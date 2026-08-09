import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SyncProvider, useSync } from './SyncContext';
import { LibraryProvider, useLibrary } from '@/features/library/LibraryContext';
import { GistAuthProvider } from '@/services/gist/GistContext';
import { createFakeGistService, type FakeGistService } from '@/services/gist/fakeGist';
import { StorageProvider } from '@/services/storage/StorageContext';
import { createFakeStorageService } from '@/services/storage/fakeStorage';
import { contentHash } from '@/services/gist/hash';
import type { StorageService } from '@/services/storage/types';

/**
 * Folder membership travelling between devices in the gist description.
 *
 * The shape these tests are built around: two `StorageService`s — two separate
 * IndexedDBs, so two machines — pointed at one gist service, which is the only
 * thing they share. Folder ids come from `crypto.randomUUID()` on whichever
 * device first made the folder, so the two disagree about ids by construction
 * and convergence has to be earned rather than assumed.
 */

const config = { clientId: 'c', tokenEndpoint: 'https://w.example' };
const SEEDED_AT = 1_700_000_001_000;

function Probe() {
  const { pull, push, errorOf } = useSync();
  const { active, files, folders, createFolder, moveFileToFolder, setActiveName, editContent } =
    useLibrary();
  // The folder the active file is in, by name — ids differ per device, so the
  // name is the only thing worth asserting across the two.
  const activeFolder = folders.find((f) => f.id === active?.folderId);
  return (
    <div>
      <div data-testid="folder">{activeFolder?.name ?? '(none)'}</div>
      <div data-testid="folder-count">{folders.length}</div>
      <div data-testid="folder-names">{[...folders].map((f) => f.name).sort().join(',')}</div>
      <div data-testid="content">{active?.editedContent ?? ''}</div>
      <div data-testid="names">{files.map((f) => f.name).join(',')}</div>
      <div data-testid="error">{(active && errorOf(active.name)) || '(none)'}</div>
      <button onClick={() => active && moveFileToFolder(active.name, createFolder('Work'))}>
        file into Work
      </button>
      <button onClick={() => active && moveFileToFolder(active.name, null)}>ungroup</button>
      <button onClick={() => active && editContent(active.name, 'edited here')}>edit</button>
      <button onClick={() => active && void pull(active.name)}>pull</button>
      <button onClick={() => active && void push(active.name)}>save</button>
      <button onClick={() => setActiveName(null)}>close</button>
      <button onClick={() => setActiveName('notes.md')}>open notes</button>
    </div>
  );
}

function renderDevice(storage: StorageService, gist: FakeGistService) {
  return render(
    <StorageProvider service={storage}>
      <LibraryProvider>
        <GistAuthProvider config={config} createService={() => gist}>
          <SyncProvider>
            <Probe />
          </SyncProvider>
        </GistAuthProvider>
      </LibraryProvider>
    </StorageProvider>,
  );
}

function syncedRecord(content: string, over: Record<string, unknown> = {}) {
  return {
    name: 'notes.md',
    content,
    kind: 'snapshot' as const,
    savedAt: 1,
    syncEnabled: true,
    gistId: 'g1',
    gistFileName: 'notes.md',
    syncedContentHash: contentHash(content),
    remoteUpdatedAt: SEEDED_AT,
    ...over,
  };
}

async function device(files: Parameters<StorageService['saveFile']>[0][] = []) {
  const storage = createFakeStorageService();
  await storage.setAuth({ accessToken: 'gho_x', scope: 'gist', login: 'octocat' });
  for (const f of files) await storage.saveFile(f);
  return storage;
}

function sharedGist(content = 'shared text', folder?: { folderId?: string; folderName?: string }) {
  return createFakeGistService({
    seed: [{ id: 'g1', fileName: 'notes.md', content, updatedAt: SEEDED_AT, folder }],
  });
}

/**
 * Looking away and coming back — the gesture that asks for a fresh answer.
 *
 * Clicking "open notes" on the file that is already open does nothing: the
 * check is keyed on which file is active, so re-selecting the same one never
 * re-runs it. The close is what makes the reopen a real event.
 */
async function reopenFile(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByText('close'));
  await user.click(screen.getByText('open notes'));
}

beforeEach(() => {
  sessionStorage.clear();
  window.history.replaceState({}, '', '/');
  vi.stubGlobal(
    'fetch',
    vi.fn(() => {
      throw new Error('no test may call fetch');
    }),
  );
});

