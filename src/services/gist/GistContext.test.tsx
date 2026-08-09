import { render, screen, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GistAuthProvider, reportAuthExpired, useGistAuth } from './GistContext';
import { createFakeGistService } from './fakeGist';
import { GistAuthError, type GistService } from './types';
import { StorageProvider } from '@/services/storage/StorageContext';
import { createFakeStorageService } from '@/services/storage/fakeStorage';
import type { StorageService } from '@/services/storage/types';

const config = { clientId: 'test-client', tokenEndpoint: 'https://worker.example' };

function Probe() {
  const { status, user, error, configured, service, signOut } = useGistAuth();
  return (
    <div>
      <div data-testid="status">{status}</div>
      <div data-testid="user">{user?.login ?? ''}</div>
      <div data-testid="error">{error ?? ''}</div>
      <div data-testid="configured">{String(configured)}</div>
      <div data-testid="has-service">{String(service !== null)}</div>
      <button onClick={() => void signOut()}>sign-out</button>
    </div>
  );
}

function renderAuth(
  storage: StorageService,
  opts: {
    strict?: boolean;
    config?: typeof config | null;
    createService?: (token: string) => GistService;
  } = {},
) {
  const tree = (
    <StorageProvider service={storage}>
      <GistAuthProvider
        config={opts.config === undefined ? config : opts.config}
        createService={opts.createService ?? (() => createFakeGistService())}
      >
        <Probe />
      </GistAuthProvider>
    </StorageProvider>
  );
  return render(opts.strict ? <StrictMode>{tree}</StrictMode> : tree);
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  sessionStorage.clear();
  window.history.replaceState({}, '', '/');
  fetchMock = vi
    .fn()
    .mockImplementation(
      async () => new Response(JSON.stringify({ access_token: 'gho_new', scope: 'gist' })),
    );
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** Puts the tab at a valid OAuth callback, state included. */
function arriveAtCallback(code = 'the-code') {
  sessionStorage.setItem('mdreader:oauth-state', 'st');
  window.history.replaceState({}, '', `/?code=${code}&state=st`);
}

describe('restoring a session', () => {
  it('starts signed out with no stored token', async () => {
    renderAuth(createFakeStorageService());
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('signed-out'));
    expect(screen.getByTestId('has-service')).toHaveTextContent('false');
  });

  it('restores a stored token without calling the network', async () => {
    // Startup must not block on GitHub. The app is fully usable offline, and a
    // revoked token is rare enough to handle when a real call fails instead.
    const storage = createFakeStorageService();
    await storage.setAuth({ accessToken: 'gho_saved', scope: 'gist', login: 'octocat' });

    renderAuth(storage);

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('signed-in'));
    expect(screen.getByTestId('user')).toHaveTextContent('octocat');
    expect(screen.getByTestId('has-service')).toHaveTextContent('true');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reports itself unconfigured when the build has no client id', async () => {
    // A sign-in button that always fails is worse than no button: the user
    // cannot tell a missed deployment step from a broken account.
    renderAuth(createFakeStorageService(), { config: null });
    await waitFor(() => expect(screen.getByTestId('configured')).toHaveTextContent('false'));
  });
});

