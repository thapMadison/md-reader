import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createFakeStorageService } from '@/services/storage/fakeStorage';
import { StorageProvider } from '@/services/storage/StorageContext';
import { ThemeProvider } from '@/features/theming/ThemeContext';
import { BUILTIN_THEMES } from '@/themes/builtin';
import { SIDEBAR_FACETS } from './chromePatternStyles';
import { Sidebar } from './Sidebar';
import type { Folder, LibraryFile } from '@/features/library/types';

const file = (name: string, over: Partial<LibraryFile> = {}): LibraryFile => ({
  name,
  kind: 'live',
  perm: 'granted',
  originalContent: 'x',
  editedContent: 'x',
  ...over,
});

const folder = (id: string, name: string, order = 0): Folder => ({ id, name, order });

// Every folder prop defaults to something inert, so the tests written before
// folders existed pass unchanged — which is the signal that the flat list did
// not regress.
interface SetupOptions {
  folders?: Folder[];
  selectedFolderId?: string | null;
  collapsedFolders?: string[];
  mode?: 'desktop' | 'mobile';
  /** Names with a copy on GitHub. Empty by default, which is the un-synced app. */
  onGitHub?: string[];
  /** Names storage could not persist — the quota-exceeded case. */
  unpersisted?: string[];
}

const setup = (
  files: LibraryFile[],
  isDirty: (name: string) => boolean = () => false,
  opts: SetupOptions = {},
) => {
  const onClearAll = vi.fn();
  const onCreateFolder = vi.fn(() => 'new-id');
  const onRenameFolder = vi.fn();
  const onUngroupFolder = vi.fn();
  const onDeleteFolderAndFiles = vi.fn();
  const onMoveFileToFolder = vi.fn();
  const onSelectFolder = vi.fn();
  const onToggleFolderCollapsed = vi.fn();
  const onCloseFile = vi.fn();
  const onGrantAccess = vi.fn();
  const onNewFile = vi.fn();
  const synced = new Set(opts.onGitHub ?? []);
  const unpersisted = new Set(opts.unpersisted ?? []);
  const { unmount } = render(
    <Sidebar
      mode={opts.mode ?? 'desktop'}
      sidebarOpen
      drawerOpen={opts.mode === 'mobile'}
      onToggleDrawer={() => {}}
      files={files}
      activeName={files[0]?.name ?? null}
      isDirty={isDirty}
      isUnpersisted={(name) => unpersisted.has(name)}
      onGitHub={(name) => synced.has(name)}
      onPickFile={() => {}}
      onCloseFile={onCloseFile}
      onGrantAccess={onGrantAccess}
      onOpenFileClick={() => {}}
      onNewFile={onNewFile}
      storageUsedBytes={1024 * 1024}
      storageQuotaBytes={10 * 1024 * 1024}
      onClearAll={onClearAll}
      folders={opts.folders ?? []}
      selectedFolderId={opts.selectedFolderId ?? null}
      collapsedFolders={opts.collapsedFolders ?? []}
      onSelectFolder={onSelectFolder}
      onToggleFolderCollapsed={onToggleFolderCollapsed}
      onCreateFolder={onCreateFolder}
      onRenameFolder={onRenameFolder}
      onUngroupFolder={onUngroupFolder}
      onDeleteFolderAndFiles={onDeleteFolderAndFiles}
      onMoveFileToFolder={onMoveFileToFolder}
    />,
  );
  return {
    unmount,
    onClearAll,
    onCloseFile,
    onGrantAccess,
    onCreateFolder,
    onRenameFolder,
    onUngroupFolder,
    onDeleteFolderAndFiles,
    onMoveFileToFolder,
    onSelectFolder,
    onToggleFolderCollapsed,
    onNewFile,
  };
};

// jsdom has no DataTransfer constructor, so drag tests hand-roll one. `types`
// is snapshotted at construction the way the real object reports it, so the
// payload has to be supplied up front.
const dataTransfer = (data: Record<string, string>) => ({
  types: Object.keys(data),
  files: [] as unknown as FileList,
  dropEffect: 'none',
  effectAllowed: 'none',
  setData: (type: string, value: string) => {
    data[type] = value;
  },
  getData: (type: string) => data[type] ?? '',
});

// Scoped to the nav: once the dialog opens, its confirm button shares this label.
const clickClearAll = () =>
  fireEvent.click(within(screen.getByRole('navigation')).getByRole('button', { name: 'Clear all' }));

describe('Sidebar live-file identity line', () => {
  it('shows size and a relative mtime so the user can tell which file this is', () => {
    setup([file('a.md', { size: 2048, lastModified: Date.now() - 5 * 60_000 })]);

    expect(screen.getByText(/2\.0 KB/)).toBeInTheDocument();
    expect(screen.getByText(/5 min ago/)).toBeInTheDocument();
  });

  it('exposes the exact timestamp on hover, since the row only has room for a rough one', () => {
    const lastModified = Date.now() - 5 * 60_000;
    setup([file('a.md', { size: 2048, lastModified })]);

    expect(screen.getByText(/2\.0 KB/).title).toContain(new Date(lastModified).toLocaleString());
  });

  it('omits the line for snapshots, which have no disk file backing them', () => {
    setup([file('a.md', { kind: 'snapshot', perm: 'na', size: undefined })]);

    expect(screen.queryByText(/KB|B$/)).toBeNull();
  });
});

