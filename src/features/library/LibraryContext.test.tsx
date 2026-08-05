import { render, screen, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LibraryProvider, useLibrary } from './LibraryContext';
import { StorageProvider } from '@/services/storage/StorageContext';
import { createFakeStorageService } from '@/services/storage/fakeStorage';
import type { StorageService } from '@/services/storage/types';

// A stand-in for a real FileSystemFileHandle whose on-disk content can be
// swapped between "visits" — the whole point of these tests is what happens
// when the bytes on disk change while the app is closed.
function fakeHandle(name: string, disk: { text: string; permission?: PermissionState }) {
  return {
    kind: 'file' as const,
    name,
    isSameEntry: async () => false,
    queryPermission: async () => disk.permission ?? 'granted',
    requestPermission: async () => disk.permission ?? 'granted',
    getFile: async () =>
      ({
        text: async () => disk.text,
        size: disk.text.length,
        lastModified: 1_700_000_000_000,
      }) as unknown as File,
  } as unknown as FileSystemFileHandle;
}

function Probe() {
  const { active } = useLibrary();
  if (!active) return <div>no active file</div>;
  return (
    <div>
      <div data-testid="original">{active.originalContent}</div>
      <div data-testid="edited">{active.editedContent}</div>
      <div data-testid="perm">{active.perm}</div>
      <div data-testid="size">{String(active.size)}</div>
    </div>
  );
}

// Drives the open/edit flow from inside the provider, and reports the notice
// lists the banner reads.
function OpenProbe({ files }: { files: File[] }) {
  const { active, openViaInput, editContent, collisions, unreadable } = useLibrary();
  return (
    <div>
      <button onClick={() => void openViaInput(files as unknown as FileList)}>open</button>
      <button onClick={() => active && editContent(active.name, 'MY UNSAVED EDIT')}>edit</button>
      <div data-testid="edited">{active?.editedContent ?? ''}</div>
      <div data-testid="original">{active?.originalContent ?? ''}</div>
      <div data-testid="collisions">{collisions.join(',')}</div>
      <div data-testid="unreadable">{unreadable.join(',')}</div>
    </div>
  );
}

// A File whose text() the FileReader path will read. readFileListSettled uses
// FileReader, so the mock has to satisfy readAsText rather than File.text().
function fakeFile(name: string, content: string | { fail: true }): File {
  return { name, content } as unknown as File;
}

// Minimal FileReader standing in for jsdom's, driven by the `content` carried on
// the fake File above: a string resolves, the failure marker fires onerror. This
// is the only way to exercise a mid-batch read failure, which is exactly the
// branch that used to sink the whole batch.
class StubFileReader {
  result: string | null = null;
  error: DOMException | null = null;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  readAsText(file: File) {
    const content = (file as unknown as { content: string | { fail: true } }).content;
    queueMicrotask(() => {
      if (typeof content === 'string') {
        this.result = content;
        this.onload?.();
      } else {
        this.error = new DOMException('unreadable', 'NotReadableError');
        this.onerror?.();
      }
    });
  }
}

const renderLibrary = (storage: StorageService) =>
  render(
    <StorageProvider service={storage}>
      <LibraryProvider>
        <Probe />
      </LibraryProvider>
    </StorageProvider>,
  );

beforeEach(() => {
  // The bootstrap path fetches sample.md when the library is empty; these tests
  // always seed a record, but a stray unmocked fetch would still warn.
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: false, text: async () => '' }) as unknown as Response),
  );
});

