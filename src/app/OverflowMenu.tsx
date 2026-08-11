import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDownIcon } from '@/components/ui/icons';
import { useAnchoredPosition } from '@/components/ui/useAnchoredPosition';
import { AccountButton, GitHubIcon } from '@/features/sync/AccountButton';
import { useOptionalGistAuth } from '@/services/gist/GistContext';

interface OverflowMenuProps {
  themeName: string;
  /** The active theme's four sample colors, as the theme picker shows them. */
  themeDots: string[];
  /** Opens the theme popover, anchored to this menu's own trigger. */
  onOpenThemes: (anchor: HTMLElement) => void;
  /**
   * Whether the trigger carries a word next to its icon — the account's login
   * once signed in, "Settings" otherwise. False on mobile, where the header is
   * already down to its three tightest controls and neither has a width
   * budget of its own — the icon alone still carries the fact, just not in
   * words.
   */
  showLabel?: boolean;
}

/**
 * The toolbar's app-level settings, behind one button.
 *
 * What went in is what the header had too many of: controls that report a
 * setting the user changes rarely — which account is connected, which theme is
 * on. What stayed out is what gets used while reading: Edit and the sidebar
 * toggle, plus the per-file sync button, which lives beside the filename it
 * acts on.
 *
 * The trigger is no longer ⋯. Three dots is the most contentless glyph in the
 * toolkit — it says "more of something" and stops there, which is why nobody
 * found the account or the theme behind it. It now shows the thing it holds:
 * your avatar when an account is connected, a gear when none is, and a chevron
 * so it reads as something that opens rather than something that toggles.
 *
 * The panel behind it is a panel, not a two-row list. An account card that
 * names you and says what the connection is for; the theme with a live swatch
 * strip of the palette it will apply, so choosing is a visual act rather than
 * reading a name; and the four keyboard shortcuts, which existed the whole time
 * and were written down nowhere in the interface.
 *
 * The account block is `AccountButton` rather than a re-implementation: it
 * reads its own context, hides itself when the build has no client id, and has
 * its own tests. A second copy of that logic for the menu would be a second
 * thing to keep true.
 */
