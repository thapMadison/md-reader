import type {
  StorageEstimate,
  StorageService,
  StoredFileRecord,
  StoredPreferences,
} from './types';
import { StorageQuotaExceededError } from './types';

export interface FakeStorageOptions {
  /** Simulate a quota ceiling in bytes; writes past it throw QuotaExceededError. */
  quotaBytes?: number;
}

// In-memory StorageService for unit tests — no idb/browser dependency.
export function createFakeStorageService(options: FakeStorageOptions = {}): StorageService {
  const files = new Map<string, StoredFileRecord>();
  let preferences: StoredPreferences = {};
  const quotaBytes = options.quotaBytes ?? Infinity;

  function usedBytes(): number {
    let total = 0;
    for (const f of files.values()) total += f.content.length;
    return total;
  }

  return {
    async saveFile(record) {
      const existing = files.get(record.name);
      const delta = record.content.length - (existing?.content.length ?? 0);
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

    async clearAll() {
      files.clear();
      preferences = {};
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
  };
}