describe('hydration re-reads live files from disk', () => {
  it('shows the current disk content, not the copy cached when the file was opened', async () => {
    const storage = createFakeStorageService();
    const disk = { text: '# new content on disk' };
    await storage.saveFile({
      name: 'a.md',
      content: '# stale copy from last visit',
      kind: 'live',
      handle: fakeHandle('a.md', disk),
      savedAt: 1,
    });

    renderLibrary(storage);

    await waitFor(() =>
      expect(screen.getByTestId('original')).toHaveTextContent('# new content on disk'),
    );
    expect(screen.getByTestId('edited')).toHaveTextContent('# new content on disk');
  });

  it('writes the refreshed content back, so the offline fallback is not stuck on first-open bytes', async () => {
    const storage = createFakeStorageService();
    const disk = { text: '# new content on disk' };
    await storage.saveFile({
      name: 'a.md',
      content: '# stale copy from last visit',
      kind: 'live',
      handle: fakeHandle('a.md', disk),
      savedAt: 1,
    });

    renderLibrary(storage);

    await waitFor(async () =>
      expect((await storage.getFile('a.md'))?.content).toBe('# new content on disk'),
    );
  });

  it('records the disk size so the sidebar can identify the file', async () => {
    const storage = createFakeStorageService();
    const disk = { text: 'abcde' };
    await storage.saveFile({
      name: 'a.md',
      content: 'old',
      kind: 'live',
      handle: fakeHandle('a.md', disk),
      savedAt: 1,
    });

    renderLibrary(storage);

    await waitFor(() => expect(screen.getByTestId('size')).toHaveTextContent('5'));
  });

  it('falls back to the cached copy and marks the file denied when the handle no longer resolves', async () => {
    const storage = createFakeStorageService();
    const handle = fakeHandle('a.md', { text: '' });
    handle.getFile = async () => {
      throw new DOMException('not found', 'NotFoundError');
    };
    await storage.saveFile({
      name: 'a.md',
      content: '# cached copy',
      kind: 'live',
      handle,
      savedAt: 1,
    });

    renderLibrary(storage);

    await waitFor(() => expect(screen.getByTestId('perm')).toHaveTextContent('denied'));
    expect(screen.getByTestId('original')).toHaveTextContent('# cached copy');
  });

  it('leaves files awaiting permission on the cached copy rather than reading disk', async () => {
    const storage = createFakeStorageService();
    const disk = { text: '# new content on disk', permission: 'prompt' as PermissionState };
    await storage.saveFile({
      name: 'a.md',
      content: '# cached copy',
      kind: 'live',
      handle: fakeHandle('a.md', disk),
      savedAt: 1,
    });

    renderLibrary(storage);

    await waitFor(() => expect(screen.getByTestId('perm')).toHaveTextContent('prompt'));
    expect(screen.getByTestId('original')).toHaveTextContent('# cached copy');
  });

  it('does not touch snapshots, which have no handle to re-read', async () => {
    const storage = createFakeStorageService();
    await storage.saveFile({
      name: 'a.md',
      content: '# snapshot content',
      kind: 'snapshot',
      savedAt: 1,
    });

    renderLibrary(storage);

    await waitFor(() => expect(screen.getByTestId('perm')).toHaveTextContent('na'));
    expect(screen.getByTestId('original')).toHaveTextContent('# snapshot content');
  });
});

describe('reopening a file that has unsaved edits', () => {
  const renderOpen = (storage: StorageService, files: File[]) =>
    render(
      <StorageProvider service={storage}>
        <LibraryProvider>
          <OpenProbe files={files} />
        </LibraryProvider>
      </StorageProvider>,
    );

  beforeEach(() => {
    vi.stubGlobal('FileReader', StubFileReader);
  });

  it('keeps the edits instead of silently discarding them', async () => {
    const user = userEvent.setup();
    const storage = createFakeStorageService();
    renderOpen(storage, [fakeFile('a.md', '# from disk')]);

    await user.click(screen.getByText('open'));
    await waitFor(() => expect(screen.getByTestId('edited')).toHaveTextContent('# from disk'));

    await user.click(screen.getByText('edit'));
    await waitFor(() => expect(screen.getByTestId('edited')).toHaveTextContent('MY UNSAVED EDIT'));

    // Same name, different bytes — the collision the FS Access API cannot
    // distinguish from reopening the identical file.
    await user.click(screen.getByText('open'));

    await waitFor(() => expect(screen.getByTestId('collisions')).toHaveTextContent('a.md'));
    expect(screen.getByTestId('edited')).toHaveTextContent('MY UNSAVED EDIT');
  });

  it('still takes the fresh disk content as the revert target', async () => {
    const user = userEvent.setup();
    const storage = createFakeStorageService();
    renderOpen(storage, [fakeFile('a.md', '# from disk')]);

    await user.click(screen.getByText('open'));
    await waitFor(() => expect(screen.getByTestId('edited')).toHaveTextContent('# from disk'));
    await user.click(screen.getByText('edit'));
    await user.click(screen.getByText('open'));

    await waitFor(() => expect(screen.getByTestId('collisions')).toHaveTextContent('a.md'));
    expect(screen.getByTestId('original')).toHaveTextContent('# from disk');
  });

  it('reports no collision when the reopened file has no unsaved edits', async () => {
    const user = userEvent.setup();
    const storage = createFakeStorageService();
    renderOpen(storage, [fakeFile('a.md', '# from disk')]);

    await user.click(screen.getByText('open'));
    await waitFor(() => expect(screen.getByTestId('edited')).toHaveTextContent('# from disk'));
    await user.click(screen.getByText('open'));

    await waitFor(() => expect(screen.getByTestId('edited')).toHaveTextContent('# from disk'));
    expect(screen.getByTestId('collisions')).toHaveTextContent('');
  });
});

