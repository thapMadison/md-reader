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
  activeFile?: string | null;
  scrollPositions?: Record<string, number>;
}

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
