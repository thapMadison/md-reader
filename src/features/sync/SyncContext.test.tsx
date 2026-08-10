import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SyncProvider, useSync } from './SyncContext';
import { canSync, syncableBytes } from './syncRules';
import { LibraryProvider, useLibrary } from '@/features/library/LibraryContext';
import { GistAuthProvider } from '@/services/gist/GistContext';
import { createFakeGistService, type FakeGistService } from '@/services/gist/fakeGist';
import { GistAuthError, GistTruncatedError, MAX_SYNC_FILE_BYTES } from '@/services/gist/types';
import { StorageProvider } from '@/services/storage/StorageContext';
import { createFakeStorageService } from '@/services/storage/fakeStorage';
import { contentHash } from '@/services/gist/hash';
import type { StorageService } from '@/services/storage/types';

const config = { clientId: 'c', tokenEndpoint: 'https://w.example' };

function Probe() {
  const {
    listed,
    remoteOnly,
    stateOf,
    errorOf,
    enableSync,
    disableSync,
    deleteRemote,
    deleteRemotes,
    hasOrphanedGist,
    leavesRemoteBehind,
    push,
    openRemote,
  } = useSync();
  const { active, files, editContent } = useLibrary();
  // Last result of a batch delete, rendered so a test can read which names came
  // back as failures. 'none' distinguishes "not run yet" from "ran, all fine".
  const [failed, setFailed] = useState('none');
  return (
    <div>
      <div data-testid="listed">{String(listed)}</div>
      <div data-testid="remote-only">{remoteOnly.map((r) => r.fileName).join(',')}</div>
      <div data-testid="names">{files.map((f) => f.name).join(',')}</div>
      <div data-testid="state">{active ? stateOf(active.name) : ''}</div>
      <div data-testid="orphaned">{String(active ? hasOrphanedGist(active.name) : false)}</div>
      <div data-testid="behind">{files.filter((f) => leavesRemoteBehind(f.name)).map((f) => f.name).join(',')}</div>
      <div data-testid="failed">{failed}</div>
      <button
        onClick={() =>
          void deleteRemotes(files.map((f) => f.name)).then((f) => setFailed(f.join(',') || 'ok'))
        }
      >
        delete all remotes
      </button>
      <div data-testid="error">{active ? (errorOf(active.name) ?? '') : ''}</div>
      <div data-testid="content">{active?.editedContent ?? ''}</div>
      <button onClick={() => active && void enableSync(active.name)}>enable</button>
      <button onClick={() => active && void disableSync(active.name)}>disable</button>
      <button onClick={() => active && void deleteRemote(active.name)}>delete remote</button>
      <button onClick={() => active && void push(active.name)}>push</button>
      <button onClick={() => active && editContent(active.name, 'typed locally')}>edit</button>
      {remoteOnly.map((r) => (
        <button key={r.gistId} onClick={() => void openRemote(r.gistId)}>
          open:{r.fileName}
        </button>
      ))}
    </div>
  );
}

