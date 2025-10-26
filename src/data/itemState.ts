import { useEffect, useState } from 'react';
import { Item, initialItem } from './item';
import { itemCache, setItem } from './itemCache';

export function getInitialItem(id: string): Item {
  return itemCache.get(id)!;
}

export function useItemState(id: string) {
  const [value, setValue] = useState<Item>(() => getInitialItem(id));

  useEffect(() => {
    return itemCache.subscribe(id, value => setValue(value === undefined ? initialItem(id) : value));
  }, [id]);

  return [value, (value: Item) => setItem(value)] as const;
}
