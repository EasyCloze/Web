import { useState } from 'react';
import { hash } from '../utility/hash'
import API from '../utility/api';
import Text from '../lang/Text';
import Message from '../widget/Message';
import Label from '../widget/Label';
import Input from '../widget/Input';
import ButtonSubmit from '../widget/ButtonSubmit';
import Placeholder from '../widget/Placeholder';
import jwt_decode from 'jwt-decode';

export default function Password({ token, setDialog }) {
  const [error, setError] = useState(null);
  return (
    <form onSubmit={async event => {
      event.preventDefault();
      const user = jwt_decode(token).user, pass = event.target.pass.value;
      const response = await fetch(API('/user/password'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ pass: hash(user, pass) }),
      });
      if (response.status !== 200) {
        setError(await response.text());
      } else {
        setDialog('');
      }
    }}>
      <Label text='Change your password' />
      {error && <Message text={error} />}
      <Label text='password' />
      <Input type="password" name="pass" required />
      <Placeholder height='10px' />
      <ButtonSubmit text='submit' />
    </form>
  )
}
