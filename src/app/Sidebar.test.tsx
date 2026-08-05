import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createFakeStorageService } from '@/services/storage/fakeStorage';
import { StorageProvider } from '@/services/storage/StorageContext';
import { ThemeProvider } from '@/features/theming/ThemeContext';
import { BUILTIN_THEMES } from '@/themes/builtin';
import { SIDEBAR_FACETS } from './chromePattern';
import { Sidebar } from './Sidebar';
import type { LibraryFile } from '@/features/library/types';

const file = (name: string, over: Partial<LibraryFile> = {}): LibraryFile => ({
  name,
  kind: 'live',
  perm: 'granted',
  originalContent: 'x',
  editedContent: 'x',
  ...over,
});

const setup = (files: LibraryFile[], isDirty: (name: string) => boolean = () => false) => {
  const onClearAll = vi.fn();
  render(
    <Sidebar
      mode="desktop"
      sidebarOpen
      drawerOpen={false}
      onToggleDrawer={() => {}}
      files={files}
      activeName={files[0]?.name ?? null}
      isDirty={isDirty}
      isUnpersisted={() => false}
      onPickFile={() => {}}
      onCloseFile={() => {}}
      onGrantAccess={() => {}}
      onOpenFileClick={() => {}}
      storageUsedBytes={1024 * 1024}
      storageQuotaBytes={10 * 1024 * 1024}
      onClearAll={onClearAll}
    />,
  );
  return { onClearAll };
};

// Scoped to the nav: once the dialog opens, its confirm button shares this label.
const clickClearAll = () =>
  fireEvent.click(within(screen.getByRole('navigation')).getByRole('button', { name: 'Clear all' }));

describe('Sidebar live-file identity line', () => {
  it('shows size and a relative mtime so the user can tell which file this is', () => {
    setup([file('a.md', { size: 2048, lastModified: Date.now() - 5 * 60_000 })]);

    expect(screen.getByText(/2\.0 KB/)).toBeInTheDocument();
    expect(screen.getByText(/5 min ago/)).toBeInTheDocument();
  });

  it('exposes the exact timestamp on hover, since the row only has room for a rough one', () => {
    const lastModified = Date.now() - 5 * 60_000;
    setup([file('a.md', { size: 2048, lastModified })]);

    expect(screen.getByText(/2\.0 KB/).title).toContain(new Date(lastModified).toLocaleString());
  });

  it('omits the line for snapshots, which have no disk file backing them', () => {
    setup([file('a.md', { kind: 'snapshot', perm: 'na', size: undefined })]);

    expect(screen.queryByText(/KB|B$/)).toBeNull();
  });
});

