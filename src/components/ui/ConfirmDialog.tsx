import { useEffect, useRef } from 'react';

interface ConfirmDialogProps {
  title: string;
  /** Body copy. Say what will be destroyed and whether it can be undone. */
  message: string;
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
        <p id="confirm-message" style={{ margin: '0 0 14px', fontSize: 12.5, lineHeight: 1.5, color: 'var(--muted)' }}>
          {message}
        </p>
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
