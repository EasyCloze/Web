type Listener<T> = (value: T | undefined) => void;

export class Cache<K, V> {
  protected cache = new Map<K, V>();
  protected listeners = new Map<K, Set<Listener<V>>>();

  protected notify(key: K, value: V | undefined) {
    const listeners = this.listeners.get(key);
    if (listeners) {
      for (const listener of listeners) {
        listener(value);
      }
    }
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  get(key: K): V | undefined {
    return this.cache.get(key);
  }

  set(key: K, value: V): void {
    this.cache.set(key, value);
    this.notify(key, value);
  }

  delete(key: K): void {
    this.cache.delete(key);
    this.notify(key, undefined);
  }

  subscribe(key: K, listener: Listener<V>): () => void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    const listeners = this.listeners.get(key)!;
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) {
        this.listeners.delete(key);
      }
    };
  }
}
