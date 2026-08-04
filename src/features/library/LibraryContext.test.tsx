import { render, screen, waitFor } from '@testing-library/react';
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
