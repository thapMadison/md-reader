import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SyncProvider } from './SyncContext';
import { FIRST_SYNC_WARNING, SyncStatusIcon, useSyncMenuActions } from './syncStatus';
import { RemoteFileList } from './RemoteFileList';
import { LibraryProvider, useLibrary } from '@/features/library/LibraryContext';
import { GistAuthProvider, useOptionalGistAuth } from '@/services/gist/GistContext';
import { createFakeGistService, type FakeGistService } from '@/services/gist/fakeGist';
import { StorageProvider } from '@/services/storage/StorageContext';
import { createFakeStorageService } from '@/services/storage/fakeStorage';
import { contentHash } from '@/services/gist/hash';
import type { StorageService } from '@/services/storage/types';

const config = { clientId: 'c', tokenEndpoint: 'https://w.example' };

/**
 * The row's action menu, as Sidebar builds it — sync entries as menu items.
 *
 * Always expanded here rather than hidden behind a ⋯ toggle: what these tests
 * are about is which actions sync offers for a given state, and a toggle would
 * add a click to every one of them without exercising any sync code.
 */
function RowMenu({ name }: { name: string }) {
  const { items, run } = useSyncMenuActions(name);
  return (
    <div role="menu">
      {items.map((item) => (
        <button key={item.kind} role="menuitem" onClick={() => run(item.kind)}>
          {item.label}
        </button>
      ))}
    </div>
  );
}

/**
 * A stand-in for the sidebar's file list: the sync surface as Sidebar mounts it
 * — a status glyph on the row, actions in the row menu — over a real
 * LibraryProvider. Rendering Sidebar itself would drag in theme chrome and a
 * dozen unrelated props without exercising anything more of the sync path.
 */
function Panel() {
  const { files, active } = useLibrary();
  return (
    <div>
      {files.map((f) => (
        <div key={f.name} data-testid={`row-${f.name}`}>
          <span>{f.name}</span>
          <SyncStatusIcon name={f.name} />
          <RowMenu name={f.name} />
        </div>
      ))}
      <RemoteFileList />
      <div data-testid="active">{active?.name ?? ''}</div>
      <div data-testid="active-content">{active?.editedContent ?? ''}</div>
    </div>
  );
}

/** The status glyph's accessible label for one row, or null when it draws none. */
const statusOf = (name: string) =>
  within(screen.getByTestId(`row-${name}`)).queryByRole('img')?.getAttribute('aria-label') ?? null;

/**
 * Drives sign-out the way the account button does. Mounted only by the test
 * that needs it, so the rest of the panel stays the shape Sidebar renders.
 */
function SignOutProbe() {
  const auth = useOptionalGistAuth();
  return <button onClick={() => void auth?.signOut()}>test-sign-out</button>;
}

function renderPanel(storage: StorageService, gist: FakeGistService, withProviders = true) {
  const panel = <Panel />;
  return render(
    <StorageProvider service={storage}>
      <LibraryProvider>
        {withProviders ? (
          <GistAuthProvider config={config} createService={() => gist}>
            <SyncProvider>{panel}</SyncProvider>
          </GistAuthProvider>
        ) : (
          panel
        )}
      </LibraryProvider>
    </StorageProvider>,
  );
}

async function signedIn(files: Parameters<StorageService['saveFile']>[0][] = []) {
  const storage = createFakeStorageService();
  await storage.setAuth({ accessToken: 'gho_x', scope: 'gist', login: 'octocat' });
  for (const f of files) await storage.saveFile(f);
  return storage;
}

const notes = { name: 'notes.md', content: 'local body', kind: 'snapshot' as const, savedAt: 1 };

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