describe('a batch with an unreadable file', () => {
  const renderOpen = (storage: StorageService, files: File[]) =>
    render(
      <StorageProvider service={storage}>
        <LibraryProvider>
          <OpenProbe files={files} />
        </LibraryProvider>
      </StorageProvider>,
    );

  beforeEach(() => {
    vi.stubGlobal('FileReader', StubFileReader);
  });

  // The whole point of the Promise.allSettled change: one bad file used to
  // reject the batch, so none of the good ones opened either.
  it('opens the readable files and names the one it could not read', async () => {
    const user = userEvent.setup();
    const storage = createFakeStorageService();
    renderOpen(storage, [
      fakeFile('good.md', '# good one'),
      fakeFile('bad.md', { fail: true }),
    ]);

    await user.click(screen.getByText('open'));

    await waitFor(() => expect(screen.getByTestId('unreadable')).toHaveTextContent('bad.md'));
    expect(screen.getByTestId('edited')).toHaveTextContent('# good one');
  });

  it('reports the failure even when every file in the batch fails', async () => {
    const user = userEvent.setup();
    const storage = createFakeStorageService();
    renderOpen(storage, [fakeFile('bad.md', { fail: true })]);

    await user.click(screen.getByText('open'));

    await waitFor(() => expect(screen.getByTestId('unreadable')).toHaveTextContent('bad.md'));
  });
});

// Folders are membership on the file record plus a list in preferences. A
// reload is simulated by seeding the fake storage before the first render,
// which is what the provider actually reads — no unmount/remount needed.
function FolderProbe() {
  const {
    files,
    activeName,
    folders,
    selectedFolderId,
    setSelectedFolderId,
    createFolder,
    ungroupFolder,
    moveFileToFolder,
    deleteFolderAndFiles,
    openViaInput,
  } = useLibrary();
  return (
    <div>
      <div data-testid="folders">{folders.map((f) => `${f.id}:${f.name}`).join(',')}</div>
      <div data-testid="membership">
        {files.map((f) => `${f.name}=${f.folderId ?? 'root'}`).join(',')}
      </div>
      <div data-testid="active">{activeName ?? ''}</div>
      <div data-testid="selected">{selectedFolderId ?? 'none'}</div>
      <button onClick={() => createFolder('Docs')}>create</button>
      <button onClick={() => setSelectedFolderId('f1')}>select-f1</button>
      <button onClick={() => moveFileToFolder('a.md', 'f1')}>file-a</button>
      <button onClick={() => ungroupFolder('f1')}>ungroup</button>
      <button onClick={() => void deleteFolderAndFiles('f1')}>delete-f1</button>
      <button onClick={() => void openViaInput([fakeFile('new.md', '# new')] as unknown as FileList)}>
        open-new
      </button>
    </div>
  );
}

