import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Sidebar } from './Sidebar';
import type { LibraryFile } from '@/features/library/types';

const file = (name: string, over: Partial<LibraryFile> = {}): LibraryFile => ({
  name,
  kind: 'live',
  perm: 'granted',
  originalContent: 'x',
  editedContent: 'x',
  ...over,
});

const setup = (files: LibraryFile[], isDirty: (name: string) => boolean = () => false) => {
  const onClearAll = vi.fn();
  render(
    <Sidebar
      mode="desktop"
      sidebarOpen
      drawerOpen={false}
      onToggleDrawer={() => {}}
      files={files}
      activeName={files[0]?.name ?? null}
      isDirty={isDirty}
      isUnpersisted={() => false}
      onPickFile={() => {}}
      onCloseFile={() => {}}
      onGrantAccess={() => {}}
      onOpenFileClick={() => {}}
      storageUsedBytes={1024 * 1024}
      storageQuotaBytes={10 * 1024 * 1024}
      onClearAll={onClearAll}
    />,
  );
  return { onClearAll };
};

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
});
