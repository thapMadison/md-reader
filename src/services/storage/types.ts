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
  /** The file as last read from its source. Never the user's unsaved edits. */
  content: string;
  /**
   * Unsaved edits, absent when the file is clean. Kept apart from `content` so
   * the editor's revert control still has the original to go back to, and so
   * "is this dirty?" survives a reload instead of the edits being lost.
   */
  editedContent?: string;
  /**
   * When `content` last actually changed, on the local clock.
   *
   * Distinct from `savedAt`, which is rewritten by every persist — including
   * the hydration write-back — and so means "last touched", not "last
   * different". Only the second question is answerable about versions.
   */
  contentUpdatedAt?: number;
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

  // ---- Sync. All optional, all schemaless additions like folderId above. ----

  /**
   * Whether this file opts in to gist sync. Per-file, never library-wide: a file
   * with this absent behaves exactly as it did before sync existed.
   *
   * Independent of `gistId`: false with an id set means sync was turned off on a
   * file that still has a gist behind it.
   */
  syncEnabled?: boolean;

  /**
   * The gist backing this file. **The only binding between the two.**
   *
   * Never match a local file to a gist by name. Files are keyed by bare
   * basename, so two different `README.md` files already collide inside one
   * library; across devices, name-matching would let one machine's README
   * overwrite another's. A file with no `gistId` always creates a new gist —
   * a duplicate gist is recoverable, an overwrite is not.
   *
   * Which is why turning sync off keeps this: clearing it would make the next
   * enable create a second gist, and since nothing deletes the first, a toggle
   * flicked a few times would leave orphans across the account. Only an actual
   * delete of the gist clears the id.
   */
  gistId?: string;

  /** Usually equal to `name`, but a rename on github.com makes them diverge. */
  gistFileName?: string;

  /**
   * GitHub's `updated_at` for the gist, as a watermark of the remote state
   * already reconciled — **not** a local clock. Never compare it to `savedAt`
   * or any other local timestamp: they come from different machines, and a few
   * minutes of clock skew would silently pick the wrong side.
   */
  remoteUpdatedAt?: number;

  /**
   * Hash of the content as last synced, which makes "has this changed locally?"
   * a fact rather than a guess about timestamps. Without it, re-saving a file
   * with identical text would look like a local edit and prompt a needless push.
   */
  syncedContentHash?: string;
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

/**
 * The GitHub credential, in its own object store.
 *
 * Deliberately not in preferences: `clearAll()` wipes that store, so the
 * sidebar's "Clear all" button would silently sign the user out along with
 * deleting their files.
 *
 * Readable by any XSS on the page. The token is scoped to `gist` alone, so a
 * leak cannot reach repositories, and `pipeline/sanitize.ts` is what stands
 * between untrusted markdown and this value.
 */
export interface StoredAuth {
  accessToken: string;
  /** Space-separated scopes GitHub actually granted, which may differ from those asked for. */
  scope: string;
  login: string;
  avatarUrl?: string;
}

/**
 * Fields a sync pass may write. Deliberately a narrow subset: the sync layer
 * must never be able to touch `content`, `editedContent`, or `folderId`, which
 * belong to the library and the user's typing.
 */
export type SyncPatch = Pick<
  StoredFileRecord,
  'syncEnabled' | 'gistId' | 'gistFileName' | 'remoteUpdatedAt' | 'syncedContentHash'
>;

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

  /**
   * Merges sync fields into an existing record, leaving every other field alone.
   *
   * A read-modify-write from the sync layer would not do. `saveFile` takes a
   * whole record, and both `persistFile` and the hydration write-back rebuild
   * theirs from live component state — so a sync write interleaving with a
   * keystroke would carry a stale `editedContent` back over the current one.
   * This runs inside a single transaction and touches only the sync fields.
   *
   * No-ops when the record is gone, which is what a file closed mid-request
   * looks like. Recreating it would resurrect a file the user just removed.
   */
  patchSync(name: string, patch: SyncPatch): Promise<void>;

  /**
   * Sets a file's folder without touching anything else in the record.
   *
   * A whole-record `saveFile` would do the job, and did until a pull started
   * moving files: the record it writes is rebuilt from live component state,
   * and `filesRef` lags a render behind `setFiles`. A move landing right after
   * a pull therefore carried the *pre-pull* content and put it back over what
   * had just been fetched.
   *
   * `undefined` means ungrouped, matching the field itself.
   *
   * No-ops when the record is gone, for the same reason as patchSync.
   */
  setFolder(name: string, folderId: string | undefined): Promise<void>;

  getPreferences(): Promise<StoredPreferences>;
  setPreferences(patch: Partial<StoredPreferences>): Promise<void>;

  /**
   * The stored GitHub credential. Its own store, so `clearAll()` leaves it
   * intact — clearing the library must not also sign the user out.
   */
  getAuth(): Promise<StoredAuth | undefined>;
  setAuth(auth: StoredAuth): Promise<void>;
  clearAuth(): Promise<void>;
}
