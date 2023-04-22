import { useState } from 'react';
import API from '../utility/api';
import Text from '../lang/Text';
import Message from '../widget/Message';
import Label from '../widget/Label';
import ButtonSubmit from '../widget/ButtonSubmit';

export default function Delete({ token, setToken, setDialog }) {
  const [error, setError] = useState(null);
  return (
    <form onSubmit={async event => {
      event.preventDefault();
      const response = await fetch(API('/user/delete'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });
      if (response.status !== 200) {
        setError(await response.text());
      } else {
        setToken(null);
        setDialog('');
      }
    }}>
      <Label text='Delete your account. (All your items will be permanently deleted.)' />
      {error && <Message text={error} />}
      <ButtonSubmit text='delete' />
    </form>
  )
}
