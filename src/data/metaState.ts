import { useEffect, useState } from 'react';
import { MetaKey, MetaValue } from './meta';
import { metaCache, setMeta, fetchMeta } from './metaCache';

export function useMetaState<T extends MetaKey>(key: T, defaultValue: MetaValue<T>) {
  const [value, setValue] = useState<MetaValue<T>>(() => metaCache.has(key) ? metaCache.get(key) as MetaValue<T> : defaultValue);

  useEffect(() => {
    const unsubscribe = metaCache.subscribe(key, value => setValue(value === undefined ? defaultValue : value as MetaValue<T>));
    if (metaCache.has(key)) {
      setValue(metaCache.get(key) as MetaValue<T>);
    } else {
      fetchMeta(key).then(value => {
        if (value === undefined) {
          setMeta(key, defaultValue);
        }
      });
    }
    return unsubscribe;
  }, [key]);

  return [value, (value: MetaValue<T>) => setMeta(key, value)] as const;
}

export function useReadOnlyMetaState<T extends MetaKey>(key: T, defaultValue: MetaValue<T>) {
  const [value] = useMetaState(key, defaultValue);
  return value;
}
