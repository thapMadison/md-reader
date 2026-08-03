import { describe, expect, it } from 'vitest';
import { parseMarkdown } from './parse';

describe('parseMarkdown', () => {
  it('extracts headings from real markdown source', () => {
    const doc = parseMarkdown('# Title\n\nBody text.\n\n## Section A\n\ncontent\n\n### Sub A.1\n');
    expect(doc.headings.map((h) => h.id)).toEqual(['top', 'section-a', 'sub-a1']);
    expect(doc.isEmpty).toBe(false);
  });

  it('excludes H4-H6 from headings', () => {
    const doc = parseMarkdown('# Title\n\n#### Deep\n\n##### Deeper\n');
    expect(doc.headings).toHaveLength(1);
  });

  it('reports isEmpty for blank/whitespace-only source', () => {
    expect(parseMarkdown('').isEmpty).toBe(true);
    expect(parseMarkdown('   \n\n  ').isEmpty).toBe(true);
  });

  it('reports no headings for a document without any', () => {
    const doc = parseMarkdown('Just a paragraph, no headings here.');
    expect(doc.headings).toEqual([]);
  });

  it('handles GFM tables via remark-gfm without throwing', () => {
    const doc = parseMarkdown('| A | B |\n| --- | --- |\n| 1 | 2 |\n');
    expect(doc.ast.type).toBe('root');
  });
});
