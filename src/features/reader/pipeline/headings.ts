export interface Heading {
  id: string;
  text: string;
  level: 1 | 2 | 3;
}

// Mirrors the design's slug algorithm (design.html:748-750): lowercase,
// strip non-word/space/hyphen chars, collapse whitespace to hyphens, cap at
// 48 chars. The very first heading in a document is always id "top" so the
// TOC's first entry can jump to the document start.
export function slugify(text: string): string {
  const slug = text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 48);
  return slug || 'section';
}

// Extracts H1-H3 headings for the TOC (H4-H6 are excluded from navigation
// per the design) and assigns collision-safe slug ids, deduplicating
// repeated headings as "-1", "-2", etc.
export function extractHeadings(
  nodes: { level: number; text: string }[],
): Heading[] {
  const used: Record<string, number> = {};
  const headings: Heading[] = [];
  let isFirst = true;

  for (const node of nodes) {
    let id = isFirst && node.level === 1 ? 'top' : slugify(node.text);
    isFirst = false;
    if (used[id] !== undefined) {
      used[id] += 1;
      id = `${id}-${used[id]}`;
    } else {
      used[id] = 0;
    }
    if (node.level <= 3) {
      headings.push({ id, text: node.text, level: node.level as 1 | 2 | 3 });
    }
  }
  return headings;
}