describe('Sidebar clear-all confirmation', () => {
  it('does not clear anything on the first click — it opens a confirmation', () => {
    const { onClearAll } = setup([file('a.md')]);

    clickClearAll();

    expect(onClearAll).not.toHaveBeenCalled();
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });

  it('clears only after the confirm button is pressed', () => {
    const { onClearAll } = setup([file('a.md')]);

    clickClearAll();
    const dialog = screen.getByRole('alertdialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Clear all' }));

    expect(onClearAll).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('cancelling leaves the library untouched and closes the dialog', () => {
    const { onClearAll } = setup([file('a.md')]);

    clickClearAll();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onClearAll).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('closes on Escape without clearing', () => {
    const { onClearAll } = setup([file('a.md')]);

    clickClearAll();
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClearAll).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('focuses Cancel so a stray Enter cannot destroy the library', () => {
    setup([file('a.md')]);

    clickClearAll();

    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cancel' }));
  });

  it('is disabled when there is nothing to clear', () => {
    const { onClearAll } = setup([]);

    const btn = screen.getByRole('button', { name: 'Clear all' });
    expect(btn).toBeDisabled();
    fireEvent.click(btn);

    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(onClearAll).not.toHaveBeenCalled();
  });

  it('warns about unsaved edits and unrecoverable snapshots by name', () => {
    setup(
      [file('a.md'), file('b.md', { kind: 'snapshot' }), file('c.md', { kind: 'snapshot' })],
      (name) => name === 'a.md',
    );

    clickClearAll();

    const msg = screen.getByRole('alertdialog').textContent ?? '';
    expect(msg).toContain('all 3 files');
    expect(msg).toContain('1 file has unsaved edits');
    expect(msg).toContain('2 are snapshots');
    expect(msg).toContain('cannot be undone');
  });

  it('omits the edit and snapshot warnings when neither applies', () => {
    setup([file('a.md')]);

    clickClearAll();

    const msg = screen.getByRole('alertdialog').textContent ?? '';
    expect(msg).toContain('all 1 file');
    expect(msg).not.toContain('unsaved edits');
    expect(msg).not.toContain('snapshot');
  });
});

// --chrome-accent-shape is the chrome half of the angular-geometry work: a theme
// built on diagonals states that in the sidebar by shearing the active row's
// trailing edge. Rendered through a real ThemeProvider rather than by unit
// testing the ternary, because what can actually break is the wiring — the token
// reaching the component — not the two-branch choice itself.
describe('Sidebar active-row accent shape', () => {
  const renderThemed = async (themeId: string) => {
    const storage = createFakeStorageService();
    await storage.setPreferences({ themeId });
    const { container } = render(
      <StorageProvider service={storage}>
        <ThemeProvider>
          <Sidebar
            mode="desktop"
            sidebarOpen
            drawerOpen={false}
            onToggleDrawer={() => {}}
            files={[file('a.md'), file('b.md')]}
            activeName="a.md"
            isDirty={() => false}
            isUnpersisted={() => false}
            onPickFile={() => {}}
            onCloseFile={() => {}}
            onGrantAccess={() => {}}
            onOpenFileClick={() => {}}
            storageUsedBytes={0}
            storageQuotaBytes={10 * 1024 * 1024}
            onClearAll={() => {}}
          />
        </ThemeProvider>
      </StorageProvider>,
    );
    // The provider loads preferences asynchronously, so the first paint is the
    // default theme regardless of what was seeded. Waiting on the *seeded*
    // theme's own --bg rather than merely on --bg being non-empty: the default
    // theme sets --bg too, so the looser condition is satisfied by the very
    // paint this is supposed to wait past, and a test reading the DOM instead of
    // React state would see the default theme's tokens.
    const expectedBg = BUILTIN_THEMES.find((t) => t.id === themeId)!.tokens['--bg'];
    await waitFor(() =>
      expect(document.documentElement.style.getPropertyValue('--bg')).toBe(expectedBg),
    );
    return container;
  };

  // Rows are found by their filename cell and walked up to the row container,
  // rather than by a test id: the shape belongs to the element that paints the
  // highlight, and pinning that relationship is part of what the test guards.
  const rowOf = (container: HTMLElement, name: string) =>
    within(container).getByTitle(name).closest('div')?.parentElement as HTMLElement;

  it('shears the active row when the theme asks for a wedge', async () => {
    const container = await renderThemed('azure-corporate');
    const active = rowOf(container, 'a.md');

    // Square on the left, cut on the right: the edge the highlight starts from
    // stays flat and the trailing edge shears. The depth is deliberately shallow
    // — see WEDGE_ROW — so this pins the asymmetry rather than the exact number.
    expect(active.style.borderRadius).toBe('0 8px 8px 0');
    expect(active.style.getPropertyValue('corner-shape')).toBe('bevel');
  });

  it('leaves inactive rows unshaped, since a transparent row has nothing to cut', async () => {
    const container = await renderThemed('azure-corporate');

    expect(rowOf(container, 'b.md').style.getPropertyValue('corner-shape')).toBe('');
  });

  it('keeps the plain rounded row on themes that did not opt in', async () => {
    const container = await renderThemed('github-light');
    const active = rowOf(container, 'a.md');

    expect(active.style.borderRadius).toBe('6px');
    expect(active.style.getPropertyValue('corner-shape')).toBe('');
  });

  // Whichever built-in currently asks for the planes, found by its token rather
  // than named here. A built-in's pattern is a design choice its author is free
  // to change — an earlier version of these tests hardcoded azure-corporate, and
  // switching that theme to `notched` turned one test red and quietly made the
  // pointer-events test below vacuous by leaving it nothing to iterate.
  const facetThemeId = BUILTIN_THEMES.find((t) => t.tokens['--chrome-pattern'] === 'facet')?.id;

  // The planes are one pattern among several now, so which themes paint them is
  // a decision made in JS rather than by a zero-alpha color. Both halves are
  // asserted — the layers are there, and the fill underneath is not replaced by
  // them.
  it.runIf(facetThemeId)('paints the planes over the chrome fill rather than instead of it', async () => {
    const container = await renderThemed(facetThemeId!);
    const nav = within(container).getByRole('navigation');

    // background-color, not the `background` shorthand — jsdom discards the
    // shorthand when it carries a var(), so this is the only readable assertion
    // that the fill beneath the planes survives.
    expect(nav.style.backgroundColor).toBe('var(--chrome)');
    expect(nav.querySelectorAll('[data-chrome-facet]')).toHaveLength(SIDEBAR_FACETS.length);
  });

  // The inverse of the test above, and the reason facets moved behind
  // --chrome-pattern: a theme that does not ask for them gets no facet markup at
  // all, rather than nine layers painting transparent gradients. github-light
  // asks for `none`, so the panel is bare.
  it('paints no planes at all on a theme that did not opt in', async () => {
    const container = await renderThemed('github-light');

    expect(
      within(container).getByRole('navigation').querySelectorAll('[data-chrome-facet]'),
    ).toHaveLength(0);
    expect(document.documentElement.style.getPropertyValue('--chrome-pattern')).toBe('none');
  });

  // The planes are decoration layered over the whole panel, so the one way they
  // can break the app rather than merely look wrong is by eating clicks meant
  // for the file rows underneath. That is a property of every layer, not of the
  // one that happens to be on top, so all of them are checked — and the count is
  // asserted first, so this cannot pass by having found none.
  it.runIf(facetThemeId)('never intercepts a click meant for the file list', async () => {
    const container = await renderThemed(facetThemeId!);
    const layers = within(container)
      .getByRole('navigation')
      .querySelectorAll<HTMLElement>('[data-chrome-facet]');

    expect(layers).toHaveLength(SIDEBAR_FACETS.length);
    for (const layer of layers) {
      expect(layer.style.pointerEvents).toBe('none');
    }
  });
});
