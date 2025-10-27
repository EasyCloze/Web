import { useEffect } from 'react';
import Slide from '@mui/material/Slide';
import useScrollTrigger from '@mui/material/useScrollTrigger';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Tooltip from '@mui/material/Tooltip';
import Switch from '@mui/material/Switch';
import CircularProgress from '@mui/material/CircularProgress';
import SettingsIcon from '@mui/icons-material/Settings';
import SyncIcon from '@mui/icons-material/Sync';
import { useRefGetSet } from './common/refGetSet';
import { useMetaState, useReadOnlyMetaState } from './data/metaState';
import { useSessionState, useReadOnlySessionState } from './data/sessionState';
import Text from './lang/Text';
import IconButton from './widget/IconButton';
import Button from './widget/Button';
import Placeholder from './widget/Placeholder';
import Dialog from './dialog/Dialog';
import './Menu.css';

export default function () {
  const loggedIn = useReadOnlyMetaState('loggedIn', false);
  const scrollTrigger = useScrollTrigger({ threshold: 30 });
  const [getDialogRef, setDialogRef] = useRefGetSet();

  useEffect(() => {
    function handleCtrlS(event) {
      if (event.ctrlKey && event.code === 'KeyS') {
        event.preventDefault();
        if (loggedIn) {
          window.scrollTo({ top: 0, behavior: 'instant' });
          setNextSyncTime(Date.now());
        }
      }
    }
    document.addEventListener('keydown', handleCtrlS);
    return () => document.removeEventListener('keydown', handleCtrlS);
  }, [loggedIn]);

  const HighlightSwitch = () => {
    const [highlight, setHighlight] = useMetaState('highlight', false);
    return (
      <Tooltip title={<Text id={highlight ? 'menu.highlightMode.tooltip' : 'menu.hideMode.tooltip'} />}>
        <Switch checked={highlight} onMouseDown={event => event.preventDefault()} onClick={() => setHighlight(!highlight)}></Switch>
      </Tooltip>
    )
  }

  const OnlineIcon = () => {
    const online = useReadOnlyMetaState('online', false);
    return (
      <Tooltip title={<Text id={online ? 'menu.online.tooltip' : 'menu.offline.tooltip'} />}>
        <div style={{ backgroundColor: online ? 'mediumseagreen' : 'lightcoral', borderRadius: '50%', width: '15px', height: '15px' }}></div>
      </Tooltip>
    )
  }

  const LastSyncTimeText = () => {
    const lastSyncTime = useReadOnlyMetaState('lastSyncTime', 0);
    return (
      <Tooltip title={<Text id='menu.lastSyncTime.tooltip' />}>
        <span>{lastSyncTime ? new Date(lastSyncTime).toLocaleString() : <Text id='menu.neverSynced.text' />}</span>
      </Tooltip>
    )
  }

  const SyncButton = () => {
    const syncing = useReadOnlySessionState('syncing', false);
    const [nextSyncTime, setNextSyncTime] = useSessionState('nextSyncTime', Date.now());
    return (
      syncing ?
        <CircularProgress size='20px' style={{ padding: '10px' }} /> :
        <IconButton
          icon={<SyncIcon />}
          title={
            <div style={{ textAlign: 'center' }}>
              <Text id='menu.sync.tooltip' />
              <br />
              <div style={{ fontStyle: 'italic', paddingTop: '5px' }}>
                <Text id='menu.sync.next.tooltip' /> {new Date(nextSyncTime).toLocaleString()}
              </div>
            </div>
          }
          onClick={() => setNextSyncTime(Date.now())}
        />
    )
  }

  return (
    <>
      <Slide appear={false} direction="down" in={!scrollTrigger}>
        <AppBar position='fixed'>
          <Toolbar variant='dense' className='menu'>
            <div>
              <IconButton icon={<SettingsIcon />} title={<Text id='menu.setting.tooltip' />} onClick={() => getDialogRef().setDialog('setting')} />
              <HighlightSwitch />
            </div>
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
              {
                !loggedIn ? (
                  <>
                    <Button onClick={() => getDialogRef().setDialog('signup')} ><Text id='menu.signup.button' /></Button>
                    <Placeholder width='5px' />
                    <Button onClick={() => getDialogRef().setDialog('login')} ><Text id='menu.login.button' /></Button>
                  </>
                ) : (
                  <>
                    <OnlineIcon />
                    <Placeholder width='10px' />
                    <LastSyncTimeText />
                    <Placeholder width='5px' />
                    <SyncButton />
                  </>
                )
              }
            </div>
          </Toolbar>
        </AppBar>
      </Slide>
      <Dialog setDialogRef={setDialogRef} />
    </>
  )
}
