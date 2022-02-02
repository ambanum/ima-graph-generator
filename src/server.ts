import GraphSearchManager from 'managers/GraphSearchManager';
import * as logging from 'common/logging';

import { getGraph } from 'graphgenerator';
import express, { Express } from 'express';

interface ServerProps {
  processorId: string;
  logger: logging.Logger;
}

const SERVER_PORT = process.env.SERVER_PORT || 4000;
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
      try {
        const { search } = req.params;
        const invalidMimes = ['image', 'video', 'application'];

        const { name, type } = await GraphSearchManager.formatTypeAndName(search, invalidMimes);

        const existingSearch = await this.graphManager.get({ name });

        if (existingSearch) {
          return res.json({ search: existingSearch });
        }

        const newSearch = await this.graphManager.create({ name, type });

        return res.json({ search: newSearch });
      } catch (error) {
        res.json({ status: 'ko', message: 'Graph not found', error: error.toString() });
      }
    });

    this.app.get('/graph-search', async (req, res) => {
      try {
        const searches = await this.graphManager.list();

        return res.json({ searches });
      } catch (error) {
        res.json({ status: 'ko', message: 'Graphs not found', error: error.toString() });
      }
    });

    this.app.listen(SERVER_PORT, () => {
      this.logger.info(`The application is listening on port ${SERVER_PORT}!`);
    });
  };
}
