import { useState } from 'react';
import { hash } from '../utility/hash'
import API from '../utility/api';
import Text from '../lang/Text';
import Message from '../widget/Message';
import Label from '../widget/Label';
import Input from '../widget/Input';
import ButtonSubmit from '../widget/ButtonSubmit';
import Placeholder from '../widget/Placeholder';

export default function Login({ setToken, setDialog }) {
  const [error, setError] = useState(null);
  return (
    <form onSubmit={async event => {
      event.preventDefault();
      const user = event.target.user.value, pass = event.target.pass.value;
      if (user.length < 6 || user.length > 30) {
        setError('invalid username');
        return;
      }
      setError(null);
      const response = await fetch(API('/user/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user, pass: hash(user, pass) }),
      });
      if (response.status !== 200) {
        switch (response.status) {
          case 400: setError(await response.text()); break;  // invalid username or password format
          case 404: setError(await response.text()); break;  // incorrect username or password
          default: setError('unknown error'); break;
        }
      } else {
        setToken(await response.text());
        setDialog('');
      }
    }}>
      {error && <Message text={error} />}
      <Label text='username' />
      <Input type="text" name="user" required />
      <Label text='password' />
      <Input type="password" name="pass" required />
      <Placeholder height='10px' />
      <ButtonSubmit text='log in' />
    </form>
  )
}
