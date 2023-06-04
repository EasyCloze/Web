import { API } from './env';

export default (path: string): string => {
  return API + path;
}
