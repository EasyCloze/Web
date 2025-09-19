import { useEffect } from 'react';
import Switch from '@mui/material/Switch';
import { useLocalStateJson } from '../utility/localState';
import Text from '../lang/Text';
import Label from '../widget/Label';
import Placeholder from '../widget/Placeholder';
import Button from '../widget/Button';
import LangSelect from '../lang/Select';

export default function ({ setError, token, setToken, user, setDialog }) {
  const NotificationSwitch = () => {
    const [registered, setRegistered] = useLocalStateJson('notification-registered', false);
    const permission_granted = Notification.permission === 'granted';

    useEffect(() => {
      if (!permission_granted) {
        setRegistered(false);
      }
    });

    return (
      <>
        <Label><Text id='dialog.setting.notification.text' /></Label>
        <Switch checked={permission_granted && registered} onMouseDown={event => event.preventDefault()} onClick={async () => {
          if (!registered) {
            if (!permission_granted) {
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

  return (
    <>
      {
        token && (
          <>
            <Label><Text id='dialog.setting.welcome.text' />{user}</Label>
            <Placeholder height='5px' />
            <Button onClick={() => { setToken(null); setDialog(null); }} ><Text id='dialog.setting.logout.button' /></Button>
            <Placeholder height='2px' />
            <Button onClick={() => { setDialog('password'); }} ><Text id='dialog.setting.change_password.button' /></Button>
            <Placeholder height='2px' />
            <Button onClick={() => { setDialog('delete'); }} ><Text id='dialog.setting.delete_account.button' /></Button>
            <Placeholder height='10px' />
          </>
        )
      }
      <NotificationSwitch />
      <LangSelect />
      <div style={{ position: 'relative', top: '20px', fontSize: '12px', textAlign: 'center' }} onClick={() => { setDialog('about'); }}>EasyCloze ©</div>
    </>
  )
}