describe('the laptop-to-phone path, through the UI', () => {
  it('lists a gist pushed elsewhere and loads it on tap', async () => {
    // The goal of the whole feature, end to end: a document that exists only on
    // GitHub is offered by name, and its body arrives only when asked for.
    const storage = await signedIn();
    const gist = createFakeGistService({
      seed: [{ id: 'g1', fileName: 'from-laptop.md', content: '# written on the laptop' }],
    });

    renderPanel(storage, gist);

    const remote = await screen.findByText('from-laptop.md');
    expect(gist.__calls).not.toContain('getGist');

    await userEvent.setup().click(remote);

    await waitFor(() => expect(screen.getByTestId('active')).toHaveTextContent('from-laptop.md'));
    expect(screen.getByTestId('active-content')).toHaveTextContent('# written on the laptop');
    // It is now a local file, so it must no longer be offered as a download.
    expect(screen.queryByText('On GitHub')).not.toBeInTheDocument();
  });

  it('says what "secret" actually means before the first push', async () => {
    // GitHub's word is "secret" and users read it as "private". A secret gist is
    // unlisted: anyone with the URL can read it, one person's access cannot be
    // revoked, and deleting the gist is the only remedy. Saying so after the
    // upload would be saying it too late.
    //
    // The warning moved onto the menu item with the row's actions, so this
    // checks the constant Sidebar puts there rather than the item's own title —
    // the harness menu here is a stand-in and does not carry titles.
    const storage = await signedIn([notes]);
    renderPanel(storage, createFakeGistService());

    await screen.findByRole('menuitem', { name: 'Sync to GitHub' });
    expect(FIRST_SYNC_WARNING).toMatch(/unlisted, not private/i);
  });

  it('turns sync on from the row menu and shows it took', async () => {
    const storage = await signedIn([notes]);
    const gist = createFakeGistService();
    renderPanel(storage, gist);

    await userEvent.setup().click(await screen.findByRole('menuitem', { name: 'Sync to GitHub' }));

    // The row now says so with a glyph rather than a word-pill, and the menu
    // flips to the action a synced file offers.
    await waitFor(() => expect(statusOf('notes.md')).toMatch(/matches the copy on GitHub/i));
    expect(screen.getByRole('menuitem', { name: 'Stop syncing this file' })).toBeInTheDocument();
    expect((await storage.getFile('notes.md'))?.gistId).toBe('gist-1');
  });

  it('shows a status glyph but no controls on the row itself', async () => {
    // The point of moving the actions into ⋯: a synced row used to stack a line
    // of word-buttons under its name, and a library of them cost more list than
    // the filenames did. What is left on the row is status, and only status.
    const storage = await signedIn([notes]);
    renderPanel(storage, createFakeGistService());

    const row = await screen.findByTestId('row-notes.md');
    await waitFor(() => expect(statusOf('notes.md')).toBeNull());
    // Nothing clickable outside the menu — no stray pill left behind on the row.
    expect(within(row).queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows nothing at all while signed out', async () => {
    // Sync is invisible until there is an account behind it: a control that
    // first demands a sign-in puts the consequence after the click.
    const storage = createFakeStorageService();
    await storage.saveFile(notes);
    const gist = createFakeGistService({ seed: [{ id: 'g1', fileName: 'x.md', content: 'y' }] });

    renderPanel(storage, gist);

    await waitFor(() => expect(screen.getByTestId('row-notes.md')).toBeInTheDocument());
    const row = screen.getByTestId('row-notes.md');
    expect(within(row).queryByRole('menuitem')).not.toBeInTheDocument();
    expect(statusOf('notes.md')).toBeNull();
    expect(screen.queryByText('On GitHub')).not.toBeInTheDocument();
  });

  it('drops the previous account\'s file names on sign-out', async () => {
    // The guarantee RemoteFileList leans on. It renders whatever `remoteOnly`
    // holds, so signing out has to empty the list at the source — otherwise the
    // last account's document names stay on screen, and tapping one would fetch
    // from an account that is no longer connected.
    const storage = await signedIn();
    const gist = createFakeGistService({
      seed: [{ id: 'g1', fileName: 'from-laptop.md', content: 'body' }],
    });

    render(
      <StorageProvider service={storage}>
        <LibraryProvider>
          <GistAuthProvider config={config} createService={() => gist}>
            <SyncProvider>
              <RemoteFileList />
              <SignOutProbe />
            </SyncProvider>
          </GistAuthProvider>
        </LibraryProvider>
      </StorageProvider>,
    );

    await screen.findByText('from-laptop.md');

    // Through signOut rather than a dispatched `mdreader:auth-expired`: that
    // event only fires from reportAuthExpired for a GistAuthError, so raising
    // it by hand would exercise a path the app cannot take.
    await userEvent.setup().click(screen.getByText('test-sign-out'));

    await waitFor(() => expect(screen.queryByText('from-laptop.md')).not.toBeInTheDocument());
    expect(screen.queryByText('On GitHub')).not.toBeInTheDocument();
  });

  it('renders the file list unharmed with no sync providers above it', async () => {
    // Sidebar is otherwise presentational and is mounted this way by its own
    // tests. A pill must not be able to take the file list down with it.
    const storage = createFakeStorageService();
    await storage.saveFile(notes);

    renderPanel(storage, createFakeGistService(), false);

    const row = await screen.findByTestId('row-notes.md');
    expect(within(row).getByText('notes.md')).toBeInTheDocument();
  });

  it('explains an oversized file rather than offering a control that would fail', async () => {
    const cjk = '漢'.repeat(400_000);
    const storage = await signedIn([{ ...notes, content: cjk }]);

    renderPanel(storage, createFakeGistService());

    // The glyph says why, and the menu offers nothing — an enabled-looking
    // control that cannot succeed is worse than no control.
    await waitFor(() => expect(statusOf('notes.md')).toMatch(/still opens and reads normally/i));
    expect(screen.queryByRole('menuitem')).not.toBeInTheDocument();
  });

  it('offers a retry when a push fails', async () => {
    const storage = await signedIn([notes]);
    const gist = createFakeGistService();
    gist.__failNext('createGist', new Error('network down'));

    renderPanel(storage, gist);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('menuitem', { name: 'Sync to GitHub' }));

    // The failure is on the row, with the reason; the retry is in the menu.
    await waitFor(() => expect(statusOf('notes.md')).toContain('network down'));
    expect(await screen.findByRole('menuitem', { name: 'Retry sync' })).toBeInTheDocument();
  });
});

