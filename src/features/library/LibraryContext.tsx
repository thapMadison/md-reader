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
import { MAX_STORAGE_BYTES, StorageQuotaExceededError } from '@/services/storage/types';
import type { SyncPatch } from '@/services/storage/types';
import {
  pickFilesLive,
  readFileListSettled,
  readDroppedFiles,
  queryHandlePermission,
  requestHandlePermission,
  rereadHandle,
  statHandle,
  supportsFileSystemAccess,
  type OpenedFile,
} from '@/services/filesystem';
import type { Folder, LibraryFile } from './types';

interface LibraryContextValue {
  files: LibraryFile[];
  active: LibraryFile | null;
  activeName: string | null;
  setActiveName: (name: string | null) => void;
  openViaPicker: () => Promise<void>;
  openViaInput: (fileList: FileList) => Promise<void>;
  openViaDrop: (dataTransfer: DataTransfer) => Promise<void>;
  closeFile: (name: string) => void;
  clearAll: () => Promise<void>;
  folders: Folder[];
  /** Folder newly opened files land in, or null for the ungrouped list. */
  selectedFolderId: string | null;
  setSelectedFolderId: (id: string | null) => void;
  /** Creates a folder and returns its id, so the caller can select or focus it. */
  createFolder: (name: string) => string;
  renameFolder: (id: string, name: string) => void;
  /** Drops the folder; its files return to the ungrouped list. */
  ungroupFolder: (id: string) => void;
  /** Drops the folder and closes every file inside it. Destructive. */
  deleteFolderAndFiles: (id: string) => Promise<void>;
  /** Moves one file. `null` returns it to the ungrouped list. */
  moveFileToFolder: (name: string, folderId: string | null) => void;
  /**
   * Finds the local folder a synced file belongs in, creating one if this
   * device has not seen it, and returns its id.
   *
   * Ids come from `crypto.randomUUID()` on whichever device first made the
   * folder, so there is no registry and no authority — convergence has to come
   * from the matching rules, in this order:
   *
   * 1. **By id.** Two devices that both know the id agree, and a folder renamed
   *    on one of them stays the same folder on the other.
   * 2. **By name, case-insensitively.** A device seeing the id for the first
   *    time adopts its own folder of that name rather than making a second one
   *    beside it. Case-insensitive because "Work" and "work" are the same
   *    folder to the person who typed them, and matching exactly would leave
   *    them staring at a duplicate.
   * 3. **Create it**, keeping the remote id so the next device to sync matches
   *    at step 1 instead of repeating this.
   *
   * Returns null for a file with no folder, which is the ungrouped list.
   */
  reconcileFolder: (remote: { folderId?: string; folderName?: string }) => string | null;
  /** Files in a folder, or the ungrouped ones for `null`, in library order. */
  filesInFolder: (id: string | null) => LibraryFile[];
  grantAccess: (name: string) => Promise<void>;
  editContent: (name: string, content: string) => void;
  revertContent: (name: string) => void;
  /**
   * Replaces both sides of the content, as if re-read from source. Used when the
   * user pulls a remote copy; does not mark the file dirty.
   *
   * `sync` is written in the same record as the content. A pull changes the
   * content *and* what the file has reconciled with, and splitting those across
   * two writes lets the content-carrying one — which reads the record first and
   * copies the sync fields it finds — put stale metadata back over the fresh
   * values. The result is a file whose stored hash describes text it no longer
   * holds, which reads as a conflict on the next load.
   */
  applyExternalContent: (name: string, content: string, sync?: SyncPatch) => Promise<void>;
  /** Adds a document downloaded from a gist, as a snapshot with no handle. */
  /**
   * Adds a file that came from the network, as a snapshot with no handle.
   *
   * @param activate Whether to switch to it. False when the file arrives beside
   *   one the user is already reading — see the `keep both` conflict path.
   */
  addRemoteFile: (name: string, content: string, activate?: boolean) => Promise<void>;
  /**
   * Creates a document that the app itself is the source of, activates it, and
   * resolves once it is in IndexedDB.
   *
   * `snapshot`, exactly like a dropped file: there is no handle and never will
   * be, so nothing can re-read it or write it back to disk. Its bytes live in
   * IndexedDB — and, if the user opts in, in a gist — which is the same path
   * that makes laptop → gist → phone work on browsers without the FS Access API.
   *
   * Returns the name it actually took, which may not be the one asked for.
   * Files are keyed by name, so a clash has to be resolved before the record is
   * written: overwriting an existing entry would destroy a document to make
   * room for a blank one.
   */
  createFile: (name: string) => Promise<string>;
  /**
   * Writes any debounced edits to storage immediately. Resolves once they have
   * landed, so a caller can push the saved bytes straight afterwards.
   */
  flushEdits: () => Promise<void>;
  isDirty: (name: string) => boolean;
  /** True when the file is open in memory but could not be written to storage. */
  isUnpersisted: (name: string) => boolean;
  dismissedBanners: Record<string, boolean>;
  dismissBanner: (name: string) => void;
  /** Names reopened while holding unsaved edits; those edits were kept, not overwritten. */
  collisions: string[];
  /** Names that could not be read at all; the rest of the batch still opened. */
  unreadable: string[];
  dismissCollisions: () => void;
  storageUsedBytes: number;
  storageQuotaBytes: number;
  fsAccessSupported: boolean;
}

