import { useState } from 'react'
import { local, localJson } from './local'

export function useLocalState(key: string): [string | null, (value: string | null) => void] {
  const [item, setItem] = local(key), [state, setState] = useState(item);
  return [state, (value: string | null) => { setItem(value); setState(value); }];
}

export function useLocalStateJson(key: string, defaultValue: any = null): [any, (value: any) => void] {
  const [item, setItem] = localJson(key), [state, setState] = useState(item);
  return [state || defaultValue, (value: any) => { setItem(value); setState(value); }];
}
