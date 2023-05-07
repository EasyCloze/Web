import { useEffect } from 'react';
import { useLocalState } from './utility/localState';
import { useRefGetSet } from './utility/refGetSet';
import { useForceUpdate } from './utility/forceUpdate';
import PositionFixed from './widget/PositionFixed';
import LanguageProvider from './lang/Provider';
import Menu from './Menu';
import List from './List';
import './App.css';

export default function App() {
  const [token, setToken] = useLocalState('token');
  const [getMenuRef, setMenuRef] = useRefGetSet();
  const [getListRef, setListRef] = useRefGetSet();

  const Frame = ({ children }) => {
    const forceUpdate = useForceUpdate();

    useEffect(() => {
      window.addEventListener('resize', forceUpdate);
    }, []);

    return <PositionFixed className='app' zIndex='0' left='0px' top='0px' right='0px' height={window.visualViewport.height}>{children}</PositionFixed>
  }

  return (
    <LanguageProvider>
      <Frame>
        <Menu token={token} setToken={setToken} setMenuRef={setMenuRef} getListRef={getListRef} />
        <List token={token} setToken={setToken} getMenuRef={getMenuRef} setListRef={setListRef} />
      </Frame>
    </LanguageProvider>
  )
}
