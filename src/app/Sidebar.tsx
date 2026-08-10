import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { useChromeAccentShape, useChromePattern } from '@/features/theming/ThemeContext';
import {
  ChevronDownIcon,
  DropHintIcon,
  FileIcon,
  NotSavedIcon,
  PlusIcon,
} from '@/components/ui/icons';
import { ConfirmDialog, type Consequence } from '@/components/ui/ConfirmDialog';
import { NotchClipDefs, SidebarPatternLayer } from './chromePattern';
import {
  DATABEND_ACTIVE_ROW,
  FIGUREGROUND_LIST_OFFSET,
  FIGUREGROUND_SIDEBAR,
  NOTCHED_SIDEBAR,
  UNPRINTED_BUTTON,
  UNPRINTED_TEXT_ROW,
  effectivePattern,
  unprintedPanelStyle,
  unprintedSidebarNote,
} from './chromePatternStyles';
import { INTERNAL_DRAG_TYPE } from './dragTypes';
import { FIRST_SYNC_WARNING, SyncStatusIcon, useSyncMenuActions } from '@/features/sync/syncStatus';
import { RemoteFileList } from '@/features/sync/RemoteFileList';
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
  /**
   * Whether this file has a copy on GitHub that a close would take with it.
   * Threaded as a prop rather than read from the sync context here: Sidebar is
   * presentational, and its own tests mount it without any provider above.
   */
  onGitHub: (name: string) => boolean;
  onPickFile: (name: string) => void;
  onCloseFile: (name: string) => void;
  onGrantAccess: (name: string) => void;
  onOpenFileClick: () => void;
  /**
   * Creates a blank document under this name and opens it for editing.
   *
   * The name is passed through raw — normalizing it, and settling a clash with
   * a file already open, both belong to the library, which is the only thing
   * that knows every name in use. The row that appears carries whatever name it
   * ended up with, so a resolved clash is visible rather than silent.
   */
  onNewFile: (name: string) => void;
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

// Shown greyed in the empty name field, and it is the name an empty commit
// actually produces — so the placeholder is a promise rather than a hint.
const NEW_FILE_PLACEHOLDER = 'Untitled.md';

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

// Bytes of the copy held in memory, for rows with no disk size to show. UTF-8,
// not `length`: a document with any non-ASCII character in it — an em dash, an
// accent, CJK — occupies more bytes than it has characters, and this number
// sits directly beneath disk sizes measured the same way.
function contentBytes(text: string): number {
  return new TextEncoder().encode(text).length;
}

/**
 * The row's second line.
 *
 * Live files report what was on disk at the last read. Snapshots have no handle
 * to stat, so they report the size of the copy they are carrying, labelled as
 * such — "9.2 KB · offline copy" is honest about being a different measurement
 * from the line above it, where "9.2 KB · Aug 4" would quietly imply a disk
 * mtime that does not exist.
 */
function secondLine(f: LibraryFile): string {
  if (f.size !== undefined) {
    return f.lastModified !== undefined
      ? `${formatSize(f.size)} · ${formatWhen(f.lastModified)}`
      : formatSize(f.size);
  }
  // No disk size. A snapshot never has one; a live file loses it when the
  // handle stops answering, at which point `perm` has already gone to
  // 'denied' and the row is showing the same cached bytes a snapshot would.
  // Both are the same thing to the reader: this size came from the copy here,
  // not from disk.
  return `${formatSize(contentBytes(f.editedContent))} · offline copy`;
}

function secondLineTitle(f: LibraryFile): string {
  if (f.size !== undefined) {
    return f.lastModified !== undefined
      ? `${formatSize(f.size)} — modified ${new Date(f.lastModified).toLocaleString()}`
      : formatSize(f.size);
  }
  return `${formatSize(contentBytes(f.editedContent))} held on this device. Not tracked on disk, so there is no file size or modified time to read.`;
}

