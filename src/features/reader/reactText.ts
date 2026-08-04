import type { ReactNode } from 'react';

// Flattens a rendered React subtree to its text content.
//
// Needed because these components receive already-rendered children from
// react-markdown rather than mdast nodes, so `mdast-util-to-string` does not
// apply — heading slugs and the code-block copy button both need the plain
// text of a ReactNode tree.
export function reactNodeToText(node: ReactNode): string {
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(reactNodeToText).join('');
  if (node && typeof node === 'object' && 'props' in node) {
    return reactNodeToText((node as { props: { children?: ReactNode } }).props.children);
  }
  return '';
}
