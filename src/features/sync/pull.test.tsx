import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SyncProvider, keepBothName, useSync } from './SyncContext';
import { ConflictBanner } from './ConflictBanner';
import { LibraryProvider, useLibrary } from '@/features/library/LibraryContext';
import { GistAuthProvider } from '@/services/gist/GistContext';
import { createFakeGistService, type FakeGistService } from '@/services/gist/fakeGist';
import { StorageProvider } from '@/services/storage/StorageContext';
import { createFakeStorageService } from '@/services/storage/fakeStorage';
import { contentHash } from '@/services/gist/hash';
import type { StorageService } from '@/services/storage/types';

const config = { clientId: 'c', tokenEndpoint: 'https://w.example' };

/** The fake's clock for the first seeded gist. See createFakeGistService. */
const SEEDED_AT = 1_700_000_001_000;

function Probe() {
  const { stateOf } = useSync();
  const { active, files, editContent, setActiveName } = useLibrary();
  return (
    <div>
      <div data-testid="state">{active ? stateOf(active.name) : ''}</div>
      <div data-testid="content">{active?.editedContent ?? ''}</div>
      <div data-testid="names">{files.map((f) => f.name).join(',')}</div>
      <button onClick={() => active && editContent(active.name, 'typed here')}>edit</button>
      {/* Standing in for the sidebar: the two clicks a user makes to look at
          something else and come back. */}
      <button onClick={() => setActiveName(null)}>close</button>
      <button onClick={() => setActiveName('notes.md')}>open notes</button>
      {active && <ConflictBanner name={active.name} />}
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

/**
 * A device mid-sync: bound to gist `g1` and carrying both the hash of what it
 * last pushed and the watermark of the remote state it last reconciled.
 *
 * Both fields matter. Without the hash the local side reads as changed, and
 * without the watermark any gist looks newer — either omission lands the
 * fixture in a state it did not mean to describe.
 */
function syncedRecord(content: string, at = SEEDED_AT) {
  return {
    name: 'notes.md',
    content,
    kind: 'snapshot' as const,
    savedAt: 1,
    syncEnabled: true,
    gistId: 'g1',
    gistFileName: 'notes.md',
    syncedContentHash: contentHash(content),
    remoteUpdatedAt: at,
  };
}

async function signedIn(files: Parameters<StorageService['saveFile']>[0][] = []) {
  const storage = createFakeStorageService();
  await storage.setAuth({ accessToken: 'gho_x', scope: 'gist', login: 'octocat' });
  for (const f of files) await storage.saveFile(f);
  return storage;
}

function seededGist(content = 'in step') {
  return createFakeGistService({
    seed: [{ id: 'g1', fileName: 'notes.md', content, updatedAt: SEEDED_AT }],
  });
}

/**
 * Looking at something else and coming back — the gesture that asks for a fresh
 * answer, now that nothing checks the remote on its own.
 *
 * The other way to ask is reloading the page, which is a remount and cannot be
 * expressed as a click. Both arrive at the same effect, so the tests exercise
 * this one.
 */
async function reopenFile(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByText('close'));
  await user.click(screen.getByText('open notes'));
}

/**
 * Waits until the `listGists` count holds still across two checks.
 *
 * Any assertion that a *later* action made no request needs a quiet baseline
 * first, and "quiet" cannot be read off a single sample: a call already in
 * flight looks identical to no call at all until it lands.
 */
async function settledListCount(gist: FakeGistService) {
  let last = -1;
  await waitFor(() => {
    const n = gist.__calls.filter((c) => c === 'listGists').length;
    const steady = n === last;
    last = n;
    expect(steady).toBe(true);
  });
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

describe('the 2x2 of local and remote change', () => {
  it('reports idle when neither side has moved', async () => {
    const storage = await signedIn([syncedRecord('in step')]);
    renderSync(storage, seededGist('in step'));

    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('idle'));
  });

  it('reports local-ahead after an edit the remote has not seen', async () => {
    const storage = await signedIn([syncedRecord('in step')]);
    renderSync(storage, seededGist('in step'));
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('idle'));

    await userEvent.setup().click(screen.getByText('edit'));

    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('local-ahead'));
  });

  it('treats a record with no synced hash as changed, not as in step', async () => {
    // Unknown is not the same as unchanged. A record with no hash — an
    // interrupted push, or one written before the field existed — has no
    // evidence its content matches the remote.
    //
    // The remote is moved as well, so this lands on the square that matters: if
    // the missing hash read as "unchanged" the file would be plain
    // `remote-ahead`, and the open-a-file pull would overwrite local content it
    // had no evidence was safe to discard. Being wrong the other way costs a
    // banner the user dismisses in one click.
    const storage = await signedIn([
      { ...syncedRecord('local body'), syncedContentHash: undefined },
    ]);
    const gist = seededGist('in step');
    renderSync(storage, gist);
    act(() => gist.__mutateRemote('g1', 'remote body'));
    await reopenFile(userEvent.setup());

    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('conflict'));
    expect(screen.getByTestId('content')).toHaveTextContent('local body');
  });
});

