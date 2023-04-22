import { useRefGetSet } from './refGetSet';
import { local, localJson } from './local'

export function useLocalRef(key: string): [() => string | null, (value: string | null) => void] {
  const [item, setItem] = local(key), [get, set] = useRefGetSet(item);
  return [get, (value: string | null) => { setItem(value); set(value); }];
}

export function useLocalRefJson(key: string, defaultValue: any): [() => any, (value: any) => void] {
  const [item, setItem] = localJson(key), [get, set] = useRefGetSet(item);
  return [() => get() || defaultValue, (value: any) => { setItem(value); set(value); }];
}
