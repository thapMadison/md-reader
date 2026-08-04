export type TokenType = 'color' | 'length' | 'font-stack';

// The one length token, `--heading-marker`, doubles as the chevron's on/off
// switch: a theme sets it to `0` to drop the glyph entirely, or to an em length
// to size it. Expressed as a length rather than a boolean because the contract
// already carries typed lengths, and because a theme keeping the chevron may
// still want to tune how far it indents the heading it precedes — one number
// covers both the switch and the size.

export interface TokenSpec {
  name: string;
  type: TokenType;
  description: string;
  default: string;
}

// Single source of truth for every themeable token. Generator scripts, the zod
// schema, contract.md, and theme-schema.json all derive from this array —
// add a token here once and it propagates everywhere.
export const TOKEN_CONTRACT: readonly TokenSpec[] = [
  // Surface
  { name: '--bg', type: 'color', description: 'Reading canvas background', default: '#ffffff' },
  { name: '--chrome', type: 'color', description: 'Toolbar, sidebar, and editor-pane background', default: '#f6f8fa' },
  { name: '--border', type: 'color', description: 'Hairline borders and dividers', default: '#d1d9e0' },
  { name: '--code-bg', type: 'color', description: 'Inline code and code-block background', default: '#f6f8fa' },
  { name: '--quote-bg', type: 'color', description: 'Blockquote background wash', default: 'rgba(9,105,218,0.05)' },
  { name: '--hl', type: 'color', description: 'Hover / active row highlight', default: 'rgba(9,105,218,0.08)' },
  { name: '--edge-shadow', type: 'color', description: 'Wide-table horizontal-scroll edge fade', default: 'rgba(31,35,40,0.12)' },
  { name: '--chrome-fg', type: 'color', description: 'Primary text and icons on chrome surfaces', default: '#1f2328' },
  { name: '--chrome-muted', type: 'color', description: 'Secondary text and metadata on chrome surfaces', default: '#59636e' },
  { name: '--chrome-border', type: 'color', description: 'Hairlines and control outlines on chrome surfaces', default: '#d1d9e0' },
  { name: '--chrome-hl', type: 'color', description: 'Hover / active row highlight on chrome surfaces', default: 'rgba(9,105,218,0.08)' },

  // Text
  { name: '--fg', type: 'color', description: 'Primary text color', default: '#1f2328' },
  { name: '--muted', type: 'color', description: 'Secondary text, metadata, placeholders', default: '#59636e' },
  { name: '--link', type: 'color', description: 'Links, active states, primary accent', default: '#0969da' },

  // Article text. Deliberately separate from --fg, which also colors chrome:
  // recoloring the article shouldn't drag the toolbar and sidebar along with it.
  // Each level gets its own token so a theme can tint h1 without touching h3.
  { name: '--body-fg', type: 'color', description: 'Article body text', default: '#1f2328' },
  { name: '--h1-fg', type: 'color', description: 'Level-1 heading text', default: '#1f2328' },
  { name: '--h2-fg', type: 'color', description: 'Level-2 heading text', default: '#1f2328' },
  { name: '--h3-fg', type: 'color', description: 'Level-3 heading text', default: '#1f2328' },
  { name: '--h4-fg', type: 'color', description: 'Level-4 heading text', default: '#1f2328' },
  { name: '--h5-fg', type: 'color', description: 'Level-5 heading text', default: '#1f2328' },
  { name: '--h6-fg', type: 'color', description: 'Level-6 heading text', default: '#59636e' },

  // Block accents — blockquote, code block chrome, heading accents
  { name: '--quote-accent', type: 'color', description: 'Blockquote left accent bar', default: '#0969da' },
  { name: '--quote-fg', type: 'color', description: 'Blockquote body text', default: '#1f2328' },
  { name: '--code-header-bg', type: 'color', description: 'Code block header strip background', default: '#f6f8fa' },
  { name: '--code-header-fg', type: 'color', description: 'Code block language label and header text', default: '#59636e' },
  { name: '--heading-accent', type: 'color', description: 'Heading chevron accent, leading tone', default: '#0969da' },
  { name: '--heading-accent-soft', type: 'color', description: 'Heading chevron accent, trailing tone', default: 'rgba(9,105,218,0.35)' },
  // Per-level chevron overrides. One chevron serves both h2 and h3, so a theme
  // that colors those levels differently can't dress the glyph from a single
  // accent without clashing with one of them. These default to the shared
  // --heading-accent pair, so a theme only sets them when it wants the split.
  { name: '--h2-accent', type: 'color', description: 'Level-2 chevron, leading tone', default: '#0969da' },
  { name: '--h2-accent-soft', type: 'color', description: 'Level-2 chevron, trailing tone', default: 'rgba(9,105,218,0.35)' },
  { name: '--h3-accent', type: 'color', description: 'Level-3 chevron, leading tone', default: '#0969da' },
  { name: '--h3-accent-soft', type: 'color', description: 'Level-3 chevron, trailing tone', default: 'rgba(9,105,218,0.35)' },
  // Width of the h2/h3 chevron. `0` removes the glyph and the space it reserves,
  // for themes that would rather carry hierarchy on color and size alone.
  { name: '--heading-marker', type: 'length', description: 'Heading chevron width; 0 hides the chevron', default: '0.52em' },
  { name: '--heading-rule', type: 'color', description: 'Underline rule beneath level-2 headings', default: '#d1d9e0' },
  { name: '--badge-bg', type: 'color', description: 'Inline code and chip background', default: '#f6f8fa' },

  // Tables
  { name: '--table-header-bg', type: 'color', description: 'Table header row background', default: '#f6f8fa' },
  { name: '--table-row-alt', type: 'color', description: 'Alternating (even) table row background', default: 'rgba(9,105,218,0.03)' },

  // Math (KaTeX)
  { name: '--math-fg', type: 'color', description: 'Math formula text', default: '#1f2328' },
  { name: '--math-bg', type: 'color', description: 'Display-math ($$…$$) block background', default: 'rgba(9,105,218,0.04)' },

  // Feedback
  { name: '--danger', type: 'color', description: 'Errors and destructive hover states', default: '#cf222e' },
  { name: '--danger-bg', type: 'color', description: 'Error banner / badge background wash', default: 'rgba(207,34,46,0.06)' },
  { name: '--warn', type: 'color', description: 'Warnings and caution callout accent', default: '#9a6700' },
  { name: '--warn-bg', type: 'color', description: 'Warning callout background wash', default: 'rgba(154,103,0,0.06)' },
  { name: '--ok', type: 'color', description: 'Success and tip callout accent', default: '#1a7f37' },
  { name: '--ok-bg', type: 'color', description: 'Success callout background wash', default: 'rgba(26,127,55,0.06)' },

  // Syntax highlighting. Each token maps to a group of highlight.js classes in
  // index.css — see the `.hljs-*` block there for the exact mapping.
  { name: '--syn-kw', type: 'color', description: 'Syntax: keywords', default: '#cf222e' },
  { name: '--syn-str', type: 'color', description: 'Syntax: strings', default: '#0a3069' },
  { name: '--syn-fn', type: 'color', description: 'Syntax: function names', default: '#8250df' },
  { name: '--syn-cm', type: 'color', description: 'Syntax: comments', default: '#6e7781' },
  { name: '--syn-num', type: 'color', description: 'Syntax: numbers', default: '#0550ae' },
  { name: '--syn-type', type: 'color', description: 'Syntax: types and class names', default: '#953800' },
  { name: '--syn-op', type: 'color', description: 'Syntax: operators and punctuation', default: '#0550ae' },
  { name: '--syn-var', type: 'color', description: 'Syntax: variables and template substitutions', default: '#953800' },
  { name: '--syn-attr', type: 'color', description: 'Syntax: attributes, object keys, CSS selectors', default: '#0550ae' },
  { name: '--syn-tag', type: 'color', description: 'Syntax: HTML/XML tags and CSS element selectors', default: '#116329' },
  { name: '--syn-meta', type: 'color', description: 'Syntax: decorators, preprocessor, shebang', default: '#6e7781' },
  { name: '--syn-lit', type: 'color', description: 'Syntax: literals (true/false/null) and symbols', default: '#0550ae' },

  // Fonts
  {
    name: '--font-ui',
    type: 'font-stack',
    description: 'Toolbar, sidebar, and other chrome UI text',
    default: "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,sans-serif",
  },
  {
    name: '--font-body',
    type: 'font-stack',
    description: 'Article body text — the only token that varies per theme beyond color',
    default: "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,sans-serif",
  },
  {
    name: '--font-mono',
    type: 'font-stack',
    description: 'Code, source editor, and monospace UI labels',
    default: "ui-monospace,'SF Mono',SFMono-Regular,Menlo,Consolas,monospace",
  },
] as const;

