import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { toString as mdastToString } from 'mdast-util-to-string';
import { visit } from 'unist-util-visit';
import type { Root, Heading as MdastHeading } from 'mdast';
import { buildHeadingIdMap, extractHeadings, type Heading } from './headings';

export interface ParsedDocument {
  /** The mdast root — react-markdown re-parses the source itself for rendering;
   * this tree exists purely for analysis (headings, stats) without touching the DOM. */
  ast: Root;
  headings: Heading[];
  isEmpty: boolean;
}

const analysisProcessor = unified().use(remarkParse).use(remarkGfm);

// Pure markdown -> analysis pipeline. No storage or DOM-file-API imports —
// this is what gets unit-tested. Actual HTML rendering happens separately
// via <ReactMarkdown>, which owns its own parse pass for the DOM output.
export function parseMarkdown(source: string): ParsedDocument {
  const ast = analysisProcessor.parse(source) as Root;

  const rawHeadings: { level: number; text: string }[] = [];
  visit(ast, 'heading', (node: MdastHeading) => {
    rawHeadings.push({ level: node.depth, text: mdastToString(node) });
  });

  return {
    ast,
    headings: extractHeadings(rawHeadings),
    isEmpty: source.trim().length === 0,
  };
}

// Heading source-offset -> id, for the renderer. Built from its own parse of the
// same source so it stays a pure function of the document: <Article> renders
// standalone in tests and does not receive a ParsedDocument.
export function buildHeadingIds(source: string): Map<number, string> {
  const ast = analysisProcessor.parse(source) as Root;
  const nodes: { level: number; text: string; offset: number }[] = [];
  visit(ast, 'heading', (node: MdastHeading) => {
    nodes.push({
      level: node.depth,
      text: mdastToString(node),
      offset: node.position?.start.offset ?? -1,
    });
  });
  return buildHeadingIdMap(nodes);
}
