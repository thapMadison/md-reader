import { StrictMode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Article } from './Article';
import { parseMarkdown } from './pipeline/parse';
import { ThemeProvider } from '@/features/theming/ThemeContext';
import { StorageProvider } from '@/services/storage/StorageContext';
import { createFakeStorageService } from '@/services/storage/fakeStorage';

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

describe('Article callouts via alt attribute', () => {
  it.each([
    ['info', 'NOTE', 'Note'],
    ['success', 'TIP', 'Tip'],
    ['warn', 'WARNING', 'Warning'],
    ['danger', 'CAUTION', 'Caution'],
  ])('renders <blockquote alt="%s"> as a %s callout', (alt, kind, label) => {
    const { container } = renderMd(`<blockquote alt="${alt}">\n\nBody text here.\n\n</blockquote>`);

    const quote = container.querySelector('blockquote');
    expect(quote?.getAttribute('data-callout')).toBe(kind);
    expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.getByText('Body text here.')).toBeInTheDocument();
  });

  it('matches the alt value case-insensitively', () => {
    const { container } = renderMd('<blockquote alt="INFO">\n\nBody.\n\n</blockquote>');
    expect(container.querySelector('blockquote')?.getAttribute('data-callout')).toBe('NOTE');
  });

  it('falls back to a plain blockquote for an unknown alt value', () => {
    const { container } = renderMd('<blockquote alt="bogus">\n\nBody.\n\n</blockquote>');
    const quote = container.querySelector('blockquote');
    expect(quote).toBeTruthy();
    expect(quote?.hasAttribute('data-callout')).toBe(false);
    expect(screen.getByText('Body.')).toBeInTheDocument();
  });

  it('lets an explicit [!MARKER] win over a conflicting alt', () => {
    const { container } = renderMd('<blockquote alt="danger">\n\n[!TIP]\nBody.\n\n</blockquote>');
    expect(container.querySelector('blockquote')?.getAttribute('data-callout')).toBe('TIP');
    expect(container.textContent).not.toContain('[!TIP]');
  });

  it('keeps the body verbatim in the alt form', () => {
    // The alt form has no marker to strip, so nothing should be removed.
    const { container } = renderMd('<blockquote alt="info">\n\nFirst para.\n\nSecond para.\n\n</blockquote>');
    expect(container.textContent).toContain('First para.');
    expect(container.textContent).toContain('Second para.');
  });
});

describe('Article math', () => {
  it('typesets a $$…$$ block once the KaTeX chunk loads', async () => {
    const { container } = renderMd('$$\nE = mc^2\n$$');

    await waitFor(() => expect(container.querySelector('.katex')).toBeTruthy());
    expect(container.querySelector('.katex-display')).toBeTruthy();
  });

  it('survives sanitization — katex markup is not stripped', async () => {
    // rehype-katex runs after rehype-sanitize, and the schema allowlists the
    // katex classes; either half missing would leave the formula bare.
    const { container } = renderMd('$$\na^2 + b^2 = c^2\n$$');

    await waitFor(() => expect(container.querySelector('.katex')).toBeTruthy());
    expect(container.querySelector('.katex-mathml, .katex-html')).toBeTruthy();
  });

  it('leaves currency in prose alone', async () => {
    // Single-dollar math is off, so this must stay literal text.
    const { container } = renderMd('It costs $5 and the other is $10.');

    await waitFor(() => expect(container.textContent).toContain('$5'));
    expect(container.textContent).toContain('$10');
    expect(container.querySelector('.katex')).toBeNull();
  });

  it('renders a document with both a table and a formula', async () => {
    // The remark-math / remark-gfm interaction the two features share.
    const { container } = renderMd('| A | B |\n| --- | --- |\n| $5 | $10 |\n\n$$\nx = 1\n$$');

    await waitFor(() => expect(container.querySelector('.katex')).toBeTruthy());
    expect(container.querySelectorAll('td')).toHaveLength(2);
    expect(container.textContent).toContain('$5');
  });
});

describe('Article tables', () => {
  const table = '| Ngôn ngữ | Mô tả |\n| --- | --- |\n| Tiếng Việt | Một dòng mô tả khá dài |\n| English | Another row |';

  it('lets cells wrap instead of forcing them onto one line', () => {
    // nowrap made any prose table overflow the viewport horizontally.
    const { container } = renderMd(table);

    for (const cell of container.querySelectorAll('th, td')) {
      expect((cell as HTMLElement).style.whiteSpace).not.toBe('nowrap');
    }
  });

  it('uses the table header token for th backgrounds', () => {
    const { container } = renderMd(table);
    expect(container.querySelector('th')?.style.background).toContain('--table-header-bg');
  });

  it('keeps the scroll wrapper for genuinely wide tables', () => {
    const { container } = renderMd(table);
    const wrapper = container.querySelector('table')?.parentElement;
    expect(wrapper?.style.overflowX).toBe('auto');
  });
});

