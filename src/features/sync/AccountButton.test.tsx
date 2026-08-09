import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AccountButton } from './AccountButton';
import { GistAuthProvider } from '@/services/gist/GistContext';
import { createFakeGistService } from '@/services/gist/fakeGist';
import { StorageProvider } from '@/services/storage/StorageContext';
import { createFakeStorageService } from '@/services/storage/fakeStorage';
import type { StorageService } from '@/services/storage/types';

const config = { clientId: 'c', tokenEndpoint: 'https://w.example' };

function renderButton(storage: StorageService, cfg: typeof config | null = config) {
  return render(
    <StorageProvider service={storage}>
      <GistAuthProvider config={cfg} createService={() => createFakeGistService({ user: { login: 'octocat' } })}>
        <AccountButton />
      </GistAuthProvider>
    </StorageProvider>,
  );
}

beforeEach(() => {
  sessionStorage.clear();
  window.history.replaceState({}, '', '/');
  vi.stubGlobal('fetch', vi.fn());
});

// The sign-in test stubs `location`. Left in place it would follow the next
// test into consumeCallback, which reads window.location.search.
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('AccountButton', () => {
  it('offers sign-in when signed out', async () => {
    renderButton(createFakeStorageService());
    await waitFor(() => expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument());
  });

  it('renders nothing when the build has no client id', async () => {
    // A button that always fails is worse than no button: the user cannot tell
    // a missed deployment step from a broken account.
    const { container } = renderButton(createFakeStorageService(), null);
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it('shows the account and signs out on click', async () => {
    const storage = createFakeStorageService();
    await storage.setAuth({ accessToken: 'gho_x', scope: 'gist', login: 'octocat' });

    renderButton(storage);

    const btn = await screen.findByRole('button', { name: /octocat/i });
    await userEvent.setup().click(btn);

    await waitFor(() => expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument());
    expect(await storage.getAuth()).toBeUndefined();
  });

  it('sends the user to GitHub when clicked', async () => {
    const assign = vi.fn();
    vi.stubGlobal('location', { ...window.location, origin: 'https://app.example', assign });

    renderButton(createFakeStorageService());
    await userEvent.setup().click(await screen.findByRole('button', { name: /sign in/i }));

    const url = new URL(assign.mock.calls[0][0] as string);
    expect(url.origin + url.pathname).toBe('https://github.com/login/oauth/authorize');
    // Only `gist`. The token is XSS-reachable in IndexedDB, so a leak must not
    // be able to reach the user's repositories.
    expect(url.searchParams.get('scope')).toBe('gist');
  });

  it('reports a failed sign-in without hiding the retry', async () => {
    // The callback error path. The button has to stay usable: a stale code or a
    // Worker blip is exactly the case where the user should try again.
    window.history.replaceState({}, '', '/?error=access_denied&error_description=You+declined');

    renderButton(createFakeStorageService());

    const btn = await screen.findByRole('button', { name: /sign-in failed/i });
    expect(btn).toHaveAttribute('title', 'You declined');
  });
});
