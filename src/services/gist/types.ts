/**
 * Largest file the app will sync, in UTF-8 bytes.
 *
 * This is an API threshold, not a storage budget — Gist imposes no total quota
 * at all. Below 1MB, `GET /gists/{id}` returns the full `content` in one
 * request. Above it, GitHub sets `truncated: true` and returns a *clipped*
 * string that must be re-fetched from `raw_url`; a gist as a whole may reach
 * 10MB, but crossing 1MB on any single file opens that second path.
 *
 * Held at 1MB rather than 10MB for two reasons that bind before Gist's own
 * limit does. The app already caps the whole library at 100MB
 * (`storage/types.ts`), so 10MB files would let ten documents fill it and make
 * the storage meter meaningless. And the phone is the device this feature
 * exists for: react-markdown parsing a 10MB document locks the tab. The reader
 * gives out well before the API does.
 *
 * A file over this limit still opens and reads normally — IndexedDB does not
 * care. It simply cannot be sync-enabled.
 */
export const MAX_SYNC_FILE_BYTES = 1024 * 1024;

export class FileTooLargeToSyncError extends Error {
  // Declared and assigned separately rather than as constructor parameter
  // properties: `erasableSyntaxOnly` rejects those, since they emit runtime
  // code that cannot be stripped by a type-only transform.
  readonly bytes: number;
  readonly limit: number;

  constructor(bytes: number, limit: number = MAX_SYNC_FILE_BYTES) {
    super(`File is ${bytes} bytes, over the ${limit} byte sync limit`);
    this.name = 'FileTooLargeToSyncError';
    this.bytes = bytes;
    this.limit = limit;
  }
}

/**
 * A gist file whose content GitHub clipped. Never treated as content: writing a
 * clipped document into IndexedDB over the user's full copy is silent data
 * loss, and it would then be pushed back as the new truth on the next sync.
 */
export class GistTruncatedError extends Error {
  readonly gistId: string;

  constructor(gistId: string) {
    super(`Gist ${gistId} content was truncated by GitHub`);
    this.name = 'GistTruncatedError';
    this.gistId = gistId;
  }
}

/** The stored token was rejected — revoked on github.com, or scope removed. */
export class GistAuthError extends Error {
  constructor(message = 'GitHub rejected the credentials') {
    super(message);
    this.name = 'GistAuthError';
  }
}

export class GistApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'GistApiError';
    this.status = status;
  }
}

/** Identity of the signed-in account, for display. */
export interface GistUser {
  login: string;
  avatarUrl?: string;
}

/**
 * What `GET /gists` returns: one entry per gist, with **no file content**.
 *
 * That absence is the reason this app fits Gist. The library list can be built
 * from one request no matter how many documents it holds, and a document's
 * bytes cross the network only when the user opens it — which on a phone over
 * mobile data is the difference between a usable reader and an unusable one.
 */
export interface GistMeta {
  id: string;
  /** Name of the markdown file inside the gist. Usually, but not always, the app's file name. */
  fileName: string;
  description: string;
  /** GitHub's clock. Never compare this against a local timestamp — see remoteUpdatedAt. */
  updatedAt: number;
  /** Size in bytes as GitHub reports it, before any content is fetched. */
  size: number;
  htmlUrl: string;
  public: boolean;
}

/**
 * The app's own metadata, carried in the gist's description.
 *
 * A gist is a flat bag of files with no room for library-wide structure, and
 * each document gets its own gist — so anything the library knows about a file
 * that GitHub does not has to travel with that file. Riding along in the same
 * `PATCH` as the content is what makes it impossible for the two to disagree:
 * there is no second write to fail on its own, and no second conflict engine.
 *
 * It used to travel as a second file, `.mdreader.json`, and that was the wrong
 * place for a reason that has nothing to do with correctness: **gist.github.com
 * titles a gist after its alphabetically first file**, and a leading dot sorts
 * before every letter. So a grouped `README.md` appeared in the user's gist list
 * as ".mdreader.json" — their document, filed under the name of the app's
 * bookkeeping. The library said the file was synced and GitHub appeared to
 * disagree, which is the one thing a backup feature must never do.
 *
 * The description has no such ordering role, holds no bytes the reader pays
 * for, and leaves each gist holding exactly one file: the document.
 *
 * Both fields, not just the id. `folderId` comes from `crypto.randomUUID()` on
 * whichever device first made the folder, so a fresh device has never seen it
 * and can only match on the name — while a device that *has* seen it must
 * ignore a renamed folder's new name and stay bound by id.
 */
export interface GistFolderTag {
  /** Folder the file belongs to, or absent when it is ungrouped. */
  folderId?: string;
  /** The folder's name as of the last push, for devices that do not know the id. */
  folderName?: string;
}

/** A gist with its content resolved. */
export interface GistContent extends GistMeta {
  content: string;
  /** Absent when the description carries no folder tag — an ungrouped file, or a gist made by hand. */
  folder?: GistFolderTag;
}

/**
 * Reads and writes gists. One implementation over `api.github.com`, one fake
 * for tests.
 *
 * Every call here goes straight to `api.github.com`, which sends
 * `Access-Control-Allow-Origin: *`. The Cloudflare Worker is **only** for the
 * token exchange and must never appear on this path.
 */
export interface GistService {
  /** The account behind the token. Also the cheapest way to verify a token still works. */
  getUser(): Promise<GistUser>;

  /**
   * Every gist owned by the user, metadata only.
   *
   * Paginates internally: GitHub returns 30 per page, and a user with more
   * documents than that would otherwise see their library silently cut off at
   * an arbitrary line.
   */
  listGists(): Promise<GistMeta[]>;

  /** One gist with content. Throws GistTruncatedError rather than returning a clipped body. */
  getGist(id: string): Promise<GistContent>;

  /**
   * Creates a secret gist. Throws FileTooLargeToSyncError above the size cap.
   *
   * The description is composed by the implementation from the file name and
   * `folder`, so callers pass the parts and never the finished string — the
   * folder tag lives in that same field, and a caller-supplied description
   * would have to overwrite it.
   */
  createGist(input: { fileName: string; content: string; folder?: GistFolderTag }): Promise<GistMeta>;

  /**
   * Replaces a gist's content. Bound by id, never by name — see the collision
   * note in SyncContext.
   *
   * `folder` travels in the same request as the content, so the two can never
   * describe different versions of the file. The description is rewritten
   * whole on every push, so omitting the field is what clears a stale tag —
   * which is exactly what a file leaving its folder needs.
   */
  updateGist(id: string, input: { fileName: string; content: string; folder?: GistFolderTag }): Promise<GistMeta>;

  deleteGist(id: string): Promise<void>;
}
