import * as logging from 'common/logging';

import { Processor } from '../interfaces';
import ProcessorModel from '../models/Processor';

import { ClientSession, UpdateQuery } from 'mongoose';

interface ProcessorManagerProps {
  processorId: string;
  logger: logging.Logger;
  session?: ClientSession;
}

export default class ProcessorManager {
  private processorId: ProcessorManagerProps['processorId'];
  private logger?: ProcessorManagerProps['logger'];
  private session?: ProcessorManagerProps['session'];

  constructor({ processorId, logger, session }: ProcessorManagerProps) {
    this.logger = logger || logging.getLogger();
    this.processorId = processorId;
    this.session = session;
  }

  async update(data: UpdateQuery<Processor>) {
    this.logger.debug(`update processor ${this.processorId} with ${JSON.stringify(data)}`);
    try {
      const update: UpdateQuery<Processor> = { $addToSet: {} };
      update.$set = { ...data, updatedAt: new Date() };
      update.$setOnInsert = { createdAt: new Date() };
      await ProcessorModel.findOneAndUpdate({ _id: this.processorId }, update, {
        upsert: true,
        new: true,
      });
    } catch (e) {
      console.error(e);
      throw new Error(
        `Could not update processor ${this.processorId} and processor ${this.processorId}`
      );
    }
  }
}
