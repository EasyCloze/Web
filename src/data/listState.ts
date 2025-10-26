import { useEffect, useState } from 'react';
import { itemCache } from './itemCache';
import { asIdArraySorted } from './list';

export function useListState() {
  const [value, setValue] = useState<string[]>(() => asIdArraySorted(itemCache.getAll()));

  useEffect(() => {
    return itemCache.subscribeSet(value => setValue(asIdArraySorted(value)));
  }, []);

  return value;
}
