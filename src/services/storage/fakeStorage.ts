import type {
  StorageEstimate,
  StorageService,
  StoredAuth,
  StoredFileRecord,
  StoredPreferences,
} from './types';
import { MAX_STORAGE_BYTES, StorageQuotaExceededError } from './types';

export interface FakeStorageOptions {
  /**
   * Override the storage ceiling in bytes. Defaults to the real app cap, so a
   * test that does not care about quota behaves like production.
   */
  quotaBytes?: number;
}

// Matches the idb adapter's accounting: UTF-8 bytes, not UTF-16 code units.
const encoder = new TextEncoder();
const contentBytes = (content: string): number => encoder.encode(content).length;

// In-memory StorageService for unit tests — no idb/browser dependency.
export function createFakeStorageService(options: FakeStorageOptions = {}): StorageService {
  const files = new Map<string, StoredFileRecord>();
  let preferences: StoredPreferences = {};
  let auth: StoredAuth | undefined;
  const quotaBytes = options.quotaBytes ?? MAX_STORAGE_BYTES;

  function usedBytes(): number {
    let total = 0;
    for (const f of files.values()) total += contentBytes(f.content);
    return total;
  }

  return {
    async saveFile(record) {
      const existing = files.get(record.name);
      const delta = contentBytes(record.content) - (existing ? contentBytes(existing.content) : 0);
      if (usedBytes() + delta > quotaBytes) throw new StorageQuotaExceededError();
      files.set(record.name, record);
    },

    async listFiles() {
      return Array.from(files.values());
    },

    async getFile(name) {
      return files.get(name);
    },

    async removeFile(name) {
      files.delete(name);
    },

    // Mirrors the idb adapter: `auth` deliberately survives, so a test that
    // clears the library and then expects the user to still be signed in is
    // exercising the real behaviour.
    async clearAll() {
      files.clear();
      preferences = {};
    },

    async patchSync(name, patch) {
      const existing = files.get(name);
      // No-op when the file is gone, matching idb: a file closed mid-request
      // must not be resurrected as a content-less husk.
      if (!existing) return;
      files.set(name, { ...existing, ...patch });
    },

    async setFolder(name, folderId) {
      const existing = files.get(name);
      if (!existing) return;
      files.set(name, { ...existing, folderId });
    },

    async estimate(): Promise<StorageEstimate> {
      return { usedBytes: usedBytes(), quotaBytes };
    },

    async getPreferences() {
      return preferences;
    },

    async setPreferences(patch) {
      preferences = { ...preferences, ...patch };
    },

    async getAuth() {
      return auth;
    },

    async setAuth(next) {
      auth = next;
    },

    async clearAuth() {
      auth = undefined;
    },
  };
}
