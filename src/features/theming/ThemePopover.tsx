import { useEffect, useRef } from 'react';
import type { Theme } from '@/themes/types';
import { useAnchoredPosition } from '@/components/ui/useAnchoredPosition';
import { useTheme } from './ThemeContext';

interface ThemePopoverProps {
  /**
   * The control this popover hangs from — the toolbar's ⋯ button, or whatever
   * opened it. Measured rather than guessed at: the offsets this used to carry
   * described one particular arrangement of toolbar buttons and stopped being
   * true the moment that arrangement changed.
   */
  anchor: HTMLElement | null;
  onClose: () => void;
}

function dotsFor(theme: Theme): string[] {
  return [theme.tokens['--bg'], theme.tokens['--fg'], theme.tokens['--link'], theme.tokens['--code-bg']];
}

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ThemePopover({ anchor, onClose }: ThemePopoverProps) {
  const {
    themes,
    customThemes,
    activeThemeId,
    activeTheme,
    setThemeId,
    importErrors,
    importTheme,
    reportImportError,
    clearImportErrors,
    removeCustomTheme,
    exportTheme,
  } = useTheme();
  const themeInputRef = useRef<HTMLInputElement>(null);
  const pos = useAnchoredPosition(anchor, true);

  // Escape closes, matching the ⋯ menu and the sidebar's row menus.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleThemePicked: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      let obj: unknown;
      try {
        obj = JSON.parse(String(reader.result ?? ''));
      } catch (err) {
        reportImportError(`invalid JSON: ${err instanceof Error ? err.message : String(err)}`);
        return;
      }
      importTheme(obj);
    };
    reader.readAsText(file);
  };

  const handleExport = () => {
    const data = exportTheme(activeTheme);
    downloadJson(`${activeTheme.id}.json`, data);
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 39 }} />
      <div
        style={{
          position: 'fixed',
          top: pos?.top ?? 0,
          right: pos?.right ?? 8,
          zIndex: 40,
          width: 268,
          // Whatever room is actually below the trigger, capped at the height
          // this panel wants. The old flat 460 could run off a short viewport.
          maxHeight: Math.min(460, pos?.maxHeight ?? 460),
          // Hidden until measured, so it cannot paint one frame at the wrong
          // place and jump.
          visibility: pos ? 'visible' : 'hidden',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          boxShadow: '0 8px 24px rgba(31,35,40,0.12)',
          animation: 'popIn .14s ease-out',
        }}
      >
        {/* Flexes instead of carrying its own cap: the panel above now sizes to
            the room under the trigger, and a fixed 300 here would either waste
            that room or overflow it. The footer and any error block are
            `flex: none`, so this is what gives. */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 6 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--muted)',
              textTransform: 'uppercase',
              letterSpacing: '.06em',
              padding: '7px 10px 5px',
            }}
          >
            Built-in
          </div>
          {themes.map((t) => {
            const active = t.id === activeThemeId;
            return (
              <button
                key={t.id}
                onClick={() => setThemeId(t.id)}
                style={{
                  display: 'flex',
                  width: '100%',
                  alignItems: 'center',
                  gap: 10,
                  padding: '9px 10px',
                  border: 'none',
                  borderRadius: 7,
                  background: active ? 'var(--hl)' : 'transparent',
                  color: 'var(--fg)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'var(--font-ui)',
                }}
              >
                <div style={{ display: 'flex', gap: 3, flex: 'none' }}>
                  {dotsFor(t).map((d, i) => (
                    <span
                      key={i}
                      style={{
                        width: 11,
                        height: 11,
                        borderRadius: '50%',
                        background: d,
                        border: '1px solid var(--border)',
                        display: 'inline-block',
                      }}
                    />
                  ))}
                </div>
                <div style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {t.name}
                </div>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: 'var(--muted)',
                    border: '1px solid var(--border)',
                    borderRadius: 99,
                    padding: '1.5px 7px',
                    flex: 'none',
                  }}
                >
                  {t.badge}
                </span>
                <span style={{ width: 14, flex: 'none', color: 'var(--link)', fontSize: 12, fontWeight: 700 }}>{active ? '✓' : ''}</span>
              </button>
            );
          })}

          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--muted)',
              textTransform: 'uppercase',
              letterSpacing: '.06em',
              padding: '12px 10px 5px',
            }}
          >
            My themes
          </div>
          {customThemes.map((t) => {
            const active = t.id === activeThemeId;
            return (
              <div
                key={t.id}
                style={{
                  display: 'flex',
                  width: '100%',
                  alignItems: 'center',
                  gap: 10,
                  padding: '9px 10px',
                  borderRadius: 7,
                  background: active ? 'var(--hl)' : 'transparent',
                }}
              >
                <div
                  onClick={() => setThemeId(t.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', gap: 3, flex: 'none' }}>
                    {dotsFor(t).map((d, i) => (
                      <span
                        key={i}
                        style={{
                          width: 11,
                          height: 11,
                          borderRadius: '50%',
                          background: d,
                          border: '1px solid var(--border)',
                          display: 'inline-block',
                        }}
                      />
                    ))}
                  </div>
                  <div style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.name}
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: 'var(--muted)',
                      border: '1px solid var(--border)',
                      borderRadius: 99,
                      padding: '1.5px 7px',
                      flex: 'none',
                    }}
                  >
                    {t.badge}
                  </span>
                  <span style={{ width: 14, flex: 'none', color: 'var(--link)', fontSize: 12, fontWeight: 700 }}>{active ? '✓' : ''}</span>
                </div>
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    removeCustomTheme(t.id);
                  }}
                  title="Delete theme"
                  style={{
                    flex: 'none',
                    width: 18,
                    height: 18,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 5,
                    color: 'var(--muted)',
                    opacity: 0.35,
                    fontSize: 14,
                    lineHeight: 1,
                    cursor: 'pointer',
                  }}
                >
                  ×
                </span>
              </div>
            );
          })}
          {customThemes.length === 0 && (
            <div style={{ fontSize: 12, color: 'var(--muted)', padding: '6px 10px 10px', lineHeight: 1.5 }}>
              No custom themes yet — import a <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>.json</span> theme to see it
              here.
            </div>
          )}
        </div>

        {importErrors.length > 0 && (
          <div
            style={{
              flex: 'none',
              margin: '0 6px 6px',
              padding: '9px 11px',
              border: '1px solid var(--danger)',
              background: 'var(--danger-bg)',
              borderRadius: 8,
              maxHeight: 120,
              overflowY: 'auto',
            }}
          >
            <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--danger)', marginBottom: 5 }}>
              {importErrors.length} {importErrors.length === 1 ? 'problem' : 'problems'} in this theme file
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {importErrors.map((e, i) => (
                <div key={i} style={{ fontSize: 11, fontFamily: 'var(--font-mono)', lineHeight: 1.5, color: 'var(--danger)' }}>
                  {e}
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ flex: 'none', display: 'flex', gap: 6, padding: 6, borderTop: '1px solid var(--border)' }}>
          <button
            onClick={() => {
              clearImportErrors();
              themeInputRef.current?.click();
            }}
            style={{
              flex: 1,
              height: 28,
              border: '1px solid var(--border)',
              borderRadius: 7,
              background: 'var(--bg)',
              color: 'var(--fg)',
              fontSize: 12,
              fontWeight: 600,
              fontFamily: 'var(--font-ui)',
              cursor: 'pointer',
            }}
          >
            Import theme…
          </button>
          <button
            onClick={handleExport}
            style={{
              flex: 1,
              height: 28,
              border: '1px solid var(--border)',
              borderRadius: 7,
              background: 'var(--bg)',
              color: 'var(--muted)',
              fontSize: 12,
              fontWeight: 600,
              fontFamily: 'var(--font-ui)',
              cursor: 'pointer',
            }}
          >
            Export current
          </button>
        </div>
      </div>
      <input type="file" accept=".json" ref={themeInputRef} onChange={handleThemePicked} style={{ display: 'none' }} />
    </>
  );
}