// How long typing must pause before edits are written to IndexedDB. Long
// enough that ordinary typing coalesces into one write, short enough that the
// window for losing work to a crash stays around a sentence.
const EDIT_DEBOUNCE_MS = 1000;

/** What a new file is called when the user names it nothing at all. */
const DEFAULT_NEW_FILE_NAME = 'Untitled.md';

// The same set the file input accepts, so a file made here and a file opened
// from disk are named by one rule.
const MARKDOWN_EXTENSIONS = ['.md', '.markdown', '.txt'];

/**
 * Normalizes a name typed by hand into one the rest of the app can key on.
 *
 * Path separators go first: this string is a bare basename everywhere it is
 * used — an IndexedDB key, a row label, and the file name inside a gist — and a
 * slash in it would read as structure that does not exist.
 *
 * `.md` is appended rather than required, because "Meeting notes" is what people
 * type and a document with no extension renders as markdown here regardless.
 */
function normalizeNewFileName(raw: string): string {
  const cleaned = raw.replace(/[\\/]/g, '-').trim();
  if (!cleaned) return DEFAULT_NEW_FILE_NAME;
  const lower = cleaned.toLowerCase();
  return MARKDOWN_EXTENSIONS.some((ext) => lower.endsWith(ext)) ? cleaned : `${cleaned}.md`;
}

/**
 * The first free variant of `name`, suffixing the stem rather than the whole
 * string so `Notes.md` becomes `Notes 2.md` and not `Notes.md 2`.
 *
 * Files are keyed by name and the library is not asked before a name is reused,
 * so this is what stands between "create a file" and "silently replace one".
 */
function uniqueFileName(name: string, taken: Iterable<string>): string {
  const names = new Set(taken);
  if (!names.has(name)) return name;
  const dot = name.lastIndexOf('.');
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : '';
  for (let i = 2; ; i += 1) {
    const candidate = `${stem} ${i}${ext}`;
    if (!names.has(candidate)) return candidate;
  }
}

const LibraryContext = createContext<LibraryContextValue | null>(null);

