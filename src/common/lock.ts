import { useEffect, useState } from "react";

export function useLock(lockName: string) {
  const [hasLock, setHasLock] = useState(false);

  useEffect(() => {
    if (!navigator.locks) {
      console.warn("Web Locks API not supported in this browser");
      return;
    }

    let cancelled: boolean = false;
    let release: (value?: unknown) => void;

    navigator.locks.request(lockName, async () => {
      if (cancelled) {
        return;
      }
      setHasLock(true);

      await new Promise(resolve => release = resolve);

      if (cancelled) {
        return;
      }
      setHasLock(false);
    });

    return () => {
      cancelled = true;
      release?.();
    };
  }, [lockName]);

  return hasLock;
}
