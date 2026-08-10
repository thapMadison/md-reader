import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createGithubGistService } from './githubGist';
import {
  FileTooLargeToSyncError,
  GistApiError,
  GistAuthError,
  GistTruncatedError,
  MAX_SYNC_FILE_BYTES,
} from './types';

// `fetch` is stubbed, so none of this proves the API is reachable from a
// browser: a CORS rejection is a `TypeError` with no status, and every test
// here would still pass. What it does pin is the translation layer — which
// failures become which typed errors, and what the app refuses to treat as
// content. See the manual smoke test in workers/gist-auth/README.md.
const service = () => createGithubGistService('gho_test');

function reply(body: unknown, init: { status?: number; headers?: Record<string, string> } = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: init.headers,
  });
}

const gistJson = (over: Record<string, unknown> = {}) => ({
  id: 'abc123',
  description: '[mdreader] notes.md',
  updated_at: '2026-01-15T10:30:00Z',
  html_url: 'https://gist.github.com/u/abc123',
  public: false,
  files: {
    'notes.md': {
      filename: 'notes.md',
      size: 12,
      truncated: false,
      content: '# my notes',
      raw_url: 'https://gist.githubusercontent.com/raw/abc123/notes.md',
    },
  },
  ...over,
});

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  // A fresh Response per call, not one shared instance: a Response body is a
  // stream that can only be read once, so a reused mock silently hands the
  // second caller an empty body.
  fetchMock = vi.fn().mockImplementation(async () => reply(gistJson()));
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const lastCall = () => fetchMock.mock.calls[fetchMock.mock.calls.length - 1];

