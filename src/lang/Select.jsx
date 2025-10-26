import { useContext } from 'react';
import { LanguageContext } from './Context';
import dict from './dict';
import Text from './Text';
import Label from '../widget/Label';

export default function () {
  const { lang, setLang } = useContext(LanguageContext);

  return (
    <div>
      <Label><Text id='dialog.setting.language.text' /></Label>
      <select style={{ height: '32px', padding: '0px 16px', borderWidth: '1px' }} value={lang || ''} onChange={event => setLang(event.target.value ? event.target.value : null)}>
        <option value={''}><Text id='dialog.setting.language.default.text' /></option>
        {
          Object.keys(dict).map(key => <option key={key} value={key}>{dict[key].lang}</option>)
        }
      </select>
    </div>
  );
};
