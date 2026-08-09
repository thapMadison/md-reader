import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SyncProvider } from './SyncContext';
import { useSyncMenuActions } from './syncStatus';
import { SaveButton } from './SaveButton';
import { useSaveFile } from './useSaveFile';
import { LibraryProvider, useLibrary } from '@/features/library/LibraryContext';
import { GistAuthProvider } from '@/services/gist/GistContext';
import { createFakeGistService, type FakeGistService } from '@/services/gist/fakeGist';
import { StorageProvider } from '@/services/storage/StorageContext';
import { createFakeStorageService } from '@/services/storage/fakeStorage';
import { useLayoutState } from '@/app/layoutState';
import type { StorageService } from '@/services/storage/types';

const config = { clientId: 'c', tokenEndpoint: 'https://w.example' };
const notes = { name: 'notes.md', content: 'local body', kind: 'snapshot' as const, savedAt: 1 };

/**
 * The Save surface as AppShell assembles it: the editor's onChange, the toolbar
 * button, and the global keydown binding, over one library.
 *
 * `useLayoutState(save)` is called here rather than stubbed because the Ctrl+S
 * assertion is about that wiring — a test that bound its own listener would pass
 * with AppShell passing nothing at all.
 */
function Harness({ withPill = true }: { withPill?: boolean }) {
  const { activeName, editContent, files } = useLibrary();
  const { save } = useSaveFile();
  useLayoutState(save);

  const active = files.find((f) => f.name === activeName);
  return (
    <div>
      <textarea
        aria-label="editor"
        value={active?.editedContent ?? ''}
        onChange={(e) => activeName && editContent(activeName, e.target.value)}
      />
      {activeName && <SaveButton />}
      {withPill && <SyncMenu name="notes.md" />}
    </div>
  );
}

/**
 * The toolbar's sync control, by accessible name.
 *
 * A pattern rather than the exact string, because that string is now stateful:
 * the control is a glyph beside the filename, so its label has to carry in
 * words what it no longer says in a caption — "Sync this file to GitHub (⌘S)",
 * "This file is synced (⌘S)", "Syncing this file to GitHub…". What every one of
 * them shares, and what these tests are actually looking for, is that it is the
 * thing that syncs. Matching the whole sentence would tie tests about pushing
 * behaviour to the wording of a tooltip.
 *
 * Anchored on "sync" as a word so it cannot also match the row menu's
 * "Sync to GitHub" — several tests have both on screen at once.
 */
const syncButton = /^(sync(ing)? this file|this file is synced)/i;

/**
 * The row's sync menu, as Sidebar builds it. These tests only need a way to
 * turn sync on and to read back what it became, so the items are rendered flat
 * rather than behind the ⋯ toggle Sidebar puts them behind.
 */
function SyncMenu({ name }: { name: string }) {
  const { items, run } = useSyncMenuActions(name);
  return (
    <div>
      {items.map((item) => (
        <button key={item.kind} onClick={() => run(item.kind)}>
          {item.label}
        </button>
      ))}
    </div>
  );
}

function renderHarness(storage: StorageService, gist: FakeGistService) {
  return render(
    <StorageProvider service={storage}>
      <LibraryProvider>
        <GistAuthProvider config={config} createService={() => gist}>
          <SyncProvider>
            <Harness />
          </SyncProvider>
        </GistAuthProvider>
      </LibraryProvider>
    </StorageProvider>,
  );
}

/**
 * The app assembled with no sync providers at all — the shape Save has to work
 * in for the offline case. Mounting SyncProvider and merely staying signed out
 * would leave `useOptionalSync()` returning a value, so a Save that had come to
 * depend on sync being present would still pass.
 */
function renderWithoutSync(storage: StorageService) {
  return render(
    <StorageProvider service={storage}>
      <LibraryProvider>
        <Harness withPill={false} />
      </LibraryProvider>
    </StorageProvider>,
  );
}

async function signedInWithNotes() {
  const storage = createFakeStorageService();
  await storage.setAuth({ accessToken: 'gho_x', scope: 'gist', login: 'octocat' });
  await storage.saveFile(notes);
  return storage;
}

/** Turns sync on for notes.md through the row menu, the only way the app offers. */
async function enableSync(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: 'Sync to GitHub' }));
  // Once it lands, the menu offers the action a synced file offers instead.
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Stop syncing this file' })).toBeInTheDocument(),
  );
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

