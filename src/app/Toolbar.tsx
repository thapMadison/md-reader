import { EditIcon, HamburgerIcon, SidebarToggleIcon } from '@/components/ui/icons';
import { SaveButton } from '@/features/sync/SaveButton';
import { OverflowMenu } from './OverflowMenu';
import {
  DATABEND_LOGO,
  DATABEND_WORDMARK,
  FIGUREGROUND_LOGO_TAB,
  FIGUREGROUND_TOOLBAR,
  NOTCHED_TOOLBAR,
  ToolbarPatternLayer,
  effectivePattern,
  unprintedPanelStyle,
} from './chromePattern';
import { useChromePattern } from '@/features/theming/ThemeContext';
import type { LayoutMode } from '@/hooks/useBreakpoint';

interface ToolbarProps {
  mode: LayoutMode;
  activeFileName: string | null;
  dirty: boolean;
  showSnapshotPill: boolean;
  snapshotLabel: string;
  snapshotDenied: boolean;
  editing: boolean;
  themeName: string;
  /** The active theme's four sample colors, for the ⋯ panel's theme row. */
  themeDots: string[];
  sidebarOpen: boolean;
  onToggleDrawer: () => void;
  onToggleEdit: () => void;
  /** Opens the theme popover under the element that requested it. */
  onOpenThemes: (anchor: HTMLElement) => void;
  onToggleSidebar: () => void;
}

