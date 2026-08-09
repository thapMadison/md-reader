import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useStorage } from '@/services/storage/StorageContext';
import { useLibrary } from '@/features/library/LibraryContext';
import { reportAuthExpired, useGistAuth } from '@/services/gist/GistContext';
import { contentHash } from '@/services/gist/hash';
import {
  FileTooLargeToSyncError,
  GistApiError,
  MAX_SYNC_FILE_BYTES,
  type GistFolderTag,
  type GistMeta,
} from '@/services/gist/types';
import type { StoredFileRecord, SyncPatch } from '@/services/storage/types';

const encoder = new TextEncoder();

/** What a record should say once `content` is known to match `meta`. */
function syncPatchFor(meta: GistMeta, content: string): SyncPatch {
  return {
    syncEnabled: true,
    gistId: meta.id,
    gistFileName: meta.fileName,
    remoteUpdatedAt: meta.updatedAt,
    syncedContentHash: contentHash(content),
  };
}

/** UTF-8 bytes, not `.length` — CJK and emoji undercount by three to four times. */
export function syncableBytes(content: string): number {
  return encoder.encode(content).length;
}

export function canSync(content: string): boolean {
  return syncableBytes(content) <= MAX_SYNC_FILE_BYTES;
}

/**
 * What the UI shows for one file.
 *
 * The four settled states are the 2×2 of `localChanged` × `remoteChanged`, and
 * they are *derived* rather than stored: a stored flag would be one more thing
 * that can disagree with the content it describes.
 */
export type FileSyncState =
  | 'off' // not opted in
  | 'too-large' // over the cap, cannot be opted in
  | 'gone' // opted in, but the remote copy no longer exists
  | 'idle' // neither side moved
  | 'local-ahead' // edited here since the last sync
  | 'remote-ahead' // changed on another device; pulling loses nothing
  | 'conflict' // both moved — never resolved without the user
  | 'pushing'
  | 'pulling'
  | 'error';

/** How the user chose to settle a conflict. */
export type ConflictResolution =
  | 'keep-mine' // push over the remote
  | 'take-remote' // discard local edits, pull
  | 'keep-both'; // pull the remote alongside, as a second file

/**
 * Suffix for the copy kept by `keep-both`, before the extension:
 * `notes.md` → `notes (from GitHub).md`.
 */
const KEEP_BOTH_SUFFIX = ' (from GitHub)';

export function keepBothName(name: string): string {
  const dot = name.lastIndexOf('.');
  // No extension, or a leading dot with nothing before it (`.gitignore`), so
  // there is no stem to suffix — append and leave the name intact.
  if (dot <= 0) return `${name}${KEEP_BOTH_SUFFIX}`;
  return `${name.slice(0, dot)}${KEEP_BOTH_SUFFIX}${name.slice(dot)}`;
}

export interface RemoteFile {
  gistId: string;
  fileName: string;
  updatedAt: number;
  /** Bytes as GitHub reports them, before any content is fetched. */
  size: number;
  htmlUrl: string;
}