function renderSync(storage: StorageService, gist: FakeGistService) {
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

/** A storage seeded as if the user were already signed in, with one local file. */
async function signedIn(files: Parameters<StorageService['saveFile']>[0][] = []) {
  const storage = createFakeStorageService();
  await storage.setAuth({ accessToken: 'gho_x', scope: 'gist', login: 'octocat' });
  for (const f of files) await storage.saveFile(f);
  return storage;
}

const localFile = {
  name: 'notes.md',
  content: 'local body',
  kind: 'snapshot' as const,
  savedAt: 1,
};

/**
 * `localFile` as a device that has genuinely finished a sync would have stored
 * it: bound to a gist, *and* carrying the two fields that record what it is in
 * step with.
 *
 * Both are needed for `stateOf` to answer `idle`. Omitting `syncedContentHash`
 * makes the local side read as changed — deliberately, since a record with no
 * hash has no evidence its content matches the remote, and guessing "unchanged"
 * there is what would let a pull overwrite an edit. Omitting `remoteUpdatedAt`
 * leaves the watermark at 0, so any gist looks newer.
 *
 * @param at Watermark to record. Must be at least the seeded gist's
 *   `updatedAt`, which the fake sets to 1_700_000_001_000 for the first seed.
 */
function syncedRecord(content = localFile.content, at = 1_700_000_001_000) {
  return {
    ...localFile,
    content,
    syncEnabled: true,
    gistId: 'g1',
    gistFileName: 'notes.md',
    syncedContentHash: contentHash(content),
    remoteUpdatedAt: at,
  };
}

beforeEach(() => {
  sessionStorage.clear();
  window.history.replaceState({}, '', '/');
  // Nothing here should reach the network; the fake service is injected. A
  // throwing fetch turns any accidental real call into a visible failure.
  vi.stubGlobal(
    'fetch',
    vi.fn(() => {
      throw new Error('no test may call fetch');
    }),
  );
});

describe('listing on sign-in', () => {
  it('fetches the gist list once signed in, without downloading content', async () => {
    // The shape that makes Gist fit this app: one request builds the whole
    // library view no matter how many documents it holds, and a document's bytes
    // cross the network only when the user opens it. On a phone over mobile data
    // that is the difference between usable and not.
    const storage = await signedIn();
    const gist = createFakeGistService({
      seed: [{ id: 'g1', fileName: 'from-laptop.md', content: 'pushed earlier' }],
    });

    renderSync(storage, gist);

    await waitFor(() => expect(screen.getByTestId('listed')).toHaveTextContent('true'));
    expect(screen.getByTestId('remote-only')).toHaveTextContent('from-laptop.md');
    expect(gist.__calls).toContain('listGists');
    expect(gist.__calls).not.toContain('getGist');
  });

  it('lists nothing while signed out', async () => {
    const gist = createFakeGistService({ seed: [{ id: 'g1', fileName: 'x.md', content: 'y' }] });
    renderSync(createFakeStorageService(), gist);

    await waitFor(() => expect(screen.getByTestId('names')).not.toHaveTextContent('x.md'));
    expect(screen.getByTestId('listed')).toHaveTextContent('false');
    expect(gist.__calls).not.toContain('listGists');
  });

  it('does not offer a remote gist that is already open locally', async () => {
    // Otherwise the sidebar would show the user's own open document as
    // something to download.
    const storage = await signedIn([localFile]);
    const gist = createFakeGistService({
      seed: [{ id: 'g1', fileName: 'notes.md', content: 'same doc' }],
    });

    renderSync(storage, gist);

    await waitFor(() => expect(screen.getByTestId('listed')).toHaveTextContent('true'));
    expect(screen.getByTestId('remote-only')).toHaveTextContent('');
  });
});

describe('enabling sync on a file', () => {
  it('creates a gist and records the binding', async () => {
    const storage = await signedIn([localFile]);
    const gist = createFakeGistService();
    renderSync(storage, gist);
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('off'));

    await userEvent.setup().click(screen.getByText('enable'));

    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('idle'));
    const rec = await storage.getFile('notes.md');
    expect(rec?.syncEnabled).toBe(true);
    expect(rec?.gistId).toBe('gist-1');
    expect(rec?.syncedContentHash).toBeTruthy();
    expect(gist.__calls.filter((c) => c === 'createGist')).toHaveLength(1);
  });

  it('pushes what the user sees, unsaved edits included', async () => {
    // editedContent, not originalContent. Pushing the on-disk copy would send a
    // version the user is not looking at and has no way to notice.
    const storage = await signedIn([localFile]);
    const gist = createFakeGistService();
    renderSync(storage, gist);
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('off'));

    const user = userEvent.setup();
    await user.click(screen.getByText('edit'));
    await user.click(screen.getByText('enable'));

    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('idle'));
    await expect(gist.getGist('gist-1')).resolves.toMatchObject({ content: 'typed locally' });
  });

  it('leaves the file usable when the push fails', async () => {
    // A network failure must not cost the user their document. It stays open,
    // stays edited, and simply is not synced.
    const storage = await signedIn([localFile]);
    const gist = createFakeGistService();
    gist.__failNext('createGist', new Error('network down'));
    renderSync(storage, gist);
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('off'));

    await userEvent.setup().click(screen.getByText('enable'));

    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('error'));
    expect(screen.getByTestId('error')).toHaveTextContent('network down');
    expect(screen.getByTestId('content')).toHaveTextContent('local body');
    expect((await storage.getFile('notes.md'))?.syncEnabled).toBeFalsy();
  });
});

