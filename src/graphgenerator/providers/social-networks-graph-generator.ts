import { Adapter } from '../index';
import { execCmd } from 'common/cmd-utils';
import fs from 'fs';
import temp from 'temp';

const BOT_SCORE_SOCIAL_NETWORKS_PATH = process.env.BOT_SCORE_SOCIAL_NETWORKS_PATH || 'botfinder';

export interface GraphGenerator {
  botScore: number;
  details: {
    base_value: number;
    statuses_count: number;
    followers_count: number;
    favourites_count: number;
    friends_count: number;
    listed_count: number;
    default_profile: number;
    profile_use_background_image: number;
    verified: number;
    age: number;
    tweet_frequence: number;
    followers_growth_rate: number;
    favourites_growth_rate: number;
    listed_growth_rate: number;
    friends_followers_ratio: number;
    followers_friend_ratio: number;
    name_length: number;
    screenname_length: number;
    name_digits: number;
    screen_name_digits: number;
    description_length: number;
  };
}

const getGraph: Adapter['getGraph'] = async (search: string, options) => {
  let cmd: string;

  let jsonPath;
  let imagePath;
  console.log(''); //eslint-disable-line
  console.log('╔════START══search══════════════════════════════════════════════════'); //eslint-disable-line
  console.log(search); //eslint-disable-line
  console.log('╚════END════search══════════════════════════════════════════════════'); //eslint-disable-line

  // if (options.rawJson) {
  //   cmd = `${BOT_SCORE_SOCIAL_NETWORKS_PATH} --rawjson '${options.rawJson.replace(/'/gi, ' ')}'`;
  // } else {
  //   cmd = `${BOT_SCORE_SOCIAL_NETWORKS_PATH} --username  ${username}`;
  // }
  // const result = execCmd(cmd);

  // const { botScore, details }: GraphGenerator = JSON.parse(result);

  return {
    jsonPath,
    imagePath,
  };
};

const getVersion: Adapter['getVersion'] = () => {
  const cmd = `${BOT_SCORE_SOCIAL_NETWORKS_PATH} --version`;
  return execCmd(cmd);
};

const adapter: Adapter = {
  getGraph,
  getVersion,
};

export default adapter;