describe('folder membership crossing devices', () => {
  it('converges on the folder name when the two devices disagree about ids', async () => {
    // The test the plan names. Device A files the document under Work and
    // pushes; device B, which has never heard of that folder, pulls and has to
    // arrive at the same place using nothing but what came down the wire.
    const gist = sharedGist();
    const user = userEvent.setup();

    const a = await device([syncedRecord('shared text')]);
    const viewA = renderDevice(a, gist);
    await waitFor(() => expect(screen.getByTestId('names')).toHaveTextContent('notes.md'));
    await user.click(screen.getByText('open notes'));
    await user.click(screen.getByText('file into Work'));
    await waitFor(() => expect(screen.getByTestId('folder')).toHaveTextContent('Work'));

    // Saving is what sends it. Moving a file does not push on its own — the
    // design has exactly one push trigger, so that each gist revision matches
    // one deliberate save rather than every incidental gesture.
    await user.click(screen.getByText('save'));
    // Membership rides in the document's own gist, in the same request as the
    // content, so there is no second write that could fail on its own.
    await waitFor(() => expect(gist.__folderOf('g1')?.folderName).toBe('Work'));
    viewA.unmount();

    const b = await device([syncedRecord('shared text')]);
    renderDevice(b, gist);
    await waitFor(() => expect(screen.getByTestId('names')).toHaveTextContent('notes.md'));
    await user.click(screen.getByText('open notes'));

    await waitFor(() => expect(screen.getByTestId('folder')).toHaveTextContent('Work'));
    // One folder, not two. B created its own local Folder record from the
    // remote description; a second would mean the pull had grouped the file
    // somewhere the user cannot see.
    expect(screen.getByTestId('folder-count')).toHaveTextContent('1');
  });

  it('keeps the remote id when it creates the folder, so the next push agrees', async () => {
    // The third matching rule. Adopting the remote id rather than minting a new
    // one is what stops the two devices trading ids forever: if B invented its
    // own, B's next push would describe a folder A has never seen, and A would
    // create a third.
    const gist = sharedGist('shared text');
    const user = userEvent.setup();
    const storage = await device([syncedRecord('shared text')]);
    renderDevice(storage, gist);

    await waitFor(() => expect(screen.getByTestId('names')).toHaveTextContent('notes.md'));

    // The other device files the document without touching a word of it. This
    // is a folder-only change, and it still bumps the gist's `updated_at`
    // because the description is part of the gist — which is what makes it
    // visible at all, since nothing compares tags between listings.
    await gist.updateGist('g1', {
      fileName: 'notes.md',
      content: 'shared text',
      folder: { folderId: 'remote-uuid', folderName: 'Work' },
    });

    await reopenFile(user);
    await waitFor(() => expect(screen.getByTestId('folder')).toHaveTextContent('Work'));

    const stored = await storage.getFile('notes.md');
    expect(stored?.folderId).toBe('remote-uuid');
  });

  it('matches an existing folder by name regardless of case', async () => {
    // Second rule. The same folder made by hand on both devices has two ids and
    // possibly two capitalisations; treating those as different folders would
    // split the library in two and never heal.
    const gist = sharedGist('shared text');
    const user = userEvent.setup();
    const storage = await device([
      syncedRecord('shared text'),
      // A second file already living in the local folder, which exists only in
      // preferences until something references it.
      { name: 'other.md', content: 'x', kind: 'snapshot' as const, savedAt: 1, folderId: 'local-uuid' },
    ]);
    await storage.setPreferences({ folders: [{ id: 'local-uuid', name: 'work', order: 1 }] });
    renderDevice(storage, gist);

    await waitFor(() => expect(screen.getByTestId('names')).toHaveTextContent('notes.md'));
    // Remote spells it differently and has its own id for the same folder.
    await gist.updateGist('g1', {
      fileName: 'notes.md',
      content: 'shared text',
      folder: { folderId: 'remote-uuid', folderName: 'WORK' },
    });
    await reopenFile(user);
    await waitFor(() => expect(screen.getByTestId('folder')).toHaveTextContent(/work/i));

    // Still one folder, and still the local id — the local name is not
    // overwritten by the remote's capitalisation, which would make the folder
    // rename itself under the user every time another device pulled.
    expect(screen.getByTestId('folder-count')).toHaveTextContent('1');
    expect(screen.getByTestId('folder-names')).toHaveTextContent('work');
    expect((await storage.getFile('notes.md'))?.folderId).toBe('local-uuid');
  });

  it('takes the file out of its folder when the other device removed the tag', async () => {
    // The other half of the move, and the half a second file could never carry.
    // The description is rewritten on every push, so an untagged one is a
    // statement — "this file is in no folder" — rather than silence. Reading it
    // as "no opinion" would leave the document filed on every device except the
    // one it was taken out on.
    const gist = sharedGist('shared text', { folderId: 'remote-uuid', folderName: 'Work' });
    const user = userEvent.setup();
    const storage = await device([syncedRecord('shared text', { folderId: 'remote-uuid' })]);
    await storage.setPreferences({ folders: [{ id: 'remote-uuid', name: 'Work', order: 1 }] });
    renderDevice(storage, gist);

    await waitFor(() => expect(screen.getByTestId('names')).toHaveTextContent('notes.md'));
    await user.click(screen.getByText('open notes'));
    await waitFor(() => expect(screen.getByTestId('folder')).toHaveTextContent('Work'));

    // The other device ungroups it and pushes. No tag, same text.
    await gist.updateGist('g1', { fileName: 'notes.md', content: 'shared text' });

    await reopenFile(user);
    await waitFor(() => expect(screen.getByTestId('folder')).toHaveTextContent('(none)'));
    expect((await storage.getFile('notes.md'))?.folderId).toBeUndefined();
    // The folder itself stays. Emptying it is not the same as deleting it, and
    // the user may well have other files in there.
    expect(screen.getByTestId('folder-names')).toHaveTextContent('Work');
  });

  it('drops the folder tag when a file leaves its folder', async () => {
    // What the device doing the move has to send. The description carries the
    // whole answer every time, so leaving the tag off is the removal — there is
    // no separate delete, and nothing that can be left stranded.
    const gist = sharedGist('shared text', { folderId: 'remote-uuid', folderName: 'Work' });
    const user = userEvent.setup();
    const storage = await device([
      syncedRecord('shared text', { folderId: 'remote-uuid' }),
    ]);
    await storage.setPreferences({ folders: [{ id: 'remote-uuid', name: 'Work', order: 1 }] });
    renderDevice(storage, gist);

    await waitFor(() => expect(screen.getByTestId('names')).toHaveTextContent('notes.md'));
    await user.click(screen.getByText('open notes'));
    await waitFor(() => expect(screen.getByTestId('folder')).toHaveTextContent('Work'));

    await user.click(screen.getByText('ungroup'));
    await waitFor(() => expect(screen.getByTestId('folder')).toHaveTextContent('(none)'));

    await user.click(screen.getByText('save'));
    await waitFor(() => expect(gist.__folderOf('g1')).toBeUndefined());
  });

  it('pushes an ungrouped file with no tag and one file in the gist', async () => {
    // The ordinary case, and the one that broke before: folder metadata used to
    // travel as a second file in the gist, which meant an ungrouped file had to
    // ask GitHub to delete a file that was often not there — a 422 that failed
    // the whole PATCH and took the content with it.
    const gist = sharedGist('shared text');
    const user = userEvent.setup();
    const storage = await device([syncedRecord('shared text')]);
    renderDevice(storage, gist);

    await waitFor(() => expect(screen.getByTestId('names')).toHaveTextContent('notes.md'));
    await user.click(screen.getByText('open notes'));
    await waitFor(() => expect(screen.getByTestId('folder')).toHaveTextContent('(none)'));

    // Edited first, so the assertion below can only pass on a push that
    // actually landed. Asserting the gist still has no tag, or that
    // `updateGist` was called, would both hold just as well for a request
    // GitHub rejected — `push` catches the failure and reports it rather than
    // throwing, so nothing else marks the difference.
    await user.click(screen.getByText('edit'));
    await user.click(screen.getByText('save'));

    await waitFor(async () =>
      expect(await gist.getGist('g1')).toMatchObject({
        content: 'edited here',
        folder: undefined,
        description: '[mdreader] notes.md',
      }),
    );
    expect(screen.getByTestId('error')).toHaveTextContent('(none)');
  });
});

