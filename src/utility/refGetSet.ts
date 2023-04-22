import { useRef } from "react";

export function useRefGetSet(initialValue: any): [() => any, (value: any) => void] {
  const ref = useRef(initialValue);
  return [() => ref.current, (value: any) => { ref.current = value; }];
}
