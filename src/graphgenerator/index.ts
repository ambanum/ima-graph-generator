import graphGenerator from './providers/social-networks-graph-generator';

export interface GraphGeneratorResponse {
  jsonPath: string;
  imagePath?: string;
}
export type GraphGeneratorsResponse = GraphGeneratorResponse[];

export interface GetGraphGeneratorOptions {
  json_path: string;
  img_path?: string;
  minretweets?: number;
  input_graph_json_path?: string;
  snscrape_json_path?: string;
  since?: string;
  maxresults?: number;
  layout_algo?: 'circular' | 'kamada_kawai' | 'spring' | 'random' | 'spiral';
  community_algo?:
    | 'greedy_modularity'
    | 'asyn_lpa_communities'
    | 'girvan_newman'
    | 'label_propagation'
    | 'louvain';
}
export interface GetGraphJson {
  nodes: any[];
  edges: any[];
  metadata: any;
}

export interface Adapter {
  getGraph: (search: string, options?: GetGraphGeneratorOptions) => Promise<void>;
  getGraphJson: (
    search: string,
    options?: Omit<GetGraphGeneratorOptions, 'json_path' | 'img_path'>
  ) => Promise<GetGraphJson>;
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

export default {
  ...adapter,
  getProvider: () => GRAPH_GENERATOR_PROVIDER,
};
