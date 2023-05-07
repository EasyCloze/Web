import { hash } from '../utility/hash';
import API from '../utility/api';
import Text from '../lang/Text';
import Label from '../widget/Label';
import Input from '../widget/Input';
import Placeholder from '../widget/Placeholder';
import ButtonSubmit from '../widget/ButtonSubmit';

export default function Login({ setError, setUser, setToken, setDialog }) {
  return (
    <form onSubmit={async event => {
      event.preventDefault();
      const user = event.target.user.value, pass = event.target.pass.value;
      if (user.length < 6 || user.length > 30) {
        setError('dialog.error.invalid_username.message');
        return;
      }
      setError(null);
      try {
        const response = await fetch(API('/user/login'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user, pass: hash(user, pass) }),
        });
        if (response.status !== 200) {
          switch (response.status) {
            case 404: setError('dialog.error.incorrect_username_password.message'); break;
            case 429: setError('dialog.error.limit.login.message'); break;
            default: throw new Error();
          }
        } else {
          setUser(user);
          setToken(await response.text());
          setDialog(null);
        }
      } catch (error) {
        setError('dialog.error.unknown.message');
      }
    }}>
      <Label><Text id='dialog.username.text' /></Label>
      <Input type="text" name="user" required />
      <Label><Text id='dialog.password.text' /></Label>
      <Input type="password" name="pass" required />
      <Placeholder height='10px' />
      <ButtonSubmit><Text id='menu.login.button' /></ButtonSubmit>
    </form>
  )
}
