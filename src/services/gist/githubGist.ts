import {
  FileTooLargeToSyncError,
  GistApiError,
  GistAuthError,
  GistTruncatedError,
  MAX_SYNC_FILE_BYTES,
  type GistContent,
  type GistFolderTag,
  type GistMeta,
  type GistService,
  type GistUser,
} from './types';

const API = 'https://api.github.com';

// GitHub returns 30 gists per page by default and caps the page size at 100.
// Asking for the maximum keeps a typical library to a single request.
const PER_PAGE = 100;

// A stop against paginating forever if GitHub ever returned a `next` link that
// loops. 50 pages is 5000 gists — far past any plausible library, and small
// enough that the failure is a bounded wait rather than a hung tab.
const MAX_PAGES = 50;

const encoder = new TextEncoder();

/** Marks a gist as belonging to this app, so listGists can ignore unrelated ones. */
const DESCRIPTION_TAG = '[mdreader]';

interface GistFileJson {
  filename: string;
  size: number;
  truncated?: boolean;
  content?: string;
  raw_url: string;
}

interface GistJson {
  id: string;
  description: string | null;
  updated_at: string;
  html_url: string;
  public: boolean;
  files: Record<string, GistFileJson>;
}

/**
 * Picks the file this app cares about out of a gist.
 *
 * A gist can hold several files and the app writes exactly one, so this is the
 * first file in all but one case: a gist that still carries the `.mdreader.json`
 * sidecar an earlier build wrote beside the document. Those are skipped by name.
 * Not for the metadata's sake — nothing reads it any more — but because a
 * leading dot sorts first, so `files[0]` on such a gist is the bookkeeping, and
 * the app would show it as the document and then push it back as one.
 */
function primaryFile(gist: GistJson): GistFileJson | undefined {
  const files = Object.values(gist.files ?? {});
  return files.find((f) => !f.filename.startsWith('.mdreader')) ?? files[0];
}

/**
 * Reads the folder tag out of a gist description.
 *
 * The format is `[mdreader] <file name>` with the tag, if any, appended as
 * compact JSON: `[mdreader] Notes.md {"folderId":"…","folderName":"Work"}`.
 *
 * Found by scanning for the first `{` from which the rest of the string parses,
 * rather than by splitting on a separator — a file name may itself contain a
 * brace, and so may a folder name, and both go into this one field. Each failed
 * candidate just moves to the next `{`, of which a description holds a handful
 * at most.
 *
 * Never throws. The tag is an optimisation — it says which folder a file
 * belongs in — and a description edited by hand on github.com can say anything
 * at all. Failing a read over unparseable grouping metadata would deny the user
 * their document because a label was malformed, so a bad tag is treated exactly
 * like a missing one: the file arrives ungrouped.
 */
function readFolderTag(description: string | null): GistFolderTag | undefined {
  const d = description ?? '';
  for (let i = d.indexOf('{'); i !== -1; i = d.indexOf('{', i + 1)) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(d.slice(i));
    } catch {
      continue;
    }
    // Nothing else `parsed` could be: the slice starts at `{`, so JSON.parse
    // either produced an object or threw. Arrays, null and scalars are the
    // `continue` above, not a case to test for here.
    const { folderId, folderName } = parsed as Record<string, unknown>;
    // Field by field rather than casting the object through: a hand-edited
    // description can hold a number, an array, or anything else where a string
    // belongs, and one of those reaching the library would be a crash far from
    // here with nothing pointing back at this file.
    return {
      ...(typeof folderId === 'string' ? { folderId } : {}),
      ...(typeof folderName === 'string' ? { folderName } : {}),
    };
  }
  return undefined;
}

/**
 * The description as the app writes it, tag and all.
 *
 * Composed here rather than passed in, so there is one place that knows the
 * format and no way for a caller to set a description that silently drops the
 * folder tag out of the same field.
 */
function composeDescription(fileName: string, folder?: GistFolderTag): string {
  const grouped = folder && (folder.folderId !== undefined || folder.folderName !== undefined);
  return `${DESCRIPTION_TAG} ${fileName}${grouped ? ` ${JSON.stringify(folder)}` : ''}`;
}

function toMeta(gist: GistJson, file: GistFileJson): GistMeta {
  return {
    id: gist.id,
    fileName: file.filename,
    description: gist.description ?? '',
    // GitHub sends ISO 8601. Parsed to epoch millis for storage, but still
    // GitHub's clock — only ever compared against another GitHub timestamp.
    updatedAt: Date.parse(gist.updated_at),
    size: file.size,
    htmlUrl: gist.html_url,
    public: gist.public,
  };
}

