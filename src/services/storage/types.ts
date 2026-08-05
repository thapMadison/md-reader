// A user-created grouping in the sidebar. Purely virtual — it has nothing to do
// with directories on disk, which the app cannot see: the File System Access API
// exposes no path, only a basename (see the collision note in LibraryContext).
//
// Defined here rather than in features/library because the dependency direction
// is one-way — features consume services, never the reverse — and StoredFileRecord
// below needs to reference the membership. features/library/types.ts re-exports it,
// mirroring how LibraryFile imports FilePermission from services/filesystem.
export interface Folder {
  /** Stable opaque id. Never the name: folders can be renamed and duplicated. */
  id: string;
  name: string;
  /** Sort key for sidebar order. A monotonic counter, not an array index. */
  order: number;
}

export interface StoredFileRecord {
  name: string;
  content: string;
  kind: 'live' | 'snapshot';
  /** Serialized FileSystemFileHandle, present only for kind: 'live'. */
  handle?: FileSystemFileHandle;
  savedAt: number;
  /**
   * Virtual-folder membership. Absent for ungrouped files, which is why it is
   * optional rather than `string | null`: records written before folders existed
   * read back as `undefined`, which already means "ungrouped". That is what makes
   * this a schemaless addition needing no DB_VERSION bump or migration.
   */
  folderId?: string;
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
  folders?: Folder[];
  /** Folder ids the user has collapsed in the sidebar. */
  collapsedFolders?: string[];
  /** Folder that newly opened files land in, or null for the ungrouped list. */
  selectedFolderId?: string | null;
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
