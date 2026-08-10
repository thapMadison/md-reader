import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useStorage } from '@/services/storage/StorageContext';
import { createGithubGistService } from './githubGist';
import { AUTH_EXPIRED_EVENT } from './authExpired';
import { beginSignIn, consumeCallback, exchangeCode, type OAuthConfig } from './oauth';
import { type GistService, type GistUser } from './types';

export type AuthStatus = 'loading' | 'signed-out' | 'signing-in' | 'signed-in';

export interface GistAuthValue {
  status: AuthStatus;
  user: GistUser | null;
  /** Last sign-in failure, shown to the user. Cleared by the next attempt. */
  error: string | null;
  /** False when the build carries no client id, so the UI can hide sync entirely. */
  configured: boolean;
  /** The authenticated API client, or null when signed out. */
  service: GistService | null;
  signIn: () => void;
  signOut: () => Promise<void>;
}

const GistAuthContext = createContext<GistAuthValue | null>(null);

function configFromEnv(): OAuthConfig | null {
  const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID;
  const tokenEndpoint = import.meta.env.VITE_GIST_TOKEN_ENDPOINT;
  // Both or nothing. A half-configured build would show a sign-in button that
  // always fails, which is worse than showing none: the user cannot tell a
  // missing deployment step from a broken account.
  if (!clientId || !tokenEndpoint) return null;
  return { clientId, tokenEndpoint };
}

export function GistAuthProvider({
  children,
  config: configOverride,
  createService = createGithubGistService,
}: {
  children: ReactNode;
  /** Injected in tests. Production reads the build's env. */
  config?: OAuthConfig | null;
  /** Injected in tests so no request is ever made. */
  createService?: (token: string) => GistService;
}) {
  const storage = useStorage();
  const config = configOverride !== undefined ? configOverride : configFromEnv();

  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<GistUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const service = useMemo(
    () => (token ? createService(token) : null),
    [token, createService],
  );

  // Runs once for the life of the provider. StrictMode double-invokes effects
  // and an authorization code is single-use, so a second exchange would return
  // `bad_verification_code`.
  //
  // This ref is not what makes that safe — `consumeCallback` is. It strips the
  // code from the address bar on its first call, so a second run sees an
  // ordinary page load and takes the restore path instead. That is load-bearing
  // on its own: it also covers a genuine remount, which no ref survives. The
  // ref is the suspenders, saving the redundant `getAuth` round-trip that
  // second run would otherwise make.
  //
  // Deliberately without the usual `cancelled` cleanup flag. That pattern
  // assumes the effect can re-run and produce a fresh result to replace the
  // discarded one — but the ref makes re-running impossible, so cancelling the
  // only run in flight would strand the provider in `loading` forever. Ignoring
  // the unmount is the lesser cost: a resolved sign-in setting state on an
  // unmounted provider is a no-op in React 18+, whereas a lost sign-in is
  // unrecoverable without another round-trip to GitHub.
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    void (async () => {
      // Read the URL before anything awaits. consumeCallback strips the code
      // from the address bar, and leaving that behind an await gives a
      // re-render a window in which to see it.
      const callback = config ? consumeCallback() : null;

      if (callback && 'error' in callback) {
        setError(callback.error);
        setStatus('signed-out');
        return;
      }

      if (callback && config) {
        setStatus('signing-in');
        try {
          const { accessToken, scope } = await exchangeCode(config, callback.code);
          // Identity is fetched before the token is stored, so a token that
          // cannot actually call the API never reaches storage and the user is
          // not left "signed in" to an account the app cannot read.
          const who = await createService(accessToken).getUser();
          await storage.setAuth({
            accessToken,
            scope,
            login: who.login,
            avatarUrl: who.avatarUrl,
          });
          setToken(accessToken);
          setUser(who);
          setStatus('signed-in');
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Sign-in failed.');
          setStatus('signed-out');
        }
        return;
      }

      // Not a callback: restore a previous session if there is one.
      const stored = await storage.getAuth();
      if (!stored) {
        setStatus('signed-out');
        return;
      }

      // Trusted immediately rather than verified first. A token revoked on
      // github.com is rare, and blocking startup on a network round-trip would
      // make every cold start wait on GitHub — including offline ones, where
      // the app is otherwise fully usable. The 401 path below handles the
      // revoked case when a real call is made.
      setToken(stored.accessToken);
      setUser(stored.login ? { login: stored.login, avatarUrl: stored.avatarUrl } : null);
      setStatus('signed-in');
    })();
  }, [config, storage, createService]);

  const signIn = useCallback(() => {
    if (!config) return;
    setError(null);
    beginSignIn(config);
  }, [config]);

  const signOut = useCallback(async () => {
    await storage.clearAuth();
    setToken(null);
    setUser(null);
    setStatus('signed-out');
  }, [storage]);

  // A revoked token surfaces as a 401 on whatever call happens to run next,
  // anywhere in the app. Rather than making every caller handle it, the signed
  // -out transition is centralised here and reached by dispatching this event.
  useEffect(() => {
    const onExpired = () => void signOut();
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, [signOut]);

  const value = useMemo<GistAuthValue>(
    () => ({
      status,
      user,
      error,
      configured: config !== null,
      service,
      signIn,
      signOut,
    }),
    [status, user, error, config, service, signIn, signOut],
  );

  return <GistAuthContext.Provider value={value}>{children}</GistAuthContext.Provider>;
}

export function useGistAuth(): GistAuthValue {
  const ctx = useContext(GistAuthContext);
  if (!ctx) throw new Error('useGistAuth must be used within a GistAuthProvider');
  return ctx;
}

/**
 * Auth state, or null when no provider is above.
 *
 * For components that live in trees assembled without sync — chrome that is
 * otherwise presentational, and its tests. They render the app without it
 * rather than crashing, which the throwing hook above is right to do for
 * anything that genuinely cannot work without an account.
 */
export function useOptionalGistAuth(): GistAuthValue | null {
  return useContext(GistAuthContext);
}
