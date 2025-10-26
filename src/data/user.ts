import { setMeta } from "./metaCache";
import { setSession } from "./sessionState";

export function logIn(user: string, token: string) {
  setMeta('user', user);
  setMeta('token', token);
  setMeta('loggedIn', true);
  setMeta('lastSyncTime', 0);
  setSession('nextSyncTime', Date.now());
}

export function logOut() {
  setMeta('user', null);
  setMeta('token', null);
  setMeta('loggedIn', false);
  setMeta('lastSyncTime', 0);
  setSession('nextSyncTime', Date.now());
}
