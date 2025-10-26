import { hash } from '../common/hash'
import { api } from '../common/api';
import { useReadOnlyMetaState } from '../data/metaState';
import { logOut } from '../data/user';
import Text from '../lang/Text';
import Label from '../widget/Label';
import Input from '../widget/Input';
import Placeholder from '../widget/Placeholder';
import ButtonSubmit from '../widget/ButtonSubmit';

export default function ({ setError, setDialog }) {
  const user = useReadOnlyMetaState('user', null);
  const token = useReadOnlyMetaState('token', null);

  return (
    <form onSubmit={async event => {
      event.preventDefault();
      const pass = event.target.pass.value;
      try {
        const response = await fetch(api('/user/password'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ pass: hash(user, pass) }),
        });
        if (response.status !== 200) {
          switch (response.status) {
            case 404: logOut(); break;
            case 429: setError('dialog.error.limit.changePassword.message'); break;
            default: throw new Error();
          }
        } else {
          setDialog(null);
        }
      } catch (error) {
        setError('dialog.error.unknown.message');
      }
    }}>
      <Label><Text id='dialog.changePassword.text' /></Label>
      <Placeholder height='10px' />
      <Label><Text id='dialog.changePassword.newPassword.text' /></Label>
      <Input type="password" name="pass" required />
      <Placeholder height='10px' />
      <ButtonSubmit><Text id='dialog.changePassword.button' /></ButtonSubmit>
    </form>
  )
}
