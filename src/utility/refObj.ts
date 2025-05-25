import { useRef } from "react";

export function useRefObj(initializer: () => object): object {
  const ref : { current : object | undefined } = useRef(undefined);
  if (!ref.current) {
    ref.current = initializer();
  }
  return ref.current;
}
