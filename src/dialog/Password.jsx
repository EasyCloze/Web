import { hash } from '../utility/hash'
import API from '../utility/api';
import Text from '../lang/Text';
import Label from '../widget/Label';
import Input from '../widget/Input';
import Placeholder from '../widget/Placeholder';
import ButtonSubmit from '../widget/ButtonSubmit';

export default function Password({ setError, token, setToken, user, setDialog }) {
  return (
    <form onSubmit={async event => {
      event.preventDefault();
      const pass = event.target.pass.value;
      try {
        const response = await fetch(API('/user/password'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ pass: hash(user, pass) }),
        });
        if (response.status !== 200) {
          switch (response.status) {
            case 404: setToken(null); break;
            case 429: setError('dialog.error.limit.change_password.message'); break;
            default: throw new Error();
          }
        } else {
          setDialog(null);
        }
      } catch (error) {
        setError('dialog.error.unknown.message');
      }
    }}>
      <Label><Text id='dialog.change_password.text' /></Label>
      <Placeholder height='10px' />
      <Label><Text id='dialog.change_password.new_password.text' /></Label>
      <Input type="password" name="pass" required />
      <Placeholder height='10px' />
      <ButtonSubmit><Text id='dialog.change_password.button' /></ButtonSubmit>
    </form>
  )
}
