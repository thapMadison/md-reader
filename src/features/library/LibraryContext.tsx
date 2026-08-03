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
import {
  pickFilesLive,
  readFileListAsSnapshots,
  readDroppedFiles,
  queryHandlePermission,
  requestHandlePermission,
  rereadHandle,
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
  dismissedBanners: Record<string, boolean>;
  dismissBanner: (name: string) => void;
  storageUsedBytes: number;
  storageQuotaBytes: number;
  fsAccessSupported: boolean;
}

const LibraryContext = createContext<LibraryContextValue | null>(null);
const FALLBACK_QUOTA_BYTES = 60 * 1024 * 1024;

export function LibraryProvider({ children }: { children: ReactNode }) {
  const storage = useStorage();
  const [files, setFiles] = useState<LibraryFile[]>([]);
  const [activeName, setActiveName] = useState<string | null>(null);
  const [dismissedBanners, setDismissedBanners] = useState<Record<string, boolean>>({});
  const [storageUsedBytes, setStorageUsedBytes] = useState(0);
  const [storageQuotaBytes, setStorageQuotaBytes] = useState(FALLBACK_QUOTA_BYTES);
  const hydrated = useRef(false);

  const refreshStorageEstimate = useCallback(async () => {
    const est = await storage.estimate();
    setStorageUsedBytes(est.usedBytes);
    setStorageQuotaBytes(est.quotaBytes || FALLBACK_QUOTA_BYTES);
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
        restored.push({
          name: r.name,
          kind: r.kind,
          perm,
          originalContent: r.content,
          editedContent: r.content,
          handle: r.handle,
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
      if (prefs.activeFile && restored.some((f) => f.name === prefs.activeFile)) {
        setActiveName(prefs.activeFile);
      } else if (restored.length > 0) {
        setActiveName(restored[0].name);
      }
      await refreshStorageEstimate();
      hydrated.current = true;
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    storage.setPreferences({ activeFile: activeName }).catch(() => {});
  }, [activeName, storage]);

  const persistFile = useCallback(
    async (f: LibraryFile) => {
      await storage.saveFile({
        name: f.name,
        content: f.originalContent,
        kind: f.kind,
        handle: f.handle,
        savedAt: Date.now(),
      });
      await refreshStorageEstimate();
    },
    [storage, refreshStorageEstimate],
  );

  const addOpenedFiles = useCallback(
    async (opened: OpenedFile[]) => {
      if (opened.length === 0) return;
      setFiles((prev) => {
        const byName = new Map(prev.map((f) => [f.name, f]));
        for (const o of opened) {
          byName.set(o.name, {
            name: o.name,
            kind: o.kind,
            perm: o.perm,
            originalContent: o.content,
            editedContent: o.content,
            handle: o.handle,
          });
        }
        return Array.from(byName.values());
      });
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

  const openViaInput = useCallback(
    async (fileList: FileList) => {
      const opened = await readFileListAsSnapshots(fileList);
      await addOpenedFiles(opened.map((o) => ({ ...o, kind: 'live' as const, perm: 'granted' as const })));
    },
    [addOpenedFiles],
  );

  const openViaDrop = useCallback(
    async (dataTransfer: DataTransfer) => {
      const opened = await readDroppedFiles(dataTransfer);
      await addOpenedFiles(opened);
    },
    [addOpenedFiles],
  );

  const closeFile = useCallback(
    (name: string) => {
      setFiles((prev) => {
        const next = prev.filter((f) => f.name !== name);
        setActiveName((prevActive) => (prevActive === name ? (next[0]?.name ?? null) : prevActive));
        return next;
      });
      storage.removeFile(name).then(refreshStorageEstimate).catch(() => {});
    },
    [storage, refreshStorageEstimate],
  );

  const clearAll = useCallback(async () => {
    await storage.clearAll();
    setFiles([]);
    setActiveName(null);
    await refreshStorageEstimate();
  }, [storage, refreshStorageEstimate]);

  const grantAccess = useCallback(async (name: string) => {
    setFiles((prev) => {
      const f = prev.find((x) => x.name === name);
      if (f?.handle) {
        requestHandlePermission(f.handle).then(async (state) => {
          if (state === 'granted') {
            const content = await rereadHandle(f.handle!);
            setFiles((cur) =>
              cur.map((x) =>
                x.name === name ? { ...x, perm: 'granted', originalContent: content, editedContent: content } : x,
              ),
            );
          } else {
            setFiles((cur) => (cur.some((x) => x.name === name) ? cur.map((x) => (x.name === name ? { ...x, perm: state } : x)) : cur));
          }
        });
      }
      return prev;
    });
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
    dismissedBanners,
    dismissBanner,
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
