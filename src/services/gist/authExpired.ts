import { GistAuthError } from './types';

/**
 * The one-way signal that the stored token was rejected.
 *
 * A window event rather than a call, because the report and the response are on
 * opposite sides of the app: any request anywhere can be the one that gets the
 * 401, while signing out is the provider's job and must happen exactly once no
 * matter how many failures arrive together.
 *
 * The name and its sender live in this module together — they were a literal
 * string written at both ends, which is the kind of pair that survives a rename
 * of one side and fails silently rather than loudly.
 */
export const AUTH_EXPIRED_EVENT = 'mdreader:auth-expired';

/** Signals that the stored token was rejected, so the app can sign out once, centrally. */
export function reportAuthExpired(err: unknown): void {
  if (err instanceof GistAuthError) {
    window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
  }
}