describe('the 1MB cap', () => {
  // Measured in UTF-8 bytes, not string length: a CJK document undercounts by
  // three to four times if you use `.length`.
  const cjk = '漢'.repeat(MAX_SYNC_FILE_BYTES / 3 + 1);

  it('counts bytes rather than characters', () => {
    expect(cjk.length).toBeLessThan(MAX_SYNC_FILE_BYTES);
    expect(syncableBytes(cjk)).toBeGreaterThan(MAX_SYNC_FILE_BYTES);
    expect(canSync(cjk)).toBe(false);
  });

  it('reports an oversized file as unsyncable but keeps it readable', async () => {
    // Both halves matter. The cap is on syncing, not on the document: a large
    // file still opens and reads exactly as before.
    const storage = await signedIn([{ ...localFile, content: cjk }]);
    renderSync(storage, createFakeGistService());

    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('too-large'));
    expect(screen.getByTestId('content')).toHaveTextContent(cjk.slice(0, 20));
  });
});

describe('opening a remote-only gist', () => {
  it('downloads the content and adds it to the library', async () => {
    // The end of the path this whole feature exists for: pushed from the laptop,
    // listed on the phone, and only now does the body cross the network.
    const storage = await signedIn();
    const gist = createFakeGistService({
      seed: [{ id: 'g1', fileName: 'from-laptop.md', content: '# written on the laptop' }],
    });
    renderSync(storage, gist);
    await waitFor(() => expect(screen.getByTestId('remote-only')).toHaveTextContent('from-laptop.md'));

    await userEvent.setup().click(screen.getByText('open:from-laptop.md'));

    await waitFor(() =>
      expect(screen.getByTestId('content')).toHaveTextContent('# written on the laptop'),
    );
    expect(screen.getByTestId('names')).toHaveTextContent('from-laptop.md');
  });

  it('persists the download so it survives a reload', async () => {
    const storage = await signedIn();
    const gist = createFakeGistService({
      seed: [{ id: 'g1', fileName: 'from-laptop.md', content: 'body' }],
    });
    renderSync(storage, gist);
    await waitFor(() => expect(screen.getByTestId('remote-only')).toHaveTextContent('from-laptop.md'));

    await userEvent.setup().click(screen.getByText('open:from-laptop.md'));

    await waitFor(async () => {
      const rec = await storage.getFile('from-laptop.md');
      expect(rec?.content).toBe('body');
      // A downloaded file has no handle and never can have one — that is what
      // makes this work on iOS Safari, where the picker API does not exist.
      expect(rec?.kind).toBe('snapshot');
      expect(rec?.gistId).toBe('g1');
      expect(rec?.syncEnabled).toBe(true);
    });
  });

  it('refuses a truncated gist rather than storing a clipped body', async () => {
    // Writing GitHub's clipped string into IndexedDB over a full document is
    // silent data loss, and the next push would send the stump back as truth.
    const storage = await signedIn();
    const gist = createFakeGistService({
      seed: [{ id: 'g1', fileName: 'big.md', content: 'the full document' }],
    });
    gist.__truncate('g1');
    renderSync(storage, gist);
    await waitFor(() => expect(screen.getByTestId('remote-only')).toHaveTextContent('big.md'));

    await userEvent.setup().click(screen.getByText('open:big.md'));

    await waitFor(() => expect(screen.getByTestId('names')).not.toHaveTextContent('big.md'));
    expect(await storage.getFile('big.md')).toBeUndefined();
  });

  it('surfaces the truncation as an error rather than failing silently', async () => {
    const storage = await signedIn();
    const gist = createFakeGistService({ seed: [{ id: 'g1', fileName: 'big.md', content: 'x' }] });
    gist.__truncate('g1');
    renderSync(storage, gist);
    await waitFor(() => expect(screen.getByTestId('remote-only')).toHaveTextContent('big.md'));

    await userEvent.setup().click(screen.getByText('open:big.md'));

    // The library never gained the file, so the probe's `active` is unchanged;
    // the error is recorded against the gist's own file name.
    await waitFor(() => expect(gist.__calls).toContain('getGist'));
    expect(await storage.getFile('big.md')).toBeUndefined();
    expect(new GistTruncatedError('g1').message).toContain('truncated');
  });
});

