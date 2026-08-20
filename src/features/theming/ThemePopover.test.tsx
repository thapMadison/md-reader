import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createFakeStorageService } from '@/services/storage/fakeStorage';
import { StorageProvider } from '@/services/storage/StorageContext';
import { BUILTIN_THEMES } from '@/themes/builtin';
import { ThemeProvider } from './ThemeContext';
import { ThemePopover } from './ThemePopover';

function open(onClose = vi.fn()) {
  const anchor = document.createElement('button');
  document.body.appendChild(anchor);
  const user = userEvent.setup();
  render(
    <StorageProvider service={createFakeStorageService()}>
      <ThemeProvider>
        <ThemePopover anchor={anchor} onClose={onClose} />
      </ThemeProvider>
    </StorageProvider>,
  );
  return { user, onClose };
}

const list = () => screen.getByRole('dialog', { name: 'Themes' });
const rowNames = () =>
  within(list())
    .getAllByRole('button')
    .map((b) => b.textContent?.trim() ?? '')
    .filter((t) => BUILTIN_THEMES.some((x) => x.name === t));
/** The row whose theme is currently applied — the only one carrying aria-current. */
const appliedName = () => within(list()).getByRole('button', { current: true }).textContent?.trim();

describe('theme picker', () => {
  it('focuses the search field once the panel has been positioned', async () => {
    // Regression: the focus call used to run on mount, while the panel was still
    // `visibility: hidden` waiting to be measured. A hidden element cannot take
    // focus, so it landed on nothing and left the document on <body> — which also
    // meant every keystroke below did nothing.
    open();
    await waitFor(() => expect(screen.getByLabelText('Search themes')).toHaveFocus());
  });

  it('filters the list by name', async () => {
    const { user } = open();
    expect(rowNames().length).toBe(BUILTIN_THEMES.length);

    await user.type(screen.getByLabelText('Search themes'), 'konayuki');
    expect(rowNames()).toEqual(BUILTIN_THEMES.filter((t) => t.name.startsWith('Konayuki')).map((t) => t.name));
  });

  it('filters the list by mode', async () => {
    const { user } = open();
    await user.click(screen.getByRole('button', { name: 'Light' }));

    expect(rowNames()).toEqual(BUILTIN_THEMES.filter((t) => t.mode === 'light').map((t) => t.name));
  });

  it('offers a way out when nothing matches', async () => {
    const { user } = open();
    await user.type(screen.getByLabelText('Search themes'), 'nothing-is-called-this');
    expect(rowNames()).toEqual([]);

    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(rowNames().length).toBe(BUILTIN_THEMES.length);
  });

  it('applies the theme under the arrow-key cursor on Enter', async () => {
    const { user } = open();
    await waitFor(() => expect(screen.getByLabelText('Search themes')).toHaveFocus());
    const first = appliedName();

    await user.keyboard('{ArrowDown}{ArrowDown}');
    // Still nothing applied — the cursor is a preview, not a selection.
    expect(appliedName()).toBe(first);

    await user.keyboard('{Enter}');
    await waitFor(() => expect(appliedName()).not.toBe(first));
  });

  it('narrows what the arrows can reach to the visible rows', async () => {
    const { user } = open();
    await user.type(screen.getByLabelText('Search themes'), 'konayuki dark');
    await user.keyboard('{ArrowDown}{Enter}');

    await waitFor(() => expect(appliedName()).toBe('Konayuki Dark'));
  });

  it('closes on Escape', async () => {
    const { user, onClose } = open();
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });
});
