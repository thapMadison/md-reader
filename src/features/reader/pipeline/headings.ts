export interface Heading {
  id: string;
  text: string;
  level: 1 | 2 | 3;
}

// Mirrors the design's slug algorithm (design.html:748-750): lowercase,
// strip non-letter/number/space/hyphen chars, collapse whitespace to hyphens,
// cap at 48 chars. The very first heading in a document is always id "top" so
// the TOC's first entry can jump to the document start.
//
// The character class is Unicode-aware (\p{L}\p{N} rather than \w) because \w
// is ASCII-only: it dropped every accented letter, so "Cài đặt môi trường"
// slugged to "ci-t-mi-trng" and any all-non-Latin heading collapsed to the
// "section" fallback — colliding into section-1, section-2, ... and breaking
// both TOC navigation and #anchor links. NFC normalization first so a decomposed
// "e + combining acute" is composed to "é" and survives the class, rather than
// having its combining mark stripped as punctuation.
export function slugify(text: string): string {
  const slug = text
    .normalize('NFC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 48);
  return slug || 'section';
}

// Assigns a collision-safe id to every heading in document order, deduplicating
// repeats as "-1", "-2", etc. Returns ids for ALL levels (not just H1-H3) so the
// rendered DOM and the TOC can be derived from one pass and cannot disagree.
//
// This is a pure function of the heading list precisely so that ids never depend
// on how many times React renders: assigning them from a counter mutated during
// render breaks under StrictMode/concurrent rendering, which invokes components
// more than once per commit and silently appended "-1" to every heading.
export function assignHeadingIds(nodes: { level: number; text: string }[]): string[] {
  const used: Record<string, number> = {};
  const ids: string[] = [];
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
    ids.push(id);
  }
  return ids;
}

// Maps each heading's source offset to its id. The renderer keys into this by
// the `position` react-markdown hands its heading components, which lets the
// rendered id be looked up rather than counted — the id for a given heading is
// then a property of the document alone and identical no matter how many times
// (or in what order) React renders the component.
export function buildHeadingIdMap(
  nodes: { level: number; text: string; offset: number }[],
): Map<number, string> {
  const ids = assignHeadingIds(nodes);
  return new Map(nodes.map((node, i) => [node.offset, ids[i]]));
}

// Extracts H1-H3 headings for the TOC (H4-H6 are excluded from navigation
// per the design). Ids come from assignHeadingIds over the full list, so a
// skipped H4 still consumes its slug and the TOC's ids keep matching the DOM's.
export function extractHeadings(
  nodes: { level: number; text: string }[],
): Heading[] {
  const ids = assignHeadingIds(nodes);
  const headings: Heading[] = [];

  nodes.forEach((node, i) => {
    if (node.level <= 3) {
      headings.push({ id: ids[i], text: node.text, level: node.level as 1 | 2 | 3 });
    }
  });
  return headings;
}
