import { api } from '../common/api';
import { useReadOnlyMetaState } from '../data/metaState';
import { logOut } from '../data/user';
import Text from '../lang/Text';
import Label from '../widget/Label';
import Placeholder from '../widget/Placeholder';
import ButtonSubmit from '../widget/ButtonSubmit';

export default function ({ setError, setDialog }) {
  const token = useReadOnlyMetaState('token');

  return (
    <form onSubmit={async event => {
      event.preventDefault();
      try {
        const response = await fetch(api('/user/delete'), {
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
          logOut();
          setDialog(null);
        }
      } catch (error) {
        setError('dialog.error.unknown.message');
      }
    }}>
      <Label><Text id='dialog.deleteAccount.text' /></Label>
      <Placeholder height='10px' />
      <ButtonSubmit><Text id='dialog.deleteAccount.button' /></ButtonSubmit>
    </form>
  )
}
