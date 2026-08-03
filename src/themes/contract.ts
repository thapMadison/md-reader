export type TokenType = 'color' | 'length' | 'font-stack';

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

  // Text
  { name: '--fg', type: 'color', description: 'Primary text color', default: '#1f2328' },
  { name: '--muted', type: 'color', description: 'Secondary text, metadata, placeholders', default: '#59636e' },
  { name: '--link', type: 'color', description: 'Links, active states, primary accent', default: '#0969da' },

  // Feedback
  { name: '--danger', type: 'color', description: 'Errors and destructive hover states', default: '#cf222e' },
  { name: '--danger-bg', type: 'color', description: 'Error banner / badge background wash', default: 'rgba(207,34,46,0.06)' },

  // Syntax highlighting
  { name: '--syn-kw', type: 'color', description: 'Syntax: keywords', default: '#cf222e' },
  { name: '--syn-str', type: 'color', description: 'Syntax: strings', default: '#0a3069' },
  { name: '--syn-fn', type: 'color', description: 'Syntax: function names', default: '#8250df' },
  { name: '--syn-cm', type: 'color', description: 'Syntax: comments', default: '#6e7781' },
  { name: '--syn-num', type: 'color', description: 'Syntax: numbers', default: '#0550ae' },
  { name: '--syn-type', type: 'color', description: 'Syntax: types', default: '#953800' },

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

// App-level metrics: user reading preferences, not part of a theme's palette.
export interface MetricSpec {
  name: '--fs' | '--cw';
  description: string;
  default: number;
  min: number;
  max: number;
  unit: 'px';
}

export const METRIC_CONTRACT: readonly MetricSpec[] = [
  { name: '--fs', description: 'Article base font size', default: 17, min: 15, max: 21, unit: 'px' },
  { name: '--cw', description: 'Article max content width', default: 960, min: 620, max: 960, unit: 'px' },
] as const;

export type ThemeTokens = {
  [K in (typeof TOKEN_CONTRACT)[number]['name']]: string;
};
