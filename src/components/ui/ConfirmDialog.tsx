import { useEffect, useRef } from 'react';

/**
 * One consequence of going ahead. `severe` marks the ones that destroy
 * something the user cannot get back by repeating the action — those get the
 * danger colour and a filled marker.
 */
export interface Consequence {
  text: string;
  severe?: boolean;
}

interface ConfirmDialogProps {
  title: string;
  /**
   * Body copy. Say what will be destroyed and whether it can be undone.
   *
   * A plain string renders as one paragraph. An array renders as a list, one
   * consequence per line — which is the point: run three of them together and
   * they read at one weight, so the sentence about permanent deletion lands with
   * the same force as the one about closing a tab, and gets skimmed past. The
   * list makes each one a separate thing the eye has to stop on, and lets the
   * severe ones be coloured.
   */
  message: string | Consequence[];
  confirmLabel: string;
  cancelLabel?: string;
  /** Styles the confirm button as destructive. */
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// A modal confirmation for actions that cannot be undone.
//
// Deliberately not window.confirm(): that blocks the main thread, cannot be
// themed (so it ignores the token system entirely), and renders inconsistently
// across browsers. This also keeps the destructive-action pattern reusable
// rather than reimplemented per call site.
export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Focus lands on Cancel, not Confirm: for a destructive dialog the safe option
  // should be the one a stray Enter or Space activates.
  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
        return;
      }
      // Trap Tab inside the dialog so focus cannot reach the UI being acted on.
      if (e.key !== 'Tab') return;
      const focusables = dialogRef.current?.querySelectorAll<HTMLElement>('button');
      if (!focusables || focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onCancel]);

  const buttonBase: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 600,
    fontFamily: 'inherit',
    borderRadius: 6,
    padding: '6px 12px',
    cursor: 'pointer',
  };

  return (
    <>
      <div
        onClick={onCancel}
        style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(31,35,40,0.45)', animation: 'fadeIn .12s' }}
      />
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 91,
          width: 'min(340px, calc(100vw - 32px))',
          background: 'var(--bg)',
          color: 'var(--fg)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          boxShadow: '0 12px 32px rgba(0,0,0,0.22)',
          padding: '16px 18px 14px',
        }}
      >
        <h2 id="confirm-title" style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 700 }}>
          {title}
        </h2>
        {typeof message === 'string' ? (
          <p id="confirm-message" style={{ margin: '0 0 14px', fontSize: 12.5, lineHeight: 1.5, color: 'var(--muted)' }}>
            {message}
          </p>
        ) : (
          <ul
            id="confirm-message"
            // `aria-describedby` points here, and a screen reader reads the whole
            // subtree — so the list is announced in full, in order, exactly as the
            // paragraph was. Nothing decorative is a text node, so the markers
            // below cannot leak into that announcement.
            style={{ margin: '0 0 14px', padding: 0, listStyle: 'none', display: 'grid', gap: 6 }}
          >
            {message.map((c) => (
              <li
                key={c.text}
                style={{
                  fontSize: 12.5,
                  lineHeight: 1.45,
                  color: c.severe ? 'var(--danger)' : 'var(--muted)',
                  // Hanging indent: the marker sits in its own column so wrapped
                  // lines align under the text rather than under the dot.
                  display: 'grid',
                  gridTemplateColumns: '10px 1fr',
                  gap: 7,
                  alignItems: 'baseline',
                  ...(c.severe
                    ? {
                        fontWeight: 600,
                        background: 'var(--danger-bg)',
                        borderRadius: 5,
                        padding: '5px 7px',
                        // Pulled back by the padding so the marker column still
                        // lines up with the unhighlighted rows above and below.
                        margin: '0 -7px',
                      }
                    : {}),
                }}
              >
                {/* Drawn, not written. A text-node bullet would join the item's
                    textContent and be announced as part of the sentence. */}
                <span
                  aria-hidden="true"
                  data-marker={c.severe ? 'severe' : 'plain'}
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    // Filled for severe, hollow for the rest, so the two are
                    // distinguishable without relying on colour alone.
                    background: c.severe ? 'currentColor' : 'transparent',
                    border: c.severe ? 'none' : '1px solid currentColor',
                    opacity: c.severe ? 1 : 0.5,
                    // Nudged up onto the text's optical centre; baseline
                    // alignment would otherwise sit it on the line itself.
                    transform: 'translateY(-1px)',
                    justifySelf: 'center',
                  }}
                />
                <span>{c.text}</span>
              </li>
            ))}
          </ul>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            style={{
              ...buttonBase,
              color: 'var(--fg)',
              background: 'transparent',
              border: '1px solid var(--border)',
            }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              ...buttonBase,
              color: '#fff',
              background: danger ? 'var(--danger)' : 'var(--link)',
              border: `1px solid ${danger ? 'var(--danger)' : 'var(--link)'}`,
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </>
  );
}
