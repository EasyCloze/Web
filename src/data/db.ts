import { DBSchema, IDBPDatabase, openDB } from 'idb';
import { MetaMapping, MetaKey } from './meta';
import { Item } from './item';

interface Schema extends DBSchema {
  'meta': {
    key: MetaKey,
    value: MetaMapping[MetaKey],
  },
  'item': {
    key: string,
    value: Item
  }
}

export const db: Promise<IDBPDatabase<Schema>> = openDB<Schema>('default', 1, {
  upgrade(db) {
    db.createObjectStore('meta');
    db.createObjectStore('item', { keyPath: 'id' });
  },
});
