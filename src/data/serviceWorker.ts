export const checkSyncingTag = 'syncing';
export const finishSyncingTag = 'finished';
export const checkRegisterBackgroundSyncTag = 'checkSync';
export const backgroundSyncTag = 'sync';
export const periodicSyncTag = 'reminder';
export const periodicSyncNotificationTag = periodicSyncTag;

export async function serviceWorkerSync(): Promise<void> {
  return new Promise(resolve => {
    if (!navigator.serviceWorker.controller) {
      resolve();
    } else {
      const messageChannel = new MessageChannel();
      messageChannel.port1.onmessage = event => {
        if (!event.data.syncing) {
          resolve();
        } else {
          function onMessage(event: MessageEvent) {
            if (event.data.tag === finishSyncingTag) {
              navigator.serviceWorker.removeEventListener('message', onMessage);
              resolve();
            }
          }
          navigator.serviceWorker.addEventListener('message', onMessage);
        }
      };
      navigator.serviceWorker.controller.postMessage({ tag: checkSyncingTag }, [messageChannel.port2]);
    }
  });
}

export function serviceWorkerCheckRegisterBackgroundSync() {
  navigator.serviceWorker.controller?.postMessage({ tag: checkRegisterBackgroundSyncTag });
}
