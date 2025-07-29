import { useEffect, useState } from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Tooltip from '@mui/material/Tooltip';
import Switch from '@mui/material/Switch';
import SettingsIcon from '@mui/icons-material/Settings';
import SyncIcon from '@mui/icons-material/Sync';
import CircularProgress from '@mui/material/CircularProgress';
import { Slide, useScrollTrigger } from '@mui/material';
import { useLocalStateJson } from './utility/localState';
import { useRefGetSet } from './utility/refGetSet';
import Text from './lang/Text';
import IconButton from './widget/IconButton';
import Button from './widget/Button';
import Placeholder from './widget/Placeholder';
import Dialog from './dialog/Dialog';
import './Menu.css';

export default function ({ token, setToken, setMenuRef, getListRef }) {
  const scrollTrigger = useScrollTrigger({ threshold: 30 });
  const [highlight, setHighlight] = useLocalStateJson('highlight', false);
  const [time, setTime] = useLocalStateJson('lastSyncTime');
  const [next, setNext] = useState(0);
  const [online, setOnline] = useLocalStateJson('online');
  const [syncing, setSyncing] = useState(false);
  const [getDialogRef, setDialogRef] = useRefGetSet();

  setMenuRef({
    time,
    setHighlight,
    setSyncing,
    setNext,
    onSync: time => { time ? (setTime(time), setOnline(true)) : setOnline(null) },
  });

  useEffect(() => {
    getListRef().setHighlight(highlight);
  }, [highlight]);

  useEffect(() => {
    if (!token) {
      setTime(null);
      setOnline(null);
      setSyncing(false);
    }
  }, [token]);

  useEffect(() => {
    function handleCtrlS(event) {
      if (event.ctrlKey && event.code === 'KeyS') {
        event.preventDefault();
        if (token) {
          window.scrollTo({ top: 0, behavior: 'instant' });
          getListRef().sync();
        }
      }
    }
    document.addEventListener('keydown', handleCtrlS);
    return () => document.removeEventListener('keydown', handleCtrlS);
  }, [token]);

  return (
    <>
      <Slide appear={false} direction="down" in={!scrollTrigger}>
        <AppBar position='fixed'>
          <Toolbar variant='dense' className='menu'>
            <div>
              <IconButton icon={<SettingsIcon />} title={<Text id='menu.setting.tooltip' />} onClick={() => getDialogRef().setDialog('setting')} />
              <Tooltip title={<Text id={highlight ? 'menu.highlight_mode.tooltip' : 'menu.hide_mode.tooltip'} />}>
                <Switch checked={highlight} onMouseDown={event => event.preventDefault()} onClick={() => setHighlight(!highlight)}></Switch>
              </Tooltip>
            </div>
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
              {
                !token ? (
                  <>
                    <Button onClick={() => getDialogRef().setDialog('signup')} ><Text id='menu.signup.button' /></Button>
                    <Placeholder width='5px' />
                    <Button onClick={() => getDialogRef().setDialog('login')} ><Text id='menu.login.button' /></Button>
                  </>
                ) : (
                  <>
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
                        <CircularProgress size='20px' style={{ padding: '10px' }} /> :
                        <IconButton
                          icon={<SyncIcon />}
                          title={
                            <div style={{ textAlign: 'center' }}>
                              <Text id='menu.sync.tooltip' />
                              {
                                next ? (
                                  <>
                                    <br />
                                    <div style={{ fontStyle: 'italic', paddingTop: '5px' }}>
                                      *<Text id='menu.sync.next.tooltip' /> {new Date(next).toLocaleString()}
                                    </div>
                                  </>
                                ) : ('')
                              }
                            </div>
                          }
                          onClick={() => getListRef().sync()}
                        />
                    }
                  </>
                )
              }
            </div>
          </Toolbar>
        </AppBar>
      </Slide>
      <Dialog setDialogRef={setDialogRef} token={token} setToken={setToken} />
    </>
  )
}
