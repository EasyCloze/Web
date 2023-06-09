import React, { useEffect, useState } from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Tooltip from '@mui/material/Tooltip';
import SettingsIcon from '@mui/icons-material/Settings';
import SyncIcon from '@mui/icons-material/Sync';
import CircularProgress from '@mui/material/CircularProgress';
import { useLocalStateJson } from './utility/localState';
import { useRefGetSet } from './utility/refGetSet';
import Text from './lang/Text';
import IconButton from './widget/IconButton';
import Button from './widget/Button';
import Placeholder from './widget/Placeholder';
import Dialog from './dialog/Dialog';
import './Menu.css';

export default function ({ token, setToken, setMenuRef, getListRef }) {
  const [time, setTime] = useLocalStateJson('lastSyncTime');
  const [online, setOnline] = useLocalStateJson('online');
  const [syncing, setSyncing] = useState(false);
  const [getDialogRef, setDialogRef] = useRefGetSet();

  setMenuRef({
    time,
    setSyncing,
    onSync: succeeded => { succeeded ? (setTime(Date.now()), setOnline(true)) : setOnline(null) },
  });

  useEffect(() => {
    if (!token) {
      setTime(null);
      setOnline(null);
      setSyncing(false);
    }
  }, [token]);

  return (
    <React.Fragment>
      <AppBar position='fixed'>
        <Toolbar variant='dense' className='menu'>
          <IconButton icon={<SettingsIcon />} title={<Text id='menu.setting.tooltip' />} onClick={() => getDialogRef().setDialog('setting')} />
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
            {
              !token ? (
                <React.Fragment>
                  <Button onClick={() => getDialogRef().setDialog('signup')} ><Text id='menu.signup.button' /></Button>
                  <Placeholder width='5px' />
                  <Button onClick={() => getDialogRef().setDialog('login')} ><Text id='menu.login.button' /></Button>
                </React.Fragment>
              ) : (
                <React.Fragment>
                  <Tooltip title={<Text id={online ? 'menu.online.tooltip' : 'menu.offline.tooltip'} />}>
                    <div style={{ backgroundColor: online ? 'mediumseagreen' : 'lightcoral', borderRadius: '50%', width: '15px', height: '15px' }}></div>
                  </Tooltip>
                  <Placeholder width='10px' />
                  <Tooltip title={<Text id='menu.last_sync_time.tooltip' />}>
                    <span>{time ? new Date(time).toLocaleString() : <Text id='menu.never_synced.text' />}</span>
                  </Tooltip>
                  <Placeholder width='5px' />
                  {
                    syncing ?
                      <CircularProgress size='20px' /> :
                      <IconButton icon={<SyncIcon />} title={<Text id='menu.sync.tooltip' />} onClick={() => getListRef().sync()} />
                  }
                </React.Fragment>
              )
            }
          </div>
        </Toolbar>
      </AppBar>
      <Dialog setDialogRef={setDialogRef} token={token} setToken={setToken} />
    </React.Fragment>
  )
}
