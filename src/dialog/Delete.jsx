import API from '../utility/api';
import Text from '../lang/Text';
import Label from '../widget/Label';
import Placeholder from '../widget/Placeholder';
import ButtonSubmit from '../widget/ButtonSubmit';

export default function Delete({ setError, token, setToken, setDialog }) {
  return (
    <form onSubmit={async event => {
      event.preventDefault();
      try {
        const response = await fetch(API('/user/delete'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
        });
        if (response.status !== 200) {
          switch (response.status) {
            default: throw new Error();
          }
        } else {
          setToken(null);
          setDialog(null);
        }
      } catch (error) {
        setError('dialog.error.unknown.message');
      }
    }}>
      <Label><Text id='dialog.delete_account.text' /></Label>
      <Placeholder height='10px' />
      <ButtonSubmit><Text id='dialog.delete_account.button' /></ButtonSubmit>
    </form>
  )
}