// The confirmation these go through lives in Sidebar's row menu — see
// "Sidebar row menu" in Sidebar.test.tsx. What is checked here is the layer
// underneath: which actions the orphan state offers, and that the delete does
// what it says to the account.
describe('deleting the GitHub copy from the row menu', () => {
  /** Signs in, syncs `notes.md`, then switches sync off — the orphan state. */
  async function orphaned() {
    const storage = await signedIn([notes]);
    const gist = createFakeGistService();
    const user = userEvent.setup();
    renderPanel(storage, gist);

    await user.click(await screen.findByRole('menuitem', { name: 'Sync to GitHub' }));
    await screen.findByRole('menuitem', { name: 'Stop syncing this file' });
    await user.click(screen.getByRole('menuitem', { name: 'Stop syncing this file' }));
    await screen.findByRole('menuitem', { name: 'Resume syncing' });
    return { storage, gist, user };
  }

  it('offers no delete for a file that was never synced', async () => {
    // There would be nothing to delete. An enabled-looking destructive control
    // that does nothing is worse than no control.
    const storage = await signedIn([notes]);
    renderPanel(storage, createFakeGistService());

    await screen.findByRole('menuitem', { name: 'Sync to GitHub' });
    expect(screen.queryByRole('menuitem', { name: /delete copy from github/i })).not.toBeInTheDocument();
  });

  it('offers the delete only once a copy has been left behind', async () => {
    // The orphan is the one case where a copy on the account has nothing local
    // pointing at it any more, so this is the app's only route to removing it.
    await orphaned();

    expect(screen.getByRole('menuitem', { name: 'Delete copy from GitHub' })).toBeInTheDocument();
  });

  it('removes the copy from the account and leaves the document alone', async () => {
    const { storage, gist, user } = await orphaned();

    await user.click(screen.getByRole('menuitem', { name: 'Delete copy from GitHub' }));

    await waitFor(() =>
      expect(screen.queryByRole('menuitem', { name: 'Delete copy from GitHub' })).not.toBeInTheDocument(),
    );
    await expect(gist.getGist('gist-1')).rejects.toThrow();
    // Back to a plain unsynced file, and the document is still here: this
    // deletes the GitHub copy, not the user's work.
    expect(screen.getByRole('menuitem', { name: 'Sync to GitHub' })).toBeInTheDocument();
    expect(await storage.getFile('notes.md')).toMatchObject({ content: 'local body' });
  });

  it('says nothing about "gists" on the labels a user reads', async () => {
    // The word is GitHub's, not the user's: someone who signed in to keep files
    // on their phone has no idea what a gist is. It survives in exactly one
    // place — the pre-upload warning, where "secret gist" is the term they will
    // meet on github.com and the thing they must not read as "private".
    await orphaned();

    for (const item of screen.getAllByRole('menuitem')) {
      expect(item.textContent).not.toMatch(/gist/i);
    }
    expect(statusOf('notes.md')).not.toMatch(/gist/i);
  });
});

