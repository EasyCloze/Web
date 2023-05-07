import { useLocalState } from '../utility/localState';
import LanguageContext from './context';
import dict from './dict';

export default function LanguageProvider({ children }) {
  const [lang, setLang] = useLocalState('lang');

  return (
    <LanguageContext.Provider value={{
      lang,
      dict: dict[lang || (Object.hasOwn(dict, navigator.language) ? navigator.language : 'en')],
      setLang
    }}>
      {children}
    </LanguageContext.Provider>
  );
};
