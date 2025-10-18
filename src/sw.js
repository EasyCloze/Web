import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import db from './utility/db';

self.skipWaiting();
clientsClaim();

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);


self.addEventListener('notificationclick', event => {
    event.waitUntil((async () => {
        event.notification.close();
        const clientList = await clients.matchAll({ type: 'window', includeUncontrolled: true });
        for (const client of clientList) {
            await client.focus();
            return;
        }
        await clients.openWindow(self.registration.scope);
    })());
});

self.addEventListener('periodicsync', event => {
    event.waitUntil((async () => {
        const clientList = await clients.matchAll({ type: 'window', includeUncontrolled: true });
        if (clientList.some(c => c.visibilityState === "visible")) {
            return;
        }
        if (event.tag === 'reminder') {
            await self.registration.showNotification('Time to review', {
                body: (await db.getAllUnion()).slice(0, 7).join(', '),
                tag: 'reminder'
            });
        }
    })());
});