export function createGithubGistService(token: string): GistService {
  async function api(path: string, init: RequestInit = {}): Promise<Response> {
    const res = await fetch(`${API}${path}`, {
      ...init,
      // Belt and braces on top of GitHub's own `Cache-Control: no-cache`, which
      // already forces the browser to revalidate. Stated here so a proxy or a
      // future change on their side cannot quietly start serving a stale gist
      // list — the app would read an old `updated_at`, conclude nothing had
      // changed, and show an old document under a `synced` pill.
      //
      // Costs nothing: `no-cache` sends the validators rather than skipping
      // them, so an unchanged response is a 304 with no body and no rate-limit
      // charge. `no-store` is the one that would throw the cache away.
      cache: 'no-cache',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        // Pins the response shape. Without it GitHub is free to change defaults
        // under a client that has already shipped.
        'X-GitHub-Api-Version': '2022-11-28',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
      },
    });

    if (res.ok) return res;

    // 401 is a dead token — revoked on github.com, or the app's authorization
    // withdrawn. Separated from other failures because it is the one the UI
    // must react to by signing out rather than by offering a retry.
    if (res.status === 401) throw new GistAuthError();
    // 403 covers both "token lacks the gist scope" and rate limiting; the
    // remaining-requests header is what tells them apart. Worth the distinction:
    // one is permanent and one clears on its own.
    if (res.status === 403 && res.headers.get('X-RateLimit-Remaining') === '0') {
      throw new GistApiError(403, 'GitHub rate limit reached');
    }
    if (res.status === 403) throw new GistAuthError('The token is missing the gist scope');

    const detail = await res
      .json()
      .then((b: { message?: string }) => b.message)
      .catch(() => null);
    throw new GistApiError(res.status, detail ?? `GitHub returned ${res.status}`);
  }

  function assertSyncable(content: string) {
    // UTF-8 bytes, not string length: a CJK document measured by `.length`
    // reads as a third of its real size and would sail past a limit it
    // actually exceeds.
    const bytes = encoder.encode(content).length;
    if (bytes > MAX_SYNC_FILE_BYTES) throw new FileTooLargeToSyncError(bytes);
  }

  function body(
    input: { fileName: string; content: string; folder?: GistFolderTag },
    extra?: Record<string, unknown>,
  ) {
    return JSON.stringify({
      // Rewritten whole on every push, which is what makes leaving a folder
      // expressible at all: an absent tag overwrites the old one rather than
      // reading as "no change" and stranding it.
      description: composeDescription(input.fileName, input.folder),
      files: { [input.fileName]: { content: input.content } },
      ...extra,
    });
  }

  return {
    async getUser(): Promise<GistUser> {
      const res = await api('/user');
      const json = (await res.json()) as { login: string; avatar_url?: string };
      return { login: json.login, avatarUrl: json.avatar_url };
    },

    async listGists(): Promise<GistMeta[]> {
      const out: GistMeta[] = [];
      for (let page = 1; page <= MAX_PAGES; page++) {
        const res = await api(`/gists?per_page=${PER_PAGE}&page=${page}`);
        const json = (await res.json()) as GistJson[];
        for (const g of json) {
          const file = primaryFile(g);
          if (file) out.push(toMeta(g, file));
        }
        // A short page means the last page. Checked against the requested size
        // rather than reading the Link header, which is a parse away and says
        // the same thing here.
        if (json.length < PER_PAGE) break;
      }
      return out;
    },

    async getGist(id: string): Promise<GistContent> {
      const res = await api(`/gists/${id}`);
      const json = (await res.json()) as GistJson;
      const file = primaryFile(json);
      if (!file) throw new GistApiError(404, 'Gist contains no files');

      // Hard failure, never a fallback to the clipped string. GitHub clips at
      // 1MB and sets this flag; storing the clipped text would overwrite the
      // user's complete copy with a partial one, and the next push would send
      // that truncation back as the new truth. Losing the read is recoverable,
      // losing the document is not.
      if (file.truncated || file.content === undefined) throw new GistTruncatedError(id);

      return { ...toMeta(json, file), content: file.content, folder: readFolderTag(json.description) };
    },

    async createGist(input): Promise<GistMeta> {
      assertSyncable(input.content);
      const res = await api('/gists', {
        method: 'POST',
        // Secret, not private — GitHub has no private tier. Unlisted and
        // unsearchable, but readable by anyone who has the URL, with no way to
        // revoke one person's access short of deleting the gist. The UI has to
        // say so plainly, because "secret" reads as "private".
        //
        // Only settable at creation: PATCH ignores `public`, so a gist made
        // public by mistake stays public until it is deleted.
        body: body(input, { public: false }),
      });
      const json = (await res.json()) as GistJson;
      const file = primaryFile(json);
      if (!file) throw new GistApiError(500, 'GitHub created a gist with no files');
      return toMeta(json, file);
    },

    async updateGist(id, input): Promise<GistMeta> {
      assertSyncable(input.content);
      const res = await api(`/gists/${id}`, { method: 'PATCH', body: body(input) });
      const json = (await res.json()) as GistJson;
      const file = primaryFile(json);
      if (!file) throw new GistApiError(500, 'Gist has no files after update');
      return toMeta(json, file);
    },

    async deleteGist(id: string): Promise<void> {
      await api(`/gists/${id}`, { method: 'DELETE' });
    },
  };
}