export function LibraryProvider({ children }: { children: ReactNode }) {
  const storage = useStorage();
  const [files, setFiles] = useState<LibraryFile[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [activeName, setActiveName] = useState<string | null>(null);
  const [dismissedBanners, setDismissedBanners] = useState<Record<string, boolean>>({});
  const [storageUsedBytes, setStorageUsedBytes] = useState(0);
  const [storageQuotaBytes, setStorageQuotaBytes] = useState(MAX_STORAGE_BYTES);
  const [unpersisted, setUnpersisted] = useState<Record<string, boolean>>({});
  const hydrated = useRef(false);
  // Mirrors `files` so callbacks can read the current list without either
  // depending on it (which would re-create every consumer's handler on each
  // keystroke) or reaching for it inside a setState updater. Synced in an
  // effect, not during render — a ref write during render is not safe under
  // concurrent rendering.
  const filesRef = useRef<LibraryFile[]>(files);
  useEffect(() => {
    filesRef.current = files;
  }, [files]);
  // Same reason as filesRef: the folder callbacks below need the current list
  // without depending on it, and without reading it inside a setState updater.
  const foldersRef = useRef<Folder[]>(folders);
  useEffect(() => {
    foldersRef.current = folders;
  }, [folders]);
  const selectedFolderRef = useRef<string | null>(selectedFolderId);
  useEffect(() => {
    selectedFolderRef.current = selectedFolderId;
  }, [selectedFolderId]);

  const refreshStorageEstimate = useCallback(async () => {
    const est = await storage.estimate();
    setStorageUsedBytes(est.usedBytes);
    setStorageQuotaBytes(est.quotaBytes || MAX_STORAGE_BYTES);
  }, [storage]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [records, prefs] = await Promise.all([storage.listFiles(), storage.getPreferences()]);
      if (cancelled) return;
      const restoredFolders = prefs.folders ?? [];
      const restored: LibraryFile[] = [];
      for (const r of records) {
        let perm: LibraryFile['perm'] = r.kind === 'live' ? 'prompt' : 'na';
        if (r.kind === 'live' && r.handle) {
          try {
            perm = await queryHandlePermission(r.handle);
          } catch {
            perm = 'denied';
          }
        }
        // A live file whose permission survived the reload must be re-read from
        // disk. Previously hydration only *queried* the permission and then used
        // the IndexedDB copy regardless, so an already-granted file showed the
        // bytes captured when it was first opened — forever. The one code path
        // that re-read (grantAccess) is unreachable here, since it is only
        // offered when perm === 'prompt'.
        let content = r.content;
        let stat: { size: number; lastModified: number } | undefined;
        if (r.kind === 'live' && r.handle && perm === 'granted') {
          try {
            content = await rereadHandle(r.handle);
            stat = await statHandle(r.handle);
          } catch {
            // File moved, deleted, or renamed since last visit. The cached copy
            // is the honest fallback — better a stale document than none.
            perm = 'denied';
          }
        }
        restored.push({
          name: r.name,
          kind: r.kind,
          perm,
          originalContent: content,
          // Unsaved edits survive the reload. Falls back to `content` when the
          // file was clean, which is what an absent `editedContent` means.
          //
          // Deliberately kept even when a live file was re-read and `content`
          // changed underneath: dropping the edits there would discard the
          // user's typing precisely when the two copies disagree, which is when
          // it matters most. The fresh bytes are still in `originalContent`, so
          // the editor's revert control offers them as a deliberate choice.
          editedContent: r.editedContent ?? content,
          handle: r.handle,
          size: stat?.size,
          lastModified: stat?.lastModified,
          folderId: r.folderId,
        });
      }
      // A file pointing at a folder that no longer exists would render nowhere —
      // it is neither in the ungrouped list nor under any visible header — while
      // still counting against the storage meter. Half-written preferences are
      // enough to cause that, so membership is validated against the folder list
      // rather than trusted.
      const folderIds = new Set(restoredFolders.map((f) => f.id));
      for (const f of restored) {
        if (f.folderId && !folderIds.has(f.folderId)) f.folderId = undefined;
      }
      if (restored.length === 0) {
        try {
          const res = await fetch(`${import.meta.env.BASE_URL}sample.md`);
          if (res.ok) {
            const content = await res.text();
            const sample: LibraryFile = {
              name: 'sample.md',
              kind: 'snapshot',
              perm: 'na',
              originalContent: content,
              editedContent: content,
            };
            restored.push(sample);
            await storage.saveFile({
              name: sample.name,
              content: sample.originalContent,
              kind: sample.kind,
              savedAt: Date.now(),
            });
          }
        } catch {
          // offline or fetch blocked — fall through to the empty-library state
        }
      }

      setFiles(restored);
      setFolders(restoredFolders);
      // Same validation as the membership prune above: a selection naming a
      // folder that is gone would send new files somewhere invisible.
      setSelectedFolderId(
        prefs.selectedFolderId && folderIds.has(prefs.selectedFolderId) ? prefs.selectedFolderId : null,
      );
      // Refresh the cached copy for anything that came back changed, so the
      // offline fallback does not stay pinned to first-open bytes.
      for (const r of records) {
        const f = restored.find((x) => x.name === r.name);
        if (!f || f.originalContent === r.content) continue;
        storage
          .saveFile({
            name: f.name,
            content: f.originalContent,
            kind: f.kind,
            handle: f.handle,
            savedAt: Date.now(),
            // Carried through explicitly: this record is built here rather than
            // via persistFile, so omitting the membership would silently reset
            // every grouped live file to ungrouped on each reload.
            folderId: f.folderId,
            // Same hazard, quieter failure. This write happens on every reload
            // where a live file changed on disk, so a field omitted here is
            // lost for good: the edits would vanish and a synced file would
            // unbind from its gist and push itself to a fresh one.
            editedContent: f.editedContent !== f.originalContent ? f.editedContent : undefined,
            contentUpdatedAt: r.contentUpdatedAt,
            syncEnabled: r.syncEnabled,
            gistId: r.gistId,
            gistFileName: r.gistFileName,
            remoteUpdatedAt: r.remoteUpdatedAt,
            syncedContentHash: r.syncedContentHash,
          })
          .catch(() => {});
      }
      if (prefs.activeFile && restored.some((f) => f.name === prefs.activeFile)) {
        setActiveName(prefs.activeFile);
      } else if (restored.length > 0) {
        setActiveName(restored[0].name);
      }
      await refreshStorageEstimate();
      hydrated.current = true;
    })().catch((err: unknown) => {
      // IndexedDB is unavailable in Firefox private windows and can fail on a
      // corrupt store. Without this the whole hydration chain rejected
      // unhandled and the app sat empty with no explanation anywhere.
      console.error('Failed to restore library from storage', err);
      hydrated.current = true;
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    storage.setPreferences({ activeFile: activeName }).catch(() => {});
  }, [activeName, storage]);

  // The `hydrated` guard matters as much here as for activeFile above: without
  // it the initial empty array would be written back over the stored folders
  // before hydration had a chance to read them.
  useEffect(() => {
    if (!hydrated.current) return;
    storage.setPreferences({ folders }).catch(() => {});
  }, [folders, storage]);

  useEffect(() => {
    if (!hydrated.current) return;
    storage.setPreferences({ selectedFolderId }).catch(() => {});
  }, [selectedFolderId, storage]);

  // A file that cannot be persisted is still usable in this session — it just
  // will not survive a reload. That distinction is worth surfacing: previously
  // the quota rejection propagated out of an un-awaited caller and the file
  // silently vanished on the next visit with no warning at any point.
  const persistFile = useCallback(
    async (f: LibraryFile, sync?: SyncPatch) => {
      try {
        // Read first. The sync fields carried through below live only in
        // storage — LibraryFile has no idea a file is bound to a gist — so a
        // whole-record write that skipped this would unbind every synced file.
        // That failure is silent: the file would look as though it had never
        // been synced, push itself to a brand-new gist, and leave the original
        // orphaned on GitHub with the other device still pointing at it.
        //
        // `sync` overrides what that read found. A caller passing it knows the
        // stored values are already out of date — it is replacing the content
        // they describe in this same write — so carrying them through would
        // reinstate metadata for text that no longer exists.
        const prev = await storage.getFile(f.name);
        const now = Date.now();
        // Only when the bytes actually differ. `savedAt` below is rewritten on
        // every persist — including the hydration write-back, which runs on
        // reloads that changed nothing — so it cannot answer "is this newer
        // than what was synced?". This can.
        const contentChanged = !prev || prev.content !== f.originalContent;
        await storage.saveFile({
          name: f.name,
          content: f.originalContent,
          // Absent when the file is clean, which is what "not dirty" reads as
          // on the way back in — so an edit reverted before a reload does not
          // come back as a phantom unsaved change.
          editedContent: f.editedContent !== f.originalContent ? f.editedContent : undefined,
          contentUpdatedAt: contentChanged ? now : prev?.contentUpdatedAt,
          kind: f.kind,
          handle: f.handle,
          savedAt: now,
          folderId: f.folderId,
          syncEnabled: prev?.syncEnabled,
          gistId: prev?.gistId,
          gistFileName: prev?.gistFileName,
          remoteUpdatedAt: prev?.remoteUpdatedAt,
          syncedContentHash: prev?.syncedContentHash,
          ...sync,
        });
        setUnpersisted((prev) => (prev[f.name] ? { ...prev, [f.name]: false } : prev));
      } catch (err) {
        if (err instanceof StorageQuotaExceededError) {
          setUnpersisted((prev) => ({ ...prev, [f.name]: true }));
        } else {
          throw err;
        }
      }
      await refreshStorageEstimate();
    },
    [storage, refreshStorageEstimate],
  );

  // Files are keyed by name, so reopening a name already in the library replaces
  // that entry. When the open copy has unsaved edits, replacing it outright
  // discards them with no warning and no undo — the incoming file is a different
  // file on disk that merely shares a basename (the FS Access API exposes no
  // path to tell them apart). The edits win: the fresh content still lands in
  // originalContent, so the editor's own revert control offers it deliberately,
  // and `collisions` lets the UI say what happened.
  const [collisions, setCollisions] = useState<string[]>([]);
  // Files that matched the extension filter but could not be read. Kept separate
  // from `collisions` because the user action differs: a collision is resolvable
  // in the editor, an unreadable file has to be reopened from disk.
  const [unreadable, setUnreadable] = useState<string[]>([]);
  const dismissCollisions = useCallback(() => {
    setCollisions([]);
    setUnreadable([]);
  }, []);

  const addOpenedFiles = useCallback(
    async (opened: OpenedFile[]) => {
      if (opened.length === 0) return;
      // Derived from the ref before the updater runs, not inside it: React calls
      // updaters twice under StrictMode, so collecting names there would report
      // each clash twice. The updater below stays pure.
      const dirtyNames = new Set(
        opened
          .map((o) => filesRef.current.find((f) => f.name === o.name))
          .filter((f): f is LibraryFile => !!f && f.editedContent !== f.originalContent)
          .map((f) => f.name),
      );
      // Read before the updater for the same reason as dirtyNames.
      const target = selectedFolderRef.current ?? undefined;
      // Where each opened name ends up, decided once and reused by both the
      // updater and the persistence loop below so they cannot disagree.
      //
      // An already-filed file keeps its folder even when another one is
      // selected: reopening is a content refresh, not a re-filing, and silently
      // moving a file the user had put somewhere is the kind of thing they
      // cannot undo because they never saw it happen. Only genuinely new files
      // take the selected folder.
      const folderFor = new Map(
        opened.map((o) => [o.name, filesRef.current.find((f) => f.name === o.name)?.folderId ?? target]),
      );
      setFiles((prev) => {
        const byName = new Map(prev.map((f) => [f.name, f]));
        for (const o of opened) {
          const existing = byName.get(o.name);
          const keepEdits = dirtyNames.has(o.name) && !!existing;
          byName.set(o.name, {
            name: o.name,
            kind: o.kind,
            perm: o.perm,
            originalContent: o.content,
            editedContent: keepEdits ? existing.editedContent : o.content,
            handle: o.handle,
            size: o.size,
            lastModified: o.lastModified,
            folderId: existing?.folderId ?? folderFor.get(o.name),
          });
        }
        return Array.from(byName.values());
      });
      setCollisions([...dirtyNames]);
      setActiveName(opened[opened.length - 1].name);
      for (const o of opened) {
        await persistFile({
          name: o.name,
          kind: o.kind,
          perm: o.perm,
          originalContent: o.content,
          editedContent: o.content,
          handle: o.handle,
          folderId: folderFor.get(o.name),
        });
      }
    },
    [persistFile],
  );

  const openViaPicker = useCallback(async () => {
    const opened = await pickFilesLive();
    await addOpenedFiles(opened);
  }, [addOpenedFiles]);

  // <input type=file> yields a File with no FileSystemFileHandle, so these are
  // snapshots and must stay labelled as such. Relabelling them 'live' made the
  // sidebar offer a "Grant access" action that could never work (grantAccess
  // needs a handle) and hid the honest "offline copy" badge — on browsers
  // without the FS Access API that was every file the user opened.
  const openViaInput = useCallback(
    async (fileList: FileList) => {
      const { files: opened, failed } = await readFileListSettled(fileList);
      setUnreadable(failed);
      await addOpenedFiles(opened);
    },
    [addOpenedFiles],
  );

  const openViaDrop = useCallback(
    async (dataTransfer: DataTransfer) => {
      const { files: opened, failed } = await readDroppedFiles(dataTransfer);
      setUnreadable(failed);
      await addOpenedFiles(opened);
    },
    [addOpenedFiles],
  );

  const closeFile = useCallback(
    (name: string) => {
      // Both updaters stay pure — setActiveName is no longer nested inside the
      // setFiles updater (React may call updaters twice), and each derives its
      // own next value from its own previous state.
      setFiles((prev) => prev.filter((f) => f.name !== name));
      setActiveName((prevActive) => {
        if (prevActive !== name) return prevActive;
        return filesRef.current.find((f) => f.name !== name)?.name ?? null;
      });
      // Drop the saved scroll offset too; otherwise scrollPositions accumulated
      // an entry per file ever opened and was never pruned.
      storage
        .getPreferences()
        .then(({ scrollPositions }) => {
          if (!scrollPositions || !(name in scrollPositions)) return;
          const rest = { ...scrollPositions };
          delete rest[name];
          return storage.setPreferences({ scrollPositions: rest });
        })
        .catch(() => {});
      storage
        .removeFile(name)
        .then(refreshStorageEstimate)
        .catch((err: unknown) => {
          console.error('Failed to remove file from storage', err);
        });
    },
    [storage, refreshStorageEstimate],
  );

  const clearAll = useCallback(async () => {
    await storage.clearAll();
    await storage.setPreferences({ scrollPositions: {} }).catch(() => {});
    setFiles([]);
    // Folders go with the files. Leaving them would present a sidebar full of
    // empty groups the user never asked to keep, and "Clear all" says otherwise.
    setFolders([]);
    setSelectedFolderId(null);
    setActiveName(null);
    await refreshStorageEstimate();
  }, [storage, refreshStorageEstimate]);

  // Writes only the folder field, never the whole record.
  //
  // This used to go through persistFile, which rebuilds the record from live
  // component state. That was fine while moves were something only the user did
  // — but a pull now moves files too, and it runs right after the content has
  // been replaced, when `filesRef` still holds the pre-pull text because it
  // syncs in an effect a render later. The rebuilt record carried that stale
  // content back over what had just been fetched.
  const persistMembership = useCallback(
    (moved: LibraryFile[], folderId: string | undefined) => {
      for (const f of moved) {
        storage.setFolder(f.name, folderId).catch((err: unknown) => {
          console.error('Failed to persist folder change', err);
        });
      }
    },
    [storage],
  );

  // The id and order are generated here rather than inside the updater. React
  // calls updaters twice under StrictMode, and crypto.randomUUID() there would
  // mint a different id per call — the returned id would name a folder that the
  // second invocation had already replaced. Deriving both up front leaves an
  // updater that is pure and idempotent, and the guard makes a repeat call a
  // no-op rather than a duplicate.
  const createFolder = useCallback((name: string): string => {
    const id = crypto.randomUUID();
    const order = foldersRef.current.reduce((max, f) => Math.max(max, f.order), 0) + 1;
    const trimmed = name.trim() || 'New folder';
    setFolders((prev) => (prev.some((f) => f.id === id) ? prev : [...prev, { id, name: trimmed, order }]));
    return id;
  }, []);

  const renameFolder = useCallback((id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setFolders((prev) => prev.map((f) => (f.id === id ? { ...f, name: trimmed } : f)));
  }, []);

  // See the interface for the three matching rules. Everything is derived from
  // foldersRef before the updater runs, for the same StrictMode reason as
  // createFolder: an updater that reads current state and mints an id would
  // produce a different answer on its second invocation, and the id this
  // returns has to be the one that ends up in state.
  const reconcileFolder = useCallback((remote: { folderId?: string; folderName?: string }) => {
    const { folderId, folderName } = remote;
    if (!folderId && !folderName) return null;

    const known = foldersRef.current;
    const byId = folderId ? known.find((f) => f.id === folderId) : undefined;
    // Match on id wins outright, and the name is deliberately not applied over
    // it. A rename is a local decision; adopting the remote name here would
    // make the last device to sync silently rename everyone else's folder.
    if (byId) return byId.id;

    const wanted = folderName?.trim();
    if (!wanted) {
      // An id this device has never seen and no name to go with it — the folder
      // was renamed away or the tag was written by hand. Ungrouped is the
      // honest answer: inventing a folder called after a UUID would be worse
      // than leaving the file where the user can see and place it.
      return null;
    }

    const byName = known.find((f) => f.name.toLowerCase() === wanted.toLowerCase());
    if (byName) return byName.id;

    // Keep the remote id rather than minting one. Two devices creating "Work"
    // independently will each keep their own until one syncs a file, and from
    // then on they agree — but only if the id travels rather than being
    // regenerated at every hop.
    const id = folderId ?? crypto.randomUUID();
    const order = known.reduce((max, f) => Math.max(max, f.order), 0) + 1;
    setFolders((prev) => (prev.some((f) => f.id === id) ? prev : [...prev, { id, name: wanted, order }]));
    return id;
  }, []);

  // Removes the grouping, keeps every file. Deliberately not a confirmation:
  // nothing is destroyed, and the files are visibly still there afterwards.
  const ungroupFolder = useCallback(
    (id: string) => {
      const moved = filesRef.current.filter((f) => f.folderId === id);
      setFolders((prev) => prev.filter((f) => f.id !== id));
      setFiles((prev) => prev.map((f) => (f.folderId === id ? { ...f, folderId: undefined } : f)));
      setSelectedFolderId((prev) => (prev === id ? null : prev));
      persistMembership(moved, undefined);
    },
    [persistMembership],
  );

  const moveFileToFolder = useCallback(
    (name: string, folderId: string | null) => {
      const next = folderId ?? undefined;
      const file = filesRef.current.find((f) => f.name === name);
      if (!file || file.folderId === next) return;
      setFiles((prev) => prev.map((f) => (f.name === name ? { ...f, folderId: next } : f)));
      persistMembership([file], next);
    },
    [persistMembership],
  );

  // Deliberately not a loop over closeFile. That would run N setActiveName
  // updaters, each re-deriving from filesRef — which lags a render behind, since
  // it syncs in an effect — so the active file would hop across the very files
  // being deleted. Worse, each call read-modify-writes scrollPositions, and N of
  // those in flight together all read the same pre-delete preferences and
  // overwrite one another's deletions.
  //
  // So: one survivor chosen up front, one write of scrollPositions, one storage
  // estimate for the batch.
  const deleteFolderAndFiles = useCallback(
    async (id: string) => {
      // Derived before any updater — StrictMode invokes those twice, and the
      // storage work below must happen exactly once per file.
      const doomedNames = new Set(filesRef.current.filter((f) => f.folderId === id).map((f) => f.name));
      setFolders((prev) => prev.filter((f) => f.id !== id));
      setSelectedFolderId((prev) => (prev === id ? null : prev));
      if (doomedNames.size === 0) return;

      const survivor = filesRef.current.find((f) => !doomedNames.has(f.name))?.name ?? null;
      setFiles((prev) => prev.filter((f) => !doomedNames.has(f.name)));
      setActiveName((prevActive) => (prevActive && doomedNames.has(prevActive) ? survivor : prevActive));
      setUnpersisted((prev) => {
        const rest = { ...prev };
        for (const name of doomedNames) delete rest[name];
        return rest;
      });

      try {
        const { scrollPositions } = await storage.getPreferences();
        if (scrollPositions) {
          const rest = { ...scrollPositions };
          let changed = false;
          for (const name of doomedNames) {
            if (name in rest) {
              delete rest[name];
              changed = true;
            }
          }
          if (changed) await storage.setPreferences({ scrollPositions: rest });
        }
      } catch {
        // Preferences are best-effort; the files still go.
      }

      await Promise.all(
        [...doomedNames].map((name) =>
          storage.removeFile(name).catch((err: unknown) => {
            console.error('Failed to remove file from storage', err);
          }),
        ),
      );
      await refreshStorageEstimate();
    },
    [storage, refreshStorageEstimate],
  );

  const filesInFolder = useCallback(
    (id: string | null) => files.filter((f) => (f.folderId ?? null) === id),
    [files],
  );

  // The handle is read from a ref rather than inside a setFiles updater. React
  // treats updaters as pure and calls them twice under StrictMode, so the old
  // shape fired requestPermission — a user-facing browser prompt — twice per
  // click.
  const grantAccess = useCallback(async (name: string) => {
    const f = filesRef.current.find((x) => x.name === name);
    if (!f?.handle) return;
    const state = await requestHandlePermission(f.handle);
    if (state === 'granted') {
      const content = await rereadHandle(f.handle);
      const stat = await statHandle(f.handle).catch(() => undefined);
      setFiles((cur) =>
        cur.map((x) =>
          x.name === name
            ? {
                ...x,
                perm: 'granted',
                originalContent: content,
                editedContent: content,
                size: stat?.size,
                lastModified: stat?.lastModified,
              }
            : x,
        ),
      );
    } else {
      setFiles((cur) => cur.map((x) => (x.name === name ? { ...x, perm: state } : x)));
    }
  }, []);

  // Names with an edit not yet written to storage, and the timer that will do
  // it. Refs, not state: nothing renders from them, and a re-render per
  // keystroke to track a pending write would be the very cost being avoided.
  const pendingEdits = useRef(new Set<string>());
  const editTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Writes every pending edit now, cancelling the debounce.
   *
   * Reads names from the ref and content from `filesRef` at call time, so a
   * flush always persists the latest text rather than whatever was current when
   * the timer was armed.
   */
  const flushEdits = useCallback(async () => {
    if (editTimer.current) {
      clearTimeout(editTimer.current);
      editTimer.current = null;
    }
    const names = Array.from(pendingEdits.current);
    pendingEdits.current.clear();
    for (const name of names) {
      const f = filesRef.current.find((x) => x.name === name);
      if (f) await persistFile(f);
    }
  }, [persistFile]);

  const editContent = useCallback(
    (name: string, content: string) => {
      setFiles((prev) => prev.map((f) => (f.name === name ? { ...f, editedContent: content } : f)));
      // Debounced rather than written per keystroke: `editContent` fires on
      // every character, and an IndexedDB transaction each time would rewrite
      // the whole record — content included — for one letter.
      pendingEdits.current.add(name);
      if (editTimer.current) clearTimeout(editTimer.current);
      editTimer.current = setTimeout(() => void flushEdits(), EDIT_DEBOUNCE_MS);
    },
    [flushEdits],
  );

  // The safety net for the debounce: a tab hidden, closed, or navigated away
  // from within the window would otherwise lose whatever was typed last.
  //
  // `visibilitychange` rather than `beforeunload`, which mobile browsers may
  // never fire when an app is backgrounded or swiped away — and that is exactly
  // the device this feature exists for. `pagehide` covers the bfcache path that
  // fires no visibility change of its own.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') void flushEdits();
    };
    const onPageHide = () => void flushEdits();
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [flushEdits]);

  const revertContent = useCallback((name: string) => {
    setFiles((prev) =>
      prev.map((f) => (f.name === name ? { ...f, editedContent: f.originalContent } : f)),
    );
  }, []);

  /**
   * Replaces both sides of the content, as though the file had been re-read from
   * its source. For a pull the user asked for: the result is not a local edit,
   * so it must not leave the file dirty and offering to revert to what was just
   * replaced.
   */
  const applyExternalContent = useCallback(
    async (name: string, content: string, sync?: SyncPatch) => {
      const existing = filesRef.current.find((f) => f.name === name);
      if (!existing) return;
      const next: LibraryFile = { ...existing, originalContent: content, editedContent: content };
      setFiles((prev) => prev.map((f) => (f.name === name ? next : f)));
      // The edits this replaces are gone, so a debounced write still holding
      // them must not fire afterwards and put them back.
      pendingEdits.current.delete(name);
      await persistFile(next, sync);
    },
    [persistFile],
  );

  /**
   * Adds a document that arrived from a remote copy rather than from disk.
   *
   * `snapshot` because there is no handle and never will be: the file has no
   * local origin, so nothing can re-read it or write back to it. That is the
   * same shape a drag-and-dropped file takes, and it is what makes the whole
   * laptop → gist → phone path work on browsers with no File System Access API.
   */
  const addRemoteFile = useCallback(
    async (name: string, content: string, activate = true) => {
      const file: LibraryFile = {
        name,
        kind: 'snapshot',
        perm: 'na',
        originalContent: content,
        editedContent: content,
        folderId: selectedFolderRef.current ?? undefined,
      };
      // Derived before the updater: StrictMode invokes updaters twice, and this
      // decides whether an existing entry is replaced or a new one appended.
      const existing = filesRef.current.some((f) => f.name === name);
      setFiles((prev) =>
        existing ? prev.map((f) => (f.name === name ? file : f)) : [...prev, file],
      );
      // Opening a remote file the user tapped should show it. Resolving a
      // conflict with "keep both" should not: the user is reading the file they
      // are resolving, and moving them to a different document mid-decision
      // reads as the app having done something to their work.
      if (activate) setActiveName(name);
      await persistFile(file);
    },
    [persistFile],
  );

  /**
   * A blank document authored in the app rather than opened from anywhere.
   *
   * Everything that decides the outcome — the final name and the folder — is
   * derived before any updater runs. StrictMode invokes updaters twice, and
   * both a name search against current state and a `setActiveName` derived
   * inside one would give different answers on the second pass; the guard in
   * the updater is what makes the repeat a no-op rather than a second row.
   *
   * The seeded H1 is not decoration. Created empty, the file would open into a
   * reader pane reading "…is empty" beside the editor the user was just sent
   * to, and Revert — which returns a file to its source state — would have
   * nothing but blankness to offer for the rest of the file's life.
   */
  const createFile = useCallback(
    async (name: string) => {
      const finalName = uniqueFileName(
        normalizeNewFileName(name),
        filesRef.current.map((f) => f.name),
      );
      const title = finalName.replace(/\.[^.]+$/, '');
      const content = `# ${title}\n\n`;
      const file: LibraryFile = {
        name: finalName,
        kind: 'snapshot',
        perm: 'na',
        originalContent: content,
        editedContent: content,
        // Same rule as an opened file: a new document lands in whichever folder
        // the sidebar has selected, so "select a folder, then add" does what it
        // looks like it does.
        folderId: selectedFolderRef.current ?? undefined,
      };
      setFiles((prev) => (prev.some((f) => f.name === finalName) ? prev : [...prev, file]));
      setActiveName(finalName);
      await persistFile(file);
      return finalName;
    },
    [persistFile],
  );

  const isDirty = useCallback(
    (name: string) => {
      const f = files.find((x) => x.name === name);
      return !!f && f.editedContent !== f.originalContent;
    },
    [files],
  );

  const isUnpersisted = useCallback((name: string) => !!unpersisted[name], [unpersisted]);

  const dismissBanner = useCallback((name: string) => {
    setDismissedBanners((prev) => ({ ...prev, [name]: true }));
  }, []);

  const active = useMemo(() => files.find((f) => f.name === activeName) ?? null, [files, activeName]);

  /**
   * Switching files flushes first. The debounce is keyed by name, so a pending
   * write would still land correctly — but leaving the previous file's edits in
   * a timer means a crash or a close in the next second loses them, and the
   * user has already moved on and would not think to look.
   */
  const selectFile = useCallback(
    (name: string | null) => {
      void flushEdits();
      setActiveName(name);
    },
    [flushEdits],
  );

  const value: LibraryContextValue = {
    files,
    active,
    activeName,
    setActiveName: selectFile,
    openViaPicker,
    openViaInput,
    openViaDrop,
    closeFile,
    clearAll,
    folders,
    selectedFolderId,
    setSelectedFolderId,
    createFolder,
    renameFolder,
    ungroupFolder,
    deleteFolderAndFiles,
    moveFileToFolder,
    reconcileFolder,
    filesInFolder,
    grantAccess,
    editContent,
    revertContent,
    applyExternalContent,
    addRemoteFile,
    createFile,
    flushEdits,
    isDirty,
    isUnpersisted,
    dismissedBanners,
    dismissBanner,
    collisions,
    unreadable,
    dismissCollisions,
    storageUsedBytes,
    storageQuotaBytes,
    fsAccessSupported: supportsFileSystemAccess(),
  };

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary(): LibraryContextValue {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error('useLibrary must be used within a LibraryProvider');
  return ctx;
}
