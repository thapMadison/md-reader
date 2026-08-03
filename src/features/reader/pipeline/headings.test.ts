import { describe, expect, it } from 'vitest';
import { buildHeadingIdMap, extractHeadings, slugify } from './headings';

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('The Parsing Pipeline')).toBe('the-parsing-pipeline');
  });

  it('strips punctuation', () => {
    expect(slugify('Why plain text wins!')).toBe('why-plain-text-wins');
  });

  it('caps at 48 chars', () => {
    const long = 'a'.repeat(60);
    expect(slugify(long)).toHaveLength(48);
  });

  it('falls back to "section" for an empty/symbol-only heading', () => {
    expect(slugify('***')).toBe('section');
  });

  // \w is ASCII-only, so the previous implementation stripped every accented
  // letter: "Cài đặt môi trường" became "ci-t-mi-trng".
  it('preserves accented letters', () => {
    expect(slugify('Cài đặt môi trường')).toBe('cài-đặt-môi-trường');
    expect(slugify('Café résumé')).toBe('café-résumé');
  });

  it('preserves non-Latin scripts instead of collapsing them to "section"', () => {
    expect(slugify('二级标题')).toBe('二级标题');
    expect(slugify('한국어 제목')).toBe('한국어-제목');
  });

  it('composes decomposed accents so combining marks are not stripped', () => {
    // "Cà" written as C + a + U+0300 combining grave.
    expect(slugify('Cài')).toBe(slugify('Cài'));
  });

  it('still strips punctuation from accented headings', () => {
    expect(slugify('Cài đặt (bước 1)!')).toBe('cài-đặt-bước-1');
  });

  it('caps at 48 chars for multi-byte text', () => {
    expect(slugify('đ'.repeat(60))).toHaveLength(48);
  });
});

describe('extractHeadings', () => {
  it('assigns "top" to the first heading when it is H1', () => {
    const headings = extractHeadings([{ level: 1, text: 'Intro' }]);
    expect(headings[0].id).toBe('top');
  });

  it('handles nested H1/H2/H3 structure', () => {
    const headings = extractHeadings([
      { level: 1, text: 'Title' },
      { level: 2, text: 'Section A' },
      { level: 3, text: 'Subsection A.1' },
      { level: 2, text: 'Section B' },
    ]);
    expect(headings.map((h) => h.level)).toEqual([1, 2, 3, 2]);
    expect(headings.map((h) => h.id)).toEqual(['top', 'section-a', 'subsection-a1', 'section-b']);
  });

  it('deduplicates identical headings with numeric suffixes', () => {
    const headings = extractHeadings([
      { level: 2, text: 'Overview' },
      { level: 2, text: 'Overview' },
      { level: 2, text: 'Overview' },
    ]);
    expect(headings.map((h) => h.id)).toEqual(['overview', 'overview-1', 'overview-2']);
  });

  it('returns an empty list when there are no headings', () => {
    expect(extractHeadings([])).toEqual([]);
  });

  // Previously every accented-only heading slugged to "section", so distinct
  // Vietnamese headings collided into section / section-1 / section-2 and the
  // TOC could not link to any of them correctly.
  it('gives distinct ids to distinct Vietnamese headings', () => {
    const headings = extractHeadings([
      { level: 2, text: 'Cài đặt môi trường' },
      { level: 2, text: 'Chạy thử' },
      { level: 2, text: 'Kết luận' },
    ]);
    expect(headings.map((h) => h.id)).toEqual(['cài-đặt-môi-trường', 'chạy-thử', 'kết-luận']);
  });

  it('excludes H4-H6 from the TOC', () => {
    const headings = extractHeadings([
      { level: 1, text: 'Title' },
      { level: 4, text: 'Deep note' },
      { level: 5, text: 'Deeper note' },
      { level: 6, text: 'Deepest note' },
    ]);
    expect(headings).toEqual([{ id: 'top', text: 'Title', level: 1 }]);
  });
});

describe('buildHeadingIdMap', () => {
  it('maps each heading offset to the id extractHeadings gives it', () => {
    const nodes = [
      { level: 1, text: 'Title', offset: 0 },
      { level: 2, text: 'Overview', offset: 10 },
      { level: 2, text: 'Overview', offset: 30 },
    ];
    const map = buildHeadingIdMap(nodes);
    expect([...map.values()]).toEqual(['top', 'overview', 'overview-1']);
    // Same ids the TOC will render, so anchors and nav agree.
    const toc = extractHeadings(nodes);
    expect(toc.map((h) => h.id)).toEqual([...map.values()]);
  });

  // H4-H6 never reach the TOC but they DO render, so they must still consume
  // their slug — otherwise an h4 "Overview" and a later h2 "Overview" would both
  // claim id "overview" and the TOC link would jump to the wrong element.
  it('lets TOC-excluded headings consume their slug', () => {
    const map = buildHeadingIdMap([
      { level: 1, text: 'Title', offset: 0 },
      { level: 4, text: 'Overview', offset: 10 },
      { level: 2, text: 'Overview', offset: 30 },
    ]);
    expect(map.get(10)).toBe('overview');
    expect(map.get(30)).toBe('overview-1');
    expect(extractHeadings([
      { level: 1, text: 'Title' },
      { level: 4, text: 'Overview' },
      { level: 2, text: 'Overview' },
    ]).map((h) => h.id)).toEqual(['top', 'overview-1']);
  });

  it('is idempotent — repeated calls yield identical ids', () => {
    const nodes = [
      { level: 1, text: 'Title', offset: 0 },
      { level: 2, text: 'Notes', offset: 10 },
    ];
    expect([...buildHeadingIdMap(nodes).values()]).toEqual([...buildHeadingIdMap(nodes).values()]);
  });
});