describe('pulling', () => {
  it('takes the newer copy when the file is opened and nothing local is at stake', async () => {
    // remote-ahead is the one square of the 2x2 that is safe to resolve without
    // asking: the local copy is byte-for-byte what was last synced, so replacing
    // it discards nothing.
    const storage = await signedIn([syncedRecord('in step')]);
    const gist = seededGist('in step');
    renderSync(storage, gist);
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('idle'));

    act(() => gist.__mutateRemote('g1', 'edited on the laptop'));
    // Reopening is the trigger — no timer, no focus listener. For this app's
    // flow the remote does not move while the tab sits open, and the user is
    // the one who knows when they have changed it elsewhere.
    await reopenFile(userEvent.setup());

    await waitFor(() =>
      expect(screen.getByTestId('content')).toHaveTextContent('edited on the laptop'),
    );
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('idle'));
  });

  it('picks up a remote change made before the app started', async () => {
    // Reloading the page while the gist is already ahead — the shape of "edit on
    // github.com, then refresh". Unlike the test above, nothing changes after
    // mount: the newer copy is already there at startup, and the restored file
    // has to be reconciled against it on the first pass rather than on some
    // later event that may never come.
    const storage = await signedIn([syncedRecord('in step')]);
    const gist = createFakeGistService({
      seed: [
        { id: 'g1', fileName: 'notes.md', content: 'edited on github', updatedAt: SEEDED_AT + 1000 },
      ],
    });
    renderSync(storage, gist);

    await waitFor(() =>
      expect(screen.getByTestId('content')).toHaveTextContent('edited on github'),
    );
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('idle'));
  });

  it('leaves an open file alone until the user asks', async () => {
    // Nothing checks the remote behind the user's back — no timer, and no focus
    // listener either. Focus looked like the natural trigger and was not: it had
    // to be throttled so alt-tabbing did not fire a request per switch, and any
    // throttle wide enough to do that also swallowed the one return the user
    // cared about, leaving a stale answer on screen at the worst moment.
    //
    // The remote moves here and the app is expected *not* to notice. Reopening
    // is what notices, which the tests below cover.
    const storage = await signedIn([syncedRecord('in step')]);
    const gist = seededGist('in step');
    renderSync(storage, gist);
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('idle'));

    const before = gist.__calls.filter((c) => c === 'listGists').length;
    act(() => gist.__mutateRemote('g1', 'edited on the laptop'));
    act(() => {
      for (let i = 0; i < 5; i++) window.dispatchEvent(new Event('focus'));
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('idle'));
    expect(gist.__calls.filter((c) => c === 'listGists').length).toBe(before);
    expect(screen.getByTestId('content')).toHaveTextContent('in step');
  });

  it('does not check the remote while the user types', async () => {
    // The check hangs off which file is open, not off its sync state. Depending
    // on the state instead would put a request behind every keystroke, since
    // typing is exactly what moves a file from idle to local-ahead.
    const storage = await signedIn([syncedRecord('in step')]);
    const gist = seededGist('in step');
    renderSync(storage, gist);

    // Waiting for the *list* to land, not for the state to read `idle`.
    //
    // `idle` is also what this file reads before any list arrives: `remotes` is
    // empty, so `remoteChanged` is false, and the fixture's hash already
    // matches, so `localChanged` is false too. Snapshotting the call count on
    // that signal captured it before the mount-time refresh had finished, and
    // the calls still in flight then landed inside the window this test claims
    // is quiet — a failure that needed the whole suite running to show up.
    await waitFor(() => expect(gist.__calls).toContain('listGists'));
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('idle'));
    // And then for the count to stop moving. One `toContain` is not enough:
    // mount fires a refresh and StrictMode doubles it, so the second call can
    // still be in flight when the first is already recorded.
    await settledListCount(gist);

    const before = gist.__calls.filter((c) => c === 'listGists').length;
    await userEvent.setup().click(screen.getByText('edit'));
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('local-ahead'));

    expect(gist.__calls.filter((c) => c === 'listGists').length).toBe(before);
  });
});

