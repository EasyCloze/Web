import { useContext } from 'react';
import Placeholder from '../widget/Placeholder';
import Text from './Text';
import LanguageContext from './context';
import dict from './dict';

export default function LangSelect() {
  const { lang, setLang } = useContext(LanguageContext);

  return (
    <div>
      <Text id='language_select.text' />
      <Placeholder width='5px' />
      <select style={{ height: '32px', padding: '0px 16px' }} value={lang || ''} onChange={event => setLang(event.target.value ? event.target.value : null)}>
        <option value={''}><Text id='language_select.default.text' /></option>
        {
          Object.keys(dict).map(key => <option key={key} value={key}>{dict[key].lang}</option>)
        }
      </select>
    </div>
  );
};