// Names the specific stakes rather than a generic "are you sure". The two that
// matter are unsaved edits (gone for good — edits live only in memory and are
// never written back to disk) and snapshots (no handle to reopen from, unlike
// live files, which can be reopened from disk afterwards).
/**
 * What to say about the GitHub copies a delete is about to take with it.
 *
 * Shared by all three destructive dialogs so they cannot drift into describing
 * the same consequence differently — the close button, the folder delete and
 * clear all destroy remote copies by exactly the same mechanism.
 *
 * Two sentences, and the second is not padding. "Permanently deleted" invites
 * the reading that other devices are about to lose the document; they are not —
 * a device that already downloaded it keeps its copy and goes on reading it,
 * verified by test, and losing sync is a smaller thing than losing a file.
 * Saying only the frightening half would be inaccurate in the direction that
 * stops people from doing something harmless.
 *
 * Avoids "gist" entirely: someone who signed in to read their notes on a phone
 * has no idea what one is. "Your GitHub account" is what they picked.
 *
 * Only the first is `severe`. Marking both would flatten the distinction the
 * two sentences exist to draw — one is the loss, the other is the reassurance
 * that limits it — and a dialog where everything is urgent reads as a dialog
 * where nothing is.
 */
function remoteDeletionSentences(count: number): Consequence[] {
  if (count === 0) return [];
  const subject = count === 1 ? 'One file is' : `${count} files are`;
  const its = count === 1 ? 'its' : 'their';
  return [
    {
      text: `${subject} on GitHub and will be permanently deleted from your account, along with ${its} edit history.`,
      severe: true,
    },
    { text: 'Devices that already downloaded these files keep their copies, but will stop syncing.' },
  ];
}

function buildClearAllMessage(
  files: LibraryFile[],
  isDirty: (name: string) => boolean,
  onGitHub: (name: string) => boolean,
): Consequence[] {
  const count = files.length;
  const plural = count === 1 ? 'file' : 'files';
  const snapshots = files.filter((f) => f.kind === 'snapshot').length;
  const dirty = files.filter((f) => isDirty(f.name)).length;
  const synced = files.filter((f) => onGitHub(f.name)).length;

  const parts: Consequence[] = [
    { text: `Removes all ${count} ${plural} from the library and frees the stored space.` },
  ];
  // Severe: edits live only in memory until saved, so these are gone for good.
  if (dirty > 0) {
    parts.push({
      text: `${dirty} ${dirty === 1 ? 'file has' : 'files have'} unsaved edits that will be lost.`,
      severe: true,
    });
  }
  // Not severe: the file itself still exists on disk, it just cannot be
  // reopened from here — recoverable by picking it again.
  if (snapshots > 0) {
    parts.push({
      text: `${snapshots} ${snapshots === 1 ? 'is a snapshot' : 'are snapshots'} that cannot be reopened from disk.`,
    });
  }
  parts.push(...remoteDeletionSentences(synced));
  parts.push({ text: 'This cannot be undone.' });
  return parts;
}

// Mirrors buildClearAllMessage, scoped to one folder. Same reasoning: name the
// stakes rather than asking "are you sure". Only reached for a non-empty folder
// — deleting an empty one destroys nothing, and asking to confirm a no-loss
// action is how users learn to click through every confirmation.
function buildDeleteFolderMessage(
  folderName: string,
  members: LibraryFile[],
  isDirty: (name: string) => boolean,
  onGitHub: (name: string) => boolean,
): Consequence[] {
  const count = members.length;
  const plural = count === 1 ? 'file' : 'files';
  const snapshots = members.filter((f) => f.kind === 'snapshot').length;
  const dirty = members.filter((f) => isDirty(f.name)).length;
  const synced = members.filter((f) => onGitHub(f.name)).length;

  const parts: Consequence[] = [
    { text: `Deletes “${folderName}” and closes the ${count} ${plural} inside it.` },
  ];
  if (dirty > 0) {
    parts.push({
      text: `${dirty} ${dirty === 1 ? 'file has' : 'files have'} unsaved edits that will be lost.`,
      severe: true,
    });
  }
  if (snapshots > 0) {
    parts.push({
      text: `${snapshots} ${snapshots === 1 ? 'is a snapshot' : 'are snapshots'} that cannot be reopened from disk.`,
    });
  }
  parts.push(...remoteDeletionSentences(synced));
  parts.push({ text: 'This cannot be undone.' });
  return parts;
}

