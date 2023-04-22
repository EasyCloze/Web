import React, { useState } from 'react';
import { useLocalState } from './utility/localState';
import Text from './lang/Text';
import Button from './widget/Button';
import Placeholder from './widget/Placeholder';
import PositionAbsolute from './widget/PositionAbsolute';
import Setting from './dialog/Setting';
import Signup from './dialog/Signup';
import Login from './dialog/Login';
import Password from './dialog/Password';
import Delete from './dialog/Delete';
import './Menu.css';

export default function Menu({ token, setToken, setMenuRef, getListRef }) {
  const [time, setTime] = useLocalState('lastSyncTime');
  const [syncing, setSyncing] = useState(false);
  const [dialog, setDialog] = useState('');
  const [connection, setConnection] = useState(true);

  setMenuRef({
    onSync: succeeded => { succeeded ? (setTime(new Date().toLocaleString()), setConnection(true)) : setConnection(false) },
    setSyncing
  });

  const Dialog = () => {
    function current_dialog() {
      switch (dialog) {
        case 'setting':
          return <Setting token={token} setToken={setToken} setDialog={setDialog} />;
        case 'signup':
          return <Signup setDialog={setDialog} />;
        case 'login':
          return <Login setToken={setToken} setDialog={setDialog} />;
        case 'password':
          return <Password token={token} setDialog={setDialog} />;
        case 'delete':
          return <Delete token={token} setToken={setToken} setDialog={setDialog} />;
        default:
          return null;
      }
    }

    let child = current_dialog();
    if (!child) {
      return null;
    }

    return (
      <div className='dialog-frame' onClick={() => setDialog('')}>
        <div className='dialog' onClick={event => event.stopPropagation()}>
          {child}
        </div>
      </div>
    )
  }

  return (
    <div className='menu'>
      <Button text='setting' onClick={() => setDialog('setting')} />
      <PositionAbsolute right='0px'>
        {
          !token ? (
            <React.Fragment>
              <Button text='signup' onClick={() => setDialog('signup')} />
              <Button text='login' onClick={() => setDialog('login')} />
            </React.Fragment>
          ) : (
            <React.Fragment>
              <span>{time}</span>
              <Placeholder width='5px' />
              {!connection && <React.Fragment>disconnected<Placeholder width='5px' /></React.Fragment>}
              {!syncing && <Button text='sync' onClick={() => getListRef().sync()} />}
            </React.Fragment>
          )
        }
      </PositionAbsolute>
      <Dialog />
    </div>
  )
}
