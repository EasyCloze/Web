import React, { useState } from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import SettingsIcon from '@mui/icons-material/Settings';
import SyncIcon from '@mui/icons-material/Sync';
import CircularProgress from '@mui/material/CircularProgress';
import { useLocalRef } from './utility/localRef';
import { useLocalState } from './utility/localState';
import Text from './lang/Text';
import Message from './widget/Message';
import Button from './widget/Button';
import Placeholder from './widget/Placeholder';
import Setting from './dialog/Setting';
import Signup from './dialog/Signup';
import Login from './dialog/Login';
import Password from './dialog/Password';
import Delete from './dialog/Delete';
import './Menu.css';

export default function Menu({ token, setToken, setMenuRef, getListRef }) {
  const [getUser, setUser] = useLocalRef('user');
  const [time, setTime] = useLocalState('lastSyncTime');
  const [online, setOnline] = useLocalState('online');
  const [syncing, setSyncing] = useState(false);
  const [dialog, setDialog] = useState('');

  setMenuRef({
    onSync: succeeded => { succeeded ? (setTime(new Date().toLocaleString()), setOnline(true)) : setOnline(false) },
    setSyncing
  });

  const Dialog = () => {
    const [error, setError] = useState(null);

    function current_dialog() {
      switch (dialog) {
        case 'setting':
          return <Setting token={token} setToken={setToken} user={getUser()} setDialog={setDialog} />
        case 'signup':
          return <Signup setError={setError} setDialog={setDialog} />
        case 'login':
          return <Login setError={setError} setUser={setUser} setToken={setToken} setDialog={setDialog} />
        case 'password':
          return <Password setError={setError} token={token} setToken={setToken} user={getUser()} setDialog={setDialog} />
        case 'delete':
          return <Delete setError={setError} token={token} setToken={setToken} setDialog={setDialog} />
        default:
          return null;
      }
    }

    let children = current_dialog();
    if (!children) {
      return null;
    }

    return (
      <div className='dialog-frame' onClick={() => setDialog(null)}>
        <div className='dialog' onClick={event => event.stopPropagation()}>
          {error && <Message><Text id={error} /></Message>}
          {children}
        </div>
      </div>
    )
  }

  return (
    <div>
      <AppBar position='static'>
        <Toolbar variant='dense' className='menu'>
          <Tooltip title={<Text id='menu.setting.tooltip' />}>
            <IconButton onClick={() => setDialog('setting')} >
              <SettingsIcon />
            </IconButton>
          </Tooltip>
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
            {
              !token ? (
                <React.Fragment>
                  <Button onClick={() => setDialog('signup')} ><Text id='menu.signup.button' /></Button>
                  <Placeholder width='5px' />
                  <Button onClick={() => setDialog('login')} ><Text id='menu.login.button' /></Button>
                </React.Fragment>
              ) : (
                <React.Fragment>
                  <Tooltip title={<Text id={online ? 'menu.online.tooltip' : 'menu.offline.tooltip'} />}>
                    <div style={{ backgroundColor: online ? 'mediumseagreen' : 'lightcoral', borderRadius: '50%', width: '15px', height: '15px' }}></div>
                  </Tooltip>
                  <Placeholder width='10px' />
                  <span>{time}</span>
                  <Placeholder width='5px' />
                  <Tooltip title={<Text id={syncing ? 'menu.syncing.tooltip' : 'menu.sync.tooltip'} />}>
                    {
                      syncing ?
                        <CircularProgress size='20px' /> :
                        <IconButton onClick={() => getListRef().sync()} >
                          <SyncIcon />
                        </IconButton>
                    }
                  </Tooltip>
                </React.Fragment>
              )
            }
          </div>
        </Toolbar>
      </AppBar>
      <Placeholder height='5px' />
      <Dialog />
    </div>
  )
}
