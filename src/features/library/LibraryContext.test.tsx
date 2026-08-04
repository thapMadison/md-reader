import { render, screen, waitFor } from '@testing-library/react';
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
