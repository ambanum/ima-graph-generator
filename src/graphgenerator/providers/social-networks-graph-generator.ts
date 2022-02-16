import { Adapter, GetGraphJson } from '../index';
import { execCmd } from 'common/cmd-utils';
import fs from 'fs';
import os from 'os';
import path from 'path';

const GRAPH_GENERATOR_SOCIAL_NETWORKS_PATH =
  process.env.GRAPH_GENERATOR_SOCIAL_NETWORKS_PATH || 'graphgenerator';

const dir = path.join(os.tmpdir(), 'social-networks-graph-generator');
fs.mkdirSync(dir, { recursive: true });

export interface GraphGenerator {}

const computeGraph: Adapter['computeGraph'] = async (search: string, options) => {
  const cmds: string[] = [];

  if (options.minretweets) {
    cmds.push(`-r ${options.minretweets}`);
  }
  if (options.input_graph_json_path) {
    cmds.push(`-f ${options.input_graph_json_path}`);
  }
  if (options.snscrape_json_path) {
    cmds.push(`-s ${options.snscrape_json_path}`);
  }
  if (options.since) {
    cmds.push(`-d ${options.since}`);
  }
  if (options.compute_botscore) {
    cmds.push(`--compute_botscore`);
  }
  if (options.maxresults) {
    cmds.push(`-m ${options.maxresults}`);
  }
  if (options.layout_algo) {
    cmds.push(`-a ${options.layout_algo}`);
  }
  if (options.community_algo) {
    cmds.push(`-c ${options.community_algo}`);
  }
  if (options.json_path) {
    cmds.push(`-j ${options.json_path}`);
  }
  if (options.img_path) {
    cmds.push(`-i ${options.img_path}`);
  }
  if (options.batch_size) {
    cmds.push(`-bs ${options.batch_size}`);
  }

  const cmd = `${GRAPH_GENERATOR_SOCIAL_NETWORKS_PATH} ${cmds.join(' ')} "+${search
    .replace('$', '\\$')
    .replace(/"/gim, '\\"')}"`;
  console.info(cmd);
  execCmd(cmd);
};

const watchGraphJson: Adapter['watchGraphJson'] = (search: string, options) => {
  const jsonPath = path.join(
    dir,
    `${search.replace(/[/\\?&%*:$|"<>]/g, '-')}.json` // replace invalid characters for a folder
  );

  const unlinkFile = () => {
    if (fs.existsSync(jsonPath)) {
      fs.unlinkSync(jsonPath);
    }
  };

  try {
    computeGraph(search, { ...options, json_path: jsonPath });

    return {
      readFile: () => {
        if (fs.existsSync(jsonPath)) {
          return JSON.parse(fs.readFileSync(jsonPath).toString());
        }
        return {
          nodes: [],
          edges: [],
          metadata: {
            status: 'PROCESSING',
          },
        };
      },

      unlinkFile,
    };
  } catch (e) {
    unlinkFile();
    throw e;
  }
};

const getVersion: Adapter['getVersion'] = () => {
  const cmd = `${GRAPH_GENERATOR_SOCIAL_NETWORKS_PATH} --version`;
  return execCmd(cmd);
};

export default {
  computeGraph,
  watchGraphJson,
  getVersion,
} as Adapter;