export const THEME_TOKEN_NAMES = TOKEN_CONTRACT.map((t) => t.name);

export const FONT_STACK_TOKEN_NAMES = TOKEN_CONTRACT.filter((t) => t.type === 'font-stack').map((t) => t.name);

export const LENGTH_TOKEN_NAMES = TOKEN_CONTRACT.filter((t) => t.type === 'length').map((t) => t.name);

// App-level metrics: user reading preferences, not part of a theme's palette.
export interface MetricSpec {
  name: '--fs' | '--cw' | '--lh';
  description: string;
  default: number;
  min: number;
  max: number;
  // Empty string for unitless values. line-height is deliberately unitless so
  // it scales with each element's own font-size rather than being frozen to the
  // article's — a `px` line-height would crush headings and code blocks.
  unit: 'px' | '';
}

export const METRIC_CONTRACT: readonly MetricSpec[] = [
  { name: '--fs', description: 'Article base font size', default: 17, min: 15, max: 21, unit: 'px' },
  { name: '--cw', description: 'Article max content width', default: 1280, min: 620, max: 1280, unit: 'px' },
  { name: '--lh', description: 'Article line height', default: 1.7, min: 1.4, max: 2.1, unit: '' },
] as const;

export type ThemeTokens = {
  [K in (typeof TOKEN_CONTRACT)[number]['name']]: string;
};