describe('completing the OAuth callback', () => {
  it('exchanges the code, verifies identity, and stores the token', async () => {
    const storage = createFakeStorageService();
    arriveAtCallback();

    renderAuth(storage, {
      createService: () => createFakeGistService({ user: { login: 'octocat' } }),
    });

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('signed-in'));
    expect(screen.getByTestId('user')).toHaveTextContent('octocat');
    expect(await storage.getAuth()).toMatchObject({
      accessToken: 'gho_new',
      scope: 'gist',
      login: 'octocat',
    });
  });

  it('exchanges the code exactly once under StrictMode', async () => {
    // The highest-risk case in this file. StrictMode double-invokes effects and
    // an authorization code is single-use: a second exchange returns
    // bad_verification_code and would clear the token the first one just stored.
    const storage = createFakeStorageService();
    arriveAtCallback();

    renderAuth(storage, { strict: true });

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('signed-in'));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('exchanges the code exactly once across a genuine remount', async () => {
    // The case the StrictMode test above cannot reach. A ref is per-provider
    // instance, so it does nothing here — what holds is consumeCallback having
    // stripped the code from the address bar, which makes the second mount an
    // ordinary page load. Clearing the stored state is not what saves this:
    // with the code still in the URL the callback path runs again and spends it
    // a second time, and GitHub answers bad_verification_code.
    const storage = createFakeStorageService();
    arriveAtCallback();

    const first = renderAuth(storage);
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('signed-in'));
    first.unmount();

    renderAuth(storage);

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('signed-in'));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not store a token that cannot call the API', async () => {
    // Identity is fetched before the token is persisted, so a token GitHub
    // rejects never reaches storage and the user is not left "signed in" to an
    // account the app cannot actually read.
    const storage = createFakeStorageService();
    arriveAtCallback();
    const failing = createFakeGistService();
    failing.__failNext('getUser', new GistAuthError());

    renderAuth(storage, { createService: () => failing });

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('signed-out'));
    expect(await storage.getAuth()).toBeUndefined();
  });

  it('surfaces a failed exchange and stays signed out', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error_description: 'code expired' }), { status: 400 }),
    );
    const storage = createFakeStorageService();
    arriveAtCallback();

    renderAuth(storage);

    await waitFor(() => expect(screen.getByTestId('error')).toHaveTextContent('code expired'));
    expect(screen.getByTestId('status')).toHaveTextContent('signed-out');
    expect(await storage.getAuth()).toBeUndefined();
  });

  it('reports a rejected state without exchanging anything', async () => {
    // Login CSRF: a crafted callback carrying someone else's code. Nothing may
    // be sent to the Worker.
    sessionStorage.setItem('mdreader:oauth-state', 'expected');
    window.history.replaceState({}, '', '/?code=attacker&state=wrong');

    renderAuth(createFakeStorageService());

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('signed-out'));
    expect(screen.getByTestId('error')).toHaveTextContent(/could not be verified/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reports a declined consent screen', async () => {
    window.history.replaceState({}, '', '/?error=access_denied&error_description=You+declined');
    renderAuth(createFakeStorageService());
    await waitFor(() => expect(screen.getByTestId('error')).toHaveTextContent('You declined'));
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('signing out', () => {
  it('clears the token and drops the service', async () => {
    const storage = createFakeStorageService();
    await storage.setAuth({ accessToken: 'gho_saved', scope: 'gist', login: 'octocat' });
    renderAuth(storage);
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('signed-in'));

    await userEvent.setup().click(screen.getByText('sign-out'));

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('signed-out'));
    expect(screen.getByTestId('has-service')).toHaveTextContent('false');
    expect(await storage.getAuth()).toBeUndefined();
  });

  it('signs out when a call reports the token was revoked', async () => {
    // A 401 can surface from any call anywhere in the app. Centralising the
    // transition here means callers report it rather than each handling it.
    const storage = createFakeStorageService();
    await storage.setAuth({ accessToken: 'gho_saved', scope: 'gist', login: 'octocat' });
    renderAuth(storage);
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('signed-in'));

    reportAuthExpired(new GistAuthError());

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('signed-out'));
    expect(await storage.getAuth()).toBeUndefined();
  });

  it('ignores errors that are not auth failures', async () => {
    // A network blip must not sign the user out.
    const storage = createFakeStorageService();
    await storage.setAuth({ accessToken: 'gho_saved', scope: 'gist', login: 'octocat' });
    renderAuth(storage);
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('signed-in'));

    reportAuthExpired(new TypeError('Failed to fetch'));

    await new Promise((r) => setTimeout(r, 0));
    expect(screen.getByTestId('status')).toHaveTextContent('signed-in');
  });
});
