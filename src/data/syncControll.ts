import { useEffect } from "react";
import { setMeta, getOrFetchMeta } from "./metaCache";
import { getSession, setSession, useReadOnlySessionState } from "./sessionState";
import { idleSyncInterval, minSyncInterval, updateDelayInterval, localRefresh, sync } from "./sync";
import { itemCache, getList, updateList } from "./itemCache";
import { asArraySorted } from "./list";
import { logOut } from "./user";
import { serviceWorkerCheckRegisterBackgroundSync } from "./serviceWorker";

export function onItemUpdate() {
  setSession('nextSyncTime', Date.now() + updateDelayInterval);
}

async function checkSync(setError: (msg: string | null) => void) {
  const list = await getList();
  const loggedIn = await getOrFetchMeta('loggedIn') ?? false;
  const lastSyncTime = await getOrFetchMeta('lastSyncTime') ?? 0;
  if (loggedIn && Date.now() < lastSyncTime + minSyncInterval) {
    setError('list.error.limit.sync.message');
    setSession('nextSyncTime', lastSyncTime + minSyncInterval);
    return;
  } else {
    setSession('nextSyncTime', Date.now() + idleSyncInterval);
  }
  if (getSession('syncing') === true) {
    return;
  }
  setSession('syncing', true);
  if (!loggedIn) {
    await updateList(...localRefresh(asArraySorted(list)));
  } else {
    try {
      await updateList(...await sync((await getOrFetchMeta('token'))!, asArraySorted(list), (id: string) => itemCache.get(id)!));
      setError(null);
      setMeta('online', true);
    } catch (error) {
      switch (error) {
        case 404: logOut(); break;
        case 429: setError('list.error.limit.sync.message'); break;
        default: setMeta('online', false); break;
      }
    }
    setMeta('lastSyncTime', Date.now());
  }
  setSession('syncing', false);
}

export function useSyncControll(setError: (msg: string | null) => void) {
  const nextSyncTime = useReadOnlySessionState('nextSyncTime', Date.now());

  useEffect(() => {
    const timeout = setTimeout(() => checkSync(setError), nextSyncTime - Date.now());
    return () => clearTimeout(timeout);
  }, [nextSyncTime]);

  useEffect(() => {
    serviceWorkerCheckRegisterBackgroundSync();
  }, []);
}
