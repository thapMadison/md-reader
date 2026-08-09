import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import worker from './index';

// Called directly rather than through workerd. The Worker touches no Cloudflare
// runtime API — only Request/Response/fetch, all of which Node 20 provides — so
// a real workerd pool would cost a dependency and buy nothing here. What this
// cannot prove is the deployment itself, which is why the README still requires
// a manual smoke test against real GitHub.
const env = {
  GITHUB_CLIENT_ID: 'client-id',
  GITHUB_CLIENT_SECRET: 'client-secret',
  ALLOWED_ORIGINS: 'https://md-reader.thapora.com,http://localhost:5173',
};

const ALLOWED = 'https://md-reader.thapora.com';

const post = (body: unknown, origin: string | null = ALLOWED) =>
  worker.fetch(
    new Request('https://worker.example/token', {
      method: 'POST',
      headers: origin ? { Origin: origin, 'Content-Type': 'application/json' } : {},
      body: JSON.stringify(body),
    }),
    env,
  );

/** GitHub's shape: always HTTP 200, success and failure told apart by the body. */
const githubReplies = (body: unknown, status = 200) =>
  vi.fn(async () => new Response(JSON.stringify(body), { status }));

beforeEach(() => {
  vi.stubGlobal('fetch', githubReplies({ access_token: 'gho_token', scope: 'gist' }));
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('origin allowlist', () => {
  it('exchanges a code for an allowed origin', async () => {
    const res = await post({ code: 'abc' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ access_token: 'gho_token', scope: 'gist' });
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(ALLOWED);
  });

  it('echoes the caller origin rather than a fixed one', async () => {
    // Two allowed origins exist; each must get its own value back. A hardcoded
    // first-entry response would pass the test above and break local dev.
    const res = await post({ code: 'abc' }, 'http://localhost:5173');
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173');
  });

  it('marks responses as varying by origin', async () => {
    // Without Vary, a cache in front of the Worker could serve one origin's
    // allowed response to a different origin and void the allowlist.
    const res = await post({ code: 'abc' });
    expect(res.headers.get('Vary')).toBe('Origin');
  });

  it('refuses an unknown origin without calling GitHub', async () => {
    const res = await post({ code: 'abc' }, 'https://evil.example');
    expect(res.status).toBe(403);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    // A different site anyone can register.
    'https://evil-thapora.com',
    // A subdomain. Anyone holding a wildcard DNS record or an abandoned
    // subdomain would inherit token access from the parent.
    'https://evil.md-reader.thapora.com',
    // The right host over plaintext http, where the token crosses the network
    // readable. The scheme is part of an origin and has to be matched too.
    'http://md-reader.thapora.com',
  ])('refuses the lookalike origin %s', async (origin) => {
    // Collectively the reason the check is an exact string match: every
    // substring test — endsWith, startsWith, includes — admits at least one
    // of these.
    const res = await post({ code: 'abc' }, origin);
    expect(res.status).toBe(403);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('refuses a request with no Origin header', async () => {
    // Non-browser callers send none. Failing closed keeps curl and server-side
    // callers out; a browser always sends one on a cross-origin request.
    const res = await post({ code: 'abc' }, null);
    expect(res.status).toBe(403);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('answers preflight for an allowed origin', async () => {
    const res = await worker.fetch(
      new Request('https://worker.example/token', {
        method: 'OPTIONS',
        headers: { Origin: ALLOWED },
      }),
      env,
    );
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(ALLOWED);
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST');
  });

  it('rejects methods other than POST', async () => {
    const res = await worker.fetch(
      new Request('https://worker.example/token', { method: 'GET', headers: { Origin: ALLOWED } }),
      env,
    );
    expect(res.status).toBe(405);
  });
});

describe('token exchange', () => {
  it('sends the secret to GitHub and never returns it', async () => {
    const res = await post({ code: 'abc' });
    const [url, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://github.com/login/oauth/access_token');
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      client_id: 'client-id',
      client_secret: 'client-secret',
      code: 'abc',
    });
    // Accept: application/json — without it GitHub answers form-urlencoded and
    // the error branch below would parse into an object with no `error` key.
    expect((init as RequestInit).headers).toMatchObject({ Accept: 'application/json' });
    expect(JSON.stringify(await res.json())).not.toContain('client-secret');
  });

  it('does not forward unexpected fields from GitHub', async () => {
    // Only access_token and scope are passed through, so anything GitHub adds
    // later has to be opted into rather than relayed by default.
    vi.stubGlobal(
      'fetch',
      githubReplies({ access_token: 'gho_token', scope: 'gist', refresh_token: 'secret-extra' }),
    );
    expect(await (await post({ code: 'abc' })).json()).toEqual({
      access_token: 'gho_token',
      scope: 'gist',
    });
  });

  it('tells the client no store may cache the token', async () => {
    expect((await post({ code: 'abc' })).headers.get('Cache-Control')).toBe('no-store');
  });

  it('rejects a missing or non-string code before calling GitHub', async () => {
    for (const body of [{}, { code: '' }, { code: 123 }]) {
      const res = await post(body);
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: 'missing_code' });
    }
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects a body that is not JSON', async () => {
    const res = await worker.fetch(
      new Request('https://worker.example/token', {
        method: 'POST',
        headers: { Origin: ALLOWED, 'Content-Type': 'application/json' },
        body: 'not json',
      }),
      env,
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'invalid_json' });
  });
});

describe('GitHub failures are surfaced, not swallowed', () => {
  it('treats an error body as a failure even though GitHub sends HTTP 200', async () => {
    // The single most important case here. GitHub answers a bad code with 200,
    // so a `res.ok` check alone would return success with no token in the body
    // and the failure would resurface much later as an unauthenticated call.
    vi.stubGlobal(
      'fetch',
      githubReplies({ error: 'bad_verification_code', error_description: 'expired' }, 200),
    );
    const res = await post({ code: 'stale' });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: 'bad_verification_code',
      error_description: 'expired',
    });
  });

  it('passes the GitHub error code through verbatim', async () => {
    // bad_verification_code and incorrect_client_credentials need completely
    // different fixes; collapsing both into a generic failure makes the smoke
    // test unable to tell "reused code" from "secret not set".
    vi.stubGlobal('fetch', githubReplies({ error: 'incorrect_client_credentials' }, 200));
    expect(await (await post({ code: 'abc' })).json()).toMatchObject({
      error: 'incorrect_client_credentials',
    });
  });

  it('reports a 200 with neither token nor error rather than returning empty', async () => {
    vi.stubGlobal('fetch', githubReplies({}));
    const res = await post({ code: 'abc' });
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: 'no_token_in_response' });
  });

  it('reports unparseable GitHub output as a bad gateway', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>502</html>', { status: 502 })));
    const res = await post({ code: 'abc' });
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: 'github_bad_response' });
  });

  it('reports an unreachable GitHub as a bad gateway, not a crash', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('network');
      }),
    );
    const res = await post({ code: 'abc' });
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: 'github_unreachable' });
  });

  it('keeps CORS headers on error responses', async () => {
    // An error without them reaches the page as an opaque CORS failure, which
    // reads exactly like the GitHub CORS problem this Worker exists to solve.
    vi.stubGlobal('fetch', githubReplies({ error: 'bad_verification_code' }, 200));
    const res = await post({ code: 'abc' });
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(ALLOWED);
  });
});
