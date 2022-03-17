import GraphSearchManager from 'managers/GraphSearchManager';
import * as logging from 'common/logging';

import express, { Express } from 'express';

interface ServerProps {
  processorId: string;
  logger: logging.Logger;
}

const SERVER_PORT = process.env.SERVER_PORT || 4000;

const defaultOptions = {
  maxresults: 5000,
  compute_botscore: true,
  batch_size: 200,
};
export default class Server {
  private processorId: ServerProps['processorId'];
  private logger?: ServerProps['logger'];
  private app?: Express;
  private graphManager?: GraphSearchManager;

  constructor({ processorId, logger }: ServerProps) {
    this.logger = logger || logging.getLogger();
    this.processorId = processorId;
    this.graphManager = new GraphSearchManager({
      processorId: this.processorId,
      logger: this.logger,
    });
    this.app = express();
  }

  init = () => {
    this.app.post('/graph-search/:search', async (req, res) => {
      const { search } = req.params;
      const { options = {} } = req.body || {};

      const allOptions = { ...defaultOptions, ...options };
      try {
        const invalidMimes = ['image', 'video', 'application'];

        const { name, type } = await GraphSearchManager.formatTypeAndName(search, invalidMimes);

        const existingSearch = await this.graphManager.get({ name });

        if (existingSearch) {
          return res.json({ search: existingSearch });
        }

        const newSearch = await this.graphManager.create({
          name,
          type,
          options: allOptions,
        });

        return res.json({ status: 'ok', search: newSearch });
      } catch (error) {
        res.json({
          status: 'ko',
          message: `Graph not created for ${search}`,
          error: error.toString(),
        });
      }
    });

    this.app.get('/graph-search/:search', async (req, res) => {
      const { search: searchQuery } = req.params;
      try {
        const search = await this.graphManager.get({ name: searchQuery });

        return res.json({ status: 'ok', search });
      } catch (error) {
        res.json({
          status: 'ko',
          message: `Graph not found for ${searchQuery}`,
          error: error.toString(),
        });
      }
    });

    this.app.put('/graph-search/:search', async (req, res) => {
      const { search: searchQuery } = req.params;
      try {
        const search = await this.graphManager.refresh({ name: searchQuery });

        return res.json({ status: 'ok', search });
      } catch (error) {
        res.json({
          status: 'ko',
          message: `Graph not found for ${searchQuery}`,
          error: error.toString(),
        });
      }
    });
    this.app.get('/graph-searches', async (req, res) => {
      try {
        const searches = await this.graphManager.list();

        return res.json({ status: 'ok', searches });
      } catch (error) {
        res.json({ status: 'ko', message: 'Graphs not found', error: error.toString() });
      }
    });

    this.app.listen(SERVER_PORT, () => {
      this.logger.info(`The application is listening on port ${SERVER_PORT}!`);
    });
  };
}