describe('when the GitHub copy is deleted from another device', () => {
  /**
   * A device that pulled the file and stored it, bound to a gist that is no
   * longer on the account — what the other machine is left holding after a
   * delete.
   */
  async function afterRemoteDelete() {
    const storage = await signedIn([
      {
        ...notes,
        syncEnabled: true,
        gistId: 'g1',
        gistFileName: 'notes.md',
        syncedContentHash: contentHash(notes.content),
        remoteUpdatedAt: 1_700_000_001_000,
      },
    ]);
    // The account has no such gist: the other device already deleted it.
    const gist = createFakeGistService();
    renderPanel(storage, gist);
    return { storage, gist, user: userEvent.setup() };
  }

  it('says so instead of claiming the file is synced', async () => {
    // Without this the pill reads `synced`, because every comparison behind it
    // is between fields the record holds about itself — nothing in them knows
    // the other end is gone. The app would vouch for a backup that no longer
    // exists.
    const { storage } = await afterRemoteDelete();

    // The reassuring half first: "deleted" next to a filename reads as "your
    // file is deleted", and it is not.
    await waitFor(() => expect(statusOf('notes.md')).toMatch(/your file is safe here/i));
    // Which is a claim about the file, so it is checked rather than trusted.
    expect(await storage.getFile('notes.md')).toMatchObject({ content: 'local body' });
    expect(statusOf('notes.md')).not.toMatch(/matches the copy on GitHub/i);
    expect(screen.getByRole('menuitem', { name: 'Upload to GitHub again' })).toBeInTheDocument();
  });

  it('does not cry wolf while the listing is still in flight', async () => {
    // The whole correctness of the `gone` branch. An empty `remotes` means one
    // of two opposite things — "asked, nothing there" or "have not asked yet" —
    // and only `listed` tells them apart. Read the wrong one and every synced
    // file flashes as deleted on each load, which is the false alarm that
    // teaches people to ignore the real one.
    //
    // The listing is held rather than failed: a failure sets an error, and an
    // error outranks every other state, so the test would pass by never
    // reaching the branch it is about.
    const storage = await signedIn([
      {
        ...notes,
        syncEnabled: true,
        gistId: 'g1',
        gistFileName: 'notes.md',
        syncedContentHash: contentHash(notes.content),
        remoteUpdatedAt: 1_700_000_001_000,
      },
    ]);
    const gist = createFakeGistService({
      seed: [{ id: 'g1', fileName: 'notes.md', content: 'local body' }],
    });
    const release = gist.__holdListings();
    renderPanel(storage, gist);

    // Waited for, not asserted on the first frame: the claim is that the alarm
    // never appears, and a synchronous check would pass before the request had
    // even been made.
    await waitFor(() => expect(gist.__calls).toContain('listGists'));
    expect(statusOf('notes.md')).not.toMatch(/deleted from another device/i);
    // And once the answer arrives, saying the gist is there, it stays away.
    release();
    await waitFor(() => expect(statusOf('notes.md')).toMatch(/matches the copy on GitHub/i));
  });

  it('uploads a fresh copy rather than failing against the deleted one', async () => {
    // The record still carries the dead id. Reusing it would PATCH a gist that
    // is not there — a 404 where the user asked for their file to be on GitHub
    // again. The stale binding has to give way to a new upload.
    const { storage, gist, user } = await afterRemoteDelete();
    await user.click(await screen.findByRole('menuitem', { name: 'Upload to GitHub again' }));

    await waitFor(() => expect(statusOf('notes.md')).toMatch(/matches the copy on GitHub/i));
    const rec = await storage.getFile('notes.md');
    expect(rec?.gistId).not.toBe('g1');
    expect(gist.__calls).toContain('createGist');
    // The content actually landed, not just a call that was made.
    await expect(gist.getGist(rec!.gistId!)).resolves.toMatchObject({ content: 'local body' });
  });
});