describe('virtual folders', () => {
  const renderFolders = (storage: StorageService, strict = false) => {
    const tree = (
      <StorageProvider service={storage}>
        <LibraryProvider>
          <FolderProbe />
        </LibraryProvider>
      </StorageProvider>
    );
    return render(strict ? <StrictMode>{tree}</StrictMode> : tree);
  };

  const seedSnapshot = (storage: StorageService, name: string, folderId?: string) =>
    storage.saveFile({ name, content: `# ${name}`, kind: 'snapshot', savedAt: 1, folderId });

  beforeEach(() => {
    vi.stubGlobal('FileReader', StubFileReader);
  });

  it('a file keeps its folder across a reload', async () => {
    const storage = createFakeStorageService();
    await storage.setPreferences({ folders: [{ id: 'f1', name: 'Docs', order: 0 }] });
    await seedSnapshot(storage, 'a.md');
    renderFolders(storage);
    await waitFor(() => expect(screen.getByTestId('membership')).toHaveTextContent('a.md=root'));

    await userEvent.setup().click(screen.getByText('file-a'));

    // The membership has to reach the stored record, not just React state —
    // that write is the single easiest thing to forget.
    await waitFor(async () => expect((await storage.getFile('a.md'))?.folderId).toBe('f1'));
  });

  it('a live file keeps its folder across a reload too', async () => {
    // The hydration refresh loop builds its own record instead of going through
    // persistFile, so live files take a different write path than snapshots. A
    // test using only snapshots would not notice that path dropping folderId.
    const storage = createFakeStorageService();
    await storage.setPreferences({ folders: [{ id: 'f1', name: 'Docs', order: 0 }] });
    await storage.saveFile({
      name: 'a.md',
      content: '# cached',
      kind: 'live',
      handle: fakeHandle('a.md', { text: '# fresh from disk' }),
      savedAt: 1,
      folderId: 'f1',
    });

    renderFolders(storage);

    await waitFor(() => expect(screen.getByTestId('membership')).toHaveTextContent('a.md=f1'));
    await waitFor(async () => {
      const rec = await storage.getFile('a.md');
      expect(rec?.content).toBe('# fresh from disk');
      expect(rec?.folderId).toBe('f1');
    });
  });

  it('a file whose folder no longer exists comes back to the ungrouped list rather than disappearing', async () => {
    const storage = createFakeStorageService();
    await storage.setPreferences({ folders: [] });
    await seedSnapshot(storage, 'a.md', 'gone');

    renderFolders(storage);

    await waitFor(() => expect(screen.getByTestId('membership')).toHaveTextContent('a.md=root'));
  });

  it('reopening a filed file leaves it where it was, even with another folder selected', async () => {
    // Reopening refreshes content. It is not a request to refile the document,
    // and silently moving it would be the kind of change nobody can account for.
    const storage = createFakeStorageService();
    await storage.setPreferences({
      folders: [
        { id: 'f1', name: 'Docs', order: 0 },
        { id: 'f2', name: 'Notes', order: 1 },
      ],
    });
    await seedSnapshot(storage, 'new.md', 'f2');
    const user = userEvent.setup();
    renderFolders(storage);
    await waitFor(() => expect(screen.getByTestId('membership')).toHaveTextContent('new.md=f2'));

    await user.click(screen.getByText('select-f1'));
    await user.click(screen.getByText('open-new'));

    await waitFor(() => expect(screen.getByTestId('selected')).toHaveTextContent('f1'));
    expect(screen.getByTestId('membership')).toHaveTextContent('new.md=f2');
  });

  it('a genuinely new file lands in the selected folder', async () => {
    const storage = createFakeStorageService();
    await storage.setPreferences({ folders: [{ id: 'f1', name: 'Docs', order: 0 }] });
    await seedSnapshot(storage, 'a.md');
    const user = userEvent.setup();
    renderFolders(storage);
    await waitFor(() => expect(screen.getByTestId('membership')).toHaveTextContent('a.md=root'));

    await user.click(screen.getByText('select-f1'));
    await user.click(screen.getByText('open-new'));

    await waitFor(() => expect(screen.getByTestId('membership')).toHaveTextContent('new.md=f1'));
  });

  it('removing a folder returns its files to the ungrouped list', async () => {
    const storage = createFakeStorageService();
    await storage.setPreferences({ folders: [{ id: 'f1', name: 'Docs', order: 0 }] });
    await seedSnapshot(storage, 'a.md', 'f1');
    renderFolders(storage);
    await waitFor(() => expect(screen.getByTestId('membership')).toHaveTextContent('a.md=f1'));

    await userEvent.setup().click(screen.getByText('ungroup'));

    await waitFor(() => expect(screen.getByTestId('membership')).toHaveTextContent('a.md=root'));
    await waitFor(async () => expect((await storage.getFile('a.md'))?.folderId).toBeUndefined());
  });

  it('deleting a folder moves the active file exactly once', async () => {
    // Looping closeFile would hop the active file across each doomed file in
    // turn. Asserting only the final value would pass for that implementation
    // too, so this records every value activeName took.
    const storage = createFakeStorageService();
    await storage.setPreferences({ folders: [{ id: 'f1', name: 'Docs', order: 0 }] });
    await seedSnapshot(storage, 'a.md', 'f1');
    await seedSnapshot(storage, 'b.md', 'f1');
    await seedSnapshot(storage, 'c.md', 'f1');
    await seedSnapshot(storage, 'survivor.md');
    renderFolders(storage);
    await waitFor(() => expect(screen.getByTestId('active')).not.toHaveTextContent(''));

    const seen: string[] = [];
    const observer = new MutationObserver(() => {
      const v = screen.getByTestId('active').textContent ?? '';
      if (seen[seen.length - 1] !== v) seen.push(v);
    });
    observer.observe(screen.getByTestId('active'), { childList: true, subtree: true, characterData: true });

    await userEvent.setup().click(screen.getByText('delete-f1'));
    await waitFor(() => expect(screen.getByTestId('active')).toHaveTextContent('survivor.md'));
    observer.disconnect();

    expect(seen).toEqual(['survivor.md']);
  });

  it('deleting a folder prunes every member’s scroll position in one write', async () => {
    const storage = createFakeStorageService();
    await storage.setPreferences({
      folders: [{ id: 'f1', name: 'Docs', order: 0 }],
      scrollPositions: { 'a.md': 10, 'b.md': 20, 'survivor.md': 30 },
    });
    await seedSnapshot(storage, 'a.md', 'f1');
    await seedSnapshot(storage, 'b.md', 'f1');
    await seedSnapshot(storage, 'survivor.md');
    renderFolders(storage);
    await waitFor(() => expect(screen.getByTestId('membership')).toHaveTextContent('a.md=f1'));

    const spy = vi.spyOn(storage, 'setPreferences');
    await userEvent.setup().click(screen.getByText('delete-f1'));
    await waitFor(() => expect(screen.getByTestId('membership')).not.toHaveTextContent('a.md'));

    // N separate read-modify-write cycles would each read the same starting
    // prefs and overwrite the previous deletion, leaving entries behind.
    await waitFor(async () =>
      expect((await storage.getPreferences()).scrollPositions).toEqual({ 'survivor.md': 30 }),
    );
    const scrollWrites = spy.mock.calls.filter((c) => 'scrollPositions' in (c[0] ?? {}));
    expect(scrollWrites).toHaveLength(1);
  });

  it('creating a folder twice under StrictMode yields one folder', async () => {
    // StrictMode double-invokes updaters, so an id generated inside the updater
    // would differ between the two runs and both would be appended.
    const storage = createFakeStorageService();
    await seedSnapshot(storage, 'a.md');
    renderFolders(storage, true);
    await waitFor(() => expect(screen.getByTestId('membership')).toHaveTextContent('a.md=root'));

    await userEvent.setup().click(screen.getByText('create'));

    await waitFor(() => expect(screen.getByTestId('folders')).toHaveTextContent('Docs'));
    expect(screen.getByTestId('folders').textContent?.split(',')).toHaveLength(1);
  });
});
