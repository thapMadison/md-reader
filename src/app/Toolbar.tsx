import { ChevronDownIcon, EditIcon, HamburgerIcon, SidebarToggleIcon } from '@/components/ui/icons';
import { TOOLBAR_FACETS, facetLayerStyle } from './chromePlane';
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
  themeDot: string;
  sidebarOpen: boolean;
  onToggleDrawer: () => void;
  onToggleEdit: () => void;
  onTogglePopover: () => void;
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
  themeDot,
  onToggleDrawer,
  onToggleEdit,
  onTogglePopover,
  onToggleSidebar,
}: ToolbarProps) {
  const isMobile = mode === 'mobile';

  return (
    <header
      style={{
        flex: '0 0 48px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: `0 10px 0 ${isMobile ? '8px' : '14px'}`,
        gap: 8,
        // Fill here, planes over it as layers below — see chromePlane.ts. A
        // theme that sets no --chrome-plane paints them transparent and is
        // unchanged. Longhand rather than the `background` shorthand, which
        // jsdom discards when it carries a var().
        backgroundColor: 'var(--chrome)',
        overflow: 'hidden',
        color: 'var(--chrome-fg)',
        borderBottom: '1px solid var(--chrome-border)',
        position: 'relative',
        zIndex: 30,
        transition: 'background .25s',
      }}
    >
      {/* Angled planes, behind every control — see the Sidebar for the rationale. */}
      {TOOLBAR_FACETS.map((facet) => (
        <div key={facet.polygon} data-chrome-facet style={facetLayerStyle(facet)} />
      ))}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        {isMobile && (
          <button
            onClick={onToggleDrawer}
            title="Files"
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
          }}
        >
          M↓
        </div>
        {!isMobile && (
          <span style={{ flex: 'none', fontSize: 13.5, fontWeight: 600, letterSpacing: '-0.1px' }}>MDReader</span>
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
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 'none' }}>
        <button
          onClick={onToggleEdit}
          title="Toggle editor (⌘E)"
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
        <div style={{ width: 1, height: 20, background: 'var(--chrome-border)', margin: '0 1px' }} />
        <button
          onClick={onTogglePopover}
          title="Switch theme (⌘K)"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            height: 30,
            padding: isMobile ? '0 8px' : '0 10px',
            border: '1px solid var(--chrome-border)',
            borderRadius: 7,
            background: 'transparent',
            color: 'var(--chrome-fg)',
            fontSize: 12.5,
            fontFamily: 'var(--font-ui)',
            cursor: 'pointer',
          }}
        >
          <span
            style={{
              flex: 'none',
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: themeDot,
              border: '1px solid var(--chrome-border)',
              display: 'inline-block',
            }}
          />
          {!isMobile && <span>{themeName}</span>}
          {!isMobile && <ChevronDownIcon />}
        </button>
        {!isMobile && (
          <button
            onClick={onToggleSidebar}
            title="Toggle sidebar (⌘\)"
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
