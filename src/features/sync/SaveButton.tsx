import { CloudIcon } from '@/components/ui/icons';
import { useOptionalGistAuth } from '@/services/gist/GistContext';
import { useSaveFile } from './useSaveFile';

interface SaveButtonProps {
  /** Icon only, for the mobile bar where the left cluster has no room for a word. */
  compact?: boolean;
}

/**
 * Sync for the file that is open, beside its name.
 *
 * It sits in the toolbar's left cluster because that is the scope it actually
 * has: `useSaveFile` reads `activeName` and pushes that one file. On the right,
 * among Edit and the theme and the sidebar toggle, it read as an app-level
 * "sync everything" — the one thing it does not do.
 *
 * It carries a word again. As a bare 24px glyph on a transparent ground it was
 * indistinguishable from the status icons it sits next to — nothing said it was
 * a control at all, let alone the one that pushes your work to GitHub, and the
 * only place that fact was written down was a tooltip nobody hovers. So: a
 * bordered button like every other control in this bar, a label that names the
 * state, and — for the one state that wants something from the user — an accent
 * and a halo that pulses three times as it arrives.
 *
 * Four states, four channels each. `pending` (edits not yet pushed) is the only
 * loud one; it is also the only one where doing nothing loses something. The
 * rest report and stay quiet, because a control that always demands attention
 * stops meaning anything. Color is never the only difference — label and glyph
 * separate them too, which is the same rule CloudIcon follows for the sidebar.
 *
 * Hidden when signed out, matching the sidebar row: with no account there is
 * nothing for it to do that has not already happened locally. Ctrl/Cmd+S is
 * bound in `layoutState` regardless, so the browser's "Save page as" dialog
 * stays suppressed and the shortcut still flushes.
 */
export function SaveButton({ compact = false }: SaveButtonProps) {
  const { save, state, dirty } = useSaveFile();
  // Optional, like the row's glyph: the app can be assembled without the gist
  // providers, and Toolbar should render rather than crash on a missing one.
  const auth = useOptionalGistAuth();

  if (auth?.status !== 'signed-in') return null;

  const busy = state === 'saving';
  // `saved` outranks `dirty` for the moment it lingers, so a sync that lands
  // while the debounce still holds an edit does not flash straight back to
  // "Sync" — the user asked, it worked, and that is what the button should say.
  const done = state === 'saved';
  const pending = dirty && !busy && !done;

  const mark = pending || busy ? 'up' : 'check';
  const label = busy ? 'Syncing…' : pending ? 'Sync' : 'Synced';

  // Every one of these opens with the phrase the accessible name is looked up
  // by ("sync this file" / "syncing this file" / "this file is synced"), which
  // is what lets tests find the control without pinning a tooltip's wording.
  const title = busy
    ? 'Syncing this file to GitHub…'
    : pending
      ? 'Sync this file to GitHub (⌘S)'
      : 'This file is synced (⌘S)';

  const tone = pending ? 'var(--link)' : done ? 'var(--ok)' : 'var(--chrome-muted)';

  return (
    <button
      onClick={() => void save()}
      disabled={busy}
      title={title}
      // The label is one word and the glyph carries the rest, so the accessible
      // name has to say in a sentence what the button is scoped to: "Sync"
      // alone would leave a screen reader with the same "sync what?" ambiguity
      // the old right-hand placement created.
      aria-label={title}
      // Only the pending button pulses, and the attribute is what the
      // reduced-motion rule in index.css switches off.
      {...(pending ? { 'data-sync-nudge': '' } : null)}
      // Ghost only while resting. Pending already holds --chrome-hl, so the
      // hover rule would land on the tint it is wearing and change nothing
      // visible; busy is disabled, and a control that lights up under the
      // pointer while refusing the click is the wrong promise. That leaves
      // "Synced", which is still a live button — ⌘S and this click both force a
      // re-push — and had no hover at all to say so.
      {...(pending || busy ? null : { 'data-chrome-btn': '' })}
      style={{
        flex: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        height: 26,
        padding: compact ? 0 : '0 9px 0 8px',
        width: compact ? 26 : undefined,
        justifyContent: 'center',
        border: `1px solid ${pending ? 'var(--link)' : done ? 'var(--ok)' : 'var(--chrome-border)'}`,
        borderRadius: 7,
        // A wash rather than a fill: the Edit button owns the solid --link in
        // this bar, and two saturated blocks would compete for the same "this
        // is the thing to press" reading.
        background: pending ? 'var(--chrome-hl)' : 'transparent',
        color: tone,
        fontSize: 12,
        fontWeight: 600,
        fontFamily: 'var(--font-ui)',
        letterSpacing: '-0.1px',
        cursor: busy ? 'default' : 'pointer',
        opacity: busy ? 0.7 : 1,
        transition: 'color .2s, border-color .2s, background .2s, opacity .2s',
        animation: pending ? 'syncNudge 1.5s ease-in-out 3' : undefined,
      }}
    >
      <CloudIcon mark={mark} />
      {!compact && <span>{label}</span>}
    </button>
  );
}
