import {
  FileTooLargeToSyncError,
  GistApiError,
  GistTruncatedError,
  MAX_SYNC_FILE_BYTES,
  type GistContent,
  type GistFolderTag,
  type GistMeta,
  type GistService,
  type GistUser,
} from './types';

const encoder = new TextEncoder();

export interface FakeGistOptions {
  user?: GistUser;
  /** Seed gists, as if another device had already pushed them. */
  seed?: {
    id: string;
    fileName: string;
    content: string;
    updatedAt?: number;
    /** Folder metadata the other device tagged the description with. */
    folder?: GistFolderTag;
  }[];
}

export interface FakeGistService extends GistService {
  /** Every call made, in order — for asserting that a push happened exactly once. */
  readonly __calls: string[];
  /**
   * Changes a gist behind the app's back, standing in for an edit made on
   * github.com or from another device. The conflict path cannot be reached
   * without it, since nothing the app itself does moves the remote copy
   * independently.
   */
  __mutateRemote(id: string, content: string): void;
  /** Marks a gist as one GitHub will clip, so the truncation path can be exercised. */
  __truncate(id: string): void;
  /** Makes the next call of the given name reject, for error-path tests. */
  __failNext(call: string, error: Error): void;
  /**
   * Holds every `listGists` open until the returned function is called, so a
   * test can observe the app during the window where it is signed in but has
   * not heard back yet.
   *
   * That window is not reachable with `__failNext`: a rejection sets an error,
   * and an error outranks every other state — the test would then be watching
   * the error path and pass no matter what the code under it does. Distinct
   * from a delay, because an unresolved promise cannot race the assertion.
   */
  __holdListings(): () => void;
  /**
   * The folder metadata currently stored on a gist, read without going through
   * `getGist` — which would record a call and disturb the `__calls` assertions
   * that are the point of the tests asking this question.
   */
  __folderOf(id: string): GistFolderTag | undefined;
}

/**
 * In-memory GistService. No `fetch`, so tests never depend on network shape.
 *
 * What it cannot tell you: whether the real API is reachable from a browser.
 * A CORS rejection surfaces as `TypeError: Failed to fetch` with no status, and
 * every test here passes regardless. Only the manual smoke test covers that.
 */
export function createFakeGistService(options: FakeGistOptions = {}): FakeGistService {
  interface Entry {
    meta: GistMeta;
    content: string;
    truncated: boolean;
    folder?: GistFolderTag;
  }

  const gists = new Map<string, Entry>();
  const calls: string[] = [];
  const failures = new Map<string, Error>();
  /** Set while `__holdListings` is in force; every listing awaits it. */
  let listingGate: Promise<void> | undefined;
  let nextId = 1;
  // Advances by a fixed step per write so ordering is deterministic. Date.now()
  // would let two writes in the same millisecond compare equal, which is
  // exactly the ambiguity the sync comparison must not be built on.
  let clock = 1_700_000_000_000;

  const user: GistUser = options.user ?? { login: 'testuser' };

  function makeMeta(
    id: string,
    fileName: string,
    content: string,
    updatedAt: number,
    folder?: GistFolderTag,
  ): GistMeta {
    return {
      id,
      fileName,
      // The same shape `githubGist` writes, spelled out again rather than
      // imported: this stands in for what GitHub stored, and a fake that got
      // its idea of the format from the code under test could not disagree
      // with it — which is the disagreement the round-trip tests exist to find.
      description: `[mdreader] ${fileName}${folder ? ` ${JSON.stringify(folder)}` : ''}`,
      updatedAt,
      size: encoder.encode(content).length,
      htmlUrl: `https://gist.github.com/${user.login}/${id}`,
      public: false,
    };
  }

  for (const s of options.seed ?? []) {
    clock += 1000;
    gists.set(s.id, {
      meta: makeMeta(s.id, s.fileName, s.content, s.updatedAt ?? clock, s.folder),
      content: s.content,
      truncated: false,
      folder: s.folder,
    });
  }

  function record(name: string) {
    calls.push(name);
    const err = failures.get(name);
    if (err) {
      failures.delete(name);
      throw err;
    }
  }

  function assertSyncable(content: string) {
    const bytes = encoder.encode(content).length;
    if (bytes > MAX_SYNC_FILE_BYTES) throw new FileTooLargeToSyncError(bytes);
  }

  return {
    get __calls() {
      return calls;
    },

    __mutateRemote(id, content) {
      const entry = gists.get(id);
      if (!entry) throw new Error(`no such gist: ${id}`);
      clock += 1000;
      entry.content = content;
      entry.meta = makeMeta(id, entry.meta.fileName, content, clock, entry.folder);
    },

    __truncate(id) {
      const entry = gists.get(id);
      if (!entry) throw new Error(`no such gist: ${id}`);
      entry.truncated = true;
    },

    __failNext(call, error) {
      failures.set(call, error);
    },

    __holdListings() {
      let release = () => {};
      // Held for every listing, not just the next one: StrictMode double-mounts
      // the effect that fetches, so releasing after one would let the second
      // through and close the window the test is trying to stand in.
      listingGate = new Promise<void>((resolve) => {
        release = resolve;
      });
      return () => {
        listingGate = undefined;
        release();
      };
    },

    __folderOf(id) {
      return gists.get(id)?.folder;
    },

    async getUser() {
      record('getUser');
      return user;
    },

    async listGists() {
      record('listGists');
      if (listingGate) await listingGate;
      // Metadata only — content is deliberately not returned, mirroring the
      // real API. A fake that leaked content here would let a lazy-loading bug
      // pass unnoticed.
      return [...gists.values()].map((e) => e.meta);
    },

    async getGist(id): Promise<GistContent> {
      record('getGist');
      const entry = gists.get(id);
      if (!entry) throw new GistApiError(404, 'Not Found');
      if (entry.truncated) throw new GistTruncatedError(id);
      return { ...entry.meta, content: entry.content, folder: entry.folder };
    },

    async createGist({ fileName, content, folder }) {
      record('createGist');
      assertSyncable(content);
      const id = `gist-${nextId++}`;
      clock += 1000;
      const meta = makeMeta(id, fileName, content, clock, folder);
      gists.set(id, { meta, content, truncated: false, folder });
      return meta;
    },

    async updateGist(id, { fileName, content, folder }) {
      record('updateGist');
      assertSyncable(content);
      const entry = gists.get(id);
      if (!entry) throw new GistApiError(404, 'Not Found');
      clock += 1000;
      // The description is replaced wholesale, as a PATCH that sends one does.
      // So an absent `folder` clears the old tag rather than preserving it —
      // which is how a file leaving its folder reaches the other devices, and a
      // fake that treated absent as "no change" would hide a stranded folder.
      const meta = makeMeta(id, fileName, content, clock, folder);
      gists.set(id, { meta, content, truncated: false, folder });
      return meta;
    },

    async deleteGist(id) {
      record('deleteGist');
      if (!gists.delete(id)) throw new GistApiError(404, 'Not Found');
    },
  };
}
