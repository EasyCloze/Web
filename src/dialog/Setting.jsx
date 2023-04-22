import React from 'react';
import jwt_decode from 'jwt-decode';
import LangSelect from '../lang/Select';
import Text from '../lang/Text';
import Button from '../widget/Button';

export default function Setting({ token, setDialog, setToken }) {
  return (
    <React.Fragment>
      {
        token ? (
          <React.Fragment>
            {'Hello! ' + jwt_decode(token).user}
            <Button text='logout' onClick={() => { setToken('') }} />
            <Button text='change password' onClick={() => { setDialog('password') }} />
            <Button text='delete account' onClick={() => setDialog('delete')} />
          </React.Fragment>
        ) : (
          <React.Fragment>
            You are not logged in
            <Button text='login' onClick={() => { setDialog('login') }} />
          </React.Fragment>
        )
      }
      <LangSelect />
    </React.Fragment>
  )
}
