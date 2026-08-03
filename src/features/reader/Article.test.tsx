import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Article } from './Article';

const renderMd = (source: string) => render(<Article source={source} padding="0" />);

describe('Article callouts', () => {
  it.each([
    ['NOTE', 'Note'],
    ['TIP', 'Tip'],
    ['IMPORTANT', 'Important'],
    ['WARNING', 'Warning'],
    ['CAUTION', 'Caution'],
  ])('renders > [!%s] as a labelled callout', (marker, label) => {
    const { container } = renderMd(`> [!${marker}]\n> Body text here.`);

    const quote = container.querySelector('blockquote');
    expect(quote?.getAttribute('data-callout')).toBe(marker);
    expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.getByText('Body text here.')).toBeInTheDocument();
  });

  it('strips the marker from the rendered body', () => {
    const { container } = renderMd('> [!WARNING]\n> Careful with this.');
    expect(container.textContent).not.toContain('[!WARNING]');
  });

  it('handles a marker sharing the first line with body text', () => {
    const { container } = renderMd('> [!TIP] Inline body.');
    expect(container.querySelector('blockquote')?.getAttribute('data-callout')).toBe('TIP');
    expect(container.textContent).not.toContain('[!TIP]');
    expect(screen.getByText(/Inline body\./)).toBeInTheDocument();
  });

  it('matches the marker case-insensitively', () => {
    const { container } = renderMd('> [!note]\n> Lowercase marker.');
    expect(container.querySelector('blockquote')?.getAttribute('data-callout')).toBe('NOTE');
  });

  it('leaves a plain blockquote untouched', () => {
    const { container } = renderMd('> Just a quote.');
    const quote = container.querySelector('blockquote');
    expect(quote).toBeTruthy();
    expect(quote?.hasAttribute('data-callout')).toBe(false);
    expect(screen.getByText('Just a quote.')).toBeInTheDocument();
  });

  it('does not treat an unknown marker as a callout', () => {
    const { container } = renderMd('> [!BOGUS]\n> Body.');
    expect(container.querySelector('blockquote')?.hasAttribute('data-callout')).toBe(false);
    expect(container.textContent).toContain('[!BOGUS]');
  });
});

describe('Article headings', () => {
  it('renders the chevron accent on h2 and h3 only', () => {
    const { container } = renderMd('# One\n\n## Two\n\n### Three\n\n#### Four');

    expect(container.querySelector('h1 svg')).toBeNull();
    expect(container.querySelector('h2 svg')).toBeTruthy();
    expect(container.querySelector('h3 svg')).toBeTruthy();
    expect(container.querySelector('h4 svg')).toBeNull();
  });

  it('keeps the chevron out of the accessibility tree and preserves heading text', () => {
    renderMd('## Section title');
    expect(screen.getByRole('heading', { level: 2, name: 'Section title' })).toBeInTheDocument();
  });

  it('still assigns TOC ids after the chevron refactor', () => {
    const { container } = renderMd('# Top\n\n## First section\n\n### Nested one');

    expect(container.querySelector('h1')?.getAttribute('data-toc')).toBe('top');
    expect(container.querySelector('h2')?.getAttribute('data-toc')).toBe('first-section');
    expect(container.querySelector('h3')?.getAttribute('data-toc')).toBe('nested-one');
  });
});
