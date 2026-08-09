/**
 * The browser half of GitHub's OAuth web flow.
 *
 * Two hops, and it matters which host serves each. GitHub redirects the browser
 * to `redirectUri` with a `?code=`, so that has to be this app. The code is then
 * exchanged for a token by the Cloudflare Worker, because
 * `github.com/login/oauth/access_token` sends no CORS headers and does not
 * answer preflight OPTIONS — a browser cannot call it at all. Device Flow does
 * not help: it posts to the same blocked endpoint.
 *
 * The Worker is the only backend in the app and only appears here. Gist traffic
 * goes straight to `api.github.com`.
 */

/** Only `gist`. A leaked token must not be able to reach the user's repositories. */
const SCOPE = 'gist';

const STATE_KEY = 'mdreader:oauth-state';

export interface OAuthConfig {
  clientId: string;
  /** Worker origin, e.g. https://md-reader-gist-auth.thapnv.workers.dev */
  tokenEndpoint: string;
}

export class OAuthStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OAuthStateError';
  }
}

/**
 * A random value tying the redirect back to the request that started it.
 *
 * Without it, an attacker can hand the user a crafted callback URL carrying
 * *their* code, and the app would silently attach the victim's session to the
 * attacker's account. sessionStorage rather than localStorage so the value dies
 * with the tab and cannot be replayed in another one.
 */
function newState(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Where GitHub sends the browser back. Must match the OAuth App's registered callback exactly. */
export function redirectUri(): string {
  // origin + BASE_URL rather than location.href: the callback GitHub compares
  // against is registered once and cannot vary with the route the user happened
  // to be on, or with any query string already present.
  return `${window.location.origin}${import.meta.env.BASE_URL}`;
}

export function beginSignIn(config: OAuthConfig): void {
  const state = newState();
  sessionStorage.setItem(STATE_KEY, state);
  const url = new URL('https://github.com/login/oauth/authorize');
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('redirect_uri', redirectUri());
  url.searchParams.set('scope', SCOPE);
  url.searchParams.set('state', state);
  window.location.assign(url.toString());
}

/**
 * Reads `?code=&state=` from the current URL, if this load is a callback.
 *
 * Always strips both parameters from the address bar, including on failure. An
 * authorization code is single-use and short-lived, but leaving it in the URL
 * puts it in history and in any `Referer` the page later sends.
 */
export function consumeCallback(): { code: string } | { error: string } | null {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const state = params.get('state');
  const error = params.get('error');
  if (!code && !error) return null;

  const expected = sessionStorage.getItem(STATE_KEY);
  sessionStorage.removeItem(STATE_KEY);

  // Rewritten before any early return below, so no path leaves the code behind.
  const clean = new URL(window.location.href);
  clean.searchParams.delete('code');
  clean.searchParams.delete('state');
  clean.searchParams.delete('error');
  clean.searchParams.delete('error_description');
  window.history.replaceState({}, '', clean.toString());

  // The user pressed Cancel on GitHub's consent screen, or the app was denied.
  if (error) return { error: params.get('error_description') ?? error };

  // Rejecting a missing `expected` is the point of the check, not an edge case:
  // it is exactly what a code injected from outside this tab looks like.
  if (!expected || state !== expected) {
    return { error: 'Sign-in could not be verified. Please try again.' };
  }
  return { code: code as string };
}

/**
 * Trades the code for a token via the Worker.
 *
 * A CORS rejection arrives as `TypeError: Failed to fetch` with no status and
 * no body, which is indistinguishable from being offline. It is reported as a
 * connection failure because that is the honest description; the Worker's own
 * errors, which do carry a body, are surfaced as themselves.
 */
export async function exchangeCode(
  config: OAuthConfig,
  code: string,
): Promise<{ accessToken: string; scope: string }> {
  let res: Response;
  try {
    res = await fetch(config.tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
  } catch {
    throw new Error('Could not reach the sign-in service.');
  }

  const body = (await res.json().catch(() => null)) as {
    access_token?: string;
    scope?: string;
    error?: string;
    error_description?: string;
  } | null;

  if (!res.ok || !body?.access_token) {
    throw new Error(body?.error_description ?? body?.error ?? `Sign-in failed (${res.status})`);
  }
  return { accessToken: body.access_token, scope: body.scope ?? '' };
}
