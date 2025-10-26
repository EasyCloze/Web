import { Cache } from "./cache";

type SetListener<K, V> = (entries: ReadonlyMap<K, V>) => void;

export class CacheSet<K, V> extends Cache<K, V> {
  protected setListeners = new Set<SetListener<K, V>>();

  protected notifySet() {
    for (const listener of this.setListeners) {
      listener(this.cache);
    }
  }

  getAll(): ReadonlyMap<K, V> {
    return this.cache;
  }

  add(key: K, value: V): void {
    if (this.cache.has(key)) {
      throw new Error(`Key ${key} already exists`);
    }
    super.set(key, value);
    this.notifySet();
  }

  override set(key: K, value: V): void {
    if (!this.cache.has(key)) {
      throw new Error(`Key ${key} does not exist`);
    }
    super.set(key, value);
  }

  override delete(key: K): void {
    if (!this.cache.has(key)) {
      throw new Error(`Key ${key} does not exist`);
    }
    super.delete(key);
    this.notifySet();
  }

  updateMany(toAdd: Iterable<[K, V]>, toUpdate: Iterable<[K, V]>, toDelete: Iterable<K>): void {
    for (const [key, value] of toAdd) {
      if (this.cache.has(key)) {
        throw new Error(`Key ${key} already exists`);
      }
      super.set(key, value);
    }
    for (const [key, value] of toUpdate) {
      if (!this.cache.has(key)) {
        throw new Error(`Key ${key} does not exist`);
      }
      super.set(key, value);
    }
    for (const key of toDelete) {
      if (!this.cache.has(key)) {
        throw new Error(`Key ${key} does not exist`);
      }
      super.delete(key);
    }
    this.notifySet();
  }

  addMany(toAdd: Iterable<[K, V]>): void {
    this.updateMany(toAdd, [], []);
  }

  subscribeSet(listener: SetListener<K, V>): () => void {
    this.setListeners.add(listener);
    return () => this.setListeners.delete(listener);
  }
}
