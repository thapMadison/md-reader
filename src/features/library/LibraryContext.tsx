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
import type { LibraryFile } from './types';

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
  grantAccess: (name: string) => Promise<void>;
  editContent: (name: string, content: string) => void;
  revertContent: (name: string) => void;
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

const LibraryContext = createContext<LibraryContextValue | null>(null);

export function LibraryProvider({ children }: { children: ReactNode }) {
  const storage = useStorage();
  const [files, setFiles] = useState<LibraryFile[]>([]);
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
          editedContent: content,
          handle: r.handle,
          size: stat?.size,
          lastModified: stat?.lastModified,
        });
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

  // A file that cannot be persisted is still usable in this session — it just
  // will not survive a reload. That distinction is worth surfacing: previously
  // the quota rejection propagated out of an un-awaited caller and the file
  // silently vanished on the next visit with no warning at any point.
  const persistFile = useCallback(
    async (f: LibraryFile) => {
      try {
        await storage.saveFile({
          name: f.name,
          content: f.originalContent,
          kind: f.kind,
          handle: f.handle,
          savedAt: Date.now(),
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
    setActiveName(null);
    await refreshStorageEstimate();
  }, [storage, refreshStorageEstimate]);

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

  const editContent = useCallback((name: string, content: string) => {
    setFiles((prev) => prev.map((f) => (f.name === name ? { ...f, editedContent: content } : f)));
  }, []);

  const revertContent = useCallback((name: string) => {
    setFiles((prev) =>
      prev.map((f) => (f.name === name ? { ...f, editedContent: f.originalContent } : f)),
    );
  }, []);

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

  const value: LibraryContextValue = {
    files,
    active,
    activeName,
    setActiveName,
    openViaPicker,
    openViaInput,
    openViaDrop,
    closeFile,
    clearAll,
    grantAccess,
    editContent,
    revertContent,
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
