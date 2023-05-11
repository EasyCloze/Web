import { useRef, useEffect } from 'react';
import { useLocalState } from './utility/localState';
import { useRefGetSet } from './utility/refGetSet';
import LanguageProvider from './lang/Provider';
import Menu from './Menu';
import List from './List';
import './App.css';

export default function App() {
  const ref = useRef();
  const [token, setToken] = useLocalState('token');
  const [getMenuRef, setMenuRef] = useRefGetSet();
  const [getListRef, setListRef] = useRefGetSet();

  useEffect(() => {
    function updatePosition() {
      ref.current.style.left = visualViewport.offsetLeft + 'px';
      ref.current.style.top = visualViewport.offsetTop + 'px';
      ref.current.style.width = visualViewport.width + 'px';
      ref.current.style.height = visualViewport.height + 'px';
    }
    visualViewport.addEventListener('resize', updatePosition);
    visualViewport.addEventListener('scroll', updatePosition);
  }, []);

  return (
    <LanguageProvider>
      <div ref={ref} className='app'>
        <Menu token={token} setToken={setToken} setMenuRef={setMenuRef} getListRef={getListRef} />
        <List token={token} setToken={setToken} getMenuRef={getMenuRef} setListRef={setListRef} />
      </div>
    </LanguageProvider>
  )
}