describe('Article raw HTML', () => {
  it('renders kbd, mark and details/summary', () => {
    const { container } = renderMd('Press <kbd>Ctrl</kbd> and <mark>note this</mark>.\n\n<details><summary>More</summary>\n\nHidden body.\n\n</details>');

    expect(container.querySelector('kbd')?.textContent).toBe('Ctrl');
    expect(container.querySelector('mark')?.textContent).toBe('note this');
    expect(container.querySelector('details')).toBeTruthy();
    expect(container.querySelector('summary')?.textContent).toBe('More');
  });

  it('strips a script tag from the document', () => {
    // End-to-end proof that the sanitize step is actually wired into the
    // rendering chain, not merely unit-tested in isolation.
    const { container } = renderMd('Hello\n\n<script>window.pwned = 1;</script>');

    expect(container.querySelector('script')).toBeNull();
    expect(container.textContent).not.toContain('pwned');
    expect(container.textContent).toContain('Hello');
  });

  it('strips inline event handlers and style attributes', () => {
    const { container } = renderMd('<p onclick="alert(1)" style="color:red">text</p>');

    const p = container.querySelector('p');
    expect(p?.hasAttribute('onclick')).toBe(false);
    expect(p?.getAttribute('style')).not.toContain('red');
  });
});

describe('Article images', () => {
  // Markdown wraps an image in a paragraph, so the image's own wrapper must be
  // phrasing content. A block-level wrapper made the browser close the <p>
  // early, splitting the DOM and logging a React nesting error.
  it('wraps images without putting block elements inside the paragraph', () => {
    const { container } = renderMd('![A caption](https://example.com/x.png)');

    expect(container.querySelector('p div')).toBeNull();
    const img = container.querySelector('img');
    expect(img?.closest('p')).not.toBeNull();
    expect(screen.getByText('A caption')).toBeInTheDocument();
  });

  it('keeps the broken-image fallback free of block elements too', async () => {
    const { container } = renderMd('![Broken](https://example.invalid/x.png)');

    fireEvent.error(container.querySelector('img')!);

    expect(await screen.findByText('Image failed to load')).toBeInTheDocument();
    expect(container.querySelector('p div')).toBeNull();
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

  // The chevron sits in the text column rather than hanging in the margin, so
  // it indents the heading it precedes. That indent is the intended trade for
  // having a marker at all, and the alternative (pulling the glyph out of flow)
  // moves it outside the column the eye tracks — so the in-flow arrangement is
  // asserted rather than left to drift.
  it('keeps the chevron in flow so it indents the heading text', () => {
    const { container } = renderMd('## Two');

    const h2 = container.querySelector('h2')!;
    const svg = container.querySelector('h2 svg')! as SVGElement;

    expect(h2).toHaveStyle({ display: 'flex', alignItems: 'flex-start' });
    // The glyph takes real space in the row: sized, unshrinkable, and followed
    // by the gap — no positioning offsets involved.
    expect(svg.style.position).toBe('');
    expect(svg.style.left).toBe('');
    expect(svg).toHaveStyle({ flex: 'none', width: '0.52em', marginRight: '0.42em' });
  });

  it('omits the chevron entirely when the theme zeroes --heading-marker', async () => {
    const storage = createFakeStorageService();
    await storage.setPreferences({ themeId: 'github-light' });

    const { container } = render(
      <StorageProvider service={storage}>
        <ThemeProvider>
          <Article source="## Two\n\n### Three" padding="0" />
        </ThemeProvider>
      </StorageProvider>,
    );

    // Not merely hidden — the element is never created, so long documents pay
    // nothing per heading for a glyph the theme turned off.
    await waitFor(() => {
      expect(container.querySelector('h2 svg')).toBeNull();
    });
    expect(container.querySelector('h3 svg')).toBeNull();
    // And with no glyph the heading is a plain block again, so it carries none
    // of the flex layout that exists only to seat the chevron.
    expect(container.querySelector('h2')?.style.display).toBe('');
  });

  it('still assigns TOC ids after the chevron refactor', () => {
    const { container } = renderMd('# Top\n\n## First section\n\n### Nested one');

    expect(container.querySelector('h1')?.getAttribute('data-toc')).toBe('top');
    expect(container.querySelector('h2')?.getAttribute('data-toc')).toBe('first-section');
    expect(container.querySelector('h3')?.getAttribute('data-toc')).toBe('nested-one');
  });

  it('matches the ids the TOC computes for the same source', () => {
    const source = '# Top\n\n## Cài đặt môi trường\n\n### Chạy thử\n\n## Kết luận';
    const { container } = renderMd(source);

    const domIds = [...container.querySelectorAll('h1,h2,h3')].map((h) => h.id);
    expect(domIds).toEqual(parseMarkdown(source).headings.map((h) => h.id));
  });

  it('numbers repeated headings only for genuine duplicates', () => {
    const { container } = renderMd('# Top\n\n## Notes\n\n## Notes\n\n## Other');

    expect([...container.querySelectorAll('h1,h2')].map((h) => h.id)).toEqual([
      'top',
      'notes',
      'notes-1',
      'other',
    ]);
  });

  // Regression: ids were assigned from a counter mutated during render, so
  // StrictMode's double invocation counted every heading twice and appended a
  // spurious "-1" to all of them, breaking every TOC anchor. The non-StrictMode
  // tests above passed throughout, which is why this one renders in StrictMode.
  it('assigns stable ids under StrictMode double-rendering', () => {
    const source = '# Top\n\n## First section\n\n### Nested one\n\n## Second section';
    const { container } = render(
      <StrictMode>
        <Article source={source} padding="0" />
      </StrictMode>,
    );

    expect([...container.querySelectorAll('h1,h2,h3')].map((h) => h.id)).toEqual([
      'top',
      'first-section',
      'nested-one',
      'second-section',
    ]);
  });

  // remark-gfm appends its own visually-hidden "Footnotes" <h2>. It has no source
  // position, so slugging it minted a second id="footnotes" that collided with the
  // author's real heading of that name (React also warned about the duplicate key).
  it('leaves the generated footnotes label out of the TOC and off the id map', () => {
    const { container } = renderMd('# Top\n\n## Footnotes\n\nRef[^1].\n\n[^1]: note text.');

    const authored = container.querySelector('h2[data-toc]');
    expect(authored?.id).toBe('footnotes');

    // The generated label keeps its own distinct id and stays out of the TOC.
    // (It reads `footnote-label`, not `user-content-footnote-label`: the
    // sanitize schema no longer adds a second `user-content-` prefix — see the
    // clobberPrefix note in pipeline/sanitize.ts.)
    const generated = container.querySelector('h2.sr-only');
    expect(generated?.id).toBe('footnote-label');
    expect(generated?.id).not.toBe(authored?.id);
    expect(generated?.hasAttribute('data-toc')).toBe(false);

    const ids = [...container.querySelectorAll('h1,h2')].map((h) => h.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  // The custom `a` and `li` renderers used to accept only href/className/style
  // and drop everything else, `id` included. Both footnote jumps then landed
  // nowhere, because the anchors they target are exactly those ids.
  it('keeps both ends of the footnote round trip anchored', () => {
    const { container } = renderMd('Ref[^1].\n\n[^1]: note text.');

    const ref = container.querySelector<HTMLAnchorElement>('a[href^="#user-content-fn-"]');
    const definition = container.querySelector('li[id^="user-content-fn-"]');
    expect(ref).not.toBeNull();
    expect(definition).not.toBeNull();
    // The reference's href must name the definition's id, not merely look like it.
    expect(ref!.getAttribute('href')).toBe(`#${definition!.id}`);

    // …and the ↩ button must point back at the reference element itself.
    const backref = container.querySelector<HTMLAnchorElement>('a[href^="#user-content-fnref-"]');
    expect(backref).not.toBeNull();
    expect(ref!.id).not.toBe('');
    expect(backref!.getAttribute('href')).toBe(`#${ref!.id}`);
  });

  it('keeps ids stable when the article re-renders', () => {
    const source = '# Top\n\n## First section\n\n## First section';
    const { container, rerender } = renderMd(source);
    const before = [...container.querySelectorAll('h1,h2')].map((h) => h.id);

    rerender(<Article source={source} padding="1rem" />);

    expect([...container.querySelectorAll('h1,h2')].map((h) => h.id)).toEqual(before);
    expect(before).toEqual(['top', 'first-section', 'first-section-1']);
  });
});
