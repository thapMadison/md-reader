import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from './ConfirmDialog';

const props = {
  title: 'Delete it?',
  confirmLabel: 'Delete',
  onConfirm: vi.fn(),
  onCancel: vi.fn(),
};

describe('ConfirmDialog body copy', () => {
  it('renders a plain string as one paragraph, as it always has', () => {
    render(<ConfirmDialog {...props} message="Gone for good." />);

    expect(screen.getByRole('alertdialog').textContent).toContain('Gone for good.');
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });

  it('gives each consequence its own line so none of them can be skimmed past', () => {
    render(
      <ConfirmDialog
        {...props}
        message={[{ text: 'First thing.' }, { text: 'Second thing.', severe: true }]}
      />,
    );

    const items = screen.getAllByRole('listitem');
    expect(items.map((li) => li.textContent)).toEqual(['First thing.', 'Second thing.']);
  });

  it('colours only the consequences with no way back', () => {
    render(
      <ConfirmDialog
        {...props}
        message={[{ text: 'Recoverable.' }, { text: 'Not recoverable.', severe: true }]}
      />,
    );

    const [calm, severe] = screen.getAllByRole('listitem');
    expect(severe.style.color).toBe('var(--danger)');
    // The contrast is the whole mechanism. Colour every line and the emphasis
    // conveys nothing — a dialog where everything is urgent reads as one where
    // nothing is.
    expect(calm.style.color).not.toBe('var(--danger)');
  });

  it('still describes the dialog to a screen reader after the switch to a list', () => {
    // `aria-describedby` moved from the <p> to the <ul>. Miss that and the
    // dialog announces its title and buttons with no stated consequence at all
    // — the failure is silent for everyone who can see the screen.
    render(
      <ConfirmDialog {...props} message={[{ text: 'First thing.' }, { text: 'Second thing.' }]} />,
    );

    const dialog = screen.getByRole('alertdialog');
    const described = document.getElementById(dialog.getAttribute('aria-describedby') ?? '');
    expect(described).not.toBeNull();
    // Read in full and in order: the subtree is what gets announced.
    expect(described?.textContent).toBe('First thing.Second thing.');
  });

  it('keeps the markers out of the text, since they carry no meaning of their own', () => {
    render(
      <ConfirmDialog {...props} message={[{ text: 'A thing.', severe: true }, { text: 'Another.' }]} />,
    );

    // Drawn with a border-radius, not written as a bullet character: a text
    // node would be read out mid-sentence and would show up in every
    // textContent assertion the call sites make.
    for (const item of screen.getAllByRole('listitem')) {
      expect(item.querySelector('[data-marker]')).toHaveAttribute('aria-hidden', 'true');
    }
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual(['A thing.', 'Another.']);
  });

  it('marks severity by shape as well as colour', () => {
    // Colour alone excludes anyone who cannot distinguish it — and the theme
    // system lets --danger be redefined to something with little contrast
    // against --muted. Filled versus hollow survives both.
    render(
      <ConfirmDialog {...props} message={[{ text: 'Calm.' }, { text: 'Severe.', severe: true }]} />,
    );

    const markerIn = (li: HTMLElement) => li.querySelector('[data-marker]') as HTMLElement;
    const [calm, severe] = screen.getAllByRole('listitem');
    expect(markerIn(severe).style.background).toBe('currentcolor');
    expect(markerIn(calm).style.background).toBe('transparent');
  });
});

describe('ConfirmDialog safety behaviour', () => {
  it('focuses Cancel, so a stray Enter does not confirm a destructive action', () => {
    render(<ConfirmDialog {...props} message="Gone for good." danger />);

    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cancel' }));
  });

  it('cancels on Escape', () => {
    const onCancel = vi.fn();
    render(<ConfirmDialog {...props} onCancel={onCancel} message="Gone for good." />);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