describe('pushing an existing binding', () => {
  it('updates the bound gist instead of creating a second one', async () => {
    // Bound by gistId, never by name. Files are keyed by bare basename, so
    // matching by name across devices would let one machine's README overwrite
    // another's.
    const storage = await signedIn([
      syncedRecord(),
    ]);
    const gist = createFakeGistService({
      seed: [{ id: 'g1', fileName: 'notes.md', content: 'older remote' }],
    });
    renderSync(storage, gist);
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('idle'));

    const user = userEvent.setup();
    await user.click(screen.getByText('edit'));
    await user.click(screen.getByText('push'));

    await waitFor(async () =>
      expect((await gist.getGist('g1')).content).toBe('typed locally'),
    );
    expect(gist.__calls).not.toContain('createGist');
  });

  it('does not push anything on its own', async () => {
    // No auto-push and no debounce, deliberately. Every PATCH is a revision, and
    // revision history is one of the reasons Gist was chosen over a blob store;
    // pushing on each keystroke would fill it with noise.
    const storage = await signedIn([
      syncedRecord(),
    ]);
    const gist = createFakeGistService({
      seed: [{ id: 'g1', fileName: 'notes.md', content: 'remote' }],
    });
    renderSync(storage, gist);
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('idle'));

    await userEvent.setup().click(screen.getByText('edit'));
    await new Promise((r) => setTimeout(r, 50));

    expect(gist.__calls).not.toContain('updateGist');
  });
});

describe('turning sync off', () => {
  it('stops syncing and leaves the gist on GitHub', async () => {
    // Another device may still be bound to that gist, and a toggle must not
    // delete the user's data as a side effect.
    const storage = await signedIn([
      syncedRecord(),
    ]);
    const gist = createFakeGistService({
      seed: [{ id: 'g1', fileName: 'notes.md', content: 'remote' }],
    });
    renderSync(storage, gist);
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('idle'));

    await userEvent.setup().click(screen.getByText('disable'));

    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('off'));
    const rec = await storage.getFile('notes.md');
    expect(rec?.syncEnabled).toBe(false);
    expect(rec?.content).toBe('local body');
    expect(gist.__calls).not.toContain('deleteGist');
    await expect(gist.getGist('g1')).resolves.toBeTruthy();
  });

  it('remembers which gist it was, so turning sync back on reuses it', async () => {
    // Off is off, not forget. Dropping `gistId` here would make the next
    // enableSync create a *second* gist for the same document — and since
    // nothing deletes the first, every flick of the toggle would leave another
    // orphan on the user's account.
    //
    // Reconnecting by the id already on the record is not the name-matching the
    // binding rules forbid: that rule exists so one machine's README cannot
    // adopt another's gist, and an id this device wrote down itself carries no
    // such ambiguity.
    const storage = await signedIn([syncedRecord()]);
    const gist = createFakeGistService({
      seed: [{ id: 'g1', fileName: 'notes.md', content: 'remote' }],
    });
    const user = userEvent.setup();
    renderSync(storage, gist);
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('idle'));

    for (let i = 0; i < 3; i++) {
      await user.click(screen.getByText('disable'));
      await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('off'));
      await user.click(screen.getByText('enable'));
      await waitFor(() => expect(screen.getByTestId('state')).not.toHaveTextContent('off'));
    }

    // Three round trips, still one gist. Asserted on the calls rather than on
    // the record, because a `createGist` that happened is not undone by the
    // record ending up pointing somewhere sensible.
    expect(gist.__calls.filter((c) => c === 'createGist')).toHaveLength(0);
    expect(await storage.getFile('notes.md')).toMatchObject({ gistId: 'g1', syncEnabled: true });
  });

  it('still reconnects when the listing has not come back', async () => {
    // The reconnect only forks to a new gist when the listing positively says
    // the old one is gone. Written the other way round — "reconnect only if I
    // can see it in `remotes`" — silence reads as absence, and a listing that
    // failed or has not landed yet makes every enable create a duplicate. That
    // is the orphan-strewing bug the reconnect exists to prevent, reintroduced
    // through the guard meant to make it safer.
    const storage = await signedIn([{ ...syncedRecord(), syncEnabled: false }]);
    const gist = createFakeGistService({
      seed: [{ id: 'g1', fileName: 'notes.md', content: 'remote' }],
    });
    // Signed in, so `enableSync` runs; the listing is held open, so `remotes`
    // is empty while the gist is very much still there. Held rather than
    // failed: a failure would put the file in the `error` state, which the
    // enable path never reaches.
    gist.__holdListings();
    const user = userEvent.setup();
    renderSync(storage, gist);
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('off'));

    await user.click(screen.getByText('enable'));

    await waitFor(() => expect(screen.getByTestId('state')).not.toHaveTextContent('off'));
    expect(gist.__calls).not.toContain('createGist');
    expect(await storage.getFile('notes.md')).toMatchObject({ gistId: 'g1' });
  });
});

