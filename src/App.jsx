import { useEffect } from 'react';
import { useLocalState } from './utility/localState';
import { useRefGetSet } from './utility/refGetSet';
import LanguageProvider from './lang/Provider';
import Menu from './Menu';
import List from './List';

export default function () {
  const [token, setToken] = useLocalState('token');
  const [getMenuRef, setMenuRef] = useRefGetSet();
  const [getListRef, setListRef] = useRefGetSet();

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

  return (
    <LanguageProvider>
      <Menu token={token} setToken={setToken} setMenuRef={setMenuRef} getListRef={getListRef} />
      <List token={token} setToken={setToken} getMenuRef={getMenuRef} setListRef={setListRef} />
    </LanguageProvider>
  )
}