export function OverflowMenu({
  themeName,
  themeDots,
  onOpenThemes,
  showLabel = true,
}: OverflowMenuProps) {
  const [open, setOpen] = useState(false);
  // State rather than a ref: the measured position depends on this element, so
  // arriving at it has to cause a render. A ref would be populated after the
  // one render that reads it, and the panel would sit at 0,0 until something
  // else happened to re-render it.
  const [trigger, setTrigger] = useState<HTMLButtonElement | null>(null);
  const pos = useAnchoredPosition(trigger, open);
  // Optional: the app can be assembled without the gist providers, and the
  // toolbar has to render its settings button either way.
  const auth = useOptionalGistAuth();
  const avatarUrl = auth?.status === 'signed-in' ? auth.user?.avatarUrl : undefined;
  const login = auth?.status === 'signed-in' ? auth.user?.login : undefined;

  // Escape closes, matching the theme popover and the sidebar's row menus. A
  // panel that can only be dismissed by clicking away strands keyboard users.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
        trigger?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, trigger]);

  const label = login ? `Account and appearance — signed in as ${login}` : 'Account and appearance';

  const shortcuts: [string, string][] = [
    ['Toggle editor', 'E'],
    ['Toggle sidebar', '\\'],
    ['Themes', 'K'],
    [auth?.status === 'signed-in' ? 'Sync this file' : 'Save edits', 'S'],
  ];

  return (
    <>
      <button
        ref={setTrigger}
        // How ⌘K finds something to hang the theme popover from. That shortcut
        // fires from a window listener with no element in hand, and this is
        // where the theme control now lives.
        data-theme-anchor=""
        // Ghost only while closed: open, it holds its own highlight, and the
        // hover rule would wash it back to the same tint on the way past.
        {...(open ? null : { 'data-chrome-btn': '' })}
        onClick={() => setOpen((v) => !v)}
        title={label}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          height: 30,
          padding: '0 6px 0 5px',
          border: `1px solid ${open ? 'var(--chrome-fg)' : 'var(--chrome-border)'}`,
          borderRadius: 8,
          background: open ? 'var(--chrome-hl)' : 'transparent',
          color: 'var(--chrome-fg)',
          cursor: 'pointer',
          flex: 'none',
        }}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            width={20}
            height={20}
            style={{ flex: 'none', borderRadius: '50%', border: '1px solid var(--chrome-border)' }}
          />
        ) : (
          // The gear this used to show read as a stray dot at 15px — nothing
          // said "click me to sign in". GitHub's own mark does: sign-in is the
          // one thing behind this button the user has not done yet, so it is
          // the glyph that most needs to be recognised, not the settings that
          // are here too but are secondary once an account exists.
          <GitHubIcon />
        )}
        {/* The avatar/mark alone reads as decoration, not a control — hence a
            word either way. Signed in, it is the account; signed out, it names
            what the mark otherwise only implies. Truncated rather than let a
            long GitHub login push the sidebar toggle out of the bar — the full
            name is still in the button's title and in the panel this opens. */}
        {showLabel && (
          <span
            style={{
              maxWidth: 96,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontSize: 12.5,
              fontWeight: 600,
              marginRight: 1,
            }}
          >
            {login ?? 'Settings'}
          </span>
        )}
        <ChevronDownIcon />
      </button>
      {/* Portaled to the body, not left where it is written.
       *
       * This panel is `position: fixed` at coordinates useAnchoredPosition measures
       * off the trigger, so it never needed the toolbar as an offset parent — but
       * being *inside* the toolbar was not free. `clip-path` clips an element's whole
       * subtree, fixed descendants included, and it is not escapable from within: a
       * chrome pattern that cuts the bar's silhouette (`notched`) therefore erased
       * this panel entirely — laid out at the right place, painted nowhere, and not
       * hit-testable. The toolbar's own overflow:hidden never did that, which is why
       * this stood up for as long as the silhouette was flat.
       *
       * Moving it out is the fix that keeps holding: any later effect on the bar that
       * establishes a clip or a containing block — transform, filter, contain — would
       * have trapped it the same way. */}
      {open &&
        pos &&
        createPortal(
          <>
            <div
              onClick={() => setOpen(false)}
              style={{ position: 'fixed', inset: 0, zIndex: 39 }}
            />
            <div
              // Not `menu`: this holds a card, a control and a static reference
              // table, and a menu role would promise arrow-key item navigation
              // over content that is not a list of commands.
              role="dialog"
              aria-label="Account and appearance"
              style={{
                position: 'fixed',
                top: pos.top,
                right: pos.right,
                zIndex: 40,
                // Wide enough for the account card's second line to finish its
                // sentence beside the Sign out button, then clamped so a phone
                // does not get a panel wider than its screen.
                width: 'min(300px, calc(100vw - 16px))',
                maxHeight: pos.maxHeight,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                padding: 8,
                background: 'var(--bg)',
                color: 'var(--fg)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                boxShadow: '0 12px 32px rgba(31,35,40,0.16)',
                animation: 'popIn .14s ease-out',
              }}
            >
              {/* Renders nothing when the build cannot sign anyone in, which is
                why the section label below is its sibling rather than its
                wrapper. */}
              <AccountButton menuItem onAfterAction={() => setOpen(false)} />

              <div style={SECTION}>Appearance</div>
              <button
                data-menu-row=""
                onClick={() => {
                  setOpen(false);
                  if (trigger) onOpenThemes(trigger);
                }}
                title={`Theme — ${themeName}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  padding: '8px 9px',
                  border: 'none',
                  borderRadius: 8,
                  background: 'transparent',
                  color: 'var(--fg)',
                  fontFamily: 'var(--font-ui)',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                {/* The palette itself, not a word for it. Four swatches is the
                  same shorthand the theme picker uses, so the row and the list
                  it opens describe a theme the same way. */}
                <span style={{ flex: 'none', display: 'flex', gap: 2.5 }}>
                  {themeDots.map((c, i) => (
                    <span
                      key={i}
                      style={{
                        width: 11,
                        height: 11,
                        borderRadius: '50%',
                        background: c,
                        border: '1px solid var(--border)',
                        display: 'inline-block',
                      }}
                    />
                  ))}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 13, fontWeight: 600 }}>Theme</span>
                  <span
                    style={{
                      display: 'block',
                      fontSize: 11.5,
                      fontWeight: 500,
                      color: 'var(--muted)',
                      marginTop: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {themeName}
                  </span>
                </span>
                <span style={{ flex: 'none', color: 'var(--muted)', fontSize: 13, lineHeight: 1 }}>
                  ›
                </span>
              </button>

              <div style={SECTION}>Shortcuts</div>
              {/* Four bindings that have always worked and were written down
                nowhere a reader would look — layoutState registers them on
                window, and only two ever appeared in a tooltip.

                ⌘S is named for what it does *here*: signed out there is no
                gist to push to and the binding only flushes edits to local
                storage, so calling it "Sync this file" would promise a backup
                that is not happening. */}
              <div
                style={{ display: 'flex', flexDirection: 'column', gap: 1, padding: '0 9px 4px' }}
              >
                {shortcuts.map(([what, key]) => (
                  <div
                    key={what}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, height: 24 }}
                  >
                    <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: 'var(--muted)' }}>
                      {what}
                    </span>
                    <span style={{ flex: 'none', display: 'flex', gap: 3 }}>
                      {[MOD, key].map((k) => (
                        <kbd key={k} style={KBD}>
                          {k}
                        </kbd>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>,
          document.body,
        )}
    </>
  );
}

const SECTION = {
  fontSize: 10.5,
  fontWeight: 700,
  color: 'var(--muted)',
  textTransform: 'uppercase',
  letterSpacing: '.07em',
  padding: '9px 10px 3px',
} as const;

const KBD = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 20,
  height: 19,
  padding: '0 5px',
  border: '1px solid var(--border)',
  borderRadius: 5,
  background: 'var(--code-bg)',
  color: 'var(--fg)',
  fontFamily: 'var(--font-mono)',
  fontSize: 10.5,
  fontWeight: 600,
  lineHeight: 1,
} as const;

/**
 * The modifier as this machine writes it. The app's tooltips say ⌘ everywhere,
 * which is wrong on the platform most of its users are on — a tooltip can get
 * away with that, but a printed shortcut table is the one place the app claims
 * to be telling you exactly which keys to press.
 */
const MOD =
  typeof navigator !== 'undefined' &&
  /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent)
    ? '⌘'
    : 'Ctrl';
