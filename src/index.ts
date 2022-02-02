import './common/bootstrap';

import * as ProcessorManager from 'managers/ProcessorManager';
import * as logging from 'common/logging';

import { getProvider, getVersion } from 'graphGenerator';

import Scraper from 'common/node-snscrape';
import SearchPoller from './searches';
import Server from './server';
import dbConnect from 'common/db';
// @ts-ignore
import packageJson from '../package.json';
const { version } = packageJson;

const service: 'search' | 'server' | string = process.argv[2];

if (!['search', 'server'].includes(service)) {
  console.error("You need to specify a service 'search' | 'server'");
  process.exit();
}

const PROCESSOR_NAME = process.env?.PROCESSOR_NAME || 'noname';
const PROCESSOR_ID = process.env?.PROCESSOR_ID || '1';
const PROCESSOR = `${PROCESSOR_NAME}_${PROCESSOR_ID}_${service}`;

const processorMetadata = {
  version,
  graphGenerator: `${getProvider()}:${getVersion()}`,
  snscrape: Scraper.getVersion(),
  scraperPath: Scraper.getPath(),
  MONGODB_URI: process.env.MONGODB_URI,
  DEBUG: process.env.DEBUG,
};

(async () => {
  logging.info(`Launching processor in version ${version}`);
  logging.info(processorMetadata);

  await dbConnect();

  await ProcessorManager.update(PROCESSOR, { metadata: processorMetadata });

  if (service === 'server') {
    if (process.env.API !== 'false') {
      const apiServer = new Server({ processorId: PROCESSOR, logger: logging });
      apiServer.init();
    } else {
      logging.info('No API started');
    }
  } else {
    const searchPoller = new SearchPoller({ processorId: PROCESSOR });
    await searchPoller.init();

    await searchPoller.pollSearches();
  }
})();
