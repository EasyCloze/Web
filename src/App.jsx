import { useState } from 'react';
import { useCloseNotification } from './common/closeNotification';
import { useLock } from './common/lock';
import LanguageProvider from './lang/Provider';
import Text from './lang/Text';
import { useSyncControll } from './data/syncControll';
import Menu from './Menu';
import List from './List';

export default function () {
  useCloseNotification();
  const hasLock = useLock('SingleTabIndexedDBAccess');

  const SyncControll = () => {
    const [error, setError] = useState(null);
    useSyncControll(setError);
    return error && <Text id='error' />;
  }

  return (
    <LanguageProvider>
      {
        hasLock ? (
          <>
            <SyncControll />
            <Menu />
            <List />
          </>
        ) : <Text id='app.singleTab.text' />
      }
    </LanguageProvider>
  )
}
