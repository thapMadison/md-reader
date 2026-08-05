import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { useChromeAccentShape, useChromePattern } from '@/features/theming/ThemeContext';
import { ChevronDownIcon, DropHintIcon, FileIcon, PlusIcon } from '@/components/ui/icons';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  DATABEND_ACTIVE_ROW,
  FIGUREGROUND_LIST_OFFSET,
  FIGUREGROUND_SIDEBAR,
  NOTCHED_SIDEBAR,
  NotchClipDefs,
  SidebarPatternLayer,
  UNPRINTED_BUTTON,
  UNPRINTED_TEXT_ROW,
  effectivePattern,
  unprintedPanelStyle,
  unprintedSidebarNote,
} from './chromePattern';
import { INTERNAL_DRAG_TYPE } from './dragTypes';
import type { LayoutMode } from '@/hooks/useBreakpoint';
import type { Folder, LibraryFile } from '@/features/library/types';

interface SidebarProps {
  mode: LayoutMode;
  sidebarOpen: boolean;
  drawerOpen: boolean;
  onToggleDrawer: () => void;
  files: LibraryFile[];
  activeName: string | null;
  isDirty: (name: string) => boolean;
  isUnpersisted: (name: string) => boolean;
  onPickFile: (name: string) => void;
  onCloseFile: (name: string) => void;
  onGrantAccess: (name: string) => void;
  onOpenFileClick: () => void;
  storageUsedBytes: number;
  storageQuotaBytes: number;
  onClearAll: () => void;
  folders: Folder[];
  selectedFolderId: string | null;
  collapsedFolders: string[];
  onSelectFolder: (id: string | null) => void;
  onToggleFolderCollapsed: (id: string) => void;
  onCreateFolder: (name: string) => string;
  onRenameFolder: (id: string, name: string) => void;
  onUngroupFolder: (id: string) => void;
  onDeleteFolderAndFiles: (id: string) => void;
  onMoveFileToFolder: (name: string, folderId: string | null) => void;
}

// Shape of the active-row highlight, driven by --chrome-accent-shape.
//
// A wedge is a bevel applied asymmetrically: the two right-hand corners take a
// deep 45-degree cut while the left stays square, which shears the trailing edge
// into a diagonal. Expressed as corner-shape + a matching per-corner radius,
// because corner-shape reshapes whatever radius each corner already has — the
// radius supplies the depth of the cut, the shape supplies the angle.
//
// 8px, kept deliberately shallow. A row is 48px tall once it carries its
// size/mtime line, so a deep cut on each of the two right corners does not meet
// in the middle — it leaves a flat stretch between two long diagonals, and the
// pair reads as a blunt arrowhead pointing out of the sidebar rather than as a
// sheared edge. Shallow cuts keep most of the trailing edge vertical, which is
// what makes the diagonal read as a shear at all.
//
// The flat variant keeps the original 6px round on all four corners. Both are
// spelled out here rather than toggling a single property, so the fallback is
// honest: a browser without corner-shape renders the wedge theme as a row with
// an 8px round on its right side — a mild asymmetry rather than a broken
// diagonal.
const WEDGE_ROW = { borderRadius: '0 8px 8px 0', cornerShape: 'bevel' } as CSSProperties;
const FLAT_ROW = { borderRadius: 6 } as CSSProperties;

function formatMb(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1);
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${formatMb(bytes)} MB`;
}

// Recent edits are the interesting case — "2 min ago" answers "did my save land?"
// far better than a timestamp the user has to diff against the clock themselves.
function formatWhen(ms: number): string {
  const diff = Date.now() - ms;
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} h ago`;
  const d = new Date(ms);
  const now = new Date();
  return d.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    ...(d.getFullYear() === now.getFullYear() ? {} : { year: 'numeric' }),
  });
}

// Names the specific stakes rather than a generic "are you sure". The two that
// matter are unsaved edits (gone for good — edits live only in memory and are
// never written back to disk) and snapshots (no handle to reopen from, unlike
// live files, which can be reopened from disk afterwards).
function buildClearAllMessage(files: LibraryFile[], isDirty: (name: string) => boolean): string {
  const count = files.length;
  const plural = count === 1 ? 'file' : 'files';
  const snapshots = files.filter((f) => f.kind === 'snapshot').length;
  const dirty = files.filter((f) => isDirty(f.name)).length;

  const parts = [`Removes all ${count} ${plural} from the library and frees the stored space.`];
  if (dirty > 0) {
    parts.push(`${dirty} ${dirty === 1 ? 'file has' : 'files have'} unsaved edits that will be lost.`);
  }
  if (snapshots > 0) {
    parts.push(
      `${snapshots} ${snapshots === 1 ? 'is a snapshot' : 'are snapshots'} that cannot be reopened from disk.`,
    );
  }
  parts.push('This cannot be undone.');
  return parts.join(' ');
}