describe('Sidebar add menu', () => {
  const openAddMenu = async (user: ReturnType<typeof userEvent.setup>) =>
    user.click(screen.getByRole('button', { name: 'New file or folder' }));

  // One + for both, because they are the same gesture — "add something to this
  // list" — differing only in what comes next.
  it('offers both things the list can gain', async () => {
    const user = userEvent.setup();
    setup([file('a.md')]);

    await openAddMenu(user);

    expect(screen.getByRole('menuitem', { name: 'New file' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'New folder' })).toBeInTheDocument();
  });

  it('drops its ghost styling while open, so hover cannot wash it out', async () => {
    // data-chrome-btn is what index.css hangs the hover wash on. Open, the +
    // already holds that tint to show which trigger the panel belongs to, and
    // leaving the attribute on would fade it back to the header mid-hover.
    const user = userEvent.setup();
    setup([file('a.md')]);

    const trigger = screen.getByRole('button', { name: 'New file or folder' });
    expect(trigger).toHaveAttribute('data-chrome-btn');

    await openAddMenu(user);
    expect(trigger).not.toHaveAttribute('data-chrome-btn');

    await openAddMenu(user);
    expect(trigger).toHaveAttribute('data-chrome-btn');
  });

  it('creates nothing until one of them is picked', async () => {
    const user = userEvent.setup();
    const { onNewFile, onCreateFolder } = setup([file('a.md')]);

    await openAddMenu(user);

    expect(onNewFile).not.toHaveBeenCalled();
    expect(onCreateFolder).not.toHaveBeenCalled();
  });

  it('still makes a folder, which used to be all the + did', async () => {
    const user = userEvent.setup();
    const { onCreateFolder, onSelectFolder } = setup([file('a.md')]);

    await openAddMenu(user);
    await user.click(screen.getByRole('menuitem', { name: 'New folder' }));

    expect(onCreateFolder).toHaveBeenCalledWith('New folder');
    // Selected too, so the next file added lands in the folder just created.
    expect(onSelectFolder).toHaveBeenCalledWith('new-id');
  });

  // Every trigger in this sidebar toggles, and the window-level mousedown
  // handler that dismisses menus runs before the click that would reopen one.
  it('closes when its own + is clicked again', async () => {
    const user = userEvent.setup();
    setup([file('a.md')]);

    await openAddMenu(user);
    await openAddMenu(user);

    expect(screen.queryByRole('menuitem', { name: 'New file' })).toBeNull();
  });
});

describe('Sidebar new file', () => {
  const openNameField = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(screen.getByRole('button', { name: 'New file or folder' }));
    await user.click(screen.getByRole('menuitem', { name: 'New file' }));
    return screen.getByLabelText('New file name');
  };

  it('asks for a name before creating anything — the library has no rename', async () => {
    const user = userEvent.setup();
    const { onNewFile } = setup([file('a.md')]);

    await openNameField(user);

    expect(onNewFile).not.toHaveBeenCalled();
  });

  it('creates the file on Enter, passing the typed name through untouched', async () => {
    const user = userEvent.setup();
    const { onNewFile } = setup([file('a.md')]);

    const input = await openNameField(user);
    await user.type(input, 'Meeting notes{Enter}');

    expect(onNewFile).toHaveBeenCalledWith('Meeting notes');
    expect(screen.queryByLabelText('New file name')).toBeNull();
  });

  // Pressing Enter on the placeholder is a deliberate "just give me a file";
  // the library is what turns the empty string into a name.
  it('still creates a file when Enter is pressed on an empty field', async () => {
    const user = userEvent.setup();
    const { onNewFile } = setup([file('a.md')]);

    const input = await openNameField(user);
    await user.type(input, '{Enter}');

    expect(onNewFile).toHaveBeenCalledWith('');
  });

  it('creates nothing on Escape, so an abandoned name leaves no document behind', async () => {
    const user = userEvent.setup();
    const { onNewFile } = setup([file('a.md')]);

    const input = await openNameField(user);
    await user.type(input, 'Draft{Escape}');

    expect(onNewFile).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('New file name')).toBeNull();
  });

  // Clicking away from a name you typed reads as "done"; clicking away from a
  // field you never touched must not leave a blank file in the library.
  it('commits a typed name on blur but drops an untouched field', async () => {
    const user = userEvent.setup();
    const { onNewFile } = setup([file('a.md')]);

    const first = await openNameField(user);
    fireEvent.blur(first);
    expect(onNewFile).not.toHaveBeenCalled();

    const second = await openNameField(user);
    await user.type(second, 'Draft');
    fireEvent.blur(second);
    expect(onNewFile).toHaveBeenCalledWith('Draft');
  });
});