export function Toolbar({
  mode,
  activeFileName,
  dirty,
  showSnapshotPill,
  snapshotLabel,
  snapshotDenied,
  editing,
  themeName,
  themeDots,
  onToggleDrawer,
  onToggleEdit,
  onOpenThemes,
  onToggleSidebar,
}: ToolbarProps) {
  const isMobile = mode === 'mobile';
  const chromePattern = useChromePattern();
  // The mobile gate is applied once, here, and every branch below reads the
  // result — so a structural motif cannot be switched off for the overlay and
  // left on for the styling it also drives.
  const pattern = effectivePattern(chromePattern.pattern, mode);

  return (
    <header
      style={{
        flex: '0 0 48px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: `0 10px 0 ${isMobile ? '8px' : '14px'}`,
        gap: 8,
        // Fill here, pattern over it as layers below — see chromePattern.tsx. A
        // theme that names no --chrome-pattern renders nothing and is unchanged.
        // Longhand rather than the `background` shorthand, which jsdom discards
        // when it carries a var().
        backgroundColor: 'var(--chrome)',
        overflow: 'hidden',
        color: 'var(--chrome-fg)',
        borderBottom: '1px solid var(--chrome-border)',
        position: 'relative',
        zIndex: 30,
        transition: 'background .25s',
        // Three motifs restyle the bar itself rather than drawing over it, so
        // they override the base above instead of arriving as a layer.
        ...(pattern === 'unprinted' ? unprintedPanelStyle(chromePattern.ink, 'bottom') : null),
        ...(pattern === 'figureground' ? FIGUREGROUND_TOOLBAR : null),
        // The notch is cut out of the bar's own silhouette, which means it also
        // cuts the overflow:hidden box above — the pattern layers stay inside it
        // either way, since they are children of this element.
        ...(pattern === 'notched' ? NOTCHED_TOOLBAR : null),
      }}
    >
      {/* The pattern, behind every control — see the Sidebar for the rationale. */}
      <ToolbarPatternLayer {...chromePattern} mode={mode} />
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          minWidth: 0,
          // figureground shrinks the chrome color into this cluster: the logo
          // and filename ride a sheared dark tab while the rest of the bar takes
          // the page background.
          ...(pattern === 'figureground' ? FIGUREGROUND_LOGO_TAB : null),
          position: 'relative',
        }}
      >
        {isMobile && (
          <button
            onClick={onToggleDrawer}
            title="Files"
            data-chrome-btn=""
            style={{
              flex: 'none',
              width: 30,
              height: 30,
              border: '1px solid var(--chrome-border)',
              borderRadius: 7,
              background: 'transparent',
              color: 'var(--chrome-fg)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <HamburgerIcon />
          </button>
        )}
        <div
          style={{
            flex: 'none',
            width: 22,
            height: 22,
            borderRadius: 6,
            background: 'var(--chrome-fg)',
            color: 'var(--chrome)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            fontWeight: 700,
            fontFamily: 'var(--font-mono)',
            letterSpacing: '-0.5px',
            ...(pattern === 'databend' ? DATABEND_LOGO : null),
            ...(pattern === 'unprinted'
              ? { background: 'transparent', color: 'var(--link)', border: '1.2px dashed var(--link)' }
              : null),
          }}
        >
          M↓
        </div>
        {!isMobile && (
          <span
            style={{
              flex: 'none',
              fontSize: 13.5,
              fontWeight: 600,
              letterSpacing: '-0.1px',
              // The glitch reaches the wordmark as a shadow only: the glyphs
              // stay put and stay readable, and the red/cyan ghosts sit behind
              // them. Decoration on real text has to work this way round.
              ...(pattern === 'databend' ? DATABEND_WORDMARK : null),
            }}
          >
            MDReader
          </span>
        )}
        <span
          style={{
            fontSize: 11.5,
            color: 'var(--chrome-muted)',
            fontFamily: 'var(--font-mono)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {activeFileName ?? ''}
        </span>
        <span
          style={{
            flex: 'none',
            fontSize: 10.5,
            fontWeight: 600,
            color: 'var(--chrome-fg)',
            border: '1px solid var(--chrome-fg)',
            borderRadius: 99,
            padding: '1px 7px',
            opacity: dirty ? 1 : 0,
            transition: 'opacity .2s',
          }}
        >
          edited
        </span>
        {showSnapshotPill && (
          <span
            title="Snapshot — not tracked on disk"
            style={{
              flex: 'none',
              fontSize: 10.5,
              fontWeight: 600,
              color: snapshotDenied ? 'var(--danger)' : 'var(--chrome-muted)',
              border: `1px solid ${snapshotDenied ? 'var(--danger)' : 'var(--chrome-border)'}`,
              background: snapshotDenied ? 'var(--danger-bg)' : 'transparent',
              borderRadius: 99,
              padding: '1px 7px',
            }}
          >
            {snapshotLabel}
          </span>
        )}
        {/* Sync sits here, with the name of the file it acts on. It pushes the
            active document and nothing else, which is a claim the right-hand
            cluster could not make for it — over there, among Edit and the theme
            and the sidebar toggle, it read as "sync everything". */}
        {activeFileName && <SaveButton compact={isMobile} />}
      </div>
      {/* Three controls, down from five. What is left is what gets used while
          reading — Edit and the sidebar toggle — plus one ⋯ for the settings
          that are glanced at and rarely changed. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 'none' }}>
        <button
          onClick={onToggleEdit}
          title="Toggle editor (⌘E)"
          // Ghost only. Filled with --link the button already reads as pressed,
          // and the hover wash in index.css would fade it back towards the bar.
          {...(editing ? null : { 'data-chrome-btn': '' })}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            height: 30,
            padding: isMobile ? '0 8px' : '0 11px',
            border: `1px solid ${editing ? 'var(--link)' : 'var(--chrome-border)'}`,
            borderRadius: 7,
            background: editing ? 'var(--link)' : 'transparent',
            color: editing ? '#fff' : 'var(--chrome-fg)',
            fontSize: 12.5,
            fontWeight: 600,
            fontFamily: 'var(--font-ui)',
            cursor: 'pointer',
          }}
        >
          <EditIcon />
          {!isMobile && <span>{editing ? 'Editing' : 'Edit'}</span>}
        </button>
        <OverflowMenu
          themeName={themeName}
          themeDots={themeDots}
          onOpenThemes={onOpenThemes}
          showLabel={!isMobile}
        />
        {!isMobile && (
          <button
            onClick={onToggleSidebar}
            title="Toggle sidebar (⌘\)"
            data-chrome-btn=""
            style={{
              width: 30,
              height: 30,
              border: '1px solid var(--chrome-border)',
              borderRadius: 7,
              background: 'transparent',
              color: 'var(--chrome-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SidebarToggleIcon />
          </button>
        )}
      </div>
    </header>
  );
}