export interface SyncValue {
  /** True once the account's gist list has been fetched at least once. */
  listed: boolean;
  /**
   * Gists on the account with no local file of the same name — the other
   * device's documents, listed but not downloaded.
   */
  remoteOnly: RemoteFile[];
  /** Per-file state, keyed by library file name. */
  stateOf: (name: string) => FileSyncState;
  /** Human-readable failure for one file, if its last operation failed. */
  errorOf: (name: string) => string | null;
  /** Turns sync on for a file: creates its gist and pushes the current content. */
  enableSync: (name: string) => Promise<void>;
  /**
   * Turns sync off locally, keeping the binding so turning it back on
   * reconnects to the same gist. Leaves the gist on GitHub — `deleteRemote` is
   * the separate, explicit way to remove it.
   */
  disableSync: (name: string) => Promise<void>;
  /**
   * Deletes the file's gist on GitHub and forgets the binding. Irreversible,
   * and it affects every device bound to that gist — the caller must have
   * confirmed with the user first.
   */
  deleteRemote: (name: string) => Promise<void>;
  /**
   * Whether a file that is not syncing still has a gist behind it, i.e. sync
   * was turned off rather than never turned on.
   *
   * Deliberately not a `FileSyncState`: both cases answer "is this syncing?"
   * with no, and splitting the state would push the distinction through every
   * switch on it to serve one badge. This is the narrower question.
   */
  hasOrphanedGist: (name: string) => boolean;
  /** Pushes the current content to the file's gist. */
  push: (name: string) => Promise<void>;
  /**
   * Takes the remote copy, replacing local content. Safe only from
   * `remote-ahead`; from `conflict` it discards edits, so the UI must route
   * that through `resolveConflict` where the user has said so.
   */
  pull: (name: string) => Promise<void>;
  /** Settles a conflict the way the user chose. */
  resolveConflict: (name: string, how: ConflictResolution) => Promise<void>;
  /**
   * Whether closing this file would leave a copy on GitHub behind. True for a
   * file that syncs, and for one whose sync was switched off but whose binding
   * is still there.
   *
   * For the close/delete confirmations: closing removes the record, and with it
   * the only pointer this device has to that copy.
   */
  leavesRemoteBehind: (name: string) => boolean;
  /**
   * Deletes the GitHub copies of these files, for the close and clear-all paths
   * where the local records are about to go. Names with no copy are skipped.
   *
   * Returns the names it could *not* delete. Callers must surface those: the
   * local file is gone by then, so a copy left on GitHub is one the user can no
   * longer see or reach from this device.
   */
  deleteRemotes: (names: string[]) => Promise<string[]>;
  /** Downloads a remote-only gist into the library. */
  openRemote: (gistId: string) => Promise<void>;
  /** Re-reads the account's gist list. */
  refresh: () => Promise<void>;
}

const SyncContext = createContext<SyncValue | null>(null);