// Mirrors buildClearAllMessage, scoped to one folder. Same reasoning: name the
// stakes rather than asking "are you sure". Only reached for a non-empty folder
// — deleting an empty one destroys nothing, and asking to confirm a no-loss
// action is how users learn to click through every confirmation.
function buildDeleteFolderMessage(
  folderName: string,
  members: LibraryFile[],
  isDirty: (name: string) => boolean,
): string {
  const count = members.length;
  const plural = count === 1 ? 'file' : 'files';
  const snapshots = members.filter((f) => f.kind === 'snapshot').length;
  const dirty = members.filter((f) => isDirty(f.name)).length;

  const parts = [`Deletes “${folderName}” and closes the ${count} ${plural} inside it.`];
  if (dirty > 0) {
    parts.push(`${dirty} ${dirty === 1 ? 'file has' : 'files have'} unsaved edits that will be lost.`);
  }
  if (snapshots > 0) {
    parts.push(
      `${snapshots} ${snapshots === 1 ? 'is a snapshot' : 'are snapshots'} that cannot be reopened from disk.`,
    );
  }
  parts.push('This cannot be undone.');
  return parts.join(' ');
}

// A menu item. Shared by the folder header menu and the row's move menu so the
// two read as one mechanism; deliberately not a general-purpose menu component,
// since the codebase has no menu primitive and inventing one here would be
// designing for callers that do not exist.
function MenuItem({
  label,
  danger,
  onSelect,
}: {
  label: string;
  danger?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      style={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        padding: '6px 10px',
        border: 'none',
        background: 'transparent',
        font: 'inherit',
        fontSize: 12,
        color: danger ? 'var(--danger)' : 'var(--chrome-fg)',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  );
}

const MENU_PANEL: CSSProperties = {
  position: 'absolute',
  top: '100%',
  right: 4,
  zIndex: 60,
  minWidth: 180,
  padding: '4px 0',
  background: 'var(--chrome)',
  border: '1px solid var(--chrome-border)',
  borderRadius: 6,
  boxShadow: '0 6px 20px rgba(31,35,40,0.18)',
};

interface FileRowProps {
  f: LibraryFile;
  active: boolean;
  rowShape: CSSProperties;
  pattern: string;
  unprinted: boolean;
  isDirty: (name: string) => boolean;
  isUnpersisted: (name: string) => boolean;
  onPickFile: (name: string) => void;
  onCloseFile: (name: string) => void;
  onGrantAccess: (name: string) => void;
  onDragStart: (e: React.DragEvent, name: string) => void;
  onDragEnd: () => void;
  dragging: boolean;
  onOpenMenu: (e: React.MouseEvent, name: string) => void;
  /** The row's open move-to-folder menu, rendered by Sidebar (which knows the
   *  folder list) but positioned against this row. Null when closed. */
  menu: ReactNode;
}

// One file in the list. Extracted from Sidebar so folder groups can render rows
// without duplicating any of the theme handling below, and deliberately kept in
// this file: it reads `rowShape`/`pattern`/`unprinted`, which Sidebar resolves
// once per render, and a separate module would have to take them as props or
// call useChromePattern() again per row.
//
// The element shape here is load-bearing. Sidebar.test.tsx finds a row by
// walking up from the filename cell — getByTitle(name).closest('div').parentElement
// — so the row container must stay the direct parent of the header div. Grouping
// wraps whole rows, which is fine; adding a wrapper *inside* a row is not.
function FileRow({
  f,
  active,
  rowShape,
  pattern,
  unprinted,
  isDirty,
  isUnpersisted,
  onPickFile,
  onCloseFile,
  onGrantAccess,
  onDragStart,
  onDragEnd,
  dragging,
  onOpenMenu,
  menu,
}: FileRowProps) {
  const denied = f.perm === 'denied';
  const prompt = f.perm === 'prompt';
  const snapshot = f.kind === 'snapshot';
  const unsaved = isUnpersisted(f.name);
  const showBadge = snapshot || denied;
  const dashed = snapshot || denied;
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, f.name)}
      onDragEnd={onDragEnd}
      onClick={() => onPickFile(f.name)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        padding: '6px 8px',
        cursor: 'pointer',
        background: active ? 'var(--chrome-hl)' : 'transparent',
        marginBottom: 1,
        position: 'relative',
        opacity: dragging ? 0.45 : 1,
        // Only the active row takes the theme's accent shape. An
        // inactive row is transparent, so a cut corner there would be
        // invisible geometry that still has to be maintained — and the
        // wedge means "this is the one you are reading", which is
        // exactly what the active state already says.
        ...(active ? rowShape : FLAT_ROW),
        // Every row gets a solid fill under unprinted: the diagonal
        // guides run the height of the panel, and a name sitting on a
        // construction line is unreadable. The rows are what the motif
        // leaves "printed".
        ...(unprinted ? UNPRINTED_TEXT_ROW : null),
        ...(unprinted && active ? { border: '1px dashed var(--link)' } : null),
        // rulework marks the active file with a rule rather than a
        // shape, which is the whole idea of the motif.
        ...(pattern === 'rulework' && active ? { borderLeft: '2px solid var(--link)' } : null),
        // databend displaces the trailing edge, as if the row had been
        // caught by one of the tears crossing the panel.
        ...(pattern === 'databend' && active ? DATABEND_ACTIVE_ROW : null),
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color: dashed ? 'var(--chrome-muted)' : 'var(--link)', display: 'flex' }} title={
          snapshot ? 'Snapshot — not tracked on disk' : denied ? 'Access denied — cached copy' : 'Live — re-read from disk'
        }>
          <FileIcon dashed={dashed} />
        </span>
        <span
          title={f.name}
          style={{
            flex: 1,
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontSize: 12.5,
            fontWeight: active ? 600 : 400,
            color: active ? 'var(--chrome-fg)' : 'var(--chrome-muted)',
          }}
        >
          {f.name}
        </span>
        <span style={{ flex: 'none', width: 6, height: 6, borderRadius: '50%', background: 'var(--link)', opacity: isDirty(f.name) ? 1 : 0 }} />
        {/* Dragging is the quicker way to file a row, but it is not available
            everywhere: touch devices raise no drag events at all, so on the
            mobile drawer this menu is the only way to group anything. */}
        <span
          onClick={(e) => onOpenMenu(e, f.name)}
          title="Move to folder"
          role="button"
          aria-label={`Move ${f.name} to folder`}
          style={{
            flex: 'none',
            width: 16,
            height: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 4,
            color: 'var(--chrome-muted)',
            opacity: 0.4,
            fontSize: 13,
            lineHeight: 1,
          }}
        >
          ⋯
        </span>
        <span
          onClick={(e) => {
            e.stopPropagation();
            onCloseFile(f.name);
          }}
          title="Close"
          style={{
            flex: 'none',
            width: 16,
            height: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 4,
            color: 'var(--chrome-muted)',
            opacity: 0.4,
            fontSize: 13,
            lineHeight: 1,
          }}
        >
          ×
        </span>
      </div>
      {/* Live files only: the FS Access API never exposes a real path,
          so size + mtime are the only disk-backed facts that tell two
          same-named files apart and confirm a re-read saw the edit. */}
      {f.kind === 'live' && f.size !== undefined && (
        <div
          style={{
            paddingLeft: 20,
            fontSize: 10,
            color: 'var(--chrome-muted)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={
            f.lastModified !== undefined
              ? `${formatSize(f.size)} — modified ${new Date(f.lastModified).toLocaleString()}`
              : formatSize(f.size)
          }
        >
          {formatSize(f.size)}
          {f.lastModified !== undefined && ` · ${formatWhen(f.lastModified)}`}
        </div>
      )}
      {(showBadge || prompt || unsaved) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 20 }}>
          {unsaved && (
            <span
              title="Storage is full — this file is open now but will not be here after a reload."
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: 'var(--danger)',
                border: '1px solid var(--danger)',
                background: 'var(--danger-bg)',
                borderRadius: 99,
                padding: '1px 6px',
              }}
            >
              not saved
            </span>
          )}
          {showBadge && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: denied ? 'var(--danger)' : 'var(--chrome-muted)',
                border: `1px solid ${denied ? 'var(--danger)' : 'var(--chrome-border)'}`,
                background: denied ? 'var(--danger-bg)' : 'transparent',
                borderRadius: 99,
                padding: '1px 6px',
              }}
            >
              {denied ? 'cached copy' : 'offline copy'}
            </span>
          )}
          {prompt && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onGrantAccess(f.name);
              }}
              style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--chrome-fg)', cursor: 'pointer' }}
            >
              Grant access
            </span>
          )}
        </div>
      )}
      {/* Last child, never wrapping anything: the filename cell has to stay
          exactly one level inside this row (see the note above the component). */}
      {menu}
    </div>
  );
}