describe('Save is the only thing that writes to a gist', () => {
  it('types a whole sentence without pushing, then pushes exactly once on Save', async () => {
    // The reason Save exists. Every PATCH is a gist revision, so an auto-push
    // would turn the version history — a reason to choose gists over Drive in
    // the first place — into a keystroke log. One deliberate save, one revision.
    const storage = await signedInWithNotes();
    const gist = createFakeGistService();
    const user = userEvent.setup();
    renderHarness(storage, gist);

    await enableSync(user);
    const pushesAfterEnable = gist.__calls.filter((c) => c === 'updateGist').length;

    await user.type(screen.getByLabelText('editor'), 'hello there');

    // Waiting on the local write rather than on a timer: it cannot land until
    // the 1s debounce has fired, so reaching this line proves the window in
    // which an auto-push would have happened is already closed. A bare
    // assertion right after typing would pass against a merely-debounced push.
    await waitFor(
      async () =>
        expect((await storage.getFile('notes.md'))?.editedContent).toContain('hello there'),
      { timeout: 3000 },
    );

    expect(gist.__calls.filter((c) => c === 'updateGist')).toHaveLength(pushesAfterEnable);

    await user.click(screen.getByRole('button', { name: syncButton }));

    await waitFor(() =>
      expect(gist.__calls.filter((c) => c === 'updateGist')).toHaveLength(pushesAfterEnable + 1),
    );
  });

  it('takes the hover wash while synced, and drops it once there is something to push', async () => {
    // data-chrome-btn is what index.css hangs the hover wash on. "Synced" is
    // still a live button — this click and ⌘S both force a re-push — and with
    // no hover it read as a status pill. Pending already wears --chrome-hl, so
    // it opts out rather than hovering to the tint it is already showing.
    const storage = await signedInWithNotes();
    const gist = createFakeGistService();
    const user = userEvent.setup();
    renderHarness(storage, gist);

    await enableSync(user);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /this file is synced/i })).toHaveAttribute(
        'data-chrome-btn',
      ),
    );

    await user.type(screen.getByLabelText('editor'), 'an edit');

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^sync this file/i })).not.toHaveAttribute(
        'data-chrome-btn',
      ),
    );
  });

  it('saves on Ctrl+S and stops the browser opening its own save dialog', async () => {
    // preventDefault matters more here than for ⌘E/⌘K/⌘\: Ctrl+S is a real
    // browser shortcut, so missing it drops "Save page as…" over the app.
    const storage = await signedInWithNotes();
    const gist = createFakeGistService();
    const user = userEvent.setup();
    renderHarness(storage, gist);

    await enableSync(user);
    const before = gist.__calls.filter((c) => c === 'updateGist').length;

    await user.type(screen.getByLabelText('editor'), 'typed');

    // Dispatched by hand rather than through fireEvent.keyDown so the return
    // value of dispatchEvent reports defaultPrevented — the assertion is about
    // the default being cancelled, not just about the handler running.
    const event = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    act(() => {
      window.dispatchEvent(event);
    });
    expect(event.defaultPrevented).toBe(true);

    await waitFor(() =>
      expect(gist.__calls.filter((c) => c === 'updateGist')).toHaveLength(before + 1),
    );
    await waitFor(async () =>
      expect((await storage.getFile('notes.md'))?.editedContent).toContain('typed'),
    );
  });

  it('keeps the edit when the tab is hidden before Save, without touching the gist', async () => {
    // The most important safety net in a manual-save design: forgetting to save
    // costs the remote copy, never the typing. visibilitychange rather than
    // beforeunload because mobile browsers may never fire the latter — and the
    // phone is the device this whole feature exists for.
    const storage = await signedInWithNotes();
    const gist = createFakeGistService();
    const user = userEvent.setup();
    renderHarness(storage, gist);

    await enableSync(user);
    const before = gist.__calls.filter((c) => c === 'updateGist').length;

    await user.type(screen.getByLabelText('editor'), 'unsaved work');

    act(() => {
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => 'hidden',
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await waitFor(async () =>
      expect((await storage.getFile('notes.md'))?.editedContent).toContain('unsaved work'),
    );
    expect(gist.__calls.filter((c) => c === 'updateGist')).toHaveLength(before);
  });

  it('saves with the sync providers absent entirely', async () => {
    // Save flushes to IndexedDB first and pushes second. Were the flush to end
    // up behind the push, "did my work survive?" would depend on sync being
    // assembled — and a snapshot file in a browser with no File System Access
    // API has nowhere else to go.
    //
    // Rendered without SyncProvider rather than merely signed out: with the
    // provider mounted, `useOptionalSync()` still returns a value, and gating
    // the flush on it survived that version of this test.
    //
    // Driven by the shortcut because the button is deliberately not rendered
    // here — see the signed-out test below. Ctrl+S stays bound either way,
    // which is the point: it is what keeps the browser's own save dialog shut.
    const storage = createFakeStorageService();
    await storage.saveFile(notes);
    const user = userEvent.setup();
    renderWithoutSync(storage);

    await screen.findByLabelText('editor');
    await user.type(screen.getByLabelText('editor'), 'offline edit');
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true, cancelable: true }));
    });

    // Deadlined below the 1s debounce so the write can only be Save's own
    // flush. A generous waitFor would be satisfied by the debounce timer
    // firing, and would pass even against a Save that wrote nothing at all.
    await waitFor(
      async () =>
        expect((await storage.getFile('notes.md'))?.editedContent).toContain('offline edit'),
      { timeout: 400 },
    );
  });

  it('uploads nothing for a file the user never opted in, even signed in', async () => {
    // Sync is per-file opt-in: the moment a document leaves the device is the
    // user's decision, and a secret gist is readable by anyone with its URL.
    //
    // The protection lives in `push`, which returns early when the record has
    // no `gistId` — not in the `stateOf(...) === 'idle'` check at the call
    // site, which reads like the guard and is not. Loosening that check leaves
    // this test green; removing the `gistId` check is what it catches.
    const storage = await signedInWithNotes();
    const gist = createFakeGistService();
    const user = userEvent.setup();
    renderHarness(storage, gist);

    await screen.findByRole('button', { name: 'Sync to GitHub' });
    await user.type(screen.getByLabelText('editor'), 'private thoughts');
    await user.click(screen.getByRole('button', { name: syncButton }));

    await waitFor(async () =>
      expect((await storage.getFile('notes.md'))?.editedContent).toContain('private thoughts'),
    );
    expect(gist.__calls).not.toContain('createGist');
    expect(gist.__calls).not.toContain('updateGist');
  });
});

