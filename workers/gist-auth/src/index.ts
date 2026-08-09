/**
 * Exchanges a GitHub OAuth `code` for an access token.
 *
 * This Worker exists for exactly one reason: `github.com/login/oauth/access_token`
 * sends no CORS headers and does not answer preflight OPTIONS, so a browser
 * cannot call it at all. Every other GitHub call this app makes goes straight to
 * `api.github.com`, which does send `Access-Control-Allow-Origin: *` — those need
 * no proxy and must not be routed through here.
 *
 * It is not on the data path. No file content, no gist body, and no user data
 * passes through it: one request per sign-in, then the browser talks to GitHub
 * directly forever after (GitHub tokens do not expire). If this Worker goes
 * down, existing users keep working and only new sign-ins break.
 *
 * Nothing is stored or logged. A token in a log line is a token that outlives
 * the request that carried it.
 */

interface Env {
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  ALLOWED_ORIGINS: string;
}

/**
 * The exact origin allowed to see this response, or null to refuse.
 *
 * Exact string match against the allowlist, never a prefix or suffix test:
 * `endsWith('thapora.com')` would also admit `evil-thapora.com`, and
 * `startsWith` on the scheme admits anything. The Origin header is set by the
 * browser and cannot be forged by page script, which is what makes this worth
 * checking — but it is absent or `null` on non-browser callers, so a missing
 * Origin must fail closed rather than be treated as same-origin.
 */
function allowedOrigin(request: Request, env: Env): string | null {
  const origin = request.headers.get('Origin');
  if (!origin) return null;
  const allowed = env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean);
  return allowed.includes(origin) ? origin : null;
}

function corsHeaders(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    // Echoing a specific origin rather than "*" makes the response vary by
    // Origin. Without this, a cache could hand one origin's response to
    // another and the allowlist stops meaning anything.
    Vary: 'Origin',
  };
}

function json(body: unknown, status: number, origin: string): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      // Belt and braces against any intermediary holding a token response.
      'Cache-Control': 'no-store',
      ...corsHeaders(origin),
    },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = allowedOrigin(request, env);

    // Refusals carry no CORS headers at all, so the browser reports them as a
    // CORS failure rather than showing the page a readable body. That is the
    // right shape for "you are not allowed to call this" — there is nothing
    // here for a disallowed origin to learn.
    if (!origin) return new Response('Forbidden', { status: 403 });

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    if (request.method !== 'POST') {
      return json({ error: 'method_not_allowed' }, 405, origin);
    }

    let code: unknown;
    try {
      ({ code } = (await request.json()) as { code?: unknown });
    } catch {
      return json({ error: 'invalid_json' }, 400, origin);
    }
    if (typeof code !== 'string' || code === '') {
      return json({ error: 'missing_code' }, 400, origin);
    }

    let ghRes: Response;
    try {
      ghRes = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          // Without this GitHub replies in form-urlencoded, and the error cases
          // below would silently parse into an object with no `error` key.
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code,
        }),
      });
    } catch {
      return json({ error: 'github_unreachable' }, 502, origin);
    }

    const data = (await ghRes.json().catch(() => null)) as {
      access_token?: string;
      scope?: string;
      error?: string;
      error_description?: string;
    } | null;

    if (!data) return json({ error: 'github_bad_response' }, 502, origin);

    // GitHub answers a rejected code with HTTP 200 and an `error` key in the
    // body. Checking `ghRes.ok` alone would treat `bad_verification_code` as a
    // success and hand the client a response with no token in it — the failure
    // would then surface much later as an unauthenticated API call.
    //
    // The GitHub error is passed through verbatim rather than flattened to a
    // generic 500: during the manual smoke test, `bad_verification_code`
    // (code reused or expired) and `incorrect_client_credentials` (secret not
    // set) point at completely different fixes, and both look identical once
    // collapsed into "auth failed".
    if (data.error) {
      return json(
        { error: data.error, error_description: data.error_description },
        ghRes.status === 200 ? 400 : ghRes.status,
        origin,
      );
    }
    if (!data.access_token) return json({ error: 'no_token_in_response' }, 502, origin);

    // Only these two fields. The upstream body is not forwarded wholesale so
    // that anything GitHub adds later has to be opted into deliberately.
    // `scope` is returned because the client should verify it got `gist` and
    // not silently operate with less than it asked for.
    return json({ access_token: data.access_token, scope: data.scope ?? '' }, 200, origin);
  },
};
