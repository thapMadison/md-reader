import { useEffect, useState } from 'react';

const LARGE_FILE_BYTES = 1_000_000;

// Files above this size get parsed off the synchronous render path so the
// shimmer skeleton reflects real work rather than a cosmetic delay.
export function useDeferredRender(name: string | null, source: string): boolean {
  const isLarge = source.length > LARGE_FILE_BYTES;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isLarge) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset the skeleton when a new large document is opened
    setReady(false);
    const idle = (
      window as unknown as { requestIdleCallback?: (cb: () => void) => number }
    ).requestIdleCallback;
    const cancelIdle = (
      window as unknown as { cancelIdleCallback?: (id: number) => void }
    ).cancelIdleCallback;
    let handle: number;
    if (idle) {
      handle = idle(() => setReady(true));
      return () => cancelIdle?.(handle);
    }
    const timeout = setTimeout(() => setReady(true), 0);
    return () => clearTimeout(timeout);
  }, [name, source, isLarge]);

  return isLarge ? ready : true;
}
