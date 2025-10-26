import { API } from './env';

export function api(path: string): string {
  return API + path;
}
