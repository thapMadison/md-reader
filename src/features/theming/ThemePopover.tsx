import { useEffect, useMemo, useRef, useState } from 'react';
import type { Theme, ThemeMode } from '@/themes/types';
import { useAnchoredPosition } from '@/components/ui/useAnchoredPosition';
import { CheckIcon, MoonIcon, SearchIcon, SunIcon, TrashIcon } from '@/components/ui/icons';
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

type ModeFilter = 'all' | ThemeMode;

const MODE_FILTERS: { id: ModeFilter; label: string; icon: React.ReactNode | null }[] = [
  { id: 'all', label: 'All', icon: null },
  { id: 'light', label: 'Light', icon: <SunIcon /> },
  { id: 'dark', label: 'Dark', icon: <MoonIcon /> },
];

/**
 * A theme at postage-stamp size: page ground, a line of body text, a line in the
 * link color, a fenced block. Four color dots used to stand here, and they were
 * unreadable — four circles say nothing about which surface each color lands on,
 * and at a glance every dark theme's row looked like every other one's. Drawing
 * the tokens in their actual relationship (text over ground, code inset in it) is
 * the same four values doing an order of magnitude more work.
 */
function ThemeSwatch({ theme }: { theme: Theme }) {
  const t = theme.tokens;
  return (
    <div
      aria-hidden
      style={{
        flex: 'none',
        width: 36,
        height: 26,
        borderRadius: 6,
        background: t['--bg'],
        border: '1px solid var(--border)',
        padding: '4px 5px',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        overflow: 'hidden',
      }}
    >
      <span style={{ height: 3, width: '72%', borderRadius: 2, background: t['--fg'] }} />
      <span style={{ height: 3, width: '46%', borderRadius: 2, background: t['--link'] }} />
      <span style={{ height: 5, width: '100%', borderRadius: 2, background: t['--code-bg'], border: `1px solid ${t['--border']}` }} />
    </div>
  );
}