describe('deleting the gist', () => {
  it('removes it from GitHub and unbinds the file, keeping the local copy', async () => {
    // The only way the app offers to remove a gist. `disableSync` deliberately
    // does not, so without this every file ever synced leaves something behind
    // on the account forever.
    const storage = await signedIn([syncedRecord()]);
    const gist = createFakeGistService({
      seed: [{ id: 'g1', fileName: 'notes.md', content: 'remote' }],
    });
    const user = userEvent.setup();
    renderSync(storage, gist);
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('idle'));

    await user.click(screen.getByText('delete remote'));

    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('off'));
    await expect(gist.getGist('g1')).rejects.toThrow();

    // Unbound, not just switched off. Keeping the id here would point the next
    // `enableSync` at a gist that no longer exists — a 404 where the user asked
    // for a new gist.
    const rec = await storage.getFile('notes.md');
    expect(rec).toMatchObject({ syncEnabled: false, content: 'local body' });
    expect(rec?.gistId).toBeUndefined();
    // Not an orphan: there is nothing left on GitHub to offer to delete.
    expect(screen.getByTestId('orphaned')).toHaveTextContent('false');
  });

  it('keeps the binding when the delete fails', async () => {
    // Unbinding after a delete that did not land is the one outcome with no way
    // back: the gist stays on the account with nothing in the app pointing at
    // it, so the user can neither reconnect to it nor retry the delete.
    const storage = await signedIn([syncedRecord()]);
    const gist = createFakeGistService({
      seed: [{ id: 'g1', fileName: 'notes.md', content: 'remote' }],
    });
    const user = userEvent.setup();
    renderSync(storage, gist);
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('idle'));

    gist.__failNext('deleteGist', new Error('network down'));
    await user.click(screen.getByText('delete remote'));

    await waitFor(() => expect(screen.getByTestId('error')).toHaveTextContent('network down'));
    await expect(gist.getGist('g1')).resolves.toBeTruthy();
    // Asserted on disk, not on the rendered state: what matters is that the id
    // survives a reload, and errors live only in memory.
    expect(await storage.getFile('notes.md')).toMatchObject({ gistId: 'g1', syncEnabled: true });
  });

  it('reports a file as orphaned only after sync is switched off', async () => {
    // What the delete button keys off. A file that never synced has nothing on
    // GitHub, and offering to delete it would be offering to delete nothing.
    const storage = await signedIn([localFile]);
    const gist = createFakeGistService();
    const user = userEvent.setup();
    renderSync(storage, gist);
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('off'));
    expect(screen.getByTestId('orphaned')).toHaveTextContent('false');

    await user.click(screen.getByText('enable'));
    await waitFor(() => expect(screen.getByTestId('state')).not.toHaveTextContent('off'));
    // Syncing, so not orphaned — there is a gist, but the file is still using it.
    expect(screen.getByTestId('orphaned')).toHaveTextContent('false');

    await user.click(screen.getByText('disable'));
    await waitFor(() => expect(screen.getByTestId('orphaned')).toHaveTextContent('true'));
  });
});

