import graphGenerator from './providers/social-networks-graph-generator';

export interface GraphGeneratorResponse {
  jsonPath: string;
  imagePath?: string;
}
export type GraphGeneratorsResponse = GraphGeneratorResponse[];

export interface GetGraphGeneratorOptions {
  rawJson?: string;
}

export interface Adapter {
  getGraph: (search: string, options?: GetGraphGeneratorOptions) => Promise<GraphGeneratorResponse>;
  getVersion: () => string;
}

const adapters = ['social-networks-graph-generator'];

const GRAPH_GENERATOR_PROVIDER = process.env.GRAPH_GENERATOR_PROVIDER;

if (!adapters.includes(GRAPH_GENERATOR_PROVIDER)) {
  throw new Error(
    `Processor can't work without a valid GRAPH_GENERATOR_PROVIDER:"${GRAPH_GENERATOR_PROVIDER}" -> should be in "${adapters.join(
      ' | '
    )}"`
  );
}

const adapter: Adapter =
  GRAPH_GENERATOR_PROVIDER === 'social-networks-graph-generator' ? graphGenerator : ({} as Adapter);

export const getGraph = async (search: string, options: GetGraphGeneratorOptions = {}) => {
  return adapter.getGraph(search, options);
};

export const getVersion = () => {
  return adapter.getVersion();
};

export const getProvider = () => GRAPH_GENERATOR_PROVIDER;
