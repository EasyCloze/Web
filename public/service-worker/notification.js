self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async () => {
    const clientList = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clientList) {
      await client.focus();
      return;
    }
    await clients.openWindow('/');
  })());
})

self.addEventListener('periodicsync', event => {
  if (event.tag === 'reminder') {
    event.waitUntil(self.registration.showNotification('Daily Reminder'));
  }
})
