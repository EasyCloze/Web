import { useRef } from "react";

export function useRefGetSet(defaultValue: any): [() => any, (value: any) => void] {
  const ref = useRef(defaultValue);
  return [() => ref.current, (value: any) => { ref.current = value; }];
}