describe('a conflict is never resolved without the user', () => {
  it('shows the banner and overwrites nothing when both sides moved', async () => {
    // The rule the whole design turns on. Both copies are the user's work, and
    // no rule this code could apply would know which one they meant.
    const storage = await signedIn([syncedRecord('in step')]);
    const gist = seededGist('in step');
    const user = userEvent.setup();
    renderSync(storage, gist);
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('idle'));

    await user.click(screen.getByText('edit'));
    act(() => gist.__mutateRemote('g1', 'changed on the laptop'));
    await reopenFile(user);

    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('conflict'));

    // Neither side moved on its own.
    expect(screen.getByTestId('content')).toHaveTextContent('typed here');
    expect(gist.__calls).not.toContain('updateGist');
    await expect(gist.getGist('g1')).resolves.toMatchObject({ content: 'changed on the laptop' });
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('keeps both copies without destroying either', async () => {
    // Offered first because it is the only choice that loses nothing. The
    // library is keyed by name, so a second entry is all it costs.
    const storage = await signedIn([syncedRecord('in step')]);
    const gist = seededGist('in step');
    const user = userEvent.setup();
    renderSync(storage, gist);
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('idle'));

    await user.click(screen.getByText('edit'));
    act(() => gist.__mutateRemote('g1', 'the laptop version'));
    await reopenFile(user);
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('conflict'));

    await user.click(screen.getByText('Keep both'));

    await waitFor(() =>
      expect(screen.getByTestId('names')).toHaveTextContent(keepBothName('notes.md')),
    );
    // The local copy is untouched and still the active one.
    expect(screen.getByTestId('content')).toHaveTextContent('typed here');
    const copy = await storage.getFile(keepBothName('notes.md'));
    expect(copy?.content).toBe('the laptop version');
    // And the conflict is settled: the watermark moved, so the file is merely
    // ahead now and can be pushed without another argument.
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('local-ahead'));
  });

  it('takes the remote copy only when asked, discarding local edits', async () => {
    const storage = await signedIn([syncedRecord('in step')]);
    const gist = seededGist('in step');
    const user = userEvent.setup();
    renderSync(storage, gist);
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('idle'));

    await user.click(screen.getByText('edit'));
    act(() => gist.__mutateRemote('g1', 'the laptop version'));
    await reopenFile(user);
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('conflict'));

    await user.click(screen.getByText("Take GitHub's"));

    await waitFor(() =>
      expect(screen.getByTestId('content')).toHaveTextContent('the laptop version'),
    );
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('idle'));
  });

  it('stays resolved across a reload', async () => {
    // Resolving has to survive a refresh, and reaching `idle` in the same
    // session does not prove it did. Everything the state is derived from lives
    // in IndexedDB; if any part of the resolution only ever reached React state,
    // the next mount reads the old record back and the banner returns — with the
    // user's local copy already gone, since they chose to discard it.
    const storage = await signedIn([syncedRecord('in step')]);
    const gist = seededGist('in step');
    const user = userEvent.setup();
    const first = renderSync(storage, gist);
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('idle'));

    await user.click(screen.getByText('edit'));
    act(() => gist.__mutateRemote('g1', 'the laptop version'));
    await reopenFile(user);
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('conflict'));

    await user.click(screen.getByText("Take GitHub's"));
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('idle'));

    // F5: same storage, same remote, everything in memory gone.
    first.unmount();
    renderSync(storage, gist);

    await waitFor(() =>
      expect(screen.getByTestId('content')).toHaveTextContent('the laptop version'),
    );
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('idle'));
    expect(screen.queryByText('Keep both')).not.toBeInTheDocument();
  });

  it('pushes over the remote only when asked', async () => {
    const storage = await signedIn([syncedRecord('in step')]);
    const gist = seededGist('in step');
    const user = userEvent.setup();
    renderSync(storage, gist);
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('idle'));

    await user.click(screen.getByText('edit'));
    act(() => gist.__mutateRemote('g1', 'the laptop version'));
    await reopenFile(user);
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('conflict'));

    await user.click(screen.getByText('Keep mine'));

    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('idle'));
    await expect(gist.getGist('g1')).resolves.toMatchObject({ content: 'typed here' });
  });

  it('stays resolved across a reload after keep-mine', async () => {
    // The same proof the take-GitHub's case gets, for the other direction.
    // Reaching `idle` in one session says nothing: the hash and the watermark
    // both have to have landed in IndexedDB, and a `persistFile` racing the
    // `patchSync` would rewind either of them without anything on screen
    // changing. The banner would then return on the next reload — over content
    // the user had already pushed and settled.
    //
    // Note what this does *not* pin down. On the happy path the resolution
    // reaches disk through `commitSync`, so making the pre-push watermark write
    // memory-only leaves this test green; the failure case below is the one
    // that covers that write.
    const storage = await signedIn([syncedRecord('in step')]);
    const gist = seededGist('in step');
    const user = userEvent.setup();
    const first = renderSync(storage, gist);
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('idle'));

    await user.click(screen.getByText('edit'));
    act(() => gist.__mutateRemote('g1', 'the laptop version'));
    await reopenFile(user);
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('conflict'));

    await user.click(screen.getByText('Keep mine'));
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('idle'));

    first.unmount();
    renderSync(storage, gist);

    await waitFor(() => expect(screen.getByTestId('content')).toHaveTextContent('typed here'));
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('idle'));
    expect(screen.queryByText('Keep both')).not.toBeInTheDocument();
  });

  it('does not re-ask after keep-mine when the push fails', async () => {
    // The one thing the pre-push watermark write earns, and the reason it is
    // not redundant with `commitSync`. Mutation says so directly: deleting the
    // whole block leaves every other test green, and only this one fails.
    //
    // The user has said the remote version is not wanted. A failed push is a
    // reason to retry, not a reason to reopen the question — but without the
    // watermark recorded first, the record still says the remote is newer, the
    // banner returns, and the app asks again about a copy already rejected.
    const storage = await signedIn([syncedRecord('in step')]);
    const gist = seededGist('in step');
    const user = userEvent.setup();
    const first = renderSync(storage, gist);
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('idle'));

    await user.click(screen.getByText('edit'));
    act(() => gist.__mutateRemote('g1', 'the laptop version'));
    await reopenFile(user);
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('conflict'));

    gist.__failNext('updateGist', new Error('network down'));
    await user.click(screen.getByText('Keep mine'));

    // `error` while the failure is on the books — it outranks the rest in
    // `stateOf`, which is right: a push that did not land is the more urgent
    // thing to say. The banner is what must be gone.
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('error'));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    // The reload is the real proof. Errors live in memory and clear with the
    // mount, so what comes back is whatever reached disk — and a watermark that
    // never got there brings the conflict with it.
    first.unmount();
    renderSync(storage, gist);

    await waitFor(() => expect(screen.getByTestId('content')).toHaveTextContent('typed here'));
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('local-ahead'));
    expect(screen.queryByText('Keep both')).not.toBeInTheDocument();
  });

  it('stays resolved across a reload after keep-both', async () => {
    // Keep-both is the resolution most likely to look settled while not being
    // it: the active file is never rewritten, so a watermark that failed to
    // reach disk leaves no visible trace until the reload brings the banner
    // back. And the second copy has to be there too — it is the user's only
    // record of the version they chose not to discard, so losing it on refresh
    // would turn the one non-destructive choice into the worst of the three.
    //
    // Verified by mutation: making the watermark write memory-only fails this
    // one and the in-session keep-both test with it.
    const storage = await signedIn([syncedRecord('in step')]);
    const gist = seededGist('in step');
    const user = userEvent.setup();
    const first = renderSync(storage, gist);
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('idle'));

    await user.click(screen.getByText('edit'));
    act(() => gist.__mutateRemote('g1', 'the laptop version'));
    await reopenFile(user);
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('conflict'));

    await user.click(screen.getByText('Keep both'));
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('local-ahead'));

    first.unmount();
    renderSync(storage, gist);

    await waitFor(() =>
      expect(screen.getByTestId('names')).toHaveTextContent(keepBothName('notes.md')),
    );
    expect(screen.getByTestId('content')).toHaveTextContent('typed here');
    // `local-ahead`, not `conflict`: the remote change was accounted for by
    // taking a copy of it, so all that is left is the local edit waiting to go.
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('local-ahead'));
  });
});

describe('keepBothName', () => {
  it('suffixes the stem, not the extension', () => {
    expect(keepBothName('notes.md')).toBe('notes (from GitHub).md');
  });

  it('appends when there is no stem to suffix', () => {
    // A dotfile has no stem before the dot, so suffixing "before the extension"
    // would produce " (from GitHub).gitignore" — a different, stranger name.
    expect(keepBothName('README')).toBe('README (from GitHub)');
    expect(keepBothName('.gitignore')).toBe('.gitignore (from GitHub)');
  });
});
