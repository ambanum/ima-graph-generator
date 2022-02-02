import { Processor as ModelProcessor } from 'models/Processor';
import { GraphSearch as ModelGraphSearch } from 'models/GraphSearch';

export * from 'models/GraphSearch';

/**
 * Common
 */

export interface CommonResponse {
  status: 'ok' | 'ko';
  message?: string;
}

/**
 * GraphSearch
 */

export type GraphSearch = ModelGraphSearch;

export interface GetGraphSearchesResponse extends CommonResponse {
  searches: GraphSearch[];
}

export interface CreateGraphSearchInput extends CommonResponse {
  name: string;
}

/**
 * Processor
 */
export type Processor = ModelProcessor;
