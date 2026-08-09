import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { OverflowMenu } from './OverflowMenu';
import { GistAuthProvider } from '@/services/gist/GistContext';
import { createFakeGistService } from '@/services/gist/fakeGist';
import { StorageProvider } from '@/services/storage/StorageContext';
import { createFakeStorageService } from '@/services/storage/fakeStorage';
import type { StorageService } from '@/services/storage/types';

const config = { clientId: 'c', tokenEndpoint: 'https://w.example' };

function renderMenu(storage: StorageService, showLabel?: boolean) {
  return render(
    <StorageProvider service={storage}>
      <GistAuthProvider config={config} createService={() => createFakeGistService({ user: { login: 'octocat' } })}>
        <OverflowMenu themeName="GitHub Light" themeDots={[]} onOpenThemes={vi.fn()} showLabel={showLabel} />
      </GistAuthProvider>
    </StorageProvider>,
  );
}

async function signedIn() {
  const storage = createFakeStorageService();
  await storage.setAuth({ accessToken: 'gho_x', scope: 'gist', login: 'octocat' });
  return storage;
}

describe('OverflowMenu trigger', () => {
  it('names the signed-in account next to the avatar', async () => {
    renderMenu(await signedIn());
    await waitFor(() => expect(screen.getByText('octocat')).toBeInTheDocument());
  });

  it('says "Settings" while signed out, next to the GitHub mark', () => {
    // The mark alone used to be a gear that read as a stray dot at this size —
    // nothing said "click here to sign in". The word is what makes the trigger
    // legible on a first visit, when there is no avatar yet to lean on.
    renderMenu(createFakeStorageService());
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('drops the label when told to, keeping only the icon', async () => {
    // The mobile toolbar's case: three controls with no width for a word, the
    // icon alone still carrying the fact — GitHub's mark for "sign in here",
    // the avatar for "this is your account".
    renderMenu(await signedIn(), false);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /account and appearance/i })).toBeInTheDocument(),
    );
    expect(screen.queryByText('octocat')).not.toBeInTheDocument();

    cleanup();
    renderMenu(createFakeStorageService(), false);
    expect(screen.queryByText('Settings')).not.toBeInTheDocument();
  });
});
