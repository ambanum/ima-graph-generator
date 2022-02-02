import * as ProcessorManager from 'managers/ProcessorManager';
import GraphSearchManager from 'managers/GraphSearchManager';
import * as logging from 'common/logging';
import ProxyList from 'common/proxy-list';

import { GraphSearchStatuses, GraphSearch } from 'interfaces';

import Scraper from 'common/node-snscrape';
import { getUrlData } from 'url-scraper';

const WAIT_TIME = 1 * 1000; // 1s
const WAIT_TIME_ON_DB_ERROR = 30 * 1000; // 30s
const NB_TWEETS_TO_SCRAPE = process.env?.NB_TWEETS_TO_SCRAPE;
const NB_TWEETS_TO_SCRAPE_FIRST_TIME = process.env?.NB_TWEETS_TO_SCRAPE_FIRST_TIME;
const MIN_PRIORITY = parseInt(process.env?.MIN_PRIORITY || '0', 10);
const NEXT_PROCESS_IN_FUTURE = 60 * 60 * 1000;

// Because I could not find other way in tyepscript to get functions of a class
type Properties<T> = { [K in keyof T]: T[K] };

export default class SearchPoller {
  private processorId: string;
  private logger: logging.Logger;
  private graphSearchmanager: GraphSearchManager;
  private proxyList: ProxyList;

  constructor({ processorId }) {
    this.processorId = processorId;
    this.logger = logging.getLogger('[search]');
    this.graphSearchmanager = new GraphSearchManager({
      logger: this.logger,
      processorId,
    });
  }

  async init() {
    this.proxyList = await ProxyList.getInstance();
    await this.graphSearchmanager.resetOutdated();
  }

  async pollSearches() {
    let count: number;
    let item: GraphSearch;
    console.log('poll');

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
      await ProcessorManager.update(this.processorId, { lastPollAt: new Date() });
      this.logger.debug(`No more items to go, waiting ${WAIT_TIME / 1000}s`);
      return setTimeout(() => process.nextTick(this.pollSearches.bind(this)), WAIT_TIME);
    }

    this.logger.info(`------- ${count} item(s) to go -------`);
    console.log(item);

    // TODO retrieve graph and save it in files

    // const { lastEvaluatedUntilTweetId, lastEvaluatedSinceTweetId } = item?.metadata || {};

    // const isRequestForPreviousData = !!lastEvaluatedUntilTweetId;
    // const isRequestForNewData = !!lastEvaluatedSinceTweetId;
    // const isFirstRequest = !isRequestForPreviousData && !isRequestForNewData;

    // const session = undefined;

    // const initScraper = (retries = 3): Scraper => {
    //   try {
    //     const scraper = new Scraper(item.search.name, {
    //       resumeUntilTweetId: lastEvaluatedUntilTweetId,
    //       resumeSinceTweetId: lastEvaluatedSinceTweetId,
    //       nbTweetsToScrape: NB_TWEETS_TO_SCRAPE ? +NB_TWEETS_TO_SCRAPE : undefined,
    //       nbTweetsToScrapeFirstTime: NB_TWEETS_TO_SCRAPE_FIRST_TIME
    //         ? +NB_TWEETS_TO_SCRAPE_FIRST_TIME
    //         : undefined,
    //       logger: this.logger,
    //     });
    //     return scraper;
    //   } catch (e) {
    //     if (retries - 1 >= 0) {
    //       this.logger.warn(
    //         `Scraper for ${item._id} (${item.search.name}) could not be processed correctly retrying again ${retries} times`
    //       );
    //       this.logger.error(e);
    //       return initScraper(retries - 1);
    //     }

    //     throw e;
    //   }
    // };

    // let scraper: Scraper;

    // try {
    //   await this.graphSearchmanager.startProcessingSearch(item, {
    //     previous: isRequestForPreviousData,
    //     next: isRequestForNewData,
    //   });

    //   if (item.search.type === 'URL' && !item.search?.metadata?.url?.scrapedAt) {
    //     const data = await getUrlData(item.search.name);

    //     item.search.set('metadata', {
    //       ...item.search.metadata,
    //       url: data,
    //     });
    //     await item.search.save();
    //   }

    //   await ProcessorManager.update(this.processorId, { lastProcessedAt: new Date() });

    //   scraper = initScraper();

    //   await this.proxyList.retryWithProxy(
    //     async (proxy) => scraper.downloadTweets(proxy.url),
    //     (error) => error.toString().includes('Unable to find guest token')
    //   );

    //   // save users
    //   const users = scraper.getUsers();
    //   const tweets = scraper.getTweets();
    //   this.logger.info(
    //     `Found ${users.length} users and ${tweets.length} tweets for ${item.search.name}`
    //   );

