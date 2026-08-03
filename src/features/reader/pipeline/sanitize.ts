import { defaultSchema } from 'hast-util-sanitize';
import type { Options as SanitizeSchema } from 'rehype-sanitize';

/**
 * Sanitization schema for author-supplied raw HTML in markdown.
 *
 * Enabling `rehype-raw` means arbitrary HTML from a `.md` file reaches the DOM,
 * so this schema is the boundary that keeps that safe. It starts from
 * `hast-util-sanitize`'s `defaultSchema` (an allowlist — anything not named is
 * dropped) and widens it only where the reader genuinely needs it.
 *
 * Two things are deliberately NOT allowed, and both matter beyond ordinary XSS:
 *
 *  - `style` attributes and `<style>` elements. The theming system's whole
 *    security posture is that theme values reach the page only via
 *    `style.setProperty` against a fixed token allowlist (see architecture.md).
 *    Letting a document carry its own CSS would route around that allowlist
 *    entirely, so raw CSS never enters through this path.
 *  - `script`, `iframe`, `object`, `embed`, and every `on*` handler — these are
 *    already absent from `defaultSchema`, and nothing here adds them back.
 *
 * The schema is a plain data object with no DOM access, which is what lets it
 * live in `pipeline/` and be unit-tested directly.
 */

// Allowed class names, as exact strings or regexes.
//
// NOTE: hast-util-sanitize has no glob support in attribute-value allowlists —
// a literal 'hljs-*' matches nothing at all. Prefix matching must be a RegExp.
// (`language-*` appearing to work in the default schema is a separate,
// special-cased path, not evidence of general globbing.)
//
// This list is required, not optional polish: defaultSchema allows NO className
// on <span> and strips bare `hljs` from <code>, so without these entries
// sanitize would quietly delete every highlight class and code blocks would
// render as flat uncolored text — the exact dead-token state this work removes.
// `function_` / `class_` are the bare modifiers highlight.js pairs with
// `hljs-title`.
const HIGHLIGHT_CLASSES = ['hljs', 'function_', 'class_', /^hljs-/];

// KaTeX renders into spans carrying `katex*` classes, plus MathML annotation
// elements. Listed here so display math survives sanitization.
const MATH_CLASSES = [/^katex/, /^mord/, /^mrel/, /^mbin/, /^mopen/, /^mclose/, /^mpunct/, /^minner/, /^mspace/, /^vlist/, /^base$/, /^strut$/, /^math$/];

export const sanitizeSchema: SanitizeSchema = {
  ...defaultSchema,
  // Remove these subtrees wholesale. Disallowed elements are otherwise merely
  // unwrapped, which leaks their text: `<style>body{...}</style>` would drop the
  // tag but leave `body{...}` as visible literal text in the article. Inert,
  // but wrong-looking — `strip` discards the content along with the element.
  strip: ['script', 'style', 'iframe', 'object', 'embed', 'template', 'noscript'],
  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    // Not in defaultSchema; all are inert, presentational elements.
    'mark',
    'figure',
    'figcaption',
    'abbr',
    'time',
    // KaTeX emits MathML alongside its HTML fallback.
    'math',
    'semantics',
    'annotation',
    'mrow',
    'mi',
    'mn',
    'mo',
    'msup',
    'msub',
    'mfrac',
    'msqrt',
    'mtext',
    'mspace',
  ],
  attributes: {
    ...defaultSchema.attributes,
    // `alt` is already permitted globally by defaultSchema, which is what lets
    // <blockquote alt="info"> through; it is repeated here so the callout
    // feature does not depend on an upstream default staying put.
    blockquote: [...(defaultSchema.attributes?.blockquote ?? []), 'alt'],
    // These four deliberately do NOT spread the defaultSchema entry. Its
    // `code: [['className', {}]]` is a tuple with an empty value allowlist, and
    // an earlier tuple for the same attribute wins — spreading it in would
    // cancel the classes added here.
    span: [['className', ...HIGHLIGHT_CLASSES, ...MATH_CLASSES]],
    code: [['className', /^language-/, ...HIGHLIGHT_CLASSES]],
    pre: [['className', ...HIGHLIGHT_CLASSES]],
    div: [['className', ...MATH_CLASSES]],
    // `open` lets an author ship an expanded <details>.
    details: [...(defaultSchema.attributes?.details ?? []), 'open'],
    annotation: ['encoding'],
    math: ['xmlns', 'display'],
  },
};
