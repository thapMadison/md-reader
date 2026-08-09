import { useState } from 'react';
import { keepBothName, useOptionalSync, type ConflictResolution } from './SyncContext';

/**
 * Shown over a document that changed both here and on GitHub.
 *
 * Nothing resolves a conflict automatically — not on focus, not on open, not on
 * save. Both copies are the user's work and no rule this code could apply would
 * know which one they meant. So the app stops and asks, and every path that
 * could overwrite either side runs from a click in here.
 *
 * Three choices rather than two, because "keep both" destroys nothing and costs
 * almost nothing: the library is keyed by name, so a second entry is all it
 * takes. It is offered first for that reason.
 */
export function ConflictBanner({ name }: { name: string }) {
  const sync = useOptionalSync();
  const [working, setWorking] = useState(false);

  if (!sync || sync.stateOf(name) !== 'conflict') return null;

  const choose = (how: ConflictResolution) => () => {
    setWorking(true);
    // No finally-reset: a resolution that succeeds takes the file out of
    // `conflict`, which unmounts this. Leaving the buttons disabled on the way
    // out is correct — re-enabling them for the last frame before they vanish
    // would just invite a second click on a choice already made.
    void sync.resolveConflict(name, how).catch(() => setWorking(false));
  };

  return (
    <div
      role="alert"
      style={{
        flex: 'none',
        margin: '10px 14px 0',
        padding: '11px 13px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 9,
        border: '1px solid var(--danger)',
        background: 'var(--danger-bg)',
        borderRadius: 8,
      }}
    >
      <span style={{ flex: 1, minWidth: 220, fontSize: 12.5, lineHeight: 1.5, color: 'var(--danger)' }}>
        This file changed here <em>and</em> on GitHub since they were last in step. Choose which copy
        to keep — nothing is overwritten until you do.
      </span>
      <Choice onClick={choose('keep-both')} disabled={working} primary title={`Pulls the GitHub copy in as "${keepBothName(name)}" and leaves this one untouched`}>
        Keep both
      </Choice>
      <Choice onClick={choose('keep-mine')} disabled={working} title="Pushes this copy over the one on GitHub. The GitHub version stays in its edit history there.">
        Keep mine
      </Choice>
      <Choice onClick={choose('take-remote')} disabled={working} danger title="Replaces this copy with the one from GitHub. Your local edits are discarded.">
        Take GitHub's
      </Choice>
    </div>
  );
}

function Choice({
  children,
  onClick,
  disabled,
  primary = false,
  danger = false,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled: boolean;
  primary?: boolean;
  danger?: boolean;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        flex: 'none',
        height: 26,
        padding: '0 11px',
        border: `1px solid ${primary ? 'var(--link)' : danger ? 'var(--danger)' : 'var(--border)'}`,
        borderRadius: 7,
        background: primary ? 'var(--link)' : 'transparent',
        color: primary ? '#fff' : danger ? 'var(--danger)' : 'var(--fg)',
        fontSize: 11.5,
        fontWeight: 600,
        fontFamily: 'var(--font-ui)',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {children}
    </button>
  );
}
