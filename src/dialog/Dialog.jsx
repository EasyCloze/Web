import { useEffect, useState } from 'react';
import { useLocalRef } from '../utility/localRef';
import Text from '../lang/Text';
import Message from '../widget/Message';
import Setting from './Setting';
import About from './About';
import Signup from './Signup';
import Login from './Login';
import Password from './Password';
import Delete from './Delete';
import './Dialog.css';

export default function ({ setDialogRef, token, setToken }) {
  const [getUser, setUser] = useLocalRef('user');
  const [dialog, setDialog] = useState(null);
  const [error, setError] = useState(null);

  setDialogRef({ setDialog });

  useEffect(() => {
    setError(null);
  }, [dialog]);

  function current_dialog() {
    switch (dialog) {
      case 'setting':
        return <Setting setError={setError} token={token} setToken={setToken} user={getUser()} setDialog={setDialog} />
      case 'about':
        return <About />
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