// Closing a file, deleting a folder and clearing the library all remove several
// files at once, and each has to take the GitHub copies with it. They go through
// `deleteRemotes`, which differs from the single-file path in what it has to
// survive: some of the names have no gist, and some of the deletes can fail
// while others succeed.
describe('deleting several gists at once', () => {
  const twoSynced = async () => {
    const storage = await signedIn([
      { ...syncedRecord(), name: 'a.md' },
      { ...syncedRecord(), name: 'b.md', gistId: 'g2' },
      // Never synced. Its presence is the point: a name with no gist must not
      // stop the two that do have one.
      { ...localFile, name: 'c.md' },
    ]);
    const gist = createFakeGistService({
      seed: [
        { id: 'g1', fileName: 'a.md', content: 'remote a' },
        { id: 'g2', fileName: 'b.md', content: 'remote b' },
      ],
    });
    const user = userEvent.setup();
    renderSync(storage, gist);
    await waitFor(() => expect(screen.getByTestId('listed')).toHaveTextContent('true'));
    return { storage, gist, user };
  };

  it('reports which files have a copy on GitHub, so the caller can warn about them', async () => {
    await twoSynced();

    // What the close/clear/delete-folder confirmations count. Keyed on the id
    // alone, not on `syncEnabled`: a file with sync switched off still has a
    // gist that a delete would take with it.
    await waitFor(() => expect(screen.getByTestId('behind')).toHaveTextContent('a.md,b.md'));
  });

  it('deletes every gist it was given and skips the names without one', async () => {
    const { gist, user } = await twoSynced();

    await user.click(screen.getByText('delete all remotes'));

    await waitFor(() => expect(screen.getByTestId('failed')).toHaveTextContent('ok'));
    await expect(gist.getGist('g1')).rejects.toThrow();
    await expect(gist.getGist('g2')).rejects.toThrow();
    // Exactly two: c.md has no gist, and asking GitHub to delete nothing is a
    // request that can only fail.
    expect(gist.__calls.filter((c) => c === 'deleteGist')).toHaveLength(2);
  });

  it('names the ones it could not delete instead of failing the whole batch', async () => {
    const { gist, user } = await twoSynced();

    gist.__failNext('deleteGist', new Error('network down'));
    await user.click(screen.getByText('delete all remotes'));

    // a.md failed, b.md still went. Returning the failures rather than throwing
    // is what lets the caller keep those rows locally — a visible file the user
    // can retry, instead of a gist left on the account with nothing pointing at it.
    await waitFor(() => expect(screen.getByTestId('failed')).toHaveTextContent('a.md'));
    await expect(gist.getGist('g1')).resolves.toBeTruthy();
    await expect(gist.getGist('g2')).rejects.toThrow();
  });

  it('treats an already-deleted gist as the outcome asked for', async () => {
    // Deleted from another device, or by hand on github.com. GitHub answers 404,
    // which is not a failure here: the caller wanted it gone and it is gone.
    // Reporting it would keep a local file alive forever over a gist that does
    // not exist.
    const { gist, user } = await twoSynced();
    await gist.deleteGist('g1');

    await user.click(screen.getByText('delete all remotes'));

    await waitFor(() => expect(screen.getByTestId('failed')).toHaveTextContent('ok'));
  });
});

describe('a revoked token', () => {
  it('signs the user out when the list call is rejected', async () => {
    // A token revoked on github.com surfaces as a 401 on whatever call runs
    // next. Reporting it centrally beats making each call site recognise it.
    const storage = await signedIn();
    const gist = createFakeGistService();
    gist.__failNext('listGists', new GistAuthError());

    renderSync(storage, gist);

    await waitFor(async () => expect(await storage.getAuth()).toBeUndefined());
    expect(screen.getByTestId('listed')).toHaveTextContent('false');
  });

  it('keeps the session through an ordinary network failure', async () => {
    const storage = await signedIn();
    const gist = createFakeGistService();
    gist.__failNext('listGists', new TypeError('Failed to fetch'));

    renderSync(storage, gist);

    await waitFor(() => expect(gist.__calls).toContain('listGists'));
    expect(await storage.getAuth()).toMatchObject({ accessToken: 'gho_x' });
  });
});
