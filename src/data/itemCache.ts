import { CacheSet } from '../common/cacheSet';
import { Item } from './item';
import { db } from './db';
import { serviceWorkerSync } from "./serviceWorker";
import { fetchMetaForce } from './metaCache';

export async function dbGetList(): Promise<Item[]> {
  return await (await db).getAll('item');
}

async function dbAddItem(item: Item): Promise<void> {
  await (await db).add('item', item);
}

async function dbSetItem(item: Item): Promise<void> {
  await (await db).put('item', item);
}

export async function dbUpdateList(toAdd: Item[], toUpdate: Item[], toDelete: string[]): Promise<void> {
  const tx = (await db).transaction(['item'], "readwrite");
  const store = tx.objectStore('item');
  toAdd.forEach(item => store.add(item));
  toUpdate.forEach(item => store.put(item));
  toDelete.forEach(id => store.delete(id));
  await tx.done;
}

const asIterable = (list: Item[]): Iterable<[string, Item]> => list.map(item => [item.id, item]);

export const itemCache: CacheSet<string, Item> = new CacheSet<string, Item>();

let initializePromise: Promise<void> | null = null;
const initialize = async () => {
  if (initializePromise === null) {
    initializePromise = (async () => {
      await serviceWorkerSync();
      await fetchMetaForce('lastSyncTime');
      itemCache.addMany(asIterable(await dbGetList()));
    })();
  }
  await initializePromise;
};

export async function getList(): Promise<ReadonlyMap<string, Item>> {
  await initialize();
  return itemCache.getAll();
}

export async function addItem(item: Item): Promise<void> {
  await initialize();
  itemCache.add(item.id, item);
  await dbAddItem(item);
}

export async function setItem(item: Item): Promise<void> {
  await initialize();
  itemCache.set(item.id, item);
  await dbSetItem(item);
}

export async function updateList(toAdd: Item[], toUpdate: Item[], toDelete: string[]): Promise<void> {
  await initialize();
  itemCache.updateMany(asIterable(toAdd), asIterable(toUpdate), toDelete);
  await dbUpdateList(toAdd, toUpdate, toDelete);
}
