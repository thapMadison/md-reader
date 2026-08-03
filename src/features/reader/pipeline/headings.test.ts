import { describe, expect, it } from 'vitest';
import { extractHeadings, slugify } from './headings';

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