interface FolderHeaderProps {
  folder: Folder;
  count: number;
  collapsed: boolean;
  selected: boolean;
  dropTarget: boolean;
  menuOpen: boolean;
  renaming: boolean;
  onToggleCollapsed: () => void;
  onSelect: () => void;
  onOpenMenu: (e: React.MouseEvent) => void;
  onStartRename: () => void;
  onCommitRename: (name: string) => void;
  onCancelRename: () => void;
  onUngroup: () => void;
  onDelete: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
}

function FolderHeader({
  folder,
  count,
  collapsed,
  selected,
  dropTarget,
  menuOpen,
  renaming,
  onToggleCollapsed,
  onSelect,
  onOpenMenu,
  onStartRename,
  onCommitRename,
  onCancelRename,
  onUngroup,
  onDelete,
  onDragOver,
  onDragLeave,
  onDrop,
}: FolderHeaderProps) {
  return (
    <div
      onClick={onSelect}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '5px 8px',
        cursor: 'pointer',
        position: 'relative',
        borderRadius: 6,
        marginBottom: 1,
        background: dropTarget ? 'var(--chrome-hl)' : 'transparent',
        // The selected folder is where newly opened files land. Without a
        // visible mark, "my file went into the wrong folder" is an effect with
        // no visible cause — this border is the cause.
        borderLeft: selected ? '2px solid var(--link)' : '2px solid transparent',
        outline: dropTarget ? '1px dashed var(--link)' : 'none',
      }}
    >
      <span
        onClick={(e) => {
          e.stopPropagation();
          onToggleCollapsed();
        }}
        role="button"
        aria-label={collapsed ? `Expand ${folder.name}` : `Collapse ${folder.name}`}
        style={{
          flex: 'none',
          display: 'flex',
          color: 'var(--chrome-muted)',
          transform: collapsed ? 'rotate(-90deg)' : 'none',
          transition: 'transform .15s',
        }}
      >
        <ChevronDownIcon />
      </span>
      {renaming ? (
        <input
          autoFocus
          defaultValue={folder.name}
          aria-label="Folder name"
          onClick={(e) => e.stopPropagation()}
          onBlur={(e) => {
            // Escape marks the input abandoned before blurring it. Reading a
            // DOM attribute rather than component state on purpose: blur() runs
            // synchronously inside the keydown handler, well before React has
            // committed any state the cancel would have set, so a state flag
            // would still be false here and the abandoned value would commit.
            if (e.currentTarget.dataset.cancelled === 'true') return;
            onCommitRename(e.currentTarget.value);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onCommitRename(e.currentTarget.value);
            // Escape has to blur too, or the input keeps focus and the next
            // click elsewhere commits the value the user just abandoned.
            if (e.key === 'Escape') {
              e.currentTarget.dataset.cancelled = 'true';
              onCancelRename();
              e.currentTarget.blur();
            }
          }}
          style={{
            flex: 1,
            minWidth: 0,
            font: 'inherit',
            fontSize: 12,
            fontWeight: 600,
            padding: '1px 4px',
            color: 'var(--chrome-fg)',
            background: 'var(--chrome-hl)',
            border: '1px solid var(--link)',
            borderRadius: 4,
          }}
        />
      ) : (
        <span
          // The count is not decoration. A folder named like one of the files
          // inside it would otherwise make getByTitle ambiguous in tests; the
          // suffix makes this title structurally distinct from any filename.
          title={`${folder.name} — ${count} ${count === 1 ? 'file' : 'files'}`}
          style={{
            flex: 1,
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--chrome-fg)',
          }}
        >
          {folder.name}
        </span>
      )}
      <span style={{ flex: 'none', fontSize: 10.5, color: 'var(--chrome-muted)' }}>{count}</span>
      {/* No × here. On a file row × means "remove this file", so an × on the
          folder header that keeps the files would give one glyph two opposite
          meanings, side by side. Both removals live in this menu as words. */}
      <span
        onClick={onOpenMenu}
        role="button"
        aria-label={`Folder actions for ${folder.name}`}
        aria-haspopup="menu"
        style={{
          flex: 'none',
          width: 16,
          height: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 4,
          color: 'var(--chrome-muted)',
          opacity: 0.6,
          fontSize: 13,
          lineHeight: 1,
        }}
      >
        ⋯
      </span>
      {menuOpen && (
        <div role="menu" style={MENU_PANEL} onClick={(e) => e.stopPropagation()}>
          <MenuItem label="Rename" onSelect={onStartRename} />
          {/* Ungroup runs immediately: nothing is destroyed, and dragging the
              files back undoes it. The asymmetry with the item below is the
              point — the two are adjacent, and only one of them asks. */}
          <MenuItem label="Remove folder, keep files" onSelect={onUngroup} />
          <MenuItem label="Delete folder and files" danger onSelect={onDelete} />
        </div>
      )}
    </div>
  );
}

