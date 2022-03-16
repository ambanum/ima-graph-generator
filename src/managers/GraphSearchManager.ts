import * as logging from 'common/logging';

import { ClientSession, FilterQuery } from 'mongoose';
import { GraphSearchStatuses, GraphSearch, GraphSearchTypes } from '../interfaces';
import { sanitizeText, sanitizeUrl, sanitizeWord } from 'utils/sanitizer';
import { getUrlType } from 'utils/fetch';

import GraphSearchModel from '../models/GraphSearch';

interface GraphSearchManagerProps {
  processorId: string;
  logger: logging.Logger;
  session?: ClientSession;
}

export default class GraphSearchManager {
  private processorId: GraphSearchManagerProps['processorId'];
  private logger?: GraphSearchManagerProps['logger'];
  private session?: GraphSearchManagerProps['session'];

  constructor({ processorId, logger, session }: GraphSearchManagerProps) {
    this.logger = logger || logging.getLogger();
    this.processorId = processorId;
    this.session = session;
  }

  static async formatTypeAndName(name: string, invalidMimes?: string[]) {
    let sanitizedName = sanitizeText(name);
    let type: GraphSearchTypes = GraphSearchTypes.KEYWORD;

    // check if name is URL
    if (name.match(/^https?:\/\//)) {
      const urlType = await getUrlType(name);

      if (invalidMimes && invalidMimes.some((invalidMime) => urlType.startsWith(invalidMime))) {
        throw new Error(`Only ${invalidMimes.join(', ')} are supported`);
      }
      type = GraphSearchTypes.URL;
      sanitizedName = sanitizeUrl(name);
    } else if (name.startsWith('@')) {
      type = GraphSearchTypes.MENTION;
      sanitizedName = `@${sanitizeWord(name)}`;
    } else if (name.startsWith('#')) {
      type = GraphSearchTypes.HASHTAG;
      sanitizedName = `#${sanitizeWord(name)}`;
    } else if (name.startsWith('$')) {
      type = GraphSearchTypes.CASHTAG;
      sanitizedName = `$${sanitizeWord(name)}`;
    }
    return { type, name: sanitizedName };
  }

  async create({ name, type, metadata, options }: Partial<GraphSearch>) {
    this.logger.info(`Creating new search ${name}`);

    return await GraphSearchModel.create({
      processorId: this.processorId,
      name,
      status: GraphSearchStatuses.PENDING,
      type,
      metadata,
      options,
    });
  }

  list() {
    return GraphSearchModel.find({}).lean();
  }

  async get(filter: FilterQuery<GraphSearch>) {
    return GraphSearchModel.findOne(filter).lean();
  }

  async refresh(filter: FilterQuery<GraphSearch>) {
    const { name, type, metadata, options } = await this.get(filter);
    await GraphSearchModel.remove(filter);
    return this.create({ name, type, metadata, options });
  }

  resetOutdated = async () => {
    this.logger.info(`reset outdated items for processorId ${this.processorId}`);
    try {
      return GraphSearchModel.updateMany(
        {
          $or: [
            { status: GraphSearchStatuses.PROCESSING, processorId: this.processorId },
            {
              status: GraphSearchStatuses.DONE_ERROR,
              processorId: this.processorId,
              error: /Command failed/gim,
            },
          ],
        },
        { $set: { status: GraphSearchStatuses.PENDING, processorId: null } }
      );
    } catch (e) {
      this.logger.error(e);
      throw new Error(`Could not reset outdated queueItems ${e}`);
    }
  };

  getPendingSearches = async () => {
    this.logger.debug(`get PENDING items`);
    try {
      const query: FilterQuery<GraphSearch> = {
        status: GraphSearchStatuses.PENDING,
      };

      const count = await GraphSearchModel.find(query).countDocuments();

      const item: GraphSearch = await GraphSearchModel.findOneAndUpdate(
        query,
        {
          $set: { status: GraphSearchStatuses.PROCESSING, processorId: this.processorId },
        },
        {
          setDefaultsOnInsert: true,
          sort: { _id: -1 },
        }
      ).populate('search');

      return {
        item,
        count,
      };
    } catch (e) {
      this.logger.error(e);
      throw new Error(`Could not create graph search ${e}`);
    }
  };

  startProcessingSearch = async (item: GraphSearch, {}: {}) => {
    this.logger.debug(
      `Start processing graph search ${item._id} and processor ${this.processorId}`
    );
    try {
      await GraphSearchModel.updateOne(
        { _id: item._id },
        { $set: { status: GraphSearchStatuses.PROCESSING, processorId: this.processorId } }
      );
    } catch (e) {
      this.logger.error(e);
      throw new Error(
        `Could not start processing for queueItem ${item._id} and processor ${this.processorId}`
      );
    }
  };

  stopProcessingSearch = async (item: GraphSearch, newData: Partial<GraphSearch>) => {
    this.logger.debug(
      `Stop processing for queueItem ${item._id} and processor ${this.processorId}`
    );
    try {
      await GraphSearchModel.updateOne(
        { _id: item._id },
        {
          $set: {
            status: GraphSearchStatuses.DONE,
            processorId: this.processorId,
            error: null,
            ...newData,
          },
        },
        this.session ? { session: this.session } : {}
      );
    } catch (e) {
      this.logger.error(e);
      throw new Error(
        `Could not stop processing for queueItem ${item._id} and processor ${this.processorId}`
      );
    }
  };

  stopProcessingSearchWithError = async (item: GraphSearch, newData: Partial<GraphSearch>) => {
    this.logger.debug(
      `Stop processing with error for queueItem ${item._id} and processor ${this.processorId}`
    );
    try {
      await GraphSearchModel.updateOne(
        { _id: item._id },
        {
          $set: {
            status: GraphSearchStatuses.DONE_ERROR,
            processorId: this.processorId,
            error: newData.error,
          },
        },
        this.session ? { session: this.session } : {}
      );

      // TODO
      // Send email
    } catch (e) {
      this.logger.error(e);
      throw new Error(
        `Could not stop processing with error for queueItem ${item._id} and processor ${this.processorId}`
      );
    }
  };
}
