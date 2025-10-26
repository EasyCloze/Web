import { useEffect } from 'react';
import { setMeta } from '../data/metaCache';
import { useMetaState } from '../data/metaState';
import { LanguageContext } from './Context';
import dict from './dict';

const defaultLangFallback = 'en';

function defaultLang() {
  let current = navigator.language;
  let [first] = current.split('-');
  return Object.hasOwn(dict, first) ? first : defaultLangFallback;
}

export default function ({ children }) {
  const [lang, setLang] = useMetaState('lang', null);
  const currLang = lang || defaultLang();

  useEffect(() => {
    setMeta('currLang', currLang);
  }, [lang]);

  return (
    <LanguageContext.Provider value={{
      lang,
      dict: dict[currLang],
      setLang
    }}>
      {children}
    </LanguageContext.Provider>
  );
};
