import { checkSyncingTag, finishSyncingTag, checkRegisterBackgroundSyncTag, backgroundSyncTag, periodicSyncTag, periodicSyncNotificationTag } from './data/serviceWorker';
import { dbGetMeta, dbSetMeta } from './data/metaCache';
import { dbGetList, dbUpdateList } from './data/itemCache';
import { minSyncInterval, sync } from './data/sync';
import { getListOfHidden, listOfHiddenLimit } from './data/editor';
import dict from './lang/dict';

/* workbox begin */
import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';

self.skipWaiting();
clientsClaim();

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);
/* workbox end */

function getClientList() {
  return clients.matchAll({ type: 'window', includeUncontrolled: true });
}

async function registerBackgroundSync(tag) {
  if (!self.registration.sync) {
    return false;
  }
  if ((await self.registration.sync.getTags()).includes(tag)) {
    return false;
  } else {
    await self.registration.sync.register(tag);
    return true;
  }
}

const backgroundSyncTagIndexMax = 2;
let backgroundSyncTagIndex = 0;

function currentBackgroundSyncTag() { return backgroundSyncTag + backgroundSyncTagIndex; }
function performCheckSync() { return backgroundSyncTagIndex === 0; }
function nextBackgroundSyncTag() { backgroundSyncTagIndex = backgroundSyncTagIndex >= backgroundSyncTagIndexMax ? 0 : backgroundSyncTagIndex + 1; return currentBackgroundSyncTag(); }

let syncing = false;

self.addEventListener('message', (event) => {
  if (event.data.tag === checkSyncingTag) {
    event.ports[0].postMessage({ syncing });
  }
  if (event.data.tag === checkRegisterBackgroundSyncTag) {
    event.waitUntil((async () => {
      if ((await self.registration.sync.getTags()).length === 0) {
        registerBackgroundSync(currentBackgroundSyncTag());
      }
    })());
  }
});

self.addEventListener('activate', event => {
  event.waitUntil(registerBackgroundSync(currentBackgroundSyncTag()));
});

async function checkSync() {
  const loggedIn = await dbGetMeta('loggedIn') ?? false;
  if (!loggedIn) {
    return;
  }
  const lastSyncTime = await dbGetMeta('lastSyncTime') ?? 0;
  if (Date.now() < lastSyncTime + minSyncInterval) {
    await new Promise(resolve => setTimeout(resolve, lastSyncTime + minSyncInterval - Date.now()));
  }
  if ((await getClientList()).length > 0) {
    return;
  }
  if (syncing === true) {
    return;
  }
  syncing = true;
  try {
    await dbUpdateList(...await sync(await dbGetMeta('token'), await dbGetList(), () => null));
  } catch (error) {
  }
  await dbSetMeta('lastSyncTime', Date.now());
  syncing = false;
  for (const client of await getClientList()) {
    client.postMessage({ tag: finishSyncingTag });
  }
}

self.addEventListener('sync', event => {
  if (event.tag === currentBackgroundSyncTag()) {
    event.waitUntil((async () => {
      if (event.lastChance) {
        if (performCheckSync()) {
          await checkSync();
        }
        await registerBackgroundSync(nextBackgroundSyncTag());
      } else {
        throw new Error("refire background sync");  // using exception to schedule next sync
      }
    })());
  }
});

self.addEventListener('notificationclick', event => {
  event.waitUntil((async () => {
    event.notification.close();
    const clientList = await getClientList();
    for (const client of clientList) {
      await client.focus();
      return;
    }
    await clients.openWindow(self.registration.scope);
  })());
});

self.addEventListener('periodicsync', event => {
  event.waitUntil((async () => {
    const clientList = await getClientList();
    if (clientList.some(c => c.visibilityState === "visible")) {
      return;
    }
    if (event.tag === periodicSyncTag) {
      const currLang = await dbGetMeta('currLang');
      if (currLang === undefined) {
        return;
      }
      await checkSync();
      await self.registration.showNotification(dict[currLang]['serviceWorker.notification.text'], {
        body: Array.from(new Set((await dbGetList()).map(item => getListOfHidden(item.val || item.remoteVal)).flat())).slice(0, listOfHiddenLimit).join(', '),
        tag: periodicSyncNotificationTag
      });
    }
  })());
});
