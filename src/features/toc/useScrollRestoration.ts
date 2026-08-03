import { useEffect, useRef } from 'react';
import { useStorage } from '@/services/storage/StorageContext';

// Restores the scroll offset saved for `activeName` once its content has
// rendered, then persists offset changes (debounced) as the user scrolls —
// keyed per file so switching documents doesn't clobber each other's position.
export function useScrollRestoration(containerRef: React.RefObject<HTMLElement | null>, activeName: string | null) {
  const storage = useStorage();
  const restoredFor = useRef<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!activeName) return;
    let cancelled = false;
    restoredFor.current = null;
    storage.getPreferences().then((prefs) => {
      if (cancelled) return;
      const offset = prefs.scrollPositions?.[activeName];
      const el = containerRef.current;
      if (el && offset) {
        el.scrollTop = offset;
      }
      restoredFor.current = activeName;
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeName]);

  const recordScroll: React.UIEventHandler<HTMLElement> = (e) => {
    if (!activeName || restoredFor.current !== activeName) return;
    const top = e.currentTarget.scrollTop;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      storage.getPreferences().then((prefs) => {
        const scrollPositions = { ...prefs.scrollPositions, [activeName]: top };
        storage.setPreferences({ scrollPositions }).catch(() => {});
      });
    }, 200);
  };

  return { recordScroll };
}