export function Sidebar({
  mode,
  sidebarOpen,
  drawerOpen,
  onToggleDrawer,
  files,
  activeName,
  isDirty,
  isUnpersisted,
  onPickFile,
  onCloseFile,
  onGrantAccess,
  onOpenFileClick,
  storageUsedBytes,
  storageQuotaBytes,
  onClearAll,
  folders,
  selectedFolderId,
  collapsedFolders,
  onSelectFolder,
  onToggleFolderCollapsed,
  onCreateFolder,
  onRenameFolder,
  onUngroupFolder,
  onDeleteFolderAndFiles,
  onMoveFileToFolder,
}: SidebarProps) {
  const [confirmClear, setConfirmClear] = useState(false);
  // Id of the folder awaiting a destructive-delete confirmation, or null.
  const [confirmDeleteFolder, setConfirmDeleteFolder] = useState<string | null>(null);
  // Name of the row currently being dragged, used only to dim it. Held here
  // rather than in each row so the drop targets below can also read it.
  const [draggingFile, setDraggingFile] = useState<string | null>(null);
  // Name of the row whose "move to folder" menu is open, or null.
  const [rowMenu, setRowMenu] = useState<string | null>(null);
  const [folderMenu, setFolderMenu] = useState<string | null>(null);
  const [renamingFolder, setRenamingFolder] = useState<string | null>(null);
  // Drop target under the cursor: a folder id, or 'root' for the ungrouped
  // area. Null when no internal drag is over anything droppable.
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  // One menu at a time, and Escape closes whichever is open. Attached only
  // while something is open so the app is not carrying a keydown listener for
  // the entire session.
  const anyMenuOpen = rowMenu !== null || folderMenu !== null;
  useEffect(() => {
    if (!anyMenuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setRowMenu(null);
        setFolderMenu(null);
      }
    };
    const onDown = (e: MouseEvent) => {
      // Ignore presses that land inside a menu. mousedown fires before click,
      // so closing unconditionally would unmount the item under the cursor
      // between press and release — mouseup would then land on nothing, no
      // click event would ever be synthesized, and every menu item would look
      // dead. stopPropagation on the panel does not help: it only stops click.
      if ((e.target as Element | null)?.closest('[role="menu"]')) return;
      setRowMenu(null);
      setFolderMenu(null);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onDown);
    };
  }, [anyMenuOpen]);

  // Grouped view of the library. Built in one pass in `files` order so the
  // order inside each folder is the library order — grouping is a view, it
  // must not reorder anything.
  const groups = useMemo(() => {
    // Copy before sorting: Array.prototype.sort mutates in place, and sorting
    // the `folders` prop directly would be mutating React state held above.
    const ordered = [...folders].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
    const buckets = new Map<string, LibraryFile[]>(ordered.map((f) => [f.id, []]));
    const root: LibraryFile[] = [];
    for (const f of files) {
      // A file pointing at a folder that no longer exists still has to render.
      // A file invisible in the list while still counted in the storage meter
      // is the worst failure available here, so the fallback is the root list.
      const bucket = f.folderId ? buckets.get(f.folderId) : undefined;
      if (bucket) bucket.push(f);
      else root.push(f);
    }
    return { ordered, buckets, root };
  }, [files, folders]);

  const startRowDrag = (e: React.DragEvent, name: string) => {
    // Only the vendor type, deliberately: adding text/plain would make the row
    // droppable into the editor textarea as literal text, and would also let a
    // text drag from another app impersonate a row drag on the way in.
    e.dataTransfer.setData(INTERNAL_DRAG_TYPE, name);
    e.dataTransfer.effectAllowed = 'move';
    setDraggingFile(name);
  };
  const endRowDrag = () => {
    setDraggingFile(null);
    setDropTarget(null);
  };
  const openRowMenu = (e: React.MouseEvent, name: string) => {
    e.stopPropagation();
    setFolderMenu(null);
    setRowMenu((prev) => (prev === name ? null : name));
  };

  const isInternalDrag = (e: React.DragEvent) => e.dataTransfer.types.includes(INTERNAL_DRAG_TYPE);

  const dragOverTarget = (e: React.DragEvent, target: string) => {
    if (!isInternalDrag(e)) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setDropTarget(target);
  };

  const dropOnFolder = (e: React.DragEvent, folderId: string | null) => {
    if (!isInternalDrag(e)) return;
    e.preventDefault();
    // Load-bearing, and it looks redundant next to preventDefault: without it
    // the window-level drop handler in layoutState also runs and treats this as
    // "open a dropped file". React attaches its listeners at the root container,
    // which sits below window in the propagation chain, so stopping here really
    // does stop that native listener. The types gate in layoutState is a second
    // layer for exactly the day someone deletes this line.
    e.stopPropagation();
    const name = e.dataTransfer.getData(INTERNAL_DRAG_TYPE);
    setDropTarget(null);
    setDraggingFile(null);
    if (name) onMoveFileToFolder(name, folderId);
  };

  const createFolderAndSelect = () => {
    const id = onCreateFolder('New folder');
    onSelectFolder(id);
    setRenamingFolder(id);
  };

  const pendingDeleteFolder = confirmDeleteFolder
    ? (groups.ordered.find((f) => f.id === confirmDeleteFolder) ?? null)
    : null;

  // The move menu, shown on every device rather than only where drag is absent.
  // On touch it is the only way to file anything — HTML5 drag events never fire
  // from a touch gesture, and this app ships a mobile drawer. On desktop it
  // still beats dragging for a run of files, and for a list long enough that
  // the drag would need the container to auto-scroll, which it does not.
  const renderRowMenu = (f: LibraryFile) => {
    if (rowMenu !== f.name) return null;
    return (
      <div role="menu" style={MENU_PANEL} onClick={(e) => e.stopPropagation()}>
        {groups.ordered.map((folder) => (
          <MenuItem
            key={folder.id}
            label={folder.id === f.folderId ? `✓ ${folder.name}` : folder.name}
            onSelect={() => {
              setRowMenu(null);
              onMoveFileToFolder(f.name, folder.id);
            }}
          />
        ))}
        {groups.ordered.length === 0 && (
          <div style={{ padding: '6px 10px', fontSize: 11.5, color: 'var(--chrome-muted)' }}>
            No folders yet
          </div>
        )}
        {f.folderId && <MenuItem
          label="Remove from folder"
          onSelect={() => {
            setRowMenu(null);
            onMoveFileToFolder(f.name, null);
          }}
        />}
      </div>
    );
  };

  const rowShape = useChromeAccentShape() === 'wedge' ? WEDGE_ROW : FLAT_ROW;
  const chromePattern = useChromePattern();
  // Resolved once so the overlay and every style branch below agree on whether a
  // structural motif is active — on the mobile drawer they all read `none`.
  const pattern = effectivePattern(chromePattern.pattern, mode);
  const unprinted = pattern === 'unprinted';
  const isMobile = mode === 'mobile';
  const pct = storageQuotaBytes > 0 ? Math.min(100, Math.round((storageUsedBytes / storageQuotaBytes) * 100)) : 0;
  const over = storageUsedBytes > storageQuotaBytes;
  const warn = !over && pct > 80;
  const usedMb = formatMb(storageUsedBytes);
  const quotaMb = formatMb(storageQuotaBytes);

  return (
    <>
      {isMobile && drawerOpen && (
        <div
          onClick={onToggleDrawer}
          style={{ position: 'absolute', inset: 0, zIndex: 44, background: 'rgba(31,35,40,0.35)', animation: 'fadeIn .15s' }}
        />
      )}
      <nav
        style={{
          flex: '0 0 240px',
          width: 240,
          position: isMobile ? 'absolute' : 'relative',
          top: 0,
          bottom: 0,
          left: 0,
          zIndex: 45,
          transform: isMobile ? (drawerOpen ? 'translateX(0)' : 'translateX(-101%)') : 'none',
          marginLeft: isMobile ? 0 : sidebarOpen ? 0 : -241,
          boxShadow: isMobile && drawerOpen ? '0 0 32px rgba(31,35,40,0.20)' : 'none',
          transition: 'margin-left .22s ease, transform .22s ease, background .25s',
          // The pattern paints over this fill, not instead of it — see the layer
          // below. A theme naming no --chrome-pattern renders nothing over it,
          // leaving exactly this color.
          //
          // background-color rather than the `background` shorthand: jsdom drops
          // the shorthand outright when its value is a var(), so the fill would
          // be invisible to every test that renders this component.
          backgroundColor: 'var(--chrome)',
          // The pattern layers are absolutely positioned against this element.
          overflow: 'hidden',
          color: 'var(--chrome-fg)',
          borderRight: '1px solid var(--chrome-border)',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          // The three motifs that restate the panel itself rather than drawing
          // on it. Each overrides the fill or the silhouette set above; all
          // three resolve to `none` on the mobile drawer, so none of them can
          // apply here while its overlay is gated off.
          ...(unprinted ? unprintedPanelStyle(chromePattern.ink, 'right') : null),
          ...(pattern === 'figureground' ? FIGUREGROUND_SIDEBAR : null),
          ...(pattern === 'notched' ? NOTCHED_SIDEBAR : null),
        }}
      >
        {/* The pattern. First in the DOM so every control below paints over it,
            and pointer-events: none so none of its layers swallows a click meant
            for a file row. */}
        <SidebarPatternLayer {...chromePattern} mode={mode} />
        {pattern === 'notched' && <NotchClipDefs />}
        {unprinted && <div style={unprintedSidebarNote(chromePattern.ink)}>w: 240px · chrome: none</div>}
        <div style={{ padding: '12px 12px 8px' }}>
          <button
            onClick={onOpenFileClick}
            style={{
              width: '100%',
              height: 32,
              border: '1px solid var(--chrome-border)',
              borderRadius: 7,
              background: 'transparent',
              color: 'var(--chrome-fg)',
              fontSize: 12.5,
              fontWeight: 600,
              fontFamily: 'var(--font-ui)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7,
              position: 'relative',
              ...(unprinted ? UNPRINTED_BUTTON : null),
            }}
          >
            <PlusIcon />
            Open file
          </button>
        </div>
        <div
          style={{
            fontSize: 10.5,
            fontWeight: 600,
            color: 'var(--chrome-muted)',
            textTransform: 'uppercase',
            letterSpacing: '.07em',
            padding: '8px 16px 4px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            position: 'relative',
          }}
        >
          Files
          {/* rulework carries its whole personality in line work, so the section
              label continues as a rule to the panel edge rather than sitting on
              its own. Nothing else draws it. */}
          {pattern === 'rulework' && (
            <span aria-hidden="true" style={{ flex: 1, height: 1, background: 'var(--chrome-border)' }} />
          )}
          <button
            type="button"
            onClick={createFolderAndSelect}
            title="New folder"
            aria-label="New folder"
            style={{
              marginLeft: pattern === 'rulework' ? 0 : 'auto',
              flex: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 18,
              height: 18,
              padding: 0,
              border: 'none',
              background: 'transparent',
              color: 'var(--chrome-muted)',
              cursor: 'pointer',
            }}
          >
            <PlusIcon />
          </button>
        </div>
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '2px 8px',
            position: 'relative',
            // figureground's upper mass slants down across the top of the panel,
            // reaching 154px at the left edge. Without this the first row sits
            // on that diagonal — a mistake the spec records having made once.
            ...(pattern === 'figureground' ? { marginTop: FIGUREGROUND_LIST_OFFSET } : null),
          }}
        >
          {groups.ordered.map((folder) => {
            const members = groups.buckets.get(folder.id) ?? [];
            const collapsed = collapsedFolders.includes(folder.id);
            return (
              <div key={folder.id} style={{ marginBottom: 2 }}>
                <FolderHeader
                  folder={folder}
                  count={members.length}
                  collapsed={collapsed}
                  selected={selectedFolderId === folder.id}
                  dropTarget={dropTarget === folder.id}
                  menuOpen={folderMenu === folder.id}
                  renaming={renamingFolder === folder.id}
                  onToggleCollapsed={() => onToggleFolderCollapsed(folder.id)}
                  onSelect={() => onSelectFolder(selectedFolderId === folder.id ? null : folder.id)}
                  onOpenMenu={(e) => {
                    e.stopPropagation();
                    setRowMenu(null);
                    setFolderMenu((prev) => (prev === folder.id ? null : folder.id));
                  }}
                  onStartRename={() => {
                    setFolderMenu(null);
                    setRenamingFolder(folder.id);
                  }}
                  onCommitRename={(name) => {
                    const trimmed = name.trim();
                    if (trimmed) onRenameFolder(folder.id, trimmed);
                    setRenamingFolder(null);
                  }}
                  onCancelRename={() => setRenamingFolder(null)}
                  onUngroup={() => {
                    setFolderMenu(null);
                    onUngroupFolder(folder.id);
                  }}
                  onDelete={() => {
                    setFolderMenu(null);
                    // An empty folder destroys nothing, so it goes straight
                    // through. Confirming a no-loss action only teaches people
                    // to dismiss the dialog that does matter.
                    if (members.length === 0) onDeleteFolderAndFiles(folder.id);
                    else setConfirmDeleteFolder(folder.id);
                  }}
                  onDragOver={(e) => dragOverTarget(e, folder.id)}
                  onDragLeave={() => setDropTarget((prev) => (prev === folder.id ? null : prev))}
                  onDrop={(e) => dropOnFolder(e, folder.id)}
                />
                {!collapsed && (
                  <div style={{ paddingLeft: 10 }}>
                    {members.map((f) => (
                      <FileRow
                        key={f.name}
                        f={f}
                        active={f.name === activeName}
                        rowShape={rowShape}
                        pattern={pattern}
                        unprinted={unprinted}
                        isDirty={isDirty}
                        isUnpersisted={isUnpersisted}
                        onPickFile={onPickFile}
                        onCloseFile={onCloseFile}
                        onGrantAccess={onGrantAccess}
                        onDragStart={startRowDrag}
                        onDragEnd={endRowDrag}
                        dragging={draggingFile === f.name}
                        onOpenMenu={openRowMenu}
                        menu={renderRowMenu(f)}
                      />
                    ))}
                    {/* A new folder is empty by definition, so this is the very
                        first thing the user sees after creating one. Collapsing
                        to nothing would leave them with no target to drop onto. */}
                    {members.length === 0 && (
                      <div
                        onDragOver={(e) => dragOverTarget(e, folder.id)}
                        onDrop={(e) => dropOnFolder(e, folder.id)}
                        style={{
                          padding: '6px 8px',
                          fontSize: 11,
                          fontStyle: 'italic',
                          color: 'var(--chrome-muted)',
                          opacity: 0.75,
                        }}
                      >
                        Drop files here
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {/* The ungrouped list. Also the drop target that takes a file back out
              of a folder — dragging a row into open space is the undo for
              dragging it in. */}
          <div
            onDragOver={(e) => dragOverTarget(e, 'root')}
            onDragLeave={() => setDropTarget((prev) => (prev === 'root' ? null : prev))}
            onDrop={(e) => dropOnFolder(e, null)}
            style={{
              minHeight: 24,
              borderRadius: 6,
              outline: dropTarget === 'root' ? '1px dashed var(--link)' : 'none',
            }}
          >
            {groups.root.map((f) => (
              <FileRow
                key={f.name}
                f={f}
                active={f.name === activeName}
                rowShape={rowShape}
                pattern={pattern}
                unprinted={unprinted}
                isDirty={isDirty}
                isUnpersisted={isUnpersisted}
                onPickFile={onPickFile}
                onCloseFile={onCloseFile}
                onGrantAccess={onGrantAccess}
                onDragStart={startRowDrag}
                onDragEnd={endRowDrag}
                dragging={draggingFile === f.name}
                onOpenMenu={openRowMenu}
                menu={renderRowMenu(f)}
              />
            ))}
          </div>
        </div>
        <div
          style={{
            borderTop: '1px solid var(--chrome-border)',
            padding: '10px 16px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            position: 'relative',
            // Same reason as the file rows: the guides cross this block too, and
            // the storage readout is small enough that a diagonal through it
            // costs legibility outright.
            ...(unprinted ? { ...UNPRINTED_TEXT_ROW, borderTop: '1px dashed var(--link)' } : null),
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontSize: 11, color: over || warn ? 'var(--danger)' : 'var(--chrome-muted)', fontWeight: over || warn ? 600 : 400 }}>
                {over ? `${usedMb} MB of ${quotaMb} MB — over quota` : `${usedMb} MB of ${quotaMb} MB used`}
              </span>
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                disabled={files.length === 0}
                style={{
                  fontSize: 10.5,
                  fontWeight: 600,
                  fontFamily: 'inherit',
                  color: 'var(--chrome-muted)',
                  background: 'transparent',
                  border: 'none',
                  cursor: files.length === 0 ? 'default' : 'pointer',
                  opacity: files.length === 0 ? 0.45 : 1,
                  borderRadius: 5,
                  padding: '1px 5px',
                }}
              >
                Clear all
              </button>
            </div>
            <div style={{ height: 3, borderRadius: 2, background: 'var(--chrome-border)', overflow: 'hidden' }}>
              <div
                style={{
                  height: 3,
                  borderRadius: 2,
                  width: `${pct}%`,
                  background: over || warn ? 'var(--danger)' : 'var(--link)',
                  transition: 'width .2s',
                }}
              />
            </div>
            {(over || warn) && (
              <div
                style={{
                  fontSize: 10.5,
                  lineHeight: 1.45,
                  color: 'var(--danger)',
                  background: 'var(--danger-bg)',
                  border: '1px solid var(--danger)',
                  borderRadius: 6,
                  padding: '5px 7px',
                }}
              >
                {over
                  ? 'Quota exceeded — new files still open, but cannot be saved for next time until you clear space.'
                  : 'Storage almost full — close a few snapshots.'}
              </div>
            )}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--chrome-muted)', display: 'flex', alignItems: 'center', gap: 7 }}>
            <DropHintIcon />
            Drop .md files anywhere
          </div>
        </div>
      </nav>
      {confirmClear && (
        <ConfirmDialog
          title="Clear all files?"
          message={buildClearAllMessage(files, isDirty)}
          confirmLabel="Clear all"
          danger
          onConfirm={() => {
            setConfirmClear(false);
            onClearAll();
          }}
          onCancel={() => setConfirmClear(false)}
        />
      )}
      {pendingDeleteFolder && (
        <ConfirmDialog
          title={`Delete “${pendingDeleteFolder.name}” and its files?`}
          message={buildDeleteFolderMessage(
            pendingDeleteFolder.name,
            groups.buckets.get(pendingDeleteFolder.id) ?? [],
            isDirty,
          )}
          confirmLabel="Delete folder and files"
          danger
          onConfirm={() => {
            const id = pendingDeleteFolder.id;
            setConfirmDeleteFolder(null);
            onDeleteFolderAndFiles(id);
          }}
          onCancel={() => setConfirmDeleteFolder(null)}
        />
      )}
    </>
  );
}
