import { openDB, type IDBPDatabase } from 'idb';
import type { StorageEstimate, StorageService, StoredPreferences } from './types';
import { StorageQuotaExceededError } from './types';

const DB_NAME = 'mdreader';
const DB_VERSION = 1;
const FILES_STORE = 'files';
const PREFS_STORE = 'preferences';
const PREFS_KEY = 'preferences';

// How long to wait for the database to open before giving up.
//
// `openDB` has no timeout of its own, and two of its outcomes never settle the
// promise: an upgrade blocked by another tab holding an old version open, and
// an environment where indexedDB.open simply never fires an event (Firefox
// private windows, some embedded webviews). Without a bound, every storage call
// awaiting `dbPromise` stays pending forever — the app shows an empty library
// and no error, because a promise that never rejects has nothing to catch.
const OPEN_TIMEOUT_MS = 5000;

export class StorageUnavailableError extends Error {
  constructor(cause?: unknown) {
    super('Storage is unavailable');
    this.name = 'StorageUnavailableError';
    this.cause = cause;
  }
}

function openMdReaderDb(): Promise<IDBPDatabase> {
  // Checks the value, not just the binding: `globalThis.indexedDB` exists but is
  // null/undefined in some embedded webviews and sandboxed frames, where a bare
  // `typeof` guard would pass and leave the open to hang instead.
  if (typeof globalThis === 'undefined' || !globalThis.indexedDB) {
    return Promise.reject(new StorageUnavailableError('indexedDB is not available'));
  }

  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new StorageUnavailableError('timed out opening database')), OPEN_TIMEOUT_MS);
  });

  const open = openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(FILES_STORE)) {
        db.createObjectStore(FILES_STORE, { keyPath: 'name' });
      }
      if (!db.objectStoreNames.contains(PREFS_STORE)) {
        db.createObjectStore(PREFS_STORE);
      }
    },
    // Another tab is holding the previous version open, so the upgrade cannot
    // proceed. Rejecting turns an indefinite hang into an error the caller can
    // report; the racing timeout would otherwise be the only way out.
    blocked() {
      throw new StorageUnavailableError('another tab is holding an older version of the database open');
    },
  }).catch((err: unknown) => {
    throw err instanceof StorageUnavailableError ? err : new StorageUnavailableError(err);
  });

  return Promise.race([open, timeout]).finally(() => clearTimeout(timer));
}

function isQuotaError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'QuotaExceededError';
}

export function createIdbStorageService(): StorageService {
  const dbPromise = openMdReaderDb();
  // The open can reject before any method awaits it (the service is created at
  // module scope, the first call comes later), which the browser would report
  // as an unhandled rejection. This no-op catch marks it handled; every caller
  // still awaits `dbPromise` itself and sees the real rejection.
  dbPromise.catch(() => {});

  return {
    async saveFile(record) {
      const db = await dbPromise;
      try {
        await db.put(FILES_STORE, record);
      } catch (err) {
        if (isQuotaError(err)) throw new StorageQuotaExceededError();
        throw err;
      }
    },

    async listFiles() {
      const db = await dbPromise;
      return db.getAll(FILES_STORE);
    },

    async getFile(name) {
      const db = await dbPromise;
      return db.get(FILES_STORE, name);
    },

    async removeFile(name) {
      const db = await dbPromise;
      await db.delete(FILES_STORE, name);
    },

    async clearAll() {
      const db = await dbPromise;
      await db.clear(FILES_STORE);
      await db.clear(PREFS_STORE);
    },

    async estimate(): Promise<StorageEstimate> {
      if (typeof navigator !== 'undefined' && navigator.storage?.estimate) {
        const { usage, quota } = await navigator.storage.estimate();
        return { usedBytes: usage ?? 0, quotaBytes: quota ?? 0 };
      }
      return { usedBytes: 0, quotaBytes: 0 };
    },

    async getPreferences(): Promise<StoredPreferences> {
      const db = await dbPromise;
      return (await db.get(PREFS_STORE, PREFS_KEY)) ?? {};
    },

    async setPreferences(patch) {
      const db = await dbPromise;
      const current = (await db.get(PREFS_STORE, PREFS_KEY)) ?? {};
      try {
        await db.put(PREFS_STORE, { ...current, ...patch }, PREFS_KEY);
      } catch (err) {
        if (isQuotaError(err)) throw new StorageQuotaExceededError();
        throw err;
      }
    },
  };
}
