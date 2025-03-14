import axios from 'axios';

export default {
  get: (url: string) => axios.get(url),
  post: (url: string, data: any) => axios.post(url, data)
};
