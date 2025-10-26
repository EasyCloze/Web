import { MetaMapping, MetaKey, MetaValue } from "./meta";
import { db } from "./db";
import { Cache } from '../common/cache';

export async function dbSetMeta<T extends MetaKey>(key: T, value: MetaValue<T>): Promise<void> {
  await (await db).put('meta', value, key);
}

export async function dbGetMeta<T extends MetaKey>(key: T): Promise<MetaValue<T> | undefined> {
  return await (await db).get('meta', key) as MetaValue<T>;
}

export const metaCache = new Cache<MetaKey, MetaMapping[MetaKey]>();

export async function setMeta<T extends MetaKey>(key: T, value: MetaValue<T>): Promise<void> {
  metaCache.set(key, value);
  await dbSetMeta(key, value);
}

export async function fetchMeta<T extends MetaKey>(key: T): Promise<MetaValue<T> | undefined> {
  const value = await dbGetMeta(key);
  if (value !== undefined) {
    if (metaCache.has(key)) {
      return metaCache.get(key) as MetaValue<T>;
    } else {
      metaCache.set(key, value);
    }
  }
  return value;
}

export async function fetchMetaForce<T extends MetaKey>(key: T): Promise<MetaValue<T> | undefined> {
  const value = await dbGetMeta(key);
  if (value !== undefined) {
    metaCache.set(key, value);
  }
  return value;
}

export async function getOrFetchMeta<T extends MetaKey>(key: T): Promise<MetaValue<T> | undefined> {
  return (metaCache.get(key) ?? await fetchMeta(key)) as MetaValue<T>;
}
