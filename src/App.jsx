import { useLocalState } from './utility/localState';
import { useRefGetSet } from './utility/refGetSet';
import LanguageProvider from './lang/Provider';
import Menu from './Menu';
import List from './List';

export default function App() {
  const [token, setToken] = useLocalState('token');
  const [getMenuRef, setMenuRef] = useRefGetSet();
  const [getListRef, setListRef] = useRefGetSet();

  return (
    <LanguageProvider>
      <Menu token={token} setToken={setToken} setMenuRef={setMenuRef} getListRef={getListRef} />
      <List token={token} setToken={setToken} getMenuRef={getMenuRef} setListRef={setListRef} />
    </LanguageProvider>
  )
}
