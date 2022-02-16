import ProcessorManager from 'managers/ProcessorManager';
import GraphSearchManager from 'managers/GraphSearchManager';
import * as logging from 'common/logging';
import graphgenerator from 'graphgenerator';
import { GraphSearch, GraphSearchStatuses, GraphSearchTypes } from 'interfaces';

import { getUrlData } from 'url-scraper';

const WAIT_TIME = 1 * 1000; // 1s
const WAIT_TIME_ON_DB_ERROR = 30 * 1000; // 30s

// Because I could not find other way in tyepscript to get functions of a class
type Properties<T> = { [K in keyof T]: T[K] };

export default class SearchPoller {
  private processorId: string;
  private logger: logging.Logger;
  private graphSearchmanager: GraphSearchManager;
  private processorManager: ProcessorManager;

  constructor({ processorId }) {
    this.processorId = processorId;
    this.logger = logging.getLogger('[search]');
    this.graphSearchmanager = new GraphSearchManager({
      logger: this.logger,
      processorId,
    });
    this.processorManager = new ProcessorManager({
      logger: this.logger,
      processorId,
    });
  }

  async init() {
    await this.graphSearchmanager.resetOutdated();
  }

  async pollSearches() {
    let count: number;
    let item: GraphSearch;

    try {
      ({ item, count } = await this.graphSearchmanager.getPendingSearches());
    } catch (e) {
      this.logger.error(e);
      return setTimeout(
        () => process.nextTick(this.pollSearches.bind(this)),
        WAIT_TIME_ON_DB_ERROR
      );
    }

    if (!item) {
      await this.processorManager.update({ lastPollAt: new Date() });
      this.logger.debug(`No more items to go, waiting ${WAIT_TIME / 1000}s`);
      return setTimeout(() => process.nextTick(this.pollSearches.bind(this)), WAIT_TIME);
    }

    this.logger.info(`------- ${count} item(s) to go -------`);

    try {
      await this.graphSearchmanager.startProcessingSearch(item, {});

      // Retrieve data from url to be able to sidplay nice message on the UI
      if (item.type === GraphSearchTypes.URL && !item?.metadata?.url?.scrapedAt) {
        const data = await getUrlData(item.name);
        item.set('metadata', {
          ...item.metadata,
          url: data,
        });
        await item.save();
      }
      await this.processorManager.update({ lastProcessedAt: new Date() });

      const { readFile, unlinkFile } = graphgenerator.watchGraphJson(item.name, item.options);

      const interval = setInterval(async () => {
        try {
          const json = readFile();

          await this.graphSearchmanager.stopProcessingSearch(item, {
            result: json,
            status: GraphSearchStatuses.PROCESSING,
          });
          if (json.metadata.status === 'DONE') {
            await this.graphSearchmanager.stopProcessingSearch(item, { result: json });
            unlinkFile();
            clearInterval(interval);
          }
        } catch (e) {
          console.warn(e);
        }
      }, 2000);
    } catch (e) {
      this.logger.error(e.toString());

      try {
        // we have found some volumetry
        await this.graphSearchmanager.stopProcessingSearchWithError(item, {
          error: e.toString(),
        });
      } catch (e) {
        this.logger.error(e);
        return setTimeout(
          () => process.nextTick(this.pollSearches.bind(this)),
          WAIT_TIME_ON_DB_ERROR
        );
      }

      this.logger.error(
        `Item ${item._id} could not be processed correctly retrying in ${WAIT_TIME / 1000}s`
      );
    }

    return setTimeout(() => {
      return process.nextTick(this.pollSearches.bind(this));
    }, WAIT_TIME);
  }
}