describe('the Sync button appears only when it has something to do', () => {
  it('is absent when signed out, where nothing is left for it to do', async () => {
    // Keeping this device's copy safe is automatic — debounced writes, plus a
    // flush when the tab hides or the file changes. Signed out, that is the
    // whole job, so a button here would offer to do work already done and
    // imply the opposite about the times it was not pressed.
    const storage = createFakeStorageService();
    await storage.saveFile(notes);
    const gist = createFakeGistService();
    render(
      <StorageProvider service={storage}>
        <LibraryProvider>
          <GistAuthProvider config={config} createService={() => gist}>
            <SyncProvider>
              <Harness withPill={false} />
            </SyncProvider>
          </GistAuthProvider>
        </LibraryProvider>
      </StorageProvider>,
    );

    await screen.findByLabelText('editor');
    expect(screen.queryByRole('button', { name: syncButton })).not.toBeInTheDocument();
  });

  it('appears once signed in', async () => {
    const storage = await signedInWithNotes();
    renderHarness(storage, createFakeGistService());

    expect(await screen.findByRole('button', { name: syncButton })).toBeInTheDocument();
  });

  it('still flushes on Ctrl+S while hidden, and stops the browser dialog', async () => {
    // The shortcut is not the button's twin. It is bound in `layoutState`
    // regardless of sign-in, and it has to stay that way: without the
    // preventDefault the browser's "Save page as" window opens over the app,
    // which is worse signed out than signed in, because that is the state a
    // first-time visitor is in.
    const storage = createFakeStorageService();
    await storage.saveFile(notes);
    const gist = createFakeGistService();
    const user = userEvent.setup();
    render(
      <StorageProvider service={storage}>
        <LibraryProvider>
          <GistAuthProvider config={config} createService={() => gist}>
            <SyncProvider>
              <Harness withPill={false} />
            </SyncProvider>
          </GistAuthProvider>
        </LibraryProvider>
      </StorageProvider>,
    );

    await screen.findByLabelText('editor');
    await user.type(screen.getByLabelText('editor'), 'typed while signed out');

    const event = new KeyboardEvent('keydown', { key: 's', ctrlKey: true, cancelable: true });
    act(() => {
      window.dispatchEvent(event);
    });
    expect(event.defaultPrevented).toBe(true);

    // Below the 1s debounce, so only the shortcut's own flush can satisfy it.
    await waitFor(
      async () =>
        expect((await storage.getFile('notes.md'))?.editedContent).toContain(
          'typed while signed out',
        ),
      { timeout: 400 },
    );
  });
});
