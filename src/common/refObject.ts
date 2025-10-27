import { useRef } from "react";

export function useRefObject(initialize: () => object): object {
  const ref = useRef<object | null>(null);
  if (ref.current === null) {
    ref.current = initialize();
  }
  return ref.current;
}
