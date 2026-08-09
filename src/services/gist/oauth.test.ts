import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { beginSignIn, consumeCallback, exchangeCode, redirectUri } from './oauth';

const config = {
  clientId: 'test-client-id',
  tokenEndpoint: 'https://worker.example',
};

/** Puts jsdom at a URL and records what history.replaceState is asked to write. */
function atUrl(url: string) {
  window.history.replaceState({}, '', url);
  return vi.spyOn(window.history, 'replaceState');
}

beforeEach(() => {
  sessionStorage.clear();
  window.history.replaceState({}, '', '/');
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('beginSignIn', () => {
  it('sends the user to GitHub with the right parameters', () => {
    const assign = vi.fn();
    vi.stubGlobal('location', { ...window.location, origin: 'https://app.example', assign });

    beginSignIn(config);

    const url = new URL(assign.mock.calls[0][0]);
    expect(url.origin + url.pathname).toBe('https://github.com/login/oauth/authorize');
    expect(url.searchParams.get('client_id')).toBe('test-client-id');
    // `gist` alone. A leaked token must not be able to reach repositories,
    // which is the mitigation for it being XSS-reachable in IndexedDB.
    expect(url.searchParams.get('scope')).toBe('gist');
    expect(url.searchParams.get('state')).toMatch(/^[0-9a-f]{32}$/);
  });

  it('stores the state so the callback can verify it', () => {
    vi.stubGlobal('location', { ...window.location, origin: 'https://app.example', assign: vi.fn() });
    beginSignIn(config);
    expect(sessionStorage.getItem('mdreader:oauth-state')).toMatch(/^[0-9a-f]{32}$/);
  });

  it('uses a different state each time', () => {
    // A fixed value would defeat the check entirely: an attacker could embed it
    // in a crafted callback URL and always pass.
    const assign = vi.fn();
    vi.stubGlobal('location', { ...window.location, origin: 'https://app.example', assign });
    beginSignIn(config);
    beginSignIn(config);
    const [a, b] = assign.mock.calls.map((args) => new URL(args[0] as string).searchParams.get('state'));
    expect(a).not.toBe(b);
  });
});

describe('redirectUri', () => {
  it('is the app root, independent of the current route', () => {
    // GitHub compares this against the one registered value, so it cannot vary
    // with whatever path or query the user happened to be on.
    window.history.replaceState({}, '', '/some/deep/path?x=1');
    expect(redirectUri()).toBe(`${window.location.origin}/`);
  });
});

describe('consumeCallback', () => {
  it('returns null on an ordinary page load', () => {
    expect(consumeCallback()).toBeNull();
  });

  it('returns the code when the state matches', () => {
    sessionStorage.setItem('mdreader:oauth-state', 'abc');
    atUrl('/?code=the-code&state=abc');
    expect(consumeCallback()).toEqual({ code: 'the-code' });
  });

  it('strips the code from the address bar', () => {
    // An authorization code is single-use and short-lived, but a URL is not:
    // left in place it lands in history and in any Referer the page later sends.
    sessionStorage.setItem('mdreader:oauth-state', 'abc');
    const replace = atUrl('/?code=the-code&state=abc');
    consumeCallback();
    const written = replace.mock.calls.at(-1)?.[2] as string;
    expect(written).not.toContain('code=');
    expect(written).not.toContain('state=');
  });

  it('rejects a mismatched state', () => {
    // The login-CSRF case: an attacker hands the user a callback carrying the
    // attacker's code, and without this the app would bind the user's session
    // to the attacker's account.
    sessionStorage.setItem('mdreader:oauth-state', 'expected');
    atUrl('/?code=attacker-code&state=different');
    expect(consumeCallback()).toEqual({ error: expect.stringContaining('could not be verified') });
  });

  it('rejects a callback when no sign-in was started in this tab', () => {
    // No stored state at all. This is what an injected code looks like, so it
    // has to fail rather than be treated as a first-time sign-in.
    atUrl('/?code=injected&state=anything');
    expect(consumeCallback()).toEqual({ error: expect.stringContaining('could not be verified') });
  });

  it('clears the stored state so a callback cannot be replayed', () => {
    sessionStorage.setItem('mdreader:oauth-state', 'abc');
    atUrl('/?code=the-code&state=abc');
    consumeCallback();
    expect(sessionStorage.getItem('mdreader:oauth-state')).toBeNull();
  });

  it('reports the error when the user declines on GitHub', () => {
    atUrl('/?error=access_denied&error_description=The+user+declined');
    expect(consumeCallback()).toEqual({ error: 'The user declined' });
  });

  it('strips the parameters even on the failure paths', () => {
    sessionStorage.setItem('mdreader:oauth-state', 'expected');
    const replace = atUrl('/?code=leaked&state=wrong');
    consumeCallback();
    expect(replace.mock.calls.at(-1)?.[2]).not.toContain('code=');
  });
});

describe('exchangeCode', () => {
  it('posts the code to the Worker and returns the token', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ access_token: 'gho_x', scope: 'gist' })));
    vi.stubGlobal('fetch', fetchMock);

    expect(await exchangeCode(config, 'the-code')).toEqual({
      accessToken: 'gho_x',
      scope: 'gist',
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://worker.example');
    expect(JSON.parse(init.body)).toEqual({ code: 'the-code' });
  });

  it('surfaces the Worker error message', async () => {
    // bad_verification_code and incorrect_client_credentials need different
    // fixes; the Worker passes them through and so must this.
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: 'bad_verification_code' }), { status: 400 }),
      ),
    );
    await expect(exchangeCode(config, 'stale')).rejects.toThrow('bad_verification_code');
  });

  it('reports a CORS or offline failure as a connection problem', async () => {
    // This is what a CORS rejection looks like from JavaScript: a TypeError
    // with no status and no body, indistinguishable from being offline. The
    // message says the honest thing rather than guessing which one it was.
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(exchangeCode(config, 'x')).rejects.toThrow(/could not reach/i);
  });

  it('treats a 200 with no token as a failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({}))));
    await expect(exchangeCode(config, 'x')).rejects.toThrow();
  });
});