describe('a pull that also moves the file', () => {
  it('keeps the pulled content when the move lands with it', async () => {
    // The data-loss path `StorageService.setFolder` exists to close.
    //
    // A pull writes new content, and applying the folder tag immediately moves
    // the file. If that move persists by rebuilding the whole record from state
    // state, it carries the content `filesRef` was holding — which is a render
    // behind, and therefore the content from *before* the pull. The document on
    // screen would be correct and the one on disk would be stale, and the next
    // reload would show the old text back.
    //
    // Asserted against storage rather than the DOM, because the DOM is exactly
    // where this bug does not show. Verified by mutation: swapping `setFolder`
    // back to a whole-record `persistFile` fails this on the content line, with
    // the pre-pull text. Reordering the two calls in `pull` does *not* fail it —
    // the narrow write, not the ordering, is what makes this safe.
    const gist = sharedGist('old text');
    const user = userEvent.setup();
    const storage = await device([syncedRecord('old text')]);
    renderDevice(storage, gist);

    await waitFor(() => expect(screen.getByTestId('names')).toHaveTextContent('notes.md'));
    await user.click(screen.getByText('open notes'));
    await waitFor(() => expect(screen.getByTestId('folder')).toHaveTextContent('(none)'));

    // Another device edits the document and files it under Work, both in one
    // push — which is the whole reason membership rides along in the gist.
    gist.__mutateRemote('g1', 'new text from the other device');
    await gist.updateGist('g1', {
      fileName: 'notes.md',
      content: 'new text from the other device',
      folder: { folderId: 'remote-uuid', folderName: 'Work' },
    });

    await user.click(screen.getByText('pull'));

    await waitFor(() => expect(screen.getByTestId('folder')).toHaveTextContent('Work'));
    await waitFor(async () => {
      const stored = await storage.getFile('notes.md');
      expect(stored?.content).toBe('new text from the other device');
      expect(stored?.folderId).toBe('remote-uuid');
    });
  });
});
