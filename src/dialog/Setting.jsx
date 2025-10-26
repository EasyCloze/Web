import { useEffect } from 'react';
import Switch from '@mui/material/Switch';
import { useMetaState, useReadOnlyMetaState } from '../data/metaState';
import { logOut } from '../data/user';
import Text from '../lang/Text';
import Label from '../widget/Label';
import Placeholder from '../widget/Placeholder';
import Button from '../widget/Button';
import LangSelect from '../lang/Select';

const NotificationSwitch = ({ setError }) => {
  const [registered, setRegistered] = useMetaState('notificationRegistered', false);
  const permissionGranted = Notification.permission === 'granted';

  useEffect(() => {
    if (!permissionGranted) {
      setRegistered(false);
    }
  });

  return (
    <>
      <Label><Text id='dialog.setting.notification.text' /></Label>
      <Switch checked={permissionGranted && registered} onMouseDown={event => event.preventDefault()} onClick={async () => {
        if (!registered) {
          if (!permissionGranted) {
            const permission = await Notification.requestPermission()
            if (permission !== 'granted') {
              setError('dialog.setting.notification.denied.message');
              return;
            }
          }
          const registration = await navigator.serviceWorker.ready;
          if (!('periodicSync' in registration)) {
            setError('dialog.setting.notification.unsupported.message');
            return;
          }
          const status = await navigator.permissions.query({ name: 'periodic-background-sync' });
          if (status.state !== 'granted') {
            setError('dialog.setting.notification.failure.text');
            return;
          }
          await registration.periodicSync.register('reminder', { minInterval: 6 * 60 * 60 * 1000 });
          setRegistered(true);
          setError(null);
        } else {
          const registration = await navigator.serviceWorker.ready;
          await registration.periodicSync.unregister('reminder');
          setRegistered(false);
        }
      }}></Switch >
    </>
  )
}

export default function ({ setError, setDialog }) {
  const loggedIn = useReadOnlyMetaState('loggedIn', false);
  const user = useReadOnlyMetaState('user', null);

  return (
    <>
      {
        loggedIn && (
          <>
            <Label><Text id='dialog.setting.welcome.text' />{user}</Label>
            <Placeholder height='5px' />
            <Button onClick={() => { logOut(); setDialog(null); }} ><Text id='dialog.setting.logout.button' /></Button>
            <Placeholder height='2px' />
            <Button onClick={() => { setDialog('password'); }} ><Text id='dialog.setting.changePassword.button' /></Button>
            <Placeholder height='2px' />
            <Button onClick={() => { setDialog('delete'); }} ><Text id='dialog.setting.deleteAccount.button' /></Button>
            <Placeholder height='10px' />
          </>
        )
      }
      <NotificationSwitch setError={setError} />
      <LangSelect />
      <div style={{ position: 'relative', top: '20px', fontSize: '12px', textAlign: 'center' }} onClick={() => { setDialog('about'); }}>EasyCloze ©</div>
    </>
  )
}
