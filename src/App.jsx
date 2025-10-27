import { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import { useCloseNotification } from './common/closeNotification';
import { useLock } from './common/lock';
import { useSyncControll } from './data/syncControll';
import PositionRelative from './widget/PositionRelative';
import PositionFixed from './widget/PositionFixed';
import LanguageProvider from './lang/Provider';
import Text from './lang/Text';
import Menu from './Menu';
import List from './List';

const syncErrorDisplayTime = 5000;
const singleTabLockMaxWaitingTime = 1000;

const SyncControll = () => {
  const [error, setError] = useState(null);
  useSyncControll(setError);

  useEffect(() => {
    if (error !== null) {
      const timeout = setTimeout(() => setError(null), syncErrorDisplayTime);
      return () => clearTimeout(timeout);
    }
  }, [error]);

  return error && (
    <PositionRelative style={{
      left: '50%',
      top: '53px',
      transform: 'translate(-50%, 0)',
      width: 'calc(100% - 10px)',
      maxWidth: '740px',
      margin: '5px 0px',
    }} >
      <Alert severity='error' icon={false} onClose={() => setError(null)}>
        <Text id={error} />
      </Alert>
    </PositionRelative>
  )
}

const SingleTabAlert = () => {
  const [waiting, setWaiting] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => setWaiting(false), singleTabLockMaxWaitingTime);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <PositionFixed style={{ left: '50%', top: '20px', transform: 'translate(-50%, 0)' }}>
      {
        waiting ? <CircularProgress /> : (
          <Alert severity='warning' icon={false} style={{ width: '100%' }}>
            <Text id='app.singleTab.text' />
          </Alert>
        )
      }
    </PositionFixed>
  )
}

export default function () {
  useCloseNotification();
  const hasLock = useLock('SingleTabIndexedDBAccess');
  return (
    <LanguageProvider>
      {
        hasLock ? (
          <>
            <SyncControll />
            <Menu />
            <List />
          </>
        ) : <SingleTabAlert />
      }
    </LanguageProvider>
  )
}
