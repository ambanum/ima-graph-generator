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

const getGraph: Adapter['getGraph'] = async (search: string, options) => {
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

  const cmd = `${GRAPH_GENERATOR_SOCIAL_NETWORKS_PATH} ${cmds.join(' ')} "+${search
    .replace('$', '\\$')
    .replace(/"/gim, '\\"')}"`;
  console.log('--------------');
  console.log(cmd);
  console.log('--------------');

  execCmd(cmd);
};

const getGraphJson: Adapter['getGraphJson'] = async (search: string, options) => {
  const jsonPath = path.join(
    dir,
    `${search.replace(/[/\\?&%*:$|"<>]/g, '-')}.json` // replace invalid characters for a folder
  );

  try {
    await getGraph(search, { ...options, json_path: jsonPath });
    const json: GetGraphJson = JSON.parse(fs.readFileSync(jsonPath).toString());
    fs.unlinkSync(jsonPath);
    return json;
  } catch (e) {
    console.log(''); //eslint-disable-line
    console.log('╔════START══e══════════════════════════════════════════════════'); //eslint-disable-line
    console.log(e); //eslint-disable-line
    console.log('╚════END════e══════════════════════════════════════════════════'); //eslint-disable-line

    process.exit();
    if (fs.existsSync(jsonPath)) {
      fs.unlinkSync(jsonPath);
    }

    if (e.toString().includes('enough tweets found to build graph')) {
      // TODO Remove when cli tool handles this nicely
      return {
        nodes: [],
        edges: [],
        metadata: {},
      };
    }

    throw e;
  }
};

const getVersion: Adapter['getVersion'] = () => {
  const cmd = `${GRAPH_GENERATOR_SOCIAL_NETWORKS_PATH} --version`;
  return execCmd(cmd);
};

export default {
  getGraph,
  getGraphJson,
  getVersion,
} as Adapter;
