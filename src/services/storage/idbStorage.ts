import { openDB, type IDBPDatabase } from 'idb';
import type {
  StorageEstimate,
  StorageService,
  StoredFileRecord,
  StoredPreferences,
} from './types';
import { MAX_STORAGE_BYTES, StorageQuotaExceededError } from './types';

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

// Encoded size of the record's payload. `content.length` counts UTF-16 code
// units, which undercounts every non-ASCII character — a CJK or emoji-heavy
// document can be three to four times larger on disk than its length suggests.
// TextEncoder gives the actual UTF-8 byte count that IndexedDB will store.
const encoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;

function recordBytes(record: StoredFileRecord): number {
  return encoder ? encoder.encode(record.content).length : record.content.length;
}

function totalBytes(records: StoredFileRecord[]): number {
  let total = 0;
  for (const r of records) total += recordBytes(r);
  return total;
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
      const incoming = recordBytes(record);
      // A single file larger than the whole budget can never fit, whatever else
      // is stored. Checked up front so the caller gets the typed error without
      // opening a transaction that is guaranteed to abort.
      if (incoming > MAX_STORAGE_BYTES) throw new StorageQuotaExceededError();
      try {
        // The usage read and the write share one readwrite transaction. Split
        // across two, concurrent saves could each read the same pre-write total,
        // both conclude they fit, and land the library over the cap.
        const tx = db.transaction(FILES_STORE, 'readwrite');
        const store = tx.objectStore(FILES_STORE);
        const existing = (await store.get(record.name)) as StoredFileRecord | undefined;
        const all = (await store.getAll()) as StoredFileRecord[];
        // Overwriting a name replaces its bytes rather than adding to them, so
        // the delta — not the raw size — is what has to fit in the headroom.
        const projected = totalBytes(all) - (existing ? recordBytes(existing) : 0) + incoming;
        if (projected > MAX_STORAGE_BYTES) {
          // Abort explicitly: returning early would let the transaction commit
          // on its own with no write, which is harmless, but aborting keeps the
          // rejection path identical to a real write failure.
          tx.abort();
          throw new StorageQuotaExceededError();
        }
        await store.put(record);
        await tx.done;
      } catch (err) {
        if (err instanceof StorageQuotaExceededError) throw err;
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

    // Reports against the app's own cap, not navigator.storage.estimate(). That
    // API measures the whole origin (caches, service worker, other stores),
    // pads its numbers for privacy, and reports a quota in the gigabytes — so
    // the meter it drove could sit near zero while a save was being rejected.
    // Summing the records is the figure the cap is actually enforced against.
    async estimate(): Promise<StorageEstimate> {
      const db = await dbPromise;
      const all = (await db.getAll(FILES_STORE)) as StoredFileRecord[];
      return { usedBytes: totalBytes(all), quotaBytes: MAX_STORAGE_BYTES };
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
