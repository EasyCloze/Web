import { useEffect } from "react";

export function useCloseNotification() {
  useEffect(() => {
    async function closeNotification() {
      if (document.visibilityState === "visible") {
        const registration = await navigator.serviceWorker.ready;
        const notifications = await registration.getNotifications();
        notifications.forEach(n => n.close());
      }
    }
    closeNotification();
    document.addEventListener('visibilitychange', closeNotification);
    return () => document.removeEventListener('visibilitychange', closeNotification);
  }, []);
}
