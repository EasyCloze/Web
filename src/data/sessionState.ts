import { useEffect, useState } from 'react';
import { Cache } from '../common/cache';

type SessionMapping = {
  syncing: boolean,
  nextSyncTime: number;
}

type SessionKey = keyof SessionMapping;
type SessionValue<K extends SessionKey> = SessionMapping[K];

const sessionCache = new Cache<SessionKey, SessionMapping[SessionKey]>();

export function getSession<T extends SessionKey>(key: T): SessionValue<T> | undefined {
  return sessionCache.get(key) as SessionValue<T> | undefined;
}

export function setSession<T extends SessionKey>(key: T, value: SessionValue<T>): SessionValue<T> {
  sessionCache.set(key, value);
  return value;
}

export function useSessionState<T extends SessionKey>(key: T, defaultValue: SessionValue<T>) {
  const [value, setValue] = useState<SessionValue<T>>(() => sessionCache.has(key) ? sessionCache.get(key) as SessionValue<T> : setSession(key, defaultValue));

  useEffect(() => {
    return sessionCache.subscribe(key, value => setValue(value === undefined ? defaultValue : value as SessionValue<T>));
  }, [key]);

  return [value, (value: SessionValue<T>) => setSession(key, value)] as const;
}

export function useReadOnlySessionState<T extends SessionKey>(key: T, defaultValue: SessionValue<T>) {
  const [value] = useSessionState(key, defaultValue);
  return value;
}