function SectionLabel({ children, count }: { children: React.ReactNode; count: number }) {
  return (
    <div
      style={{
        // Sticky so the group a row belongs to stays named while the list
        // scrolls — with five Phycat siblings in a row, "which section am I in"
        // stops being obvious from the names alone.
        //
        // Full-bleed, and the list gives up its top padding to make that work.
        // A scroll container's scrollport is its *padding* box, so `top: 0`
        // parks the label 6px below where the content starts scrolling and
        // leaves a strip of moving row visible above it. Negative margins undo
        // the side padding for the same reason: the background has to reach both
        // panel edges or rows slide past in the gutters.
        position: 'sticky',
        top: 0,
        zIndex: 1,
        background: 'var(--bg)',
        margin: '0 -6px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: 11,
        fontWeight: 600,
        color: 'var(--muted)',
        textTransform: 'uppercase',
        letterSpacing: '.06em',
        padding: '10px 16px 6px',
      }}
    >
      <span>{children}</span>
      <span style={{ letterSpacing: 0, opacity: 0.75 }}>{count}</span>
      {/* The label's own trailing edge. Without it a row passing underneath is
          sliced off mid-glyph at a hard line; the fade reads as the row going
          under the header rather than being cut by it. */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: -8,
          height: 8,
          background: 'linear-gradient(var(--bg), rgba(0, 0, 0, 0))',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}

interface ThemeRowProps {
  theme: Theme;
  active: boolean;
  /** Sitting under the keyboard cursor — a preview of what Enter would apply. */
  cursored: boolean;
  index: number;
  onPick: () => void;
  onDelete?: () => void;
}

function ThemeRow({ theme, active, cursored, index, onPick, onDelete }: ThemeRowProps) {
  return (
    <div
      data-menu-row
      data-row={index}
      style={{
        display: 'flex',
        alignItems: 'center',
        borderRadius: 8,
        background: active ? 'var(--hl)' : 'transparent',
        // Two inset rings, either of which may be absent: the accent bar marks
        // the applied theme, the outline marks the keyboard cursor. They stack
        // rather than compete, because the two states are independent — you can
        // be arrowing past the theme you already have on.
        boxShadow: [active ? 'inset 3px 0 0 var(--link)' : '', cursored ? 'inset 0 0 0 1.5px var(--link)' : '']
          .filter(Boolean)
          .join(', '),
      }}
    >
      <button
        onClick={onPick}
        aria-current={active || undefined}
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '7px 10px',
          border: 'none',
          borderRadius: 8,
          background: 'transparent',
          color: 'var(--fg)',
          cursor: 'pointer',
          textAlign: 'left',
          fontFamily: 'var(--font-ui)',
        }}
      >
        <ThemeSwatch theme={theme} />
        <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {theme.name}
        </span>
        <span style={{ flex: 'none', width: 12, height: 10, color: 'var(--link)' }}>{active && <CheckIcon />}</span>
      </button>
      {onDelete && (
        <button
          data-row-delete
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title={`Delete ${theme.name}`}
          aria-label={`Delete ${theme.name}`}
          style={{
            flex: 'none',
            width: 24,
            height: 24,
            marginRight: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            borderRadius: 6,
            background: 'transparent',
            color: 'var(--muted)',
            opacity: 0.5,
            cursor: 'pointer',
          }}
        >
          <TrashIcon />
        </button>
      )}
    </div>
  );
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
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const pos = useAnchoredPosition(anchor, true);

  const [query, setQuery] = useState('');
  const [modeFilter, setModeFilter] = useState<ModeFilter>('all');
  // -1 means "no keyboard cursor yet" — the list opens with nothing highlighted
  // but the applied theme, and the first arrow press starts from there.
  const [cursor, setCursor] = useState(-1);

  const { builtin, custom, flat } = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const match = (t: Theme) =>
      (modeFilter === 'all' || t.mode === modeFilter) && (needle === '' || t.name.toLowerCase().includes(needle));
    const b = themes.filter(match);
    const c = customThemes.filter(match);
    return { builtin: b, custom: c, flat: [...b, ...c] };
  }, [themes, customThemes, query, modeFilter]);

  // The search field takes focus on open: the popover is reachable by ⌘K, and a
  // picker that answers a keystroke should be ready for the next one.
  //
  // Keyed on `measured` rather than on mount. The panel renders
  // `visibility: hidden` until `useAnchoredPosition` has measured the trigger,
  // and a hidden element cannot take focus — a mount-time `focus()` here landed
  // on nothing at all and left the document focused on `<body>`.
  const measured = pos !== null;
  useEffect(() => {
    if (measured) searchRef.current?.focus();
  }, [measured]);

  const moveCursor = (delta: number) => {
    if (flat.length === 0) return;
    const from = cursor >= 0 ? cursor : flat.findIndex((t) => t.id === activeThemeId);
    const next = from < 0 ? (delta > 0 ? 0 : flat.length - 1) : (from + delta + flat.length) % flat.length;
    setCursor(next);
    listRef.current?.querySelector<HTMLElement>(`[data-row="${next}"]`)?.scrollIntoView({ block: 'nearest' });
  };

  // Escape closes, matching the ⋯ menu and the sidebar's row menus; the arrows
  // and Enter drive the list.
  //
  // On the window rather than as an `onKeyDown` on the panel, because the panel
  // is not guaranteed to hold focus: React attaches its listeners at the root
  // container, so a keystroke that reaches `<body>` — which is what happens for
  // the moment between opening and the search field being focusable — never
  // reaches a handler mounted inside it. The popover owns the keyboard while it
  // is open either way, so listening globally is also the honest description.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        moveCursor(1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        moveCursor(-1);
      } else if (e.key === 'Enter' && cursor >= 0 && flat[cursor]) {
        // Unless a button has focus — then Enter belongs to that button, not to
        // whatever row the cursor was last left on.
        if (document.activeElement instanceof HTMLButtonElement) return;
        e.preventDefault();
        setThemeId(flat[cursor].id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose, cursor, flat, activeThemeId, setThemeId]);

  // Both filters reset the cursor: index 4 of the old list is a different theme
  // in the new one, and a cursor left pointing at it would move under the user.
  const onQueryChange = (v: string) => {
    setQuery(v);
    setCursor(-1);
  };
  const onModeChange = (m: ModeFilter) => {
    setModeFilter(m);
    setCursor(-1);
  };

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

  const footerButton: React.CSSProperties = {
    flex: 1,
    height: 30,
    border: '1px solid var(--border)',
    borderRadius: 8,
    background: 'var(--bg)',
    color: 'var(--fg)',
    fontSize: 12,
    fontWeight: 600,
    fontFamily: 'var(--font-ui)',
    cursor: 'pointer',
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 39 }} />
      <div
        role="dialog"
        aria-label="Themes"
        style={{
          position: 'fixed',
          top: pos?.top ?? 0,
          right: pos?.right ?? 8,
          zIndex: 40,
          // Wide enough for the longest built-in name at 13px semibold. The old
          // 268 spent its width on a badge column that only ever repeated what
          // `mode` already said, and truncated the names to pay for it.
          width: 320,
          // Whatever room is actually below the trigger, capped at the height
          // this panel wants. The old flat 460 could run off a short viewport.
          maxHeight: Math.min(540, pos?.maxHeight ?? 540),
          // Hidden until measured, so it cannot paint one frame at the wrong
          // place and jump.
          visibility: pos ? 'visible' : 'hidden',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          boxShadow: '0 12px 32px var(--edge-shadow)',
          animation: 'popIn .14s ease-out',
        }}
      >
        <div style={{ flex: 'none', padding: 8, borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 7 }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <span style={{ position: 'absolute', left: 9, color: 'var(--muted)', display: 'flex', pointerEvents: 'none' }}>
              <SearchIcon />
            </span>
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Search themes…"
              aria-label="Search themes"
              style={{
                width: '100%',
                height: 32,
                padding: '0 10px 0 28px',
                border: '1px solid var(--border)',
                borderRadius: 8,
                background: 'transparent',
                color: 'var(--fg)',
                fontSize: 13,
                fontFamily: 'var(--font-ui)',
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: 4, border: '1px solid var(--border)', borderRadius: 8, padding: 2 }}>
            {MODE_FILTERS.map((f) => {
              const on = modeFilter === f.id;
              return (
                <button
                  key={f.id}
                  data-menu-row={on ? undefined : ''}
                  onClick={() => onModeChange(f.id)}
                  aria-pressed={on}
                  style={{
                    flex: 1,
                    height: 26,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 5,
                    border: 'none',
                    borderRadius: 6,
                    background: on ? 'var(--hl)' : 'transparent',
                    // The ring, not the wash, is what says "selected": hover
                    // paints the same --hl on the other two, and a state that
                    // hover can imitate is not a state.
                    boxShadow: on ? 'inset 0 0 0 1px var(--link)' : undefined,
                    color: on ? 'var(--fg)' : 'var(--muted)',
                    fontSize: 12,
                    fontWeight: 600,
                    fontFamily: 'var(--font-ui)',
                    cursor: 'pointer',
                  }}
                >
                  {f.icon}
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Flexes instead of carrying its own cap: the panel above now sizes to
            the room under the trigger, and a fixed 300 here would either waste
            that room or overflow it. The header, footer and any error block are
            `flex: none`, so this is what gives. */}
        {/* No padding-top: the sticky section labels above supply their own, and
            any here would be a band the rows scroll through in the open. */}
        <div ref={listRef} style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 6px 6px' }}>
          {flat.length === 0 && (
            <div style={{ fontSize: 12.5, color: 'var(--muted)', padding: '18px 10px', textAlign: 'center', lineHeight: 1.6 }}>
              No theme matches that.
              <br />
              <button
                onClick={() => {
                  onQueryChange('');
                  onModeChange('all');
                }}
                style={{
                  marginTop: 8,
                  border: '1px solid var(--border)',
                  borderRadius: 7,
                  background: 'transparent',
                  color: 'var(--fg)',
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: 'var(--font-ui)',
                  padding: '5px 12px',
                  cursor: 'pointer',
                }}
              >
                Clear filters
              </button>
            </div>
          )}

          {builtin.length > 0 && <SectionLabel count={builtin.length}>Built-in</SectionLabel>}
          {builtin.map((t, i) => (
            <ThemeRow
              key={t.id}
              theme={t}
              index={i}
              active={t.id === activeThemeId}
              cursored={cursor === i}
              onPick={() => setThemeId(t.id)}
            />
          ))}

          {(custom.length > 0 || (customThemes.length === 0 && query === '' && modeFilter === 'all')) && (
            <SectionLabel count={custom.length}>My themes</SectionLabel>
          )}
          {custom.map((t, i) => (
            <ThemeRow
              key={t.id}
              theme={t}
              index={builtin.length + i}
              active={t.id === activeThemeId}
              cursored={cursor === builtin.length + i}
              onPick={() => setThemeId(t.id)}
              onDelete={() => removeCustomTheme(t.id)}
            />
          ))}
          {customThemes.length === 0 && query === '' && modeFilter === 'all' && (
            <div style={{ fontSize: 12, color: 'var(--muted)', padding: '4px 10px 10px', lineHeight: 1.5 }}>
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

        <div style={{ flex: 'none', display: 'flex', gap: 6, padding: 8, borderTop: '1px solid var(--border)' }}>
          <button
            onClick={() => {
              clearImportErrors();
              themeInputRef.current?.click();
            }}
            style={footerButton}
          >
            Import theme…
          </button>
          <button onClick={handleExport} style={{ ...footerButton, color: 'var(--muted)' }}>
            Export current
          </button>
        </div>
      </div>
      <input type="file" accept=".json" ref={themeInputRef} onChange={handleThemePicked} style={{ display: 'none' }} />
    </>
  );
}
