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

  async create({ name, type, metadata }: Partial<GraphSearch>) {
    this.logger.info(`Creating new search ${name}`);

    return await GraphSearchModel.create({
      processorId: this.processorId,
      name,
      status: GraphSearchStatuses.PENDING,
      type,
      metadata,
    });
  }

  list() {
    return GraphSearchModel.find({}).lean();
  }

  get(filter: FilterQuery<GraphSearch>) {
    return GraphSearchModel.findOne(filter).lean();
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

  // create = async (
  //   search: string,
  //   {
  //     lastEvaluatedUntilTweetId,
  //     lastEvaluatedSinceTweetId,
  //     priority = GraphSearchManager.PRIORITIES.NOW,
  //     processingDate,
  //     action = GraphSearchActionTypes.SEARCH,
  //   }: {
  //     lastEvaluatedUntilTweetId?: string;
  //     lastEvaluatedSinceTweetId?: string;
  //     priority?: number;
  //     processingDate?: Date;
  //     action?: GraphSearchActionTypes;
  //   } = {}
  // ) => {
  //   try {
  //     const queueItems = await GraphSearchModel.create(
  //       [
  //         {
  //           priority,
  //           action,
  //           status: GraphSearchStatuses.PENDING,
  //           processingDate,
  //           search,
  //           ...(lastEvaluatedUntilTweetId
  //             ? {
  //                 metadata: {
  //                   lastEvaluatedUntilTweetId,
  //                 },
  //               }
  //             : {}),
  //           ...(lastEvaluatedSinceTweetId
  //             ? {
  //                 metadata: {
  //                   lastEvaluatedSinceTweetId,
  //                 },
  //               }
  //             : {}),
  //         },
  //       ],
  //       this.session ? { session: this.session } : {}
  //     );

  //     return queueItems[0];
  //   } catch (e) {
  //     this.logger.error(e);
  //     throw new Error('Could not create queueItem');
  //   }
  // };

  // createMissingGraphSearchsIfNotExist = async () => {
  //   const searches = await GraphSearchModel.aggregate([
  //     {
  //       $lookup: {
  //         from: 'queueitems',
  //         localField: '_id',
  //         foreignField: 'search',
  //         as: 'queueitems',
  //       },
  //     },
  //     {
  //       $sort: {
  //         'queueitems.createdAt': 1,
  //       },
  //     },
  //   ]);

  //   searches.map(async (search) => {
  //     const hasRetweet = search.queueitems.some(
  //       ({ action }) => action === GraphSearchActionTypes.RETWEETS
  //     );
  //     const nbGraphSearchs = search.queueitems.length;
  //     if (!hasRetweet && nbGraphSearchs > 10) {
  //       await GraphSearchModel.create(
  //         [
  //           {
  //             action: GraphSearchActionTypes.RETWEETS,
  //             status: GraphSearchStatuses.PENDING,
  //             priority: GraphSearchManager.PRIORITIES.HIGH,
  //             processingDate: new Date(),
  //             search: search._id,
  //             metadata: search.queueitems[2].metadata,
  //           },
  //         ],
  //         this.session ? { session: this.session } : {}
  //       );
  //     }
  //   });
  // };

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

  // startProcessingSearch = async (
  //   item: GraphSearch,
  //   { previous, next }: { previous?: boolean; next?: boolean }
  // ) => {
  //   this.logger.debug(
  //     `Start processing for queueItem ${item._id} (pr:${item.priority}) and processor ${this.processorId}`
  //   );
  //   try {
  //     await GraphSearchModel.updateOne(
  //       { _id: item._id },
  //       { $set: { status: GraphSearchStatuses.PROCESSING, processorId: this.processorId } }
  //     );
  //     await GraphSearchModel.updateOne(
  //       { _id: item.search },
  //       {
  //         $set: {
  //           scrapeVersion: this.scrapeVersion,
  //           status:
  //             SearchStatuses[
  //               previous
  //                 ? SearchStatuses.PROCESSING_PREVIOUS
  //                 : next
  //                 ? SearchStatuses.PROCESSING_NEW
  //                 : SearchStatuses.PROCESSING
  //             ],
  //         },
  //       }
  //     );
  //   } catch (e) {
  //     this.logger.error(e);
  //     throw new Error(
  //       `Could not start processing for queueItem ${item._id} and processor ${this.processorId}`
  //     );
  //   }
  // };

  // stopProcessingSearch = async (
  //   item: GraphSearch,
  //   itemData: Partial<GraphSearch>,
  //   searchData: Partial<Search>
  // ) => {
  //   this.logger.debug(
  //     `Stop processing for queueItem ${item._id} and processor ${this.processorId}`
  //   );
  //   try {
  //     await GraphSearchModel.updateOne(
  //       { _id: item._id },
  //       {
  //         $set: {
  //           status: GraphSearchStatuses.DONE,
  //           processorId: this.processorId,
  //           ...itemData,
  //         },
  //       },
  //       this.session ? { session: this.session } : {}
  //     );

  //     await GraphSearchModel.updateOne(
  //       { _id: item.search },
  //       { $set: { status: SearchStatuses.DONE, error: null, ...searchData } },
  //       this.session ? { session: this.session } : {}
  //     );
  //   } catch (e) {
  //     this.logger.error(e);
  //     throw new Error(
  //       `Could not stop processing for queueItem ${item._id} and processor ${this.processorId}`
  //     );
  //   }
  // };

  // stopProcessingSearchWithError = async (item: GraphSearch, searchData: Partial<Search>) => {
  //   this.logger.debug(
  //     `Stop processing with error for queueItem ${item._id} and processor ${this.processorId}`
  //   );
  //   try {
  //     await GraphSearchModel.updateOne(
  //       { _id: item._id },
  //       {
  //         $set: {
  //           status: GraphSearchStatuses.DONE_ERROR,
  //           processorId: this.processorId,
  //           error: searchData.error,
  //         },
  //       },
  //       this.session ? { session: this.session } : {}
  //     );

  //     await GraphSearchModel.updateOne(
  //       { _id: item.search },
  //       { $set: { status: SearchStatuses.DONE_ERROR, ...searchData } },
  //       this.session ? { session: this.session } : {}
  //     );

  //     // TODO
  //     // Send email
  //   } catch (e) {
  //     console.error(e);
  //     throw new Error(
  //       `Could not stop processing with error for queueItem ${item._id} and processor ${this.processorId}`
  //     );
  //   }
  // };

  // startProcessingRetweets = async (item: GraphSearch) => {
  //   this.logger.debug(
  //     `Start processing Retweets for queueItem ${item._id} (pr:${item.priority}) and processor ${this.processorId}`
  //   );
  //   try {
  //     await GraphSearchModel.updateOne(
  //       { _id: item._id },
  //       { $set: { status: GraphSearchStatuses.PROCESSING, processorId: this.processorId } }
  //     );
  //   } catch (e) {
  //     this.logger.error(e);
  //     throw new Error(
  //       `Could not start processing Retweets for queueItem ${item._id} and processor ${this.processorId}`
  //     );
  //   }
  // };

  // stopProcessingRetweets = async (item: GraphSearch, itemData: Partial<GraphSearch>) => {
  //   this.logger.debug(
  //     `Stop processing for queueItem ${item._id} and processor ${this.processorId}`
  //   );
  //   try {
  //     await GraphSearchModel.updateOne(
  //       { _id: item._id },
  //       {
  //         $set: {
  //           status: GraphSearchStatuses.DONE,
  //           processorId: this.processorId,
  //           ...itemData,
  //         },
  //       },
  //       this.session ? { session: this.session } : {}
  //     );
  //   } catch (e) {
  //     this.logger.error(e);
  //     throw new Error(
  //       `Could not stop processing for queueItem ${item._id} and processor ${this.processorId}`
  //     );
  //   }
  // };
}
