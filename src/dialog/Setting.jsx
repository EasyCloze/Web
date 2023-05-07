import React from 'react';
import Text from '../lang/Text';
import Placeholder from '../widget/Placeholder';
import Button from '../widget/Button';
import LangSelect from '../lang/Select';

export default function Setting({ token, setToken, user, setDialog }) {
  return (
    <React.Fragment>
      {
        token && (
          <React.Fragment>
            <Text id='dialog.setting.welcome.text' />
            {user}
            <Placeholder height='5px' />
            <Button onClick={() => { setToken(null); setDialog(null); }} ><Text id='dialog.setting.logout.button' /></Button>
            <Placeholder height='2px' />
            <Button onClick={() => { setDialog('password'); }} ><Text id='dialog.setting.change_password.button' /></Button>
            <Placeholder height='2px' />
            <Button onClick={() => { setDialog('delete'); }} ><Text id='dialog.setting.delete_account.button' /></Button>
            <Placeholder height='10px' />
          </React.Fragment>
        )
      }
      <LangSelect />
    </React.Fragment>
  )
}
