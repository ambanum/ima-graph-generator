import { GetGraphGeneratorOptions } from 'graphgenerator';
import { Document, Model, Schema, model, models } from 'mongoose';

export enum GraphSearchStatuses {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  DONE = 'DONE',
  DONE_ERROR = 'DONE_ERROR',
}

export enum GraphSearchTypes {
  KEYWORD = 'KEYWORD',
  HASHTAG = 'HASHTAG',
  MENTION = 'MENTION',
  URL = 'URL',
  CASHTAG = 'CASHTAG',
}

export interface GraphSearch extends Document {
  name: string;
  status: GraphSearchStatuses;
  type: GraphSearchTypes;
  result: {
    nodes: any[];
    edges: any[];
    metadata: any;
  };
  metadata?: {
    [key: string]: any;
    url: any;
  };
  error?: string;
  options: GetGraphGeneratorOptions;
}

const schema = new Schema<GraphSearch>(
  {
    name: { type: String, required: true, index: true },
    status: { type: String, required: true, index: true, enum: Object.values(GraphSearchStatuses) },
    type: { type: String, required: true, index: true, enum: Object.values(GraphSearchTypes) },
    metadata: { type: Schema.Types.Mixed },
    options: { type: Schema.Types.Mixed },
    result: { type: Schema.Types.Mixed },
    error: { type: String, index: 'text' },
    processorId: {
      type: String,
      index: true,
      description:
        'The name of the processor it has been processed by initially. This is useful if the procesor fails and needs to start again',
    },
  },
  {
    strict: 'throw',
    timestamps: true,
  }
);

const GraphSearchModel: Model<GraphSearch> = models.GraphSearch || model('GraphSearch', schema);

export default GraphSearchModel;