    //   await UserManager.batchUpsert(session)(users, item.search._id, Scraper.platformId);
    //   await TweetManager.batchUpsert(session)(tweets, item.search._id);

    //   // const session = await mongoose.startSession();

    //   // session.startTransaction();

    //   // FIXME @martin should it still be used ?
    //   // if (lastEvaluatedUntilTweetId) {
    //   //   // This to prevent overwriting the lastEvaluatedUntilTweetId in case there is a problem
    //   //   newSearchData.metadata = { lastEvaluatedUntilTweetId };
    //   // }

    //   const newSearchData: Partial<
    //     Parameters<Properties<GraphSearchManager>['stopProcessingSearch']>[2]
    //   > = {};

    //   const { id: lastProcessedUntilTweetId, date: lastProcessedTweetCreatedAt } =
    //     scraper.getLastProcessedTweet() || {};
    //   const { id: firstProcessedUntilTweetId } = scraper.getFirstProcessedTweet() || {};

    //   if (isFirstRequest || isRequestForPreviousData) {
    //     if (lastProcessedTweetCreatedAt) {
    //       newSearchData.oldestProcessedDate = lastProcessedTweetCreatedAt;
    //     }

    //     if (lastEvaluatedUntilTweetId !== lastProcessedUntilTweetId && lastProcessedUntilTweetId) {
    //       // There might be some more data to retrieve
    //       await this.graphSearchmanager.create(item.search._id, {
    //         lastEvaluatedUntilTweetId: lastProcessedUntilTweetId,
    //         priority: item.priority + 1,
    //       });

    //       newSearchData.status = GraphSearchStatuses.PROCESSING_PREVIOUS;
    //     } else {
    //       // This is the last occurence of all times
    //       newSearchData.firstOccurenceDate = lastProcessedTweetCreatedAt;
    //     }

    //     if (isFirstRequest) {
    //       await this.graphSearchmanager.create(item.search._id, {
    //         lastEvaluatedSinceTweetId: firstProcessedUntilTweetId,
    //         priority: GraphSearchManager.PRIORITIES.HIGH,
    //         processingDate: new Date(Date.now() + NEXT_PROCESS_IN_FUTURE),
    //       });
    //       newSearchData.newestProcessedDate = new Date();
    //     }
    //     await this.graphSearchmanager.stopProcessingSearch(item, {}, newSearchData);
    //   } else if (isRequestForNewData) {
    //     if (!firstProcessedUntilTweetId) {
    //       // reuse same queueitem to prevent having too many of them
    //       // and just change the date
    //       await this.graphSearchmanager.stopProcessingSearch(
    //         item,
    //         {
    //           status: QueueItemStatuses.PENDING,
    //           processingDate: new Date(Date.now() + NEXT_PROCESS_IN_FUTURE),
    //           metadata: {
    //             ...(item.metadata || {}),
    //             numberTimesCrawled: (item?.metadata?.numberTimesCrawled || 0) + 1,
    //           },
    //         },
    //         {
    //           newestProcessedDate: new Date(),
    //         }
    //       );
    //     } else {
    //       await this.graphSearchmanager.create(item.search._id, {
    //         lastEvaluatedSinceTweetId: firstProcessedUntilTweetId,
    //         priority: GraphSearchManager.PRIORITIES.HIGH,
    //       });
    //       await this.graphSearchmanager.stopProcessingSearch(
    //         item,
    //         {},
    //         {
    //           newestProcessedDate: new Date(),
    //           ...(item.search.get('status') === GraphSearchStatuses.PROCESSING_PREVIOUS
    //             ? { status: GraphSearchStatuses.PROCESSING_PREVIOUS }
    //             : {}),
    //         }
    //       );
    //     }
    //   }

    //   // await session.commitTransaction();

    //   this.logger.info(`Item ${item._id} processing is done, waiting ${WAIT_TIME / 1000}s`);
    // } catch (e) {
    //   // await session.abortTransaction();
    //   this.logger.error(e);

    //   try {
    //     // we have found some volumetry
    //     await this.graphSearchmanager.stopProcessingSearchWithError(item, {
    //       error: e.toString(),
    //     });
    //   } catch (e) {
    //     this.logger.error(e);
    //     return setTimeout(
    //       () => process.nextTick(this.pollSearches.bind(this)),
    //       WAIT_TIME_ON_DB_ERROR
    //     );
    //   }

    //   this.logger.error(
    //     `Item ${item._id} could not be processed correctly retrying in ${WAIT_TIME / 1000}s`
    //   );
    // }
    // scraper?.purge();
    // // session.endSession();

    return setTimeout(() => {
      return process.nextTick(this.pollSearches.bind(this));
    }, WAIT_TIME);
  }
}
