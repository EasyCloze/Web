import { useContext } from 'react';
import Text from './Text';
import LanguageContext from '../lang/context';
import dict from './dict';

export default function LangSelect() {
  const { lang, setLang } = useContext(LanguageContext);

  return (
    <div>
      select language
      <select value={lang || ''} onChange={event => setLang(event.target.value === '' ? null : event.target.value)}>
        <option value={''}>default</option>
        {
          Object.keys(dict).map(key => <option key={key} value={key}>{dict[key].lang}</option>)
        }
      </select>
    </div>
  );
};