describe('request shape', () => {
  it('sends the token and pins the API version', async () => {
    await service().getUser();
    const [url, init] = lastCall();
    expect(url).toBe('https://api.github.com/user');
    expect(init.headers).toMatchObject({
      Authorization: 'Bearer gho_test',
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    });
  });

  it('revalidates instead of reading the HTTP cache', async () => {
    // GitHub already sends `Cache-Control: no-cache` on API responses, so this
    // is a guard rather than a fix: it keeps a proxy, or a change on their side,
    // from letting a stale gist list through. The app compares `updated_at` to
    // decide whether the remote moved, so a cached list would show an old
    // document under a `synced` pill with nothing on screen admitting it.
    //
    // `no-cache`, not `no-store`: the validators still go out, so an unchanged
    // list returns 304 with no body and costs no rate limit.
    // Every verb, since they all share `api` and the guarantee has to hold for
    // the read paths whether or not a write happens to go through the same code.
    await service().getUser();
    await service().getGist('abc123');
    await service().createGist({ fileName: 'a.md', content: 'x' });
    await service().updateGist('abc123', { fileName: 'a.md', content: 'y' });
    expect(fetchMock.mock.calls).toHaveLength(4);
    for (const [, init] of fetchMock.mock.calls) {
      expect((init as RequestInit).cache).toBe('no-cache');
    }
  });

  it('talks to api.github.com, never to the auth Worker', async () => {
    // The Worker exists solely because github.com/login/oauth blocks CORS.
    // api.github.com sends Access-Control-Allow-Origin: * and must be called
    // directly — routing gist traffic through the Worker would put it on the
    // data path and make it a bottleneck and a place tokens could be logged.
    await service().getUser();
    await service().getGist('abc123');
    await service().createGist({ fileName: 'a.md', content: 'x' });
    await service().updateGist('abc123', { fileName: 'a.md', content: 'y' });
    await service().deleteGist('abc123');
    expect(fetchMock.mock.calls).toHaveLength(5);
    for (const [url] of fetchMock.mock.calls) {
      expect(url).toMatch(/^https:\/\/api\.github\.com\//);
    }
  });
});

describe('listGists', () => {
  it('returns metadata without fetching any content', async () => {
    fetchMock.mockResolvedValue(reply([gistJson()]));
    const list = await service().listGists();

    expect(list).toEqual([
      {
        id: 'abc123',
        fileName: 'notes.md',
        description: '[mdreader] notes.md',
        updatedAt: Date.parse('2026-01-15T10:30:00Z'),
        size: 12,
        htmlUrl: 'https://gist.github.com/u/abc123',
        public: false,
      },
    ]);
    // One request for the whole library, and no content in the result. This is
    // the property that makes the app usable on a phone over mobile data.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(list)).not.toContain('# my notes');
  });

  it('follows pagination until a short page', async () => {
    // A user with more than one page of gists would otherwise see their library
    // silently cut off at an arbitrary line.
    const full = Array.from({ length: 100 }, (_, i) => gistJson({ id: `g${i}` }));
    fetchMock
      .mockResolvedValueOnce(reply(full))
      .mockResolvedValueOnce(reply([gistJson({ id: 'last' })]));

    const list = await service().listGists();
    expect(list).toHaveLength(101);
    expect(fetchMock.mock.calls[0][0]).toContain('page=1');
    expect(fetchMock.mock.calls[1][0]).toContain('page=2');
  });

  it('stops after one request when the first page is short', async () => {
    fetchMock.mockResolvedValue(reply([gistJson()]));
    await service().listGists();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('skips a gist that has no files', async () => {
    fetchMock.mockResolvedValue(reply([gistJson({ files: {} }), gistJson({ id: 'ok' })]));
    expect(await service().listGists()).toHaveLength(1);
  });

  it('ignores a leftover sidecar file when choosing the primary file', async () => {
    // An earlier build wrote folder metadata as a second file, `.mdreader.json`,
    // and gists written then still carry it. A leading dot sorts first, so
    // "the first file" would be the bookkeeping — the app would show it as the
    // document and push it back as one.
    fetchMock.mockResolvedValue(
      reply([
        gistJson({
          files: {
            '.mdreader.json': {
              filename: '.mdreader.json',
              size: 20,
              content: '{}',
              raw_url: 'r',
            },
            'notes.md': { filename: 'notes.md', size: 12, content: '# my notes', raw_url: 'r' },
          },
        }),
      ]),
    );
    expect((await service().listGists())[0].fileName).toBe('notes.md');
  });
});

describe('listGists filters the account down to documents', () => {
  // A gist nobody tagged, named like the snippets Gist is actually full of.
  const foreign = (filename: string, over: Record<string, unknown> = {}) =>
    gistJson({
      id: `f-${filename}`,
      description: 'deploy helper',
      files: { [filename]: { filename, size: 9, content: 'x', raw_url: 'r' } },
      ...over,
    });

  it('drops a foreign gist that is not markdown', async () => {
    fetchMock.mockResolvedValue(reply([foreign('deploy.sh'), foreign('config.json')]));
    expect(await service().listGists()).toEqual([]);
  });

  it('keeps a foreign gist that is markdown', async () => {
    fetchMock.mockResolvedValue(reply([foreign('README.md'), foreign('deploy.sh')]));
    const list = await service().listGists();
    expect(list.map((g) => g.fileName)).toEqual(['README.md']);
  });

  it.each(['notes.md', 'notes.markdown', 'notes.txt', 'NOTES.MD'])(
    'accepts %s, matching what the file picker opens',
    async (filename) => {
      fetchMock.mockResolvedValue(reply([foreign(filename)]));
      expect(await service().listGists()).toHaveLength(1);
    },
  );

  // The one that cannot be got wrong. The picker applies no extension check to
  // what the user chooses, so a synced document may be named `README` or
  // `notes.mdx` — and a gist missing from this listing is read as deleted, not
  // as hidden: `stateOf` answers `gone` and `enableSync` creates a second gist
  // for a file that already has one.
  it.each(['README', 'notes.mdx', 'CHANGELOG'])(
    'keeps this app\'s own gist named %s, which no extension test would match',
    async (filename) => {
      fetchMock.mockResolvedValue(
        reply([
          gistJson({
            description: `[mdreader] ${filename}`,
            files: { [filename]: { filename, size: 9, content: 'x', raw_url: 'r' } },
          }),
        ]),
      );
      const list = await service().listGists();
      expect(list.map((g) => g.fileName)).toEqual([filename]);
    },
  );

  // Pagination is driven by what GitHub sent, not by what survived the filter.
  // A full page of shell snippets contributes nothing to `out`, and a
  // "collected fewer than PER_PAGE" test would read that as the end of the list
  // and stop — losing every document on page 2.
  it('keeps paginating through a full page that the filter empties', async () => {
    const allForeign = Array.from({ length: 100 }, (_, i) => foreign(`snippet${i}.sh`));
    fetchMock
      .mockResolvedValueOnce(reply(allForeign))
      .mockResolvedValueOnce(reply([gistJson({ id: 'doc-on-page-2' })]));

    const list = await service().listGists();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(list.map((g) => g.id)).toEqual(['doc-on-page-2']);
  });
});

describe('the folder tag', () => {
  const tagged = (description: string) => gistJson({ description });

  it('reads folder membership back off the description', async () => {
    fetchMock.mockResolvedValue(
      reply(tagged('[mdreader] notes.md {"folderId":"u-1","folderName":"Work"}')),
    );
    const got = await service().getGist('abc123');
    expect(got.folder).toEqual({ folderId: 'u-1', folderName: 'Work' });
    // And the document itself is still the document.
    expect(got.content).toBe('# my notes');
  });

  it('writes the tag in the same request as the content, and in no second file', async () => {
    // The whole reason membership travels with the push: one PATCH means the
    // two cannot end up describing different versions, and there is no second
    // write to fail on its own. In the description rather than a second file so
    // that gist.github.com, which titles a gist after its alphabetically first
    // file, still shows the user their document's name.
    await service().updateGist('abc123', {
      fileName: 'notes.md',
      content: '# changed',
      folder: { folderId: 'u-1', folderName: 'Work' },
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const sent = JSON.parse(lastCall()[1].body);
    expect(sent.files).toEqual({ 'notes.md': { content: '# changed' } });
    expect(sent.description).toBe('[mdreader] notes.md {"folderId":"u-1","folderName":"Work"}');
  });

  it('drops the tag for an ungrouped file', async () => {
    // How a file leaving a folder reaches the other devices. The description is
    // rewritten whole, so an absent tag overwrites the old one — there is no
    // separate remove to send, and nothing left to strand.
    await service().updateGist('abc123', { fileName: 'notes.md', content: 'x' });
    expect(JSON.parse(lastCall()[1].body).description).toBe('[mdreader] notes.md');

    // Same for a tag object with nothing in it, which `folderTagFor` never
    // produces but a caller could still hand over.
    await service().updateGist('abc123', { fileName: 'notes.md', content: 'x', folder: {} });
    expect(JSON.parse(lastCall()[1].body).description).toBe('[mdreader] notes.md');
  });

  it('tags a gist at creation too', async () => {
    await service().createGist({
      fileName: 'notes.md',
      content: '# my notes',
      folder: { folderId: 'u-1', folderName: 'Work' },
    });
    const sent = JSON.parse(lastCall()[1].body);
    expect(sent.description).toBe('[mdreader] notes.md {"folderId":"u-1","folderName":"Work"}');
    expect(sent.public).toBe(false);
  });

  it('finds the tag past a brace in the file name', async () => {
    // The file name and the tag share one field with no separator between them,
    // so the reader scans for the first `{` the rest of the string parses from
    // rather than the first `{` at all.
    fetchMock.mockResolvedValue(reply(tagged('[mdreader] a{b.md {"folderName":"Work"}')));
    expect((await service().getGist('abc123')).folder).toEqual({ folderName: 'Work' });
  });

  it('survives a brace inside the folder name', async () => {
    const description = `[mdreader] notes.md ${JSON.stringify({ folderName: 'A {big} folder' })}`;
    fetchMock.mockResolvedValue(reply(tagged(description)));
    expect((await service().getGist('abc123')).folder).toEqual({ folderName: 'A {big} folder' });
  });

  it('treats an unreadable tag as no tag, without failing the read', async () => {
    // A description edited by hand on github.com can say anything, and refusing
    // to open the document over a malformed label would deny the user their
    // file for the sake of its grouping.
    for (const bad of [
      '[mdreader] notes.md {oops',
      '[mdreader] notes.md {"folderName":"Work"} and then some',
      '[mdreader] notes.md []',
      'notes.md',
      '',
    ]) {
      fetchMock.mockResolvedValue(reply(tagged(bad)));
      const got = await service().getGist('abc123');
      expect(got.folder).toBeUndefined();
      expect(got.content).toBe('# my notes');
    }
  });

  it('drops tag fields that are not strings', async () => {
    // Checked field by field rather than cast through. A number where a string
    // belongs would otherwise reach the library and crash somewhere far from
    // here, with nothing pointing back at a hand-edited description.
    fetchMock.mockResolvedValue(
      reply(tagged(`[mdreader] notes.md ${JSON.stringify({ folderId: 42, folderName: ['Work'] })}`)),
    );
    expect((await service().getGist('abc123')).folder).toEqual({});
  });

  it('reports no tag for a gist that has none', async () => {
    fetchMock.mockResolvedValue(reply(gistJson()));
    expect((await service().getGist('abc123')).folder).toBeUndefined();
  });
});

describe('getGist', () => {
  it('returns content for a normal gist', async () => {
    const got = await service().getGist('abc123');
    expect(got.content).toBe('# my notes');
    expect(got.id).toBe('abc123');
  });

  it('throws rather than returning a clipped body', async () => {
    // The most destructive failure available here. GitHub clips over 1MB and
    // flags it; writing the clipped text to IndexedDB would overwrite the
    // user's complete copy, and the next push would send the truncation back as
    // the new truth. A failed read is recoverable, a shortened document is not.
    fetchMock.mockResolvedValue(
      reply(
        gistJson({
          files: {
            'notes.md': {
              filename: 'notes.md',
              size: 2_000_000,
              truncated: true,
              content: '# my notes (clipped',
              raw_url: 'r',
            },
          },
        }),
      ),
    );
    await expect(service().getGist('abc123')).rejects.toThrow(GistTruncatedError);
  });

  it('throws when content is absent even without the truncated flag', async () => {
    fetchMock.mockResolvedValue(
      reply(
        gistJson({
          files: { 'notes.md': { filename: 'notes.md', size: 12, raw_url: 'r' } },
        }),
      ),
    );
    await expect(service().getGist('abc123')).rejects.toThrow(GistTruncatedError);
  });

  it('reports a gist with no files as a 404', async () => {
    fetchMock.mockResolvedValue(reply(gistJson({ files: {} })));
    await expect(service().getGist('abc123')).rejects.toThrow(GistApiError);
  });
});

describe('createGist', () => {
  it('creates a secret gist', async () => {
    await service().createGist({ fileName: 'notes.md', content: '# hi' });
    const [url, init] = lastCall();
    expect(url).toBe('https://api.github.com/gists');
    expect(init.method).toBe('POST');
    const body = JSON.parse(init.body);
    // public:false is only honoured at creation — PATCH ignores it — so a gist
    // created public stays public until deleted.
    expect(body.public).toBe(false);
    expect(body.files).toEqual({ 'notes.md': { content: '# hi' } });
  });

  it('refuses a file over the sync limit before making a request', async () => {
    await expect(
      service().createGist({ fileName: 'big.md', content: 'x'.repeat(MAX_SYNC_FILE_BYTES + 1) }),
    ).rejects.toThrow(FileTooLargeToSyncError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('measures the limit in UTF-8 bytes, not string length', async () => {
    // Every character here is 3 bytes in UTF-8 but one unit by `.length`. This
    // document is a third of the cap by length and just over it by bytes —
    // measuring the wrong one lets it through.
    const cjk = '日'.repeat(MAX_SYNC_FILE_BYTES / 3 + 1);
    expect(cjk.length).toBeLessThan(MAX_SYNC_FILE_BYTES);
    expect(new TextEncoder().encode(cjk).length).toBeGreaterThan(MAX_SYNC_FILE_BYTES);
    await expect(service().createGist({ fileName: 'cjk.md', content: cjk })).rejects.toThrow(
      FileTooLargeToSyncError,
    );
  });

  it('accepts a file exactly at the limit', async () => {
    await expect(
      service().createGist({ fileName: 'edge.md', content: 'x'.repeat(MAX_SYNC_FILE_BYTES) }),
    ).resolves.toBeDefined();
  });
});

describe('updateGist', () => {
  it('patches by id', async () => {
    // Bound by id and never by name: two different documents can share a
    // basename, and matching on name would let one device's README overwrite
    // another's.
    await service().updateGist('abc123', { fileName: 'notes.md', content: '# changed' });
    const [url, init] = lastCall();
    expect(url).toBe('https://api.github.com/gists/abc123');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body).files).toEqual({ 'notes.md': { content: '# changed' } });
  });

  it('enforces the size limit on update too', async () => {
    await expect(
      service().updateGist('abc123', {
        fileName: 'big.md',
        content: 'x'.repeat(MAX_SYNC_FILE_BYTES + 1),
      }),
    ).rejects.toThrow(FileTooLargeToSyncError);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('error translation', () => {
  it('turns 401 into GistAuthError', async () => {
    // The token was revoked on github.com. The UI has to sign out rather than
    // offer a retry, which is why this is its own type.
    fetchMock.mockResolvedValue(reply({ message: 'Bad credentials' }, { status: 401 }));
    await expect(service().getUser()).rejects.toThrow(GistAuthError);
  });

  it('distinguishes rate limiting from a missing scope, both 403', async () => {
    fetchMock.mockResolvedValue(
      reply({}, { status: 403, headers: { 'X-RateLimit-Remaining': '0' } }),
    );
    await expect(service().listGists()).rejects.toThrow(GistApiError);
    await expect(service().listGists()).rejects.toThrow(/rate limit/i);

    // Same status, no exhausted budget: the token simply lacks `gist`. One
    // clears on its own and one never will, so collapsing them would send the
    // user to wait out a limit that is not the problem.
    fetchMock.mockResolvedValue(reply({}, { status: 403 }));
    await expect(service().listGists()).rejects.toThrow(GistAuthError);
  });

  it('surfaces the GitHub message on other failures', async () => {
    fetchMock.mockResolvedValue(reply({ message: 'Validation Failed' }, { status: 422 }));
    await expect(service().createGist({ fileName: 'a.md', content: 'x' })).rejects.toThrow(
      'Validation Failed',
    );
  });

  it('still reports a status when the error body is not JSON', async () => {
    fetchMock.mockResolvedValue(new Response('<html>500</html>', { status: 500 }));
    await expect(service().listGists()).rejects.toThrow(/500/);
  });
});