// A menu item. Shared by the folder header menu and the row's move menu so the
// two read as one mechanism; deliberately not a general-purpose menu component,
// since the codebase has no menu primitive and inventing one here would be
// designing for callers that do not exist.
function MenuItem({
  label,
  danger,
  title,
  onSelect,
}: {
  label: string;
  danger?: boolean;
  /** Hover text, for the one item whose consequence needs more than a label. */
  title?: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      title={title}
      // The hover wash lives in index.css: a pointer sitting on a menu row with
      // no feedback at all reads as a disabled list, and :hover cannot be
      // written inline. --hl rather than --chrome-hl, matching the ⋯ menus this
      // is shared with — the panel sits on --chrome, so the row tint has to be
      // the one mixed for that surface.
      data-menu-row=""
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
        // Wraps rather than nowrap. The panel is bounded by the sidebar
        // (see MENU_PANEL), so a label too wide for it — "Close and delete
        // from GitHub" needs ~184px — has to go somewhere. A second line is
        // readable; the alternative is a word clipped off by the nav.
        lineHeight: 1.35,
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
  // The nav clips with overflow:hidden, so a panel wider than the sidebar
  // loses its right edge rather than scrolling into view — and the longest
  // label the menu can build, "Close and delete from GitHub", needs ~184px of
  // the 240px sidebar. That fits today with little to spare, so the cap is
  // here to keep a future wording change from silently clipping: bounded to
  // the row, the label wraps to a second line instead (see MenuItem).
  maxWidth: 'calc(100% - 8px)',
  padding: '4px 0',
  background: 'var(--chrome)',
  border: '1px solid var(--chrome-border)',
  borderRadius: 6,
  boxShadow: '0 6px 20px rgba(31,35,40,0.18)',
};

/** A hairline between groups of menu items that mean different things. */
function MenuSeparator() {
  return <div style={{ height: 1, margin: '4px 0', background: 'var(--chrome-border)' }} />;
}

interface RowMenuProps {
  f: LibraryFile;
  folders: Folder[];
  onClose: () => void;
  onMoveFileToFolder: (name: string, folderId: string | null) => void;
  onGrantAccess: (name: string) => void;
  onCloseFile: (name: string) => void;
  onGitHub: (name: string) => boolean;
  /** Tells Sidebar this menu is showing a dialog, so its dismiss handlers stand
   *  down until the question is answered. */
  onDialogOpenChange: (open: boolean) => void;
}

/**
 * Everything one file row can do, in three groups: fix-ups that only some rows
 * need, sync, filing, then the close.
 *
 * A component rather than a render function because it calls into the sync
 * context for its own items — and it must not be mounted for every row, only
 * the open one, or every row in the library would subscribe to sync state.
 */
function RowMenu({
  f,
  folders,
  onClose,
  onMoveFileToFolder,
  onGrantAccess,
  onCloseFile,
  onGitHub,
  onDialogOpenChange,
}: RowMenuProps) {
  const sync = useSyncMenuActions(f.name);
  // Set when the user picks the one irreversible item, cleared by the dialog.
  const [confirmingDeleteRemote, setConfirmingDeleteRemote] = useState(false);
  const showDeleteDialog = (open: boolean) => {
    setConfirmingDeleteRemote(open);
    onDialogOpenChange(open);
  };
  const select = (fn: () => void) => () => {
    onClose();
    fn();
  };

  // Outlives the menu: picking the item closes the menu, and the question has to
  // stay on screen after it. Rendered instead of the panel rather than beside
  // it, so the closed menu cannot come back with the dialog over it.
  if (confirmingDeleteRemote) {
    return (
      <ConfirmDialog
        title="Delete this file from GitHub?"
        // Names what is destroyed and what is not, because neither is guessable
        // from a menu label. Separate lines rather than one sentence: run
        // together, the reassuring half blunts the destructive half and the
        // whole thing reads as mild.
        //
        // The last line is the one that changes the decision: a phone that
        // already downloaded this file keeps it and goes on reading it —
        // verified, not assumed — so the cost is losing sync, not losing
        // anyone's document.
        message={[
          {
            text: `“${f.name}” will be permanently deleted from your GitHub account, along with its edit history.`,
            severe: true,
          },
          { text: 'Your devices will stop syncing it.' },
          { text: 'The file stays on this device, and any other device that already downloaded it keeps its copy.' },
        ]}
        confirmLabel="Delete from GitHub"
        danger
        onConfirm={() => {
          showDeleteDialog(false);
          onClose();
          sync.run('delete-remote');
        }}
        onCancel={() => showDeleteDialog(false)}
      />
    );
  }

  return (
    <div role="menu" style={MENU_PANEL} onClick={(e) => e.stopPropagation()}>
      {/* First, because a denied row cannot be re-read until this is done and
          nothing else in the menu matters while it is broken. */}
      {f.perm === 'prompt' && (
        <>
          <MenuItem label="Grant access" onSelect={select(() => onGrantAccess(f.name))} />
          <MenuSeparator />
        </>
      )}
      {sync.items.map((item) => (
        <MenuItem
          key={item.kind}
          label={item.label}
          danger={item.danger}
          title={item.kind === 'enable' ? FIRST_SYNC_WARNING : undefined}
          // Deleting the GitHub copy is the one irreversible thing in here, and
          // it reaches every device bound to that copy — so it asks first.
          //
          // Deliberately not wrapped in `select`: that closes the menu, and the
          // menu is what holds the dialog's state. Swapping the panel for the
          // question keeps this component mounted, so a cancel returns the user
          // to the menu they were in rather than to nothing.
          onSelect={
            item.kind === 'delete-remote'
              ? () => showDeleteDialog(true)
              : select(() => sync.run(item.kind))
          }
        />
      ))}
      {sync.items.length > 0 && <MenuSeparator />}
      <div style={{ padding: '4px 10px 2px', fontSize: 10, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--chrome-muted)' }}>
        Move to
      </div>
      {folders.map((folder) => (
        <MenuItem
          key={folder.id}
          label={folder.id === f.folderId ? `✓ ${folder.name}` : folder.name}
          onSelect={select(() => onMoveFileToFolder(f.name, folder.id))}
        />
      ))}
      {folders.length === 0 && (
        <div style={{ padding: '6px 10px', fontSize: 11.5, color: 'var(--chrome-muted)' }}>
          No folders yet
        </div>
      )}
      {f.folderId && (
        <MenuItem
          label="Remove from folder"
          onSelect={select(() => onMoveFileToFolder(f.name, null))}
        />
      )}
      <MenuSeparator />
      {/* Closing used to be an × on the row. It moved in here with everything
          else, but it keeps its own group and its own wording: only the synced
          case warns, because a file with nothing on GitHub closes as it always
          has, and confirming a no-loss action is how people learn to dismiss
          every dialog — including the one that mattered. */}
      <MenuItem
        label={onGitHub(f.name) ? 'Close and delete from GitHub' : 'Close file'}
        danger={onGitHub(f.name)}
        onSelect={select(() => onCloseFile(f.name))}
      />
    </div>
  );
}

interface FileRowProps {
  f: LibraryFile;
  active: boolean;
  rowShape: CSSProperties;
  pattern: string;
  unprinted: boolean;
  isDirty: (name: string) => boolean;
  isUnpersisted: (name: string) => boolean;
  onPickFile: (name: string) => void;
  onDragStart: (e: React.DragEvent, name: string) => void;
  onDragEnd: () => void;
  dragging: boolean;
  onOpenMenu: (e: React.MouseEvent, name: string) => void;
  /** Whether the row's controls stay visible when not hovered. True on touch,
   *  where there is no hover to reveal them with. */
  alwaysShowControls: boolean;
  /** The row's open action menu, rendered by Sidebar (which knows the folder
   *  list and the sync context) but positioned against this row. Null when
   *  closed — and kept open-aware, so ⋯ does not vanish under the open menu. */
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
  onDragStart,
  onDragEnd,
  dragging,
  onOpenMenu,
  alwaysShowControls,
  menu,
}: FileRowProps) {
  const [hovered, setHovered] = useState(false);
  const denied = f.perm === 'denied';
  const snapshot = f.kind === 'snapshot';
  const unsaved = isUnpersisted(f.name);
  const dashed = snapshot || denied;
  // ⋯ is revealed by hover, but it must not disappear the moment the pointer
  // travels from the row into the menu it opened — the menu hangs below the row
  // and leaving the row is how you reach it.
  const showControls = alwaysShowControls || hovered || active || menu !== null;
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, f.name)}
      onDragEnd={onDragEnd}
      onClick={() => onPickFile(f.name)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        padding: '6px 8px',
        cursor: 'pointer',
        // Hover is a weaker echo of the active fill, not the same one: the two
        // have to stay apart while the pointer rests on an inactive row, and
        // reusing --chrome-hl outright would make a hovered row look like the
        // file actually open. Derived with color-mix rather than added to the
        // theme contract as its own token — every theme already tunes
        // --chrome-hl, a second one would be a knob they all have to set in
        // agreement with the first, and a user theme written against the
        // current contract would leave this unset.
        //
        // Inline rather than a :hover rule because `hovered` is already tracked
        // here to reveal the ⋯; an attribute would put one fact in two places.
        background: active
          ? 'var(--chrome-hl)'
          : hovered
            ? 'color-mix(in srgb, var(--chrome-hl) 55%, transparent)'
            : 'transparent',
        transition: 'background .12s',
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
        {/* The dashed outline is the "not the authoritative copy" signal, for
            both a snapshot and a denied file — and the second line spells it
            out in words. A separate badge saying the same thing was a third
            statement of one fact on a line with no room to spare. Only the
            colour survives it: denied is the case the user can act on, and
            red is what distinguishes it from a snapshot, which is simply what
            the file is. Not colour alone — the accessible name below carries
            the same split for anyone who cannot see it. */}
        <span
          role="img"
          aria-label={
            snapshot
              ? 'Offline copy — not tracked on disk'
              : denied
                ? 'Cached copy — access denied'
                : 'Live file'
          }
          style={{ color: denied ? 'var(--danger)' : snapshot ? 'var(--chrome-muted)' : 'var(--link)', display: 'flex' }}
          title={
            snapshot
              ? 'A snapshot taken when the file was opened. Not tracked on disk, so it will not pick up outside edits.'
              : denied
                ? 'Access to the file on disk was denied. This is a cached copy — open the row menu to grant access again.'
                : 'Live — re-read from disk'
          }
        >
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
        {/* Status only, no controls: everything actionable lives in ⋯ below.
            What is left here is what the file icon and the size line cannot
            already say: storage dropping the file, and where sync stands. */}
        {unsaved && (
          <span
            role="img"
            aria-label="Not saved — storage is full"
            title="Storage is full — this file is open now but will not be here after a reload."
            style={{ flex: 'none', display: 'flex', color: 'var(--danger)' }}
          >
            <NotSavedIcon />
          </span>
        )}
        <SyncStatusIcon name={f.name} />
        <span
          title="Unsaved edits"
          style={{ flex: 'none', width: 6, height: 6, borderRadius: '50%', background: 'var(--link)', opacity: isDirty(f.name) ? 1 : 0 }}
        />
        {/* One menu for everything this row can do — sync, filing, and closing.
            Dragging is still the quicker way to file a row, but it is not
            available everywhere: touch devices raise no drag events at all, so
            on the mobile drawer this menu is the only way to group anything. */}
        <span
          onClick={(e) => onOpenMenu(e, f.name)}
          // No filename in the tooltip: the accessible name below carries it,
          // and a title ending in ".md" would be indistinguishable from the
          // filename cell's own title to anything matching on that.
          title="Row actions"
          role="button"
          aria-label={`Actions for ${f.name}`}
          aria-haspopup="menu"
          // Ghost only while its menu is closed, and only while it is actually
          // visible: the hidden state is opacity, not unmounting, so without
          // the second guard a wash would appear under a pointer crossing a
          // control that is not there.
          {...(menu !== null || !showControls ? null : { 'data-chrome-btn': '' })}
          style={{
            flex: 'none',
            width: 16,
            height: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 4,
            cursor: 'pointer',
            background: menu !== null ? 'var(--chrome-hl)' : 'transparent',
            color: 'var(--chrome-muted)',
            // Hidden rather than unmounted: a row that adds a control on hover
            // would reflow its own title line under the pointer, and the name
            // would shift out from under a click already on its way down.
            // Full strength once its menu is open: the glyph is the anchor for
            // the panel below it, and a half-faded anchor reads as disabled.
            opacity: showControls ? (menu !== null ? 1 : 0.75) : 0,
            pointerEvents: showControls ? 'auto' : 'none',
            transition: 'opacity .12s, background .12s',
            fontSize: 13,
            lineHeight: 1,
          }}
        >
          ⋯
        </span>
      </div>
      {/* The second line, on every row. For a live file these are disk-backed
          facts: the FS Access API never exposes a real path, so size + mtime
          are the only things that tell two same-named files apart and confirm
          a re-read saw the edit. A snapshot has no handle to stat, so it says
          how big the copy it is holding is, and names it as a copy — the row
          keeps its height either way, and a list where one row is shorter for
          a reason the user cannot see reads as a rendering glitch. */}
      <div
        style={{
          paddingLeft: 20,
          fontSize: 10,
          color: 'var(--chrome-muted)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={secondLineTitle(f)}
      >
        {secondLine(f)}
      </div>
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
        // Same ghost-while-closed rule as the row's ⋯ and the header's +.
        {...(menuOpen ? null : { 'data-chrome-btn': '' })}
        style={{
          flex: 'none',
          width: 16,
          height: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 4,
          cursor: 'pointer',
          background: menuOpen ? 'var(--chrome-hl)' : 'transparent',
          color: 'var(--chrome-muted)',
          opacity: menuOpen ? 1 : 0.6,
          transition: 'opacity .12s, background .12s',
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
  onGitHub,
  onPickFile,
  onCloseFile,
  onGrantAccess,
  onOpenFileClick,
  onNewFile,
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
  // True while the name field for a new file is open. A field rather than an
  // immediate "Untitled.md" the user renames afterwards: the library keys files
  // by name and has no rename, so the one chance to name a document is before
  // it exists.
  const [namingFile, setNamingFile] = useState(false);
  // Id of the folder awaiting a destructive-delete confirmation, or null.
  const [confirmDeleteFolder, setConfirmDeleteFolder] = useState<string | null>(null);
  // Name of the file awaiting a close confirmation, or null. Only ever set for
  // a file with a copy on GitHub — closing anything else destroys nothing that
  // is not already on disk, and asking about it would be noise.
  const [confirmClose, setConfirmClose] = useState<string | null>(null);
  // Name of the row currently being dragged, used only to dim it. Held here
  // rather than in each row so the drop targets below can also read it.
  const [draggingFile, setDraggingFile] = useState<string | null>(null);
  // Name of the row whose "move to folder" menu is open, or null.
  const [rowMenu, setRowMenu] = useState<string | null>(null);
  const [folderMenu, setFolderMenu] = useState<string | null>(null);
  // Whether the + beside the Files header has its menu open.
  const [addMenu, setAddMenu] = useState(false);
  const [renamingFolder, setRenamingFolder] = useState<string | null>(null);
  // Drop target under the cursor: a folder id, or 'root' for the ungrouped
  // area. Null when no internal drag is over anything droppable.
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  // True while the open row menu has swapped itself for a confirmation. The
  // dismiss handlers below stand down for it: that dialog is owned by the menu,
  // so closing the menu would take the question off screen mid-decision — and
  // its own backdrop and Escape key already cancel it.
  const [rowDialogOpen, setRowDialogOpen] = useState(false);

  // One menu at a time, and Escape closes whichever is open. Attached only
  // while something is open so the app is not carrying a keydown listener for
  // the entire session.
  const anyMenuOpen = (rowMenu !== null || folderMenu !== null || addMenu) && !rowDialogOpen;
  useEffect(() => {
    if (!anyMenuOpen) return;
    const closeAll = () => {
      setRowMenu(null);
      setFolderMenu(null);
      setAddMenu(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeAll();
    };
    const onDown = (e: MouseEvent) => {
      const target = e.target as Element | null;
      // Ignore presses that land inside a menu. mousedown fires before click,
      // so closing unconditionally would unmount the item under the cursor
      // between press and release — mouseup would then land on nothing, no
      // click event would ever be synthesized, and every menu item would look
      // dead. stopPropagation on the panel does not help: it only stops click.
      if (target?.closest('[role="menu"]')) return;
      // And ignore the trigger that opened it, for a near-identical reason one
      // step earlier: every trigger here toggles, so closing on its mousedown
      // leaves the click that follows reopening what the user was trying to
      // shut. Matched on aria-haspopup so all three — row ⋯, folder ⋯, and the
      // + — behave the same way without each having to opt in.
      if (target?.closest('[aria-haspopup="menu"]')) return;
      closeAll();
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
    setAddMenu(false);
    setRowDialogOpen(false);
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

  // Closing a file that exists only here is not destructive enough to interrupt
  // for; closing one that also lives on GitHub deletes it there too, which is,
  // and nothing about a small × says so.
  const requestClose = (name: string) => {
    if (onGitHub(name)) setConfirmClose(name);
    else onCloseFile(name);
  };

  // Every action a row can take, in one menu.
  //
  // It holds the sync controls, the folder moves and the close, because the row
  // itself now shows status only — a synced file used to stack up to four lines
  // of word-buttons under its name, which cost more list than the file did.
  //
  // Shown on every device rather than only where drag is absent. On touch it is
  // the only way to file anything — HTML5 drag events never fire from a touch
  // gesture, and this app ships a mobile drawer. On desktop it still beats
  // dragging for a run of files, and for a list long enough that the drag would
  // need the container to auto-scroll, which it does not.
  const renderRowMenu = (f: LibraryFile) => {
    if (rowMenu !== f.name) return null;
    return (
      <RowMenu
        f={f}
        folders={groups.ordered}
        onClose={() => {
          setRowMenu(null);
          setRowDialogOpen(false);
        }}
        onMoveFileToFolder={onMoveFileToFolder}
        onGrantAccess={onGrantAccess}
        onCloseFile={requestClose}
        onGitHub={onGitHub}
        onDialogOpenChange={setRowDialogOpen}
      />
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
          {/* Bringing in a document that already exists. Making one that does
              not lives under the + beside the Files header, next to the list the
              new row appears in — the two are different enough that pairing
              them here would have read as two spellings of one action. */}
          <button
            onClick={onOpenFileClick}
            // Unconditional: unlike the menu triggers this has no open state to
            // protect, so it is always in its ghost form.
            data-chrome-btn=""
            style={{
              width: '100%',
              height: 32,
              transition: 'background .12s',
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
          {/* One + for both things the list can gain, rather than a button per
              kind. The two are the same gesture — "add something here" — and
              they differ only in what comes next, which is what a menu is for.
              A second icon beside this one would have to be legible at 18px as
              "folder, not file", and nothing at that size reliably is. */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setRowMenu(null);
              setFolderMenu(null);
              setAddMenu((prev) => !prev);
            }}
            title="New file or folder"
            aria-label="New file or folder"
            aria-haspopup="menu"
            aria-expanded={addMenu}
            // Ghost only while closed. Open, it holds the same tint to show
            // which trigger the panel below belongs to, and the hover rule
            // would wash it back to the header on the way past.
            {...(addMenu ? null : { 'data-chrome-btn': '' })}
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
              // Square-ish target at 18px, so the wash reads as a button rather
              // than a stray tinted rectangle behind the glyph.
              borderRadius: 4,
              background: addMenu ? 'var(--chrome-hl)' : 'transparent',
              color: addMenu ? 'var(--chrome-fg)' : 'var(--chrome-muted)',
              cursor: 'pointer',
              transition: 'background .12s, color .12s',
            }}
          >
            <PlusIcon />
          </button>
          {addMenu && (
            <div role="menu" style={MENU_PANEL} onClick={(e) => e.stopPropagation()}>
              {/* File first: it is the one people came here for. Both open a
                  name field rather than acting outright — a folder's is the
                  header it just made, a file's is the row below. */}
              <MenuItem
                label="New file"
                onSelect={() => {
                  setAddMenu(false);
                  setNamingFile(true);
                }}
              />
              <MenuItem
                label="New folder"
                onSelect={() => {
                  setAddMenu(false);
                  createFolderAndSelect();
                }}
              />
            </div>
          )}
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
          {/* Sits in the list rather than up by the Open button, because it
              stands in for the row it is about to become — the same place a new
              folder gets its name field, one gesture from the same +. */}
          {namingFile && (
            <input
              autoFocus
              aria-label="New file name"
              placeholder={NEW_FILE_PLACEHOLDER}
              onClick={(e) => e.stopPropagation()}
              // Committing on blur, like the folder rename field: clicking away
              // from a field you have typed a name into reads as "done", not as
              // "discard". An untouched field is the exception — a stray click
              // that opened this must not leave a document behind.
              onBlur={(e) => {
                if (e.currentTarget.dataset.cancelled !== 'true' && e.currentTarget.value.trim()) {
                  onNewFile(e.currentTarget.value);
                }
                setNamingFile(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  // Empty is allowed here and only here: pressing Enter on the
                  // placeholder is a deliberate "just give me a file", and the
                  // library names it. Blur cannot tell that from a stray click.
                  onNewFile(e.currentTarget.value);
                  e.currentTarget.dataset.cancelled = 'true';
                  setNamingFile(false);
                }
                // Marked before blurring, and read from the DOM rather than
                // from state, for the same reason as the folder field: blur()
                // runs synchronously inside this handler, long before React has
                // committed anything a state flag would have set.
                if (e.key === 'Escape') {
                  e.currentTarget.dataset.cancelled = 'true';
                  setNamingFile(false);
                  e.currentTarget.blur();
                }
              }}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                height: 26,
                margin: '2px 0 4px',
                padding: '0 8px',
                font: 'inherit',
                fontSize: 12,
                color: 'var(--chrome-fg)',
                background: 'var(--chrome-hl)',
                border: '1px solid var(--link)',
                borderRadius: 6,
                outline: 'none',
              }}
            />
          )}
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
                    setAddMenu(false);
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
                        onDragStart={startRowDrag}
                        onDragEnd={endRowDrag}
                        dragging={draggingFile === f.name}
                        onOpenMenu={openRowMenu}
                        alwaysShowControls={isMobile}
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
                onDragStart={startRowDrag}
                onDragEnd={endRowDrag}
                dragging={draggingFile === f.name}
                onOpenMenu={openRowMenu}
                alwaysShowControls={isMobile}
                menu={renderRowMenu(f)}
              />
            ))}
          </div>
          {/* Gists on the account with no local copy — the other device's files.
              Renders nothing when signed out or when everything is already here. */}
          <RemoteFileList />
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
      {confirmClose && (
        <ConfirmDialog
          title={`Close “${confirmClose}”?`}
          // Reached only for a file that is on GitHub, so the remote sentences
          // always apply — hence the literal 1 rather than a recount.
          message={[
            { text: 'Removes it from this device.' },
            ...remoteDeletionSentences(1),
            { text: 'This cannot be undone.' },
          ]}
          confirmLabel="Close and delete"
          danger
          onConfirm={() => {
            const name = confirmClose;
            setConfirmClose(null);
            onCloseFile(name);
          }}
          onCancel={() => setConfirmClose(null)}
        />
      )}
      {confirmClear && (
        <ConfirmDialog
          title="Clear all files?"
          message={buildClearAllMessage(files, isDirty, onGitHub)}
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
            onGitHub,
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
