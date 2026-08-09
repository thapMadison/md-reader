import { useCallback, useEffect, useRef, useState } from 'react';
import { useLibrary } from '@/features/library/LibraryContext';
import { useOptionalSync } from './SyncContext';

export type SaveState = 'idle' | 'saving' | 'saved';

/** How long the button confirms a save before returning to its resting state. */
const SAVED_LINGER_MS = 1600;

/**
 * The Save action, behind the toolbar button and Ctrl/Cmd+S.
 *
 * Two steps, in order: flush the debounced edits to IndexedDB, then push to the
 * gist if this file syncs. The first always runs — Save is meaningful with no
 * account and for files that do not sync at all, and treating it as a
 * sync-only control would make "did my work survive?" depend on being signed in.
 *
 * Push happens only here, never on a timer. Not for rate limits, which are
 * nowhere near binding, but because every PATCH creates a gist revision:
 * auto-pushing would turn the version history — a reason to choose gists in the
 * first place — into a log of keystrokes. One deliberate save, one revision.
 */
export function useSaveFile() {
  const { activeName, flushEdits, isDirty } = useLibrary();
  // Optional: the app can be assembled without sync, and Save still has to work.
  const sync = useOptionalSync();
  const [state, setState] = useState<SaveState>('idle');

  // Cleared on unmount so a save finishing as the app tears down does not set
  // state on a gone component.
  const linger = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (linger.current) clearTimeout(linger.current);
    },
    [],
  );

  const settle = useCallback((next: SaveState) => {
    setState(next);
    if (linger.current) clearTimeout(linger.current);
    if (next === 'saved') {
      linger.current = setTimeout(() => setState('idle'), SAVED_LINGER_MS);
    }
  }, []);

  const save = useCallback(async () => {
    if (!activeName) return;
    settle('saving');
    try {
      await flushEdits();
      // 'local-ahead' is the state Save exists for — edited here, remote
      // untouched — and 'idle' is included so an explicit Save on an unchanged
      // file still round-trips rather than silently doing nothing.
      //
      // Everything else is excluded for its own reason. 'off' and 'too-large'
      // were never opted in. 'pushing' would queue a second write behind one in
      // flight. 'error' would retry silently, and that retry belongs to the
      // sidebar pill where the failure is shown. 'conflict' is the one that
      // matters most: pushing from there would overwrite a copy the user has
      // not been asked about, so Save deliberately leaves it to the banner.
      //
      // Not the only thing standing between an opted-out file and an upload:
      // `push` returns early without a `gistId` too. Loosening either one alone
      // leaves the opt-in test green — they have to be broken together before
      // anything uploads, which is what makes this safe rather than merely
      // correct-looking.
      const state = sync?.stateOf(activeName);
      if (sync && (state === 'idle' || state === 'local-ahead')) {
        await sync.push(activeName);
      }
      settle('saved');
    } catch {
      // Deliberately swallowed here. Both steps report their own failure where
      // the user is already looking: the quota path raises the `not saved` pill
      // in the sidebar, and a failed push raises `sync failed` on the row, with
      // the reason in its title. Re-reporting it on the toolbar button would say
      // the same thing twice and leave the button stuck in an error state that
      // outlives the problem.
      settle('idle');
    }
  }, [activeName, flushEdits, sync, settle]);

  return {
    save,
    state,
    /** True when there is something worth saving — drives the button's emphasis. */
    dirty: !!activeName && isDirty(activeName),
  };
}