describe('Sidebar clear-all confirmation', () => {
  it('does not clear anything on the first click — it opens a confirmation', () => {
    const { onClearAll } = setup([file('a.md')]);

    clickClearAll();

    expect(onClearAll).not.toHaveBeenCalled();
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });

  it('clears only after the confirm button is pressed', () => {
    const { onClearAll } = setup([file('a.md')]);

    clickClearAll();
    const dialog = screen.getByRole('alertdialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Clear all' }));

    expect(onClearAll).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('cancelling leaves the library untouched and closes the dialog', () => {
    const { onClearAll } = setup([file('a.md')]);

    clickClearAll();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onClearAll).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('closes on Escape without clearing', () => {
    const { onClearAll } = setup([file('a.md')]);

    clickClearAll();
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClearAll).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('focuses Cancel so a stray Enter cannot destroy the library', () => {
    setup([file('a.md')]);

    clickClearAll();

    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cancel' }));
  });

  it('is disabled when there is nothing to clear', () => {
    const { onClearAll } = setup([]);

    const btn = screen.getByRole('button', { name: 'Clear all' });
    expect(btn).toBeDisabled();
    fireEvent.click(btn);

    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(onClearAll).not.toHaveBeenCalled();
  });

  it('warns about unsaved edits and unrecoverable snapshots by name', () => {
    setup(
      [file('a.md'), file('b.md', { kind: 'snapshot' }), file('c.md', { kind: 'snapshot' })],
      (name) => name === 'a.md',
    );

    clickClearAll();

    const msg = screen.getByRole('alertdialog').textContent ?? '';
    expect(msg).toContain('all 3 files');
    expect(msg).toContain('1 file has unsaved edits');
    expect(msg).toContain('2 are snapshots');
    expect(msg).toContain('cannot be undone');
  });

  it('omits the edit and snapshot warnings when neither applies', () => {
    setup([file('a.md')]);

    clickClearAll();

    const msg = screen.getByRole('alertdialog').textContent ?? '';
    expect(msg).toContain('all 1 file');
    expect(msg).not.toContain('unsaved edits');
    expect(msg).not.toContain('snapshot');
  });

  it('says the GitHub copies go too, but only counting the files that have one', () => {
    setup([file('a.md'), file('b.md'), file('c.md')], () => false, {
      onGitHub: ['a.md', 'b.md'],
    });

    clickClearAll();

    const msg = screen.getByRole('alertdialog').textContent ?? '';
    expect(msg).toContain('2 files are on GitHub');
    expect(msg).toContain('permanently deleted from your account');
    expect(msg).toContain('keep their copies');
  });

  it('stays silent about GitHub when nothing is on it', () => {
    setup([file('a.md'), file('b.md')]);

    clickClearAll();

    expect(screen.getByRole('alertdialog').textContent ?? '').not.toContain('GitHub');
  });

  it('sets the unrecoverable losses apart instead of running them into one paragraph', () => {
    // Three consequences at one weight read as one grey block, and the eye
    // skims it — so the sentence about permanent deletion lands with the same
    // force as the one about freeing disk space. Each gets its own line, and
    // the ones with no way back are coloured.
    setup([file('a.md'), file('b.md', { kind: 'snapshot' })], (name) => name === 'a.md', {
      onGitHub: ['a.md'],
    });

    clickClearAll();

    const lines = within(screen.getByRole('alertdialog')).getAllByRole('listitem');
    const severe = lines.filter((li) => li.style.color === 'var(--danger)').map((li) => li.textContent ?? '');

    // The two with no way back: edits exist only in memory, and a deleted gist
    // takes its history with it.
    expect(severe).toHaveLength(2);
    expect(severe.join(' ')).toContain('unsaved edits');
    expect(severe.join(' ')).toContain('permanently deleted from your account');

    // And not everything, or the emphasis says nothing. The snapshot line is
    // recoverable — the file is still on disk — and the reassurance is the
    // opposite of a warning.
    const calm = lines.filter((li) => li.style.color !== 'var(--danger)').map((li) => li.textContent ?? '');
    expect(calm.join(' ')).toContain('cannot be reopened from disk');
    expect(calm.join(' ')).toContain('keep their copies');
  });
});

// Closing a row used to be free of consequence: the file stayed on disk, and
// re-opening it cost one click. With sync it also deletes the copy on GitHub,
// which no small × conveyed — so the ones that destroy something ask first, and
// the ones that do not are left alone.
//
// The × itself is gone; closing is now an item in the row's ⋯ menu alongside
// everything else the row can do, which is why these go through the menu.
describe('Sidebar close confirmation', () => {
  const clickClose = (name: string) => {
    fireEvent.click(screen.getByRole('button', { name: `Actions for ${name}` }));
    fireEvent.click(screen.getByRole('menuitem', { name: /^Close/ }));
  };

  it('closes a file that is only on this device without asking', () => {
    const { onCloseFile } = setup([file('a.md')]);

    clickClose('a.md');

    expect(onCloseFile).toHaveBeenCalledWith('a.md');
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('asks before closing a file whose copy on GitHub goes with it', () => {
    const { onCloseFile } = setup([file('a.md')], () => false, { onGitHub: ['a.md'] });

    clickClose('a.md');

    const dialog = screen.getByRole('alertdialog');
    expect(dialog.textContent).toContain('a.md');
    expect(dialog.textContent).toContain('permanently deleted from your account');
    // The point of the dialog: nothing has happened yet.
    expect(onCloseFile).not.toHaveBeenCalled();
  });

  it('closes once the user confirms', () => {
    const { onCloseFile } = setup([file('a.md')], () => false, { onGitHub: ['a.md'] });

    clickClose('a.md');
    fireEvent.click(screen.getByRole('button', { name: 'Close and delete' }));

    expect(onCloseFile).toHaveBeenCalledTimes(1);
    expect(onCloseFile).toHaveBeenCalledWith('a.md');
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('keeps the file when the user backs out', () => {
    const { onCloseFile } = setup([file('a.md')], () => false, { onGitHub: ['a.md'] });

    clickClose('a.md');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onCloseFile).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('warns in the menu label itself, so the consequence is visible before the click', () => {
    setup([file('a.md'), file('b.md')], () => false, { onGitHub: ['a.md'] });

    fireEvent.click(screen.getByRole('button', { name: 'Actions for a.md' }));
    expect(screen.getByRole('menuitem', { name: 'Close and delete from GitHub' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Actions for b.md' }));
    expect(screen.getByRole('menuitem', { name: 'Close file' })).toBeInTheDocument();
  });
});

// A synced row used to carry up to four stacked lines — a size line, a badge
// line and a line of sync word-buttons — so a dozen files filled the panel with
// controls rather than filenames. The row is now two lines that never grow:
// name plus status glyphs, then size and mtime. Everything actionable moved
// into one ⋯ menu.
describe('Sidebar row: status out, actions in the menu', () => {
  it('keeps the row to its two lines no matter how much state a file carries', () => {
    // The worst case the old layout had: a live file that is dirty, denied and
    // unpersistable at once. It used to stack a badge line under the size line;
    // now every one of those conditions is a glyph on the title line.
    setup([file('a.md', { perm: 'denied', size: 2048, lastModified: Date.now() })], () => true, {
      unpersisted: ['a.md'],
    });

    const row = screen.getByTitle('a.md').closest('div')?.parentElement as HTMLElement;
    // The title line and the size line, and nothing stacked beneath them.
    expect(row.children).toHaveLength(2);
    // All three conditions still stated, just not as extra rows.
    expect(screen.getByRole('img', { name: /not saved/i })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /cached copy/i })).toBeInTheDocument();
    expect(screen.getByTitle('Unsaved edits')).toBeInTheDocument();
  });

  it('gives a snapshot the same two lines as a live file, sized from its own copy', () => {
    // A snapshot has no handle to stat, so it has no disk size — and the row
    // used to drop its second line entirely, leaving a list where some rows
    // were shorter than others for a reason nothing on screen explained.
    setup([file('a.md', { kind: 'snapshot', editedContent: 'x'.repeat(2048) })], () => false, {});

    const row = screen.getByTitle('a.md').closest('div')?.parentElement as HTMLElement;
    expect(row.children).toHaveLength(2);
    // Sized from the bytes it is holding, and named as a copy so the number is
    // not read as a disk fact the way "2.0 KB · Aug 4" would be.
    expect(row).toHaveTextContent(/2\.0 KB · offline copy/);
  });

  it('measures the offline size in bytes, not characters', () => {
    // Sits directly under disk sizes, which are bytes. A document of em dashes
    // would otherwise report a third of its real weight.
    setup([file('a.md', { kind: 'snapshot', editedContent: '—'.repeat(1024) })], () => false, {});

    // 1024 em dashes = 3072 UTF-8 bytes, not 1024.
    const row = screen.getByTitle('a.md').closest('div')?.parentElement as HTMLElement;
    expect(row).toHaveTextContent(/3\.0 KB · offline copy/);
  });

  it('states each condition as a shape with a label, not a colour alone', () => {
    // The glyphs replace words, so they have to carry the same meaning to a
    // screen reader — and to anyone who cannot separate the red one from the
    // grey one by colour.
    setup([file('a.md', { kind: 'snapshot' })], () => false, {});

    expect(screen.getByRole('img', { name: /offline copy/i })).toBeInTheDocument();
  });

  it('tells a snapshot from a denied file on the icon alone', () => {
    // These two share the dashed outline, and the separate badge that used to
    // spell out which one this was is gone — it was a third statement of what
    // the icon and the size line already said. What it must not take with it
    // is the distinction: only one of the two is something the user can fix,
    // and red carries that visually but not to a screen reader.
    const { unmount } = setup([file('a.md', { kind: 'snapshot' })], () => false, {});
    expect(screen.getByRole('img', { name: /offline copy/i })).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /access denied/i })).not.toBeInTheDocument();
    unmount();

    setup([file('b.md', { perm: 'denied' })], () => false, {});
    const denied = screen.getByRole('img', { name: /cached copy — access denied/i });
    // The recovery path is named where the user is looking when they wonder.
    expect(denied).toHaveAttribute('title', expect.stringMatching(/grant access/i));
  });

  it('warns in words, not just an icon, when storage will drop the file', () => {
    // The one condition where the user loses work by doing nothing at all, so
    // its glyph is the filled one and its label says what happens.
    setup([file('a.md')], () => false, { unpersisted: ['a.md'] });

    const badge = screen.getByRole('img', { name: /not saved/i });
    expect(badge).toHaveAttribute('title', expect.stringMatching(/will not be here after a reload/i));
  });

  it('offers Grant access in the menu for a file whose permission lapsed', () => {
    // It used to be a word on the row. Nothing else in the menu matters while
    // the file cannot be re-read, so it goes first.
    const { onGrantAccess } = setup([file('a.md', { perm: 'prompt' })]);

    fireEvent.click(screen.getByRole('button', { name: 'Actions for a.md' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Grant access' }));

    expect(onGrantAccess).toHaveBeenCalledWith('a.md');
  });

  it('keeps ⋯ reachable on touch, where there is no hover to reveal it', () => {
    // The reveal-on-hover that keeps the desktop list quiet would otherwise
    // leave the mobile drawer with no way to file, sync or close anything.
    setup([file('a.md'), file('b.md')], () => false, { mode: 'mobile' });

    // b.md is not the active row, so only the always-on rule can be showing it.
    const menuButton = screen.getByRole('button', { name: 'Actions for b.md' });
    expect(menuButton).toBeVisible();
    expect(menuButton).toHaveStyle({ opacity: '0.75' });
  });

  it('hides ⋯ on a resting desktop row and shows it on hover', () => {
    setup([file('a.md'), file('b.md')]);

    // a.md is active, so b.md is the row with nothing keeping its ⋯ visible.
    const menuButton = screen.getByRole('button', { name: 'Actions for b.md' });
    expect(menuButton).toHaveStyle({ opacity: '0' });

    fireEvent.mouseEnter(screen.getByTitle('b.md').closest('div')?.parentElement as HTMLElement);
    expect(menuButton).toHaveStyle({ opacity: '0.75' });
  });

  it('tints a hovered row without letting it read as the active one', () => {
    // Two states that can be on screen at once — the pointer resting on an
    // inactive row while another file is open — so the fills have to differ.
    setup([file('a.md'), file('b.md')]);

    const row = screen.getByTitle('b.md').closest('div')?.parentElement as HTMLElement;
    const activeRow = screen.getByTitle('a.md').closest('div')?.parentElement as HTMLElement;
    const resting = row.style.background;

    fireEvent.mouseEnter(row);
    expect(row.style.background).not.toBe(resting);
    expect(row.style.background).not.toBe(activeRow.style.background);

    fireEvent.mouseLeave(row);
    expect(row.style.background).toBe(resting);
  });

  it('keeps the active row on its own fill while hovered', () => {
    // The stronger fill wins: hover must not dim the file being read.
    setup([file('a.md'), file('b.md')]);

    const activeRow = screen.getByTitle('a.md').closest('div')?.parentElement as HTMLElement;
    const before = activeRow.style.background;
    fireEvent.mouseEnter(activeRow);
    expect(activeRow.style.background).toBe(before);
  });

  it('keeps ⋯ visible while its own menu is open', () => {
    // The menu hangs below the row, so reaching it means leaving the row. A ⋯
    // that vanished on mouseleave would take the open menu's anchor with it.
    setup([file('a.md'), file('b.md')]);

    const menuButton = screen.getByRole('button', { name: 'Actions for b.md' });
    const row = screen.getByTitle('b.md').closest('div')?.parentElement as HTMLElement;
    fireEvent.mouseEnter(row);
    fireEvent.click(menuButton);
    fireEvent.mouseLeave(row);

    // Visible, not a particular opacity: an open ⋯ sits at full strength rather
    // than the 0.75 it rests at, and what this protects is that it did not fade
    // out from under the menu — not which of the two visible values it took.
    expect(menuButton).not.toHaveStyle({ opacity: '0' });
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });
});

// Folders are a view over the same flat library — no file moves on disk, and
// the storage meter counts every file whether or not it is grouped. What these
// guard is that grouping never loses a file, never reorders one, and that the
// two ways of removing a folder stay distinguishable at the point of decision.
describe('Sidebar folders', () => {
  const groupOf = (name: string) => screen.getByTitle(name).closest('div')?.parentElement as HTMLElement;

  it('renders ungrouped files exactly as before when no folders exist', () => {
    setup([file('a.md'), file('b.md')]);

    expect(screen.getByTitle('a.md')).toBeInTheDocument();
    expect(screen.getByTitle('b.md')).toBeInTheDocument();
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('keeps the filename cell exactly one level inside its row', () => {
    // Pins the shape the accent-shape tests depend on. Without this, adding a
    // wrapper inside a row shows up as four confusing style failures elsewhere
    // instead of one failure that names the cause.
    setup([file('a.md', { folderId: 'f1' })], () => false, { folders: [folder('f1', 'Docs')] });

    const row = groupOf('a.md');
    expect(row.style.cursor).toBe('pointer');
    expect(row.style.flexDirection).toBe('column');
  });

  it('shows a file under its folder rather than in the root list', () => {
    setup([file('a.md', { folderId: 'f1' }), file('b.md')], () => false, {
      folders: [folder('f1', 'Docs')],
    });

    // The header reports one member, so a.md is inside and b.md is not.
    expect(screen.getByTitle('Docs — 1 file')).toBeInTheDocument();
    expect(screen.getByTitle('b.md')).toBeInTheDocument();
  });

  it('keeps a file visible in the root list when its folder was deleted from preferences', () => {
    // A file that is invisible in the list while still counted in the storage
    // meter is the worst outcome available here, so a dangling folderId falls
    // back to the ungrouped list rather than vanishing.
    setup([file('a.md', { folderId: 'gone' })], () => false, { folders: [folder('f1', 'Docs')] });

    expect(screen.getByTitle('a.md')).toBeInTheDocument();
    expect(screen.getByTitle('Docs — 0 files')).toBeInTheDocument();
  });

  it('hides a collapsed folder’s files but still reports how many are inside', () => {
    setup([file('a.md', { folderId: 'f1' })], () => false, {
      folders: [folder('f1', 'Docs')],
      collapsedFolders: ['f1'],
    });

    expect(screen.queryByTitle('a.md')).toBeNull();
    expect(screen.getByTitle('Docs — 1 file')).toBeInTheDocument();
  });

  it('does not reorder the library when grouping', () => {
    setup([file('a.md'), file('b.md', { folderId: 'f1' }), file('c.md'), file('d.md', { folderId: 'f1' })], () => false, {
      folders: [folder('f1', 'Docs')],
    });

    const names = screen.getAllByTitle(/\.md$/).map((el) => el.getAttribute('title'));
    // Folder members first (in library order), then the ungrouped list (also in
    // library order). Grouping is a view; it must not permute anything.
    expect(names).toEqual(['b.md', 'd.md', 'a.md', 'c.md']);
  });

  it('an empty folder still offers somewhere to drop files', () => {
    // A folder is empty the moment it is created, so this is the first thing a
    // user sees after clicking "New folder".
    setup([], () => false, { folders: [folder('f1', 'Docs')] });

    expect(screen.getByText('Drop files here')).toBeInTheDocument();
  });

  it('marks the selected folder, since it silently decides where new files land', () => {
    setup([], () => false, { folders: [folder('f1', 'Docs')], selectedFolderId: 'f1' });

    const header = screen.getByTitle('Docs — 0 files').parentElement as HTMLElement;
    expect(header.style.borderLeft).toContain('var(--link)');
  });

  it('removing a folder but keeping its files does not ask for confirmation, because nothing is destroyed', () => {
    const { onUngroupFolder } = setup([file('a.md', { folderId: 'f1' })], () => false, {
      folders: [folder('f1', 'Docs')],
    });

    fireEvent.click(screen.getByRole('button', { name: 'Folder actions for Docs' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Remove folder, keep files' }));

    expect(onUngroupFolder).toHaveBeenCalledWith('f1');
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('deleting a folder and its files names the unsaved edits and snapshots at stake', () => {
    const { onDeleteFolderAndFiles } = setup(
      [
        file('a.md', { folderId: 'f1' }),
        file('b.md', { folderId: 'f1', kind: 'snapshot' }),
        file('c.md'),
      ],
      (name) => name === 'a.md',
      { folders: [folder('f1', 'Docs')] },
    );

    fireEvent.click(screen.getByRole('button', { name: 'Folder actions for Docs' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete folder and files' }));

    const msg = screen.getByRole('alertdialog').textContent ?? '';
    // Scoped to the folder: c.md is dirty-free and outside, and must not be counted.
    expect(msg).toContain('the 2 files inside');
    expect(msg).toContain('1 file has unsaved edits');
    expect(msg).toContain('1 is a snapshot');
    expect(onDeleteFolderAndFiles).not.toHaveBeenCalled();
  });

  it('counts only the folder members when warning about GitHub copies', () => {
    setup(
      [file('a.md', { folderId: 'f1' }), file('b.md', { folderId: 'f1' }), file('c.md')],
      () => false,
      // c.md is on GitHub too, but it is outside the folder and survives.
      { folders: [folder('f1', 'Docs')], onGitHub: ['a.md', 'c.md'] },
    );

    fireEvent.click(screen.getByRole('button', { name: 'Folder actions for Docs' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete folder and files' }));

    const msg = screen.getByRole('alertdialog').textContent ?? '';
    expect(msg).toContain('One file is on GitHub');
    expect(msg).not.toContain('2 files are on GitHub');
  });

  it('deletes an empty folder without a dialog, since there is nothing to lose', () => {
    // Asking to confirm a no-loss action is how users learn to click through
    // the confirmation that does matter.
    const { onDeleteFolderAndFiles } = setup([], () => false, { folders: [folder('f1', 'Docs')] });

    fireEvent.click(screen.getByRole('button', { name: 'Folder actions for Docs' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete folder and files' }));

    expect(onDeleteFolderAndFiles).toHaveBeenCalledWith('f1');
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('offers moving a file to a folder without dragging, since drag events never fire on touch', () => {
    const { onMoveFileToFolder } = setup([file('a.md'), file('b.md')], () => false, {
      folders: [folder('f1', 'Docs')],
      mode: 'mobile',
    });

    fireEvent.click(screen.getByRole('button', { name: 'Actions for a.md' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Docs' }));

    expect(onMoveFileToFolder).toHaveBeenCalledWith('a.md', 'f1');
  });

  it('runs a menu item pressed with a real mouse, not just a synthetic click', async () => {
    // Regression: the close-on-click-outside listener ran on mousedown, which
    // fires before click. It unmounted the item between press and release, so
    // no click was ever synthesized and every menu item silently did nothing.
    // fireEvent.click skips mousedown entirely, so only a full pointer sequence
    // catches this.
    const user = userEvent.setup();
    const { onUngroupFolder } = setup([file('a.md', { folderId: 'f1' })], () => false, {
      folders: [folder('f1', 'Docs')],
    });

    await user.click(screen.getByRole('button', { name: 'Folder actions for Docs' }));
    await user.click(screen.getByRole('menuitem', { name: 'Remove folder, keep files' }));

    expect(onUngroupFolder).toHaveBeenCalledWith('f1');
  });

  it('closes the menu when the press lands outside it', async () => {
    const user = userEvent.setup();
    setup([file('a.md')], () => false, { folders: [folder('f1', 'Docs')] });

    await user.click(screen.getByRole('button', { name: 'Folder actions for Docs' }));
    expect(screen.getByRole('menu')).toBeInTheDocument();

    await user.click(screen.getByRole('navigation'));

    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('renames a folder in place rather than through a blocking browser prompt', () => {
    const { onRenameFolder } = setup([], () => false, { folders: [folder('f1', 'Docs')] });

    fireEvent.click(screen.getByRole('button', { name: 'Folder actions for Docs' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Rename' }));
    const input = screen.getByLabelText('Folder name');
    fireEvent.change(input, { target: { value: 'Notes' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onRenameFolder).toHaveBeenCalledWith('f1', 'Notes');
  });

  it('abandons a rename on Escape instead of committing what was typed', () => {
    const { onRenameFolder } = setup([], () => false, { folders: [folder('f1', 'Docs')] });

    fireEvent.click(screen.getByRole('button', { name: 'Folder actions for Docs' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Rename' }));
    const input = screen.getByLabelText('Folder name');
    fireEvent.change(input, { target: { value: 'Notes' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(onRenameFolder).not.toHaveBeenCalled();
  });

  it('a folder sharing a name with a file does not confuse the two', () => {
    setup([file('Docs', { folderId: 'f1' })], () => false, { folders: [folder('f1', 'Docs')] });

    // The header's title carries a count, so it is structurally distinct from
    // any filename and getByTitle stays unambiguous.
    expect(screen.getByTitle('Docs')).toBeInTheDocument();
    expect(screen.getByTitle('Docs — 1 file')).toBeInTheDocument();
  });
});

describe('Sidebar folder drag and drop', () => {
  it('dropping a row on a folder header files it there', () => {
    const { onMoveFileToFolder } = setup([file('a.md')], () => false, {
      folders: [folder('f1', 'Docs')],
    });

    const dt = dataTransfer({ 'application/x-mdreader-file': 'a.md' });
    const header = screen.getByTitle('Docs — 0 files').parentElement as HTMLElement;
    fireEvent.dragOver(header, { dataTransfer: dt });
    fireEvent.drop(header, { dataTransfer: dt });

    expect(onMoveFileToFolder).toHaveBeenCalledWith('a.md', 'f1');
  });

  it('a drag carrying no internal payload is ignored by the folder header', () => {
    // An OS file drag must fall through to the window handler that opens files,
    // not be swallowed as a regrouping gesture.
    const { onMoveFileToFolder } = setup([file('a.md')], () => false, {
      folders: [folder('f1', 'Docs')],
    });

    const dt = { ...dataTransfer({}), types: ['Files'] };
    const header = screen.getByTitle('Docs — 0 files').parentElement as HTMLElement;
    fireEvent.dragOver(header, { dataTransfer: dt });
    fireEvent.drop(header, { dataTransfer: dt });

    expect(onMoveFileToFolder).not.toHaveBeenCalled();
  });
});

// --chrome-accent-shape is the chrome half of the angular-geometry work: a theme
// built on diagonals states that in the sidebar by shearing the active row's
// trailing edge. Rendered through a real ThemeProvider rather than by unit
// testing the ternary, because what can actually break is the wiring — the token
// reaching the component — not the two-branch choice itself.
describe('Sidebar active-row accent shape', () => {
  const renderThemed = async (themeId: string) => {
    const storage = createFakeStorageService();
    await storage.setPreferences({ themeId });
    const { container } = render(
      <StorageProvider service={storage}>
        <ThemeProvider>
          <Sidebar
            mode="desktop"
            sidebarOpen
            drawerOpen={false}
            onToggleDrawer={() => {}}
            files={[file('a.md'), file('b.md')]}
            activeName="a.md"
            isDirty={() => false}
            isUnpersisted={() => false}
            onGitHub={() => false}
            onPickFile={() => {}}
            onCloseFile={() => {}}
            onGrantAccess={() => {}}
            onOpenFileClick={() => {}}
            onNewFile={() => {}}
            storageUsedBytes={0}
            storageQuotaBytes={10 * 1024 * 1024}
            onClearAll={() => {}}
            folders={[]}
            selectedFolderId={null}
            collapsedFolders={[]}
            onSelectFolder={() => {}}
            onToggleFolderCollapsed={() => {}}
            onCreateFolder={() => 'id'}
            onRenameFolder={() => {}}
            onUngroupFolder={() => {}}
            onDeleteFolderAndFiles={() => {}}
            onMoveFileToFolder={() => {}}
          />
        </ThemeProvider>
      </StorageProvider>,
    );
    // The provider loads preferences asynchronously, so the first paint is the
    // default theme regardless of what was seeded. Waiting on the *seeded*
    // theme's own --bg rather than merely on --bg being non-empty: the default
    // theme sets --bg too, so the looser condition is satisfied by the very
    // paint this is supposed to wait past, and a test reading the DOM instead of
    // React state would see the default theme's tokens.
    const expectedBg = BUILTIN_THEMES.find((t) => t.id === themeId)!.tokens['--bg'];
    await waitFor(() =>
      expect(document.documentElement.style.getPropertyValue('--bg')).toBe(expectedBg),
    );
    return container;
  };

  // Rows are found by their filename cell and walked up to the row container,
  // rather than by a test id: the shape belongs to the element that paints the
  // highlight, and pinning that relationship is part of what the test guards.
  //
  // This survives folder grouping because grouping wraps whole rows — the row
  // container is still the direct parent of the header div. What would break it
  // is a wrapper added *inside* a row, above that header. See the note on
  // FileRow, and the invariant test below.
  const rowOf = (container: HTMLElement, name: string) =>
    within(container).getByTitle(name).closest('div')?.parentElement as HTMLElement;

  it('shears the active row when the theme asks for a wedge', async () => {
    const container = await renderThemed('azure-corporate');
    const active = rowOf(container, 'a.md');

    // Square on the left, cut on the right: the edge the highlight starts from
    // stays flat and the trailing edge shears. The depth is deliberately shallow
    // — see WEDGE_ROW — so this pins the asymmetry rather than the exact number.
    expect(active.style.borderRadius).toBe('0 8px 8px 0');
    expect(active.style.getPropertyValue('corner-shape')).toBe('bevel');
  });

  it('leaves inactive rows unshaped, since a transparent row has nothing to cut', async () => {
    const container = await renderThemed('azure-corporate');

    expect(rowOf(container, 'b.md').style.getPropertyValue('corner-shape')).toBe('');
  });

  it('keeps the plain rounded row on themes that did not opt in', async () => {
    const container = await renderThemed('github-light');
    const active = rowOf(container, 'a.md');

    expect(active.style.borderRadius).toBe('6px');
    expect(active.style.getPropertyValue('corner-shape')).toBe('');
  });

  // Whichever built-in currently asks for the planes, found by its token rather
  // than named here. A built-in's pattern is a design choice its author is free
  // to change — an earlier version of these tests hardcoded azure-corporate, and
  // switching that theme to `notched` turned one test red and quietly made the
  // pointer-events test below vacuous by leaving it nothing to iterate.
  const facetThemeId = BUILTIN_THEMES.find((t) => t.tokens['--chrome-pattern'] === 'facet')?.id;

  // The planes are one pattern among several now, so which themes paint them is
  // a decision made in JS rather than by a zero-alpha color. Both halves are
  // asserted — the layers are there, and the fill underneath is not replaced by
  // them.
  it.runIf(facetThemeId)('paints the planes over the chrome fill rather than instead of it', async () => {
    const container = await renderThemed(facetThemeId!);
    const nav = within(container).getByRole('navigation');

    // background-color, not the `background` shorthand — jsdom discards the
    // shorthand when it carries a var(), so this is the only readable assertion
    // that the fill beneath the planes survives.
    expect(nav.style.backgroundColor).toBe('var(--chrome)');
    expect(nav.querySelectorAll('[data-chrome-facet]')).toHaveLength(SIDEBAR_FACETS.length);
  });

  // The inverse of the test above, and the reason facets moved behind
  // --chrome-pattern: a theme that does not ask for them gets no facet markup at
  // all, rather than nine layers painting transparent gradients. github-light
  // asks for `none`, so the panel is bare.
  it('paints no planes at all on a theme that did not opt in', async () => {
    const container = await renderThemed('github-light');

    expect(
      within(container).getByRole('navigation').querySelectorAll('[data-chrome-facet]'),
    ).toHaveLength(0);
    expect(document.documentElement.style.getPropertyValue('--chrome-pattern')).toBe('none');
  });

  // The planes are decoration layered over the whole panel, so the one way they
  // can break the app rather than merely look wrong is by eating clicks meant
  // for the file rows underneath. That is a property of every layer, not of the
  // one that happens to be on top, so all of them are checked — and the count is
  // asserted first, so this cannot pass by having found none.
  it.runIf(facetThemeId)('never intercepts a click meant for the file list', async () => {
    const container = await renderThemed(facetThemeId!);
    const layers = within(container)
      .getByRole('navigation')
      .querySelectorAll<HTMLElement>('[data-chrome-facet]');

    expect(layers).toHaveLength(SIDEBAR_FACETS.length);
    for (const layer of layers) {
      expect(layer.style.pointerEvents).toBe('none');
    }
  });
});