export function SyncProvider({ children }: { children: ReactNode }) {
  const storage = useStorage();
  const { service, status } = useGistAuth();
  const { files, folders, active, addRemoteFile, applyExternalContent, reconcileFolder, moveFileToFolder } =
    useLibrary();

  const [listed, setListed] = useState(false);
  const [remotes, setRemotes] = useState<GistMeta[]>([]);
  const [records, setRecords] = useState<Record<string, StoredFileRecord>>({});
  const [busy, setBusy] = useState<Record<string, 'pushing' | 'pulling'>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Mirrors `files` for the callbacks below, which must not re-create
  // themselves on every keystroke — LibraryContext rebuilds its value object
  // each render, so depending on `files` directly would re-render every sync
  // consumer as the user types.
  const filesRef = useRef(files);
  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  // Same reason as filesRef: read inside callbacks that must not be rebuilt
  // when the folder list moves, and read across awaits where the closed-over
  // value would be whatever it was when the push started.
  const foldersRef = useRef(folders);
  useEffect(() => {
    foldersRef.current = folders;
  }, [folders]);

  // Read by the async operations below, which must see the list as it is when
  // they run rather than as it was when they were created. `stateOf` uses
  // `remotes` directly instead — it has to recompute when the list moves, or
  // the pill would keep reporting a state the data no longer supports.
  const remotesRef = useRef(remotes);
  useEffect(() => {
    remotesRef.current = remotes;
  }, [remotes]);

  // Read across `await` boundaries, where the closed-over `records` would be
  // whatever it was when the operation started — a stale `gistId` there would
  // send a push to the wrong gist.
  const recordsRef = useRef(records);
  useEffect(() => {
    recordsRef.current = records;
  }, [records]);

  // The sync fields live in storage, not on LibraryFile, so they are read back
  // rather than derived. Re-read whenever the set of file names changes; the
  // individual operations below patch this map themselves so a push does not
  // need a round-trip through storage to show its result.
  const names = files.map((f) => f.name).join('\n');
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const all = await storage.listFiles();
      if (cancelled) return;
      setRecords(Object.fromEntries(all.map((r) => [r.name, r])));
    })();
    return () => {
      cancelled = true;
    };
  }, [names, storage]);

  const setError = useCallback((name: string, message: string | null) => {
    setErrors((prev) => {
      if (message === null) {
        if (!(name in prev)) return prev;
        const next = { ...prev };
        delete next[name];
        return next;
      }
      return { ...prev, [name]: message };
    });
  }, []);

  const setBusyFor = useCallback((name: string, kind: 'pushing' | 'pulling' | null) => {
    setBusy((prev) => {
      if (kind === null) {
        if (!(name in prev)) return prev;
        const next = { ...prev };
        delete next[name];
        return next;
      }
      return { ...prev, [name]: kind };
    });
  }, []);

  // Several refreshes can be in flight at once — signing in and opening a file
  // both trigger one, and StrictMode doubles each — so a slow response can
  // arrive after a newer one and rewind every `updatedAt`. Ignoring all but the
  // latest keeps a stale list from being read as "the remote has not moved".
  const refreshSeq = useRef(0);

  const refresh = useCallback(async () => {
    if (!service) return;
    const seq = ++refreshSeq.current;
    try {
      const list = await service.listGists();
      if (seq !== refreshSeq.current) return;
      setRemotes(list);
      setListed(true);
    } catch (err) {
      // A revoked token surfaces here as readily as anywhere else. Reporting it
      // lets the auth provider sign out once, centrally, rather than leaving
      // every call site to recognise a 401.
      reportAuthExpired(err);
    }
  }, [service]);

  // Sign-in is the trigger, not a timer. `listGists` returns metadata only, so
  // this is one request regardless of library size and no content crosses the
  // network until the user opens something.
  //
  // Only fetches. Clearing on sign-out is deliberately *not* done here: setting
  // state synchronously in an effect cascades a second render, and — worse —
  // it leaves the previous account's file names on screen for the render in
  // between. `signedIn` below gates the stored list at read time instead, so
  // there is no window where stale names are visible.
  useEffect(() => {
    if (status !== 'signed-in') return;
    // set-state-in-effect traces into `refresh` and sees setRemotes/setListed,
    // but not the `await service.listGists()` they sit behind — they land a
    // network round-trip later, not synchronously, so the cascading render the
    // rule warns about cannot happen. Fetching on sign-in is the subscribe-to
    // -an-external-system case the rule documents as legitimate.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [status, refresh]);

  // Signed-out is not a state the fetched list survives into. Deriving this
  // rather than clearing on transition means a revoked token cannot leave one
  // account's documents listed under another's session, no matter how the
  // status changed or how many renders it took.
  const signedIn = status === 'signed-in';

  const refreshRef = useRef(refresh);
  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  /**
   * Brings local state in line with a reconcile that has already been written
   * to storage. Split from the write itself because pull and push write through
   * different paths — one with the content, one without — but both have to end
   * with the same in-memory picture.
   */
  const noteSynced = useCallback((name: string, meta: GistMeta, patch: SyncPatch) => {
    setRecords((prev) => (prev[name] ? { ...prev, [name]: { ...prev[name], ...patch } } : prev));
    setRemotes((prev) => {
      const rest = prev.filter((g) => g.id !== meta.id);
      return [...rest, meta];
    });
  }, []);

  /** Records a successful push: metadata only, leaving the local text alone. */
  const commitSync = useCallback(
    async (name: string, meta: GistMeta, content: string) => {
      const patch = syncPatchFor(meta, content);
      // patchSync rather than saveFile: the user keeps typing through a network
      // round-trip, and a whole-record write built before the request would
      // carry the pre-push text back over what they have since typed.
      await storage.patchSync(name, patch);
      noteSynced(name, meta, patch);
    },
    [storage, noteSynced],
  );

  /** The content a push should send: what the user sees, edits included. */
  const contentToPush = useCallback((name: string): string | null => {
    const f = filesRef.current.find((x) => x.name === name);
    return f ? f.editedContent : null;
  }, []);

  /**
   * The folder tag a push should carry: which folder the file is in right now.
   *
   * Undefined for an ungrouped file, and that is the whole mechanism for taking
   * a file *out* of a folder: the description is rewritten on every push, so an
   * absent tag overwrites the old one. There is no separate "remove" to send.
   *
   * The name travels with the id so a device that has never seen this folder
   * has something to match on. See reconcileFolder for the rules.
   */
  const folderTagFor = useCallback((name: string): GistFolderTag | undefined => {
    const file = filesRef.current.find((f) => f.name === name);
    if (!file?.folderId) return undefined;
    const folder = foldersRef.current.find((f) => f.id === file.folderId);
    if (!folder) return undefined;
    return { folderId: folder.id, folderName: folder.name };
  }, []);

  const push = useCallback(
    async (name: string) => {
      if (!service) return;
      const content = contentToPush(name);
      if (content === null) return;
      const rec = records[name];
      if (!rec?.gistId) return;

      setError(name, null);
      setBusyFor(name, 'pushing');
      try {
        const meta = await service.updateGist(rec.gistId, {
          fileName: rec.gistFileName ?? name,
          content,
          // Same request as the content, so the two can never describe
          // different versions of the file.
          folder: folderTagFor(name),
        });
        await commitSync(name, meta, content);
      } catch (err) {
        reportAuthExpired(err);
        setError(name, describe(err));
      } finally {
        setBusyFor(name, null);
      }
    },
    [service, records, contentToPush, folderTagFor, commitSync, setError, setBusyFor],
  );

  // `resolveConflict` calls push, and push has no reason to know conflicts
  // exist. Going through a ref keeps the dependency one-way rather than
  // forcing both to be declared together.
  const pushRef = useRef(push);
  useEffect(() => {
    pushRef.current = push;
  }, [push]);

  const enableSync = useCallback(
    async (name: string) => {
      if (!service) return;
      const content = contentToPush(name);
      if (content === null) return;

      setError(name, null);
      setBusyFor(name, 'pushing');
      try {
        // A gistId already on the record means this file was synced before and
        // the user turned it off; reconnect rather than fork. Note this is an
        // id *this device wrote down itself*, which is what makes it safe —
        // matching by name is still forbidden below.
        //
        // Unless the listing positively says it is gone. A remote copy deleted
        // from another device leaves the id behind, and PATCHing it is a 404 —
        // the user asked to sync this file, so the answer is a fresh remote
        // copy, not an error about one that no longer exists.
        //
        // Stated as "known to be gone" rather than "known to exist" on purpose.
        // A listing that has not arrived yet knows nothing, and reading that as
        // absence would create a duplicate every time this ran before the fetch
        // came back — the very bug keeping the id was meant to stop. Silence
        // means keep the binding; only a fetched listing may break it.
        const known = records[name]?.gistId;
        const confirmedGone = !!known && listed && signedIn && !remotes.some((g) => g.id === known);
        const existing = confirmedGone ? undefined : known;
        const meta = existing
          ? await service.updateGist(existing, {
              fileName: records[name]?.gistFileName ?? name,
              content,
              folder: folderTagFor(name),
            })
          : // No gistId: a new gist, never a match by name. Files are keyed by
            // bare basename, so two different README.md files already collide
            // inside one library; matching across devices would let one
            // machine's README overwrite another's. A duplicate gist is
            // recoverable, an overwrite is not.
            await service.createGist({ fileName: name, content, folder: folderTagFor(name) });
        await commitSync(name, meta, content);
      } catch (err) {
        reportAuthExpired(err);
        setError(name, describe(err));
      } finally {
        setBusyFor(name, null);
      }
    },
    // `remotes`/`listed` rather than the ref: this callback has to see the
    // current listing to know an id is dead, and rebuilding it costs nothing —
    // unlike `push`, nothing keys off its identity, and the value object below
    // already changes whenever `remotes` does.
    [
      service,
      records,
      remotes,
      listed,
      signedIn,
      contentToPush,
      folderTagFor,
      commitSync,
      setError,
      setBusyFor,
    ],
  );

  const disableSync = useCallback(
    async (name: string) => {
      // Local only. The gist stays on GitHub: another device may still be bound
      // to it, and deleting the user's data is not something a toggle should do
      // as a side effect. `deleteRemote` is the explicit way to do that.
      //
      // Only the flag is cleared. Everything identifying the gist stays on the
      // record so that turning sync back on reconnects to it instead of
      // creating a second one — nothing deletes the first, so a toggle flicked
      // a few times would otherwise strew orphan gists across the account.
      //
      // The watermark and hash stay for the same reason in miniature: dropping
      // them makes a re-enabled file read as changed on both sides at once,
      // which is a conflict banner over two identical documents. While sync is
      // off nothing reads either field, so keeping them costs nothing.
      const patch = { syncEnabled: false };
      await storage.patchSync(name, patch);
      setRecords((prev) => (prev[name] ? { ...prev, [name]: { ...prev[name], ...patch } } : prev));
      setError(name, null);
    },
    [storage, setError],
  );

  /**
   * True when sync is off but the record still points at a gist. Distinguishes
   * "never synced" from "synced, then switched off" — the second leaves a gist
   * on the account that nothing else will ever clean up.
   */
  const hasOrphanedGist = useCallback(
    (name: string) => {
      const rec = records[name];
      return Boolean(rec && !rec.syncEnabled && rec.gistId);
    },
    [records],
  );

  /**
   * Whether closing this file would abandon a copy on GitHub — the question the
   * close and clear-all confirmations need answered.
   *
   * Broader than `hasOrphanedGist` by exactly the `syncEnabled` files: those are
   * not orphans *yet*, but closing removes the record, and the id on it is the
   * only pointer this device has. After that the copy is reachable only by
   * downloading it again from the remote list.
   */
  const leavesRemoteBehind = useCallback(
    (name: string) => Boolean(records[name]?.gistId),
    [records],
  );

  const deleteRemotes = useCallback(
    async (names: string[]): Promise<string[]> => {
      // Ids read up front, through the ref. Callers run this alongside a local
      // delete, and `records` lags a render behind the state that is already
      // being torn down — by the time an await resolves, the id may be gone.
      const targets = names
        .map((name) => ({ name, id: recordsRef.current[name]?.gistId }))
        .filter((t): t is { name: string; id: string } => !!t.id);
      if (!service || targets.length === 0) return [];

      // Sequential, not Promise.all. GitHub's secondary rate limits are about
      // concurrent mutations rather than total volume, and a handful of deletes
      // is not worth the risk of tripping one; the user is watching a
      // confirmation resolve, not a progress bar.
      const failed: string[] = [];
      for (const { name, id } of targets) {
        try {
          await service.deleteGist(id);
        } catch (err) {
          reportAuthExpired(err);
          // A gist already gone is the outcome asked for. GitHub answers 404,
          // which is not a failure to report to someone who wanted it deleted.
          if (err instanceof GistApiError && err.status === 404) continue;
          failed.push(name);
        }
      }

      // One state write for the batch, not one per file.
      const goneIds = new Set(targets.filter((t) => !failed.includes(t.name)).map((t) => t.id));
      if (goneIds.size > 0) setRemotes((prev) => prev.filter((g) => !goneIds.has(g.id)));
      return failed;
    },
    [service],
  );

  const deleteRemote = useCallback(
    async (name: string) => {
      const id = records[name]?.gistId;
      if (!service || !id) return;

      setError(name, null);
      try {
        // No busy state. The two that exist say "pushing…" and "pulling…", and
        // either would describe the wrong thing to someone watching a delete.
        // A single DELETE behind a confirmation is not worth a third.
        await service.deleteGist(id);
      } catch (err) {
        reportAuthExpired(err);
        setError(name, describe(err));
        // Left bound on failure. Forgetting the id after a delete that did not
        // land is the one outcome with no way back: the gist would still be on
        // the account with nothing in the app pointing at it, so the user could
        // neither reconnect to it nor try the delete again.
        return;
      }

      // Only now. The binding described a gist that no longer exists, and
      // keeping the id would make a later `enableSync` PATCH a deleted gist —
      // a 404 in place of the new gist the user asked for.
      const patch = {
        syncEnabled: false,
        gistId: undefined,
        gistFileName: undefined,
        remoteUpdatedAt: undefined,
        syncedContentHash: undefined,
      };
      await storage.patchSync(name, patch);
      setRecords((prev) => (prev[name] ? { ...prev, [name]: { ...prev[name], ...patch } } : prev));
      // Drop it from the listing too, so the row does not linger under
      // "on GitHub" until the next refresh.
      setRemotes((prev) => prev.filter((g) => g.id !== id));
    },
    [service, records, storage, setError],
  );

  const openRemote = useCallback(
    async (gistId: string) => {
      if (!service) return;
      const meta = remotes.find((g) => g.id === gistId);
      const name = meta?.fileName ?? gistId;

      setError(name, null);
      setBusyFor(name, 'pulling');
      try {
        // The lazy load: content crosses the network only now, when the user has
        // asked for this specific document.
        const gist = await service.getGist(gistId);
        const existing = filesRef.current.find((f) => f.name === gist.fileName);
        if (existing) {
          applyExternalContent(gist.fileName, gist.content);
        } else {
          await addRemoteFile(gist.fileName, gist.content);
        }
        await commitSync(gist.fileName, gist, gist.content);
      } catch (err) {
        reportAuthExpired(err);
        setError(name, describe(err));
      } finally {
        setBusyFor(name, null);
      }
    },
    [service, remotes, applyExternalContent, addRemoteFile, commitSync, setError, setBusyFor],
  );

  /**
   * Fetches a file's gist and hands back its content, or null if there is
   * nothing to fetch. Shared by `pull` and the two conflict resolutions that
   * need the remote text; each decides for itself what to do with it.
   *
   * Errors are reported here and swallowed, so callers see null and stop.
   */
  const fetchRemote = useCallback(
    async (
      name: string,
    ): Promise<{ content: string; meta: GistMeta; folder?: GistFolderTag } | null> => {
      if (!service) return null;
      const rec = recordsRef.current[name];
      if (!rec?.gistId) return null;

      setError(name, null);
      setBusyFor(name, 'pulling');
      try {
        const gist = await service.getGist(rec.gistId);
        return { content: gist.content, meta: gist, folder: gist.folder };
      } catch (err) {
        reportAuthExpired(err);
        setError(name, describe(err));
        return null;
      } finally {
        setBusyFor(name, null);
      }
    },
    [service, setError, setBusyFor],
  );

  /**
   * Puts a pulled file into the folder the other device had it in.
   *
   * Only ever moves a file that is already synced, and only on a pull — the one
   * moment the remote is the authority on where the file belongs. Nothing here
   * runs against a file the user is merely looking at.
   *
   * No tag means ungrouped, and the file is moved out. That reading is only
   * safe because the description is rewritten on every push: absence is a
   * statement the other device made, not silence from a gist that predates
   * folders. It is also the only way a file leaving a folder can reach the
   * other devices — there is nothing else in the payload to carry it.
   */
  const applyFolderTag = useCallback(
    (name: string, folder: GistFolderTag | undefined) => {
      moveFileToFolder(name, folder ? reconcileFolder(folder) : null);
    },
    [moveFileToFolder, reconcileFolder],
  );

  const pull = useCallback(
    async (name: string) => {
      const got = await fetchRemote(name);
      if (!got) return;
      const patch = syncPatchFor(got.meta, got.content);
      // Content and metadata in one write, unlike push. A push leaves the local
      // text alone and only records what was sent, so patching the record is
      // right there. A pull replaces the text, and the hash and watermark
      // describe exactly the text it is replacing it with — write them
      // separately and the content write, which copies forward the sync fields
      // it reads, can land last and reinstate metadata for content that is
      // gone. The file then reads as a conflict on the next load, having
      // already discarded the local copy the user chose to give up.
      //
      // Replaces both sides of the content: this is not an edit the user made,
      // so the file must not come out of it marked dirty.
      await applyExternalContent(name, got.content, patch);
      noteSynced(name, got.meta, patch);
      // Last, once the content write has settled.
      //
      // What actually makes this safe is that the move persists through
      // `storage.setFolder`, which touches one field. The order here is
      // belt-and-braces on top of that, not the guard itself: a move that
      // re-saved the whole record would read `filesRef` — a render behind
      // `setFiles` — and put the pre-pull text back over what was just
      // fetched, and running it after the content write would not save it.
      // See the pull-and-move test in folderSync.test.tsx.
      applyFolderTag(name, got.folder);
    },
    [fetchRemote, applyExternalContent, noteSynced, applyFolderTag],
  );

  // Same one-way-dependency reason as pushRef: the open-a-file effect below is
  // declared after `pull` and must not drag it into its dependency array, where
  // a new `pull` identity would re-run the effect and re-fetch.
  const pullRef = useRef(pull);
  useEffect(() => {
    pullRef.current = pull;
  }, [pull]);

  const resolveConflict = useCallback(
    async (name: string, how: ConflictResolution) => {
      if (how === 'keep-mine') {
        // Deliberately overwrites the remote. Reachable only from the banner,
        // where the user was told the other copy exists — nothing on the
        // automatic paths can arrive here.
        const rec = recordsRef.current[name];
        const remoteMeta = rec?.gistId ? remotesRef.current.find((g) => g.id === rec.gistId) : undefined;
        // Accept the remote's current timestamp as the new watermark *before*
        // pushing over it. On the happy path this is redundant — `commitSync`
        // writes a watermark from the meta the push returns, and dropping this
        // block entirely leaves the whole suite green.
        //
        // What it earns is the failure path. The user has said, on the banner,
        // that the remote version is not wanted. If the push then fails, that
        // decision has to survive anyway: without this the record still carries
        // the old watermark, the remote still reads as newer, and the banner
        // comes back asking a question already answered. Recorded first so a
        // failure cannot lose it. See the keep-mine failure test in
        // pull.test.tsx.
        if (remoteMeta) {
          await storage.patchSync(name, { remoteUpdatedAt: remoteMeta.updatedAt });
          setRecords((prev) =>
            prev[name]
              ? { ...prev, [name]: { ...prev[name], remoteUpdatedAt: remoteMeta.updatedAt } }
              : prev,
          );
        }
        await pushRef.current(name);
        return;
      }

      if (how === 'take-remote') {
        await pull(name);
        return;
      }

      // keep-both: the only resolution that destroys nothing. The remote copy
      // arrives as a second file and the local one is left exactly as it is —
      // still ahead, still bound to the gist, and now pushable without argument
      // because the watermark has moved.
      const got = await fetchRemote(name);
      if (!got) return;
      // Not activated: the user is reading the file they are resolving, and
      // being moved to a different document mid-decision would read as the app
      // having done something to their work.
      await addRemoteFile(keepBothName(name), got.content, false);
      await storage.patchSync(name, { remoteUpdatedAt: got.meta.updatedAt });
      setRecords((prev) =>
        prev[name] ? { ...prev, [name]: { ...prev[name], remoteUpdatedAt: got.meta.updatedAt } } : prev,
      );
    },
    [fetchRemote, pull, addRemoteFile, storage],
  );

  const stateOf = useCallback(
    (name: string): FileSyncState => {
      const b = busy[name];
      if (b) return b;
      if (errors[name]) return 'error';
      const rec = records[name];
      if (!rec?.syncEnabled) {
        const tooLarge = files.find((x) => x.name === name);
        // Reported before the user can try, so the sidebar can say why the
        // control is unavailable rather than failing at the moment it is used.
        return tooLarge && !canSync(tooLarge.editedContent) ? 'too-large' : 'off';
      }

      // The remote copy is gone: deleted from another device, or by hand on
      // github.com. Everything below this compares hashes and watermarks the
      // record carries about *itself*, so with nothing on the other end it would
      // happily answer `idle` — the app claiming a file is backed up when the
      // backup no longer exists.
      //
      // Gated on `listed && signedIn`, and that gate is the whole correctness of
      // this branch. An empty `remotes` before the first response is "not asked
      // yet", not "nothing there"; without the gate every synced file would flash
      // as deleted on each load, which is exactly the false alarm that teaches
      // people to ignore the real one.
      if (listed && signedIn && rec.gistId && !remotes.some((g) => g.id === rec.gistId)) {
        return 'gone';
      }

      // `files`, not `filesRef`: this has to recompute as the user types, or
      // the pill would keep saying `idle` over an edit already made.
      const f = files.find((x) => x.name === name);
      // Hash comparison, not a timestamp one. `contentUpdatedAt` runs on this
      // machine's clock and `updatedAt` on GitHub's; comparing them across
      // devices turns a few minutes of clock skew into a wrong answer about
      // whose copy is newer. The hash makes "did this change" a fact.
      //
      // A *missing* hash counts as changed, not unchanged. It means this device
      // never recorded what it last synced — an interrupted push, or a record
      // written before the field existed — so whether the local copy matches
      // the remote is unknown. Reading unknown as "unchanged" would let the
      // pull-on-open path overwrite local content it had no evidence was safe
      // to discard; reading it as "changed" costs at most a conflict banner
      // the user can dismiss with one click.
      const localChanged = !!f && rec.syncedContentHash !== contentHash(f.editedContent);

      // A watermark, not a clock reading: `remoteUpdatedAt` is the last remote
      // state this device reconciled, so comparing GitHub's timestamp against
      // it stays within GitHub's own clock.
      const remoteMeta = rec.gistId ? remotes.find((g) => g.id === rec.gistId) : undefined;
      const remoteChanged = !!remoteMeta && remoteMeta.updatedAt > (rec.remoteUpdatedAt ?? 0);

      if (localChanged && remoteChanged) return 'conflict';
      if (localChanged) return 'local-ahead';
      if (remoteChanged) return 'remote-ahead';
      return 'idle';
    },
    [busy, errors, records, remotes, files, listed, signedIn],
  );

  const errorOf = useCallback((name: string) => errors[name] ?? null, [errors]);

  const activeName = active?.name ?? null;
  const activeState = activeName ? stateOf(activeName) : null;

  /**
   * Opening a file re-checks the remote.
   *
   * Opening is the whole trigger. There is no focus listener and no timer: both
   * answer a question the user did not ask, and the focus version was worse than
   * useless — throttling it to keep alt-tabbing from firing a request per switch
   * also swallowed the one return that mattered, so the app showed a stale
   * answer at exactly the moment the user came back to check.
   *
   * Refreshing the state a user is looking at is left to the user too: reload
   * the page, or switch to another file and back. Both are things people already
   * do when they want a fresh answer, and both come through here.
   *
   * `activeName` alone in the deps, deliberately. `activeState` changes on every
   * keystroke, and depending on it would turn typing into a request per
   * character.
   */
  useEffect(() => {
    if (!signedIn || !activeName) return;
    void refreshRef.current();
  }, [signedIn, activeName]);

  /**
   * Taking the newer copy once the check comes back.
   *
   * Only from `remote-ahead`, where there is nothing local to lose — the local
   * copy is byte-for-byte what was last synced, so replacing it discards
   * nothing. From `conflict` this stays out of the way and the banner asks.
   *
   * Separate from the check above because it has to run when the *answer*
   * arrives, which is a render later than the request. `listed` gates it:
   * before the first `listGists` there is no remote timestamp to compare
   * against, so every file would read as up to date.
   *
   * `pulling` is the re-entrancy guard, and it holds because `fetchRemote` sets
   * it synchronously before its first await — so the very next render already
   * reads `pulling` rather than `remote-ahead`. By the time the flag clears the
   * commit has moved the state to `idle`, and the condition that got us here is
   * gone.
   */
  useEffect(() => {
    if (!signedIn || !listed || !activeName) return;
    if (activeState !== 'remote-ahead') return;
    void pullRef.current(activeName);
  }, [signedIn, listed, activeName, activeState]);

  const remoteOnly = useMemo<RemoteFile[]>(() => {
    if (!signedIn) return [];
    const local = new Set(files.map((f) => f.name));
    return remotes
      .filter((g) => !local.has(g.fileName))
      .map((g) => ({
        gistId: g.id,
        fileName: g.fileName,
        updatedAt: g.updatedAt,
        size: g.size,
        htmlUrl: g.htmlUrl,
      }));
  }, [remotes, files, signedIn]);

  const value = useMemo<SyncValue>(
    () => ({
      listed: listed && signedIn,
      remoteOnly,
      stateOf,
      errorOf,
      enableSync,
      disableSync,
      deleteRemote,
      hasOrphanedGist,
      leavesRemoteBehind,
      deleteRemotes,
      push,
      pull,
      resolveConflict,
      openRemote,
      refresh,
    }),
    [
      listed,
      signedIn,
      remoteOnly,
      stateOf,
      errorOf,
      enableSync,
      disableSync,
      deleteRemote,
      hasOrphanedGist,
      leavesRemoteBehind,
      deleteRemotes,
      push,
      pull,
      resolveConflict,
      openRemote,
      refresh,
    ],
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

function describe(err: unknown): string {
  if (err instanceof FileTooLargeToSyncError) {
    return `Too large to sync (${Math.round(err.bytes / 1024)}KB of a ${Math.round(err.limit / 1024)}KB limit).`;
  }
  return err instanceof Error ? err.message : 'Sync failed.';
}

export function useSync(): SyncValue {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useSync must be used within a SyncProvider');
  return ctx;
}

/** Sync state, or null when no provider is above. See useOptionalGistAuth. */
export function useOptionalSync(): SyncValue | null {
  return useContext(SyncContext);
}
