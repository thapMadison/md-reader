export interface StoredFileRecord {
  name: string;
  content: string;
  kind: 'live' | 'snapshot';
  /** Serialized FileSystemFileHandle, present only for kind: 'live'. */
  handle?: FileSystemFileHandle;
  savedAt: number;
}

export interface StoredPreferences {
  themeId?: string;
  customThemes?: { id: string; name: string; mode: 'light' | 'dark'; tokens: Record<string, string> }[];
  sidebarOpen?: boolean;
  fontSize?: number;
  contentWidth?: number;
  lineHeight?: number;
  activeFile?: string | null;
  scrollPositions?: Record<string, number>;
}

// Application-level storage ceiling, independent of whatever the browser
// grants the origin. Browsers typically hand out quotas in the gigabytes and
// only reject a write once the disk is genuinely under pressure — far too late
// to be a useful signal, and the point at which they evict is not ours to
// predict. Capping ourselves keeps the sidebar meter meaningful and makes the
// "this file was not persisted" path reachable and testable.
export const MAX_STORAGE_BYTES = 100 * 1024 * 1024;

export class StorageQuotaExceededError extends Error {
  constructor() {
    super('Storage quota exceeded');
    this.name = 'StorageQuotaExceededError';
  }
}

export interface StorageEstimate {
  usedBytes: number;
  quotaBytes: number;
}

// Storage abstraction every component codes against — one idb-backed
// implementation, one in-memory fake for tests. Never import `idb` directly
// outside services/storage.
export interface StorageService {
  saveFile(record: StoredFileRecord): Promise<void>;
  listFiles(): Promise<StoredFileRecord[]>;
  getFile(name: string): Promise<StoredFileRecord | undefined>;
  removeFile(name: string): Promise<void>;
  clearAll(): Promise<void>;
  estimate(): Promise<StorageEstimate>;

  getPreferences(): Promise<StoredPreferences>;
  setPreferences(patch: Partial<StoredPreferences>): Promise<void>;
}
