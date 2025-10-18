import { useLocalState } from '../utility/localState';
import LanguageContext from './context';
import dict from './dict';

function current_lang() {
  let current = navigator.language;
  let [first] = current.split('-');
  return Object.hasOwn(dict, first) ? first : 'en';
}

export default function ({ children }) {
  const [lang, setLang] = useLocalState('lang');

  // todo: language and dictionary visible to service worker

  return (
    <LanguageContext.Provider value={{
      lang,
      dict: dict[lang || current_lang()],
      setLang
    }}>
      {children}
    </LanguageContext.Provider>
  );
};
