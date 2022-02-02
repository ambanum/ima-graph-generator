import axios from 'axios';

export const getUrlType = async (url: string) =>
  ((await axios.head(url))?.headers || {})['content-type'];

export default axios;
