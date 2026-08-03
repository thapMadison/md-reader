import { openDB, type IDBPDatabase } from 'idb';
import type { StorageEstimate, StorageService, StoredPreferences } from './types';
import { StorageQuotaExceededError } from './types';

const DB_NAME = 'mdreader';
const DB_VERSION = 1;
const FILES_STORE = 'files';
const PREFS_STORE = 'preferences';
const PREFS_KEY = 'preferences';

function openMdReaderDb(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(FILES_STORE)) {
        db.createObjectStore(FILES_STORE, { keyPath: 'name' });
      }
      if (!db.objectStoreNames.contains(PREFS_STORE)) {
        db.createObjectStore(PREFS_STORE);
      }
    },
  });
}

function isQuotaError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'QuotaExceededError';
}

export function createIdbStorageService(): StorageService {
  const dbPromise = openMdReaderDb();

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
