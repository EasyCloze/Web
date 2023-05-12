import { useEffect } from 'react';
import { useLocalState } from './utility/localState';
import { useRefGetSet } from './utility/refGetSet';
import LanguageProvider from './lang/Provider';
import Menu from './Menu';
import List from './List';
import './App.css';

export default function App() {
  const [token, setToken] = useLocalState('token');
  const [getMenuRef, setMenuRef] = useRefGetSet();
  const [getListRef, setListRef] = useRefGetSet();

  useEffect(() => {
    function updatePosition() {
      document.body.style.left = visualViewport.offsetLeft + 'px';
      document.body.style.top = visualViewport.offsetTop + 'px';
      document.body.style.width = visualViewport.width + 'px';
      document.body.style.height = visualViewport.height + 'px';
    }
    visualViewport.addEventListener('resize', updatePosition);
    visualViewport.addEventListener('scroll', updatePosition);
    updatePosition();
  }, []);

  return (
    <LanguageProvider>
      <div className='app'>
        <Menu token={token} setToken={setToken} setMenuRef={setMenuRef} getListRef={getListRef} />
        <List token={token} setToken={setToken} getMenuRef={getMenuRef} setListRef={setListRef} />
      </div>
    </LanguageProvider>
  )
}
