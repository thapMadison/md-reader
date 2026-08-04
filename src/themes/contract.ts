export type TokenType = 'color' | 'length' | 'font-stack' | 'enum';

// Some length tokens double as on/off switches: `--table-border-width` set to
// `0` removes the table grid, and a theme keeping the grid still wants to tune
// its thickness — one number covers both the switch and the measurement, and
// zero is a genuine point on that scale rather than a sentinel.
//
// `--heading-marker` is deliberately NOT one of those, despite having been
// written as a length. Its `0` was a sentinel meaning "no glyph at all", which
// the renderer had to recover by parsing the number back out of the string
// (markerIsHidden in Article.tsx). That is a discrete choice wearing a
// continuous type: `0.52em` and `0` differ in kind, not in degree, and nothing
// between `0` and a usable width is meaningful. It now pairs an `enum` switch
// with a separate length for the size — see --heading-marker-style below.

export interface TokenSpec {
  name: string;
  type: TokenType;
  description: string;
  default: string;
  // Enum tokens only: the closed set of accepted values. Validation rejects
  // anything outside it, and the generated JSON schema emits it as `enum` so an
  // editor completes the options rather than offering a free-text string.
  values?: readonly string[];
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
  // Corner rounding for every boxed surface in the article — code blocks,
  // blockquotes and callouts, <details>, inline code and kbd, images, display
  // math. One token rather than one per element: these radii were a spread of
  // hardcoded 3-10px constants that no theme could reach, and the thing a theme
  // actually wants to say is "this design is rounded" or "this design is
  // square", which is a single decision. Tables keep their own --table-radius,
  // which predates this and is genuinely independent: a theme can want a
  // square-cornered data grid inside an otherwise rounded article.
  //
  // Elements scale off this rather than all taking it raw — an 8px card radius
  // on a 0.15em inline-code chip would swallow the glyph — so the smaller
  // surfaces use a fraction of it via calc(). At `0` every one of them lands
  // back on 0, which is what makes a fully square theme expressible.
  { name: '--surface-radius', type: 'length', description: 'Corner radius for article surfaces (code, quotes, images); 0 for square corners', default: '8px' },
  // What *kind* of corner --surface-radius describes. The length above is the
  // size of the corner treatment; this picks its shape. They are two tokens
  // rather than one because a bevel and a round are the same measurement applied
  // differently — a theme switching to bevel keeps whatever depth it already
  // tuned, and a theme setting `0` gets a square corner under either value.
  //
  // Implemented with CSS `corner-shape`, which is the only technique that keeps
  // a border following the cut. `clip-path: polygon()` was tried and rejected:
  // it clips the border away at each cut corner, leaving raw open edges on every
  // bordered surface (fences, mermaid frames, callouts), and it fights
  // `overflow: auto` on the surfaces that scroll.
  //
  // Degrades by construction. `corner-shape` is a young property; a browser
  // without it drops the declaration and keeps the `border-radius` beside it, so
  // a beveled theme renders rounded rather than broken. Nothing reads this token
  // back in JS — it is emitted straight into the style declaration — so there is
  // no second code path to keep in step with what the browser actually did.
  {
    name: '--surface-corner',
    type: 'enum',
    description: 'Shape of article surface corners: rounded, or beveled (cut at 45°)',
    default: 'round',
    values: ['round', 'bevel'],
  },
  { name: '--chrome-fg', type: 'color', description: 'Primary text and icons on chrome surfaces', default: '#1f2328' },
  { name: '--chrome-muted', type: 'color', description: 'Secondary text and metadata on chrome surfaces', default: '#59636e' },
  { name: '--chrome-border', type: 'color', description: 'Hairlines and control outlines on chrome surfaces', default: '#d1d9e0' },
  { name: '--chrome-hl', type: 'color', description: 'Hover / active row highlight on chrome surfaces', default: 'rgba(9,105,218,0.08)' },
  // Shape of the active-file highlight in the sidebar. `wedge` shears its
  // trailing edge into a diagonal, which is how a theme built on angled planes
  // states that geometry in the chrome.
  //
  // Deliberately scoped to the active row rather than to the chrome fill at
  // large. Angled planes across the sidebar background were measured and cost
  // real legibility: the tonal edge cuts through the file list and drops
  // --chrome-muted contrast from 6.86 to 5.16 behind the names the user is
  // actually reading. The active row carries no such cost — it is already the
  // element meant to draw the eye, and its label uses --chrome-fg, which
  // measures 10.16 on the wedge. Same design language, paid for out of the one
  // surface that was built to spend it.
  {
    name: '--chrome-accent-shape',
    type: 'enum',
    description: 'Active sidebar row highlight: rounded rectangle, or diagonal wedge',
    default: 'flat',
    values: ['flat', 'wedge'],
  },

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
  { name: '--heading-accent', type: 'color', description: 'Heading marker accent, leading tone', default: '#0969da' },
  { name: '--heading-accent-soft', type: 'color', description: 'Heading marker accent, trailing tone', default: 'rgba(9,105,218,0.35)' },
  // Per-level marker colors, h2 through h6. A theme that colors its heading
  // levels differently can't dress five glyphs from one accent without clashing
  // with most of them, so each level gets its own pair. All default to the
  // shared --heading-accent pair, which means a theme only sets the levels it
  // wants to split — see applyAccentInheritance in merge.ts.
  //
  // The `-soft` tone is the trailing half of the two-tone glyphs (h2/h3). The
  // one-tone glyphs below them ignore it; the token still exists per level so a
  // theme can restyle a level without first having to know which shape it draws.
  { name: '--h2-accent', type: 'color', description: 'Level-2 marker, leading tone', default: '#0969da' },
  { name: '--h2-accent-soft', type: 'color', description: 'Level-2 marker, trailing tone', default: 'rgba(9,105,218,0.35)' },
  { name: '--h3-accent', type: 'color', description: 'Level-3 marker, leading tone', default: '#0969da' },
  { name: '--h3-accent-soft', type: 'color', description: 'Level-3 marker, trailing tone', default: 'rgba(9,105,218,0.35)' },
  { name: '--h4-accent', type: 'color', description: 'Level-4 marker (single-tone chevron)', default: '#0969da' },
  { name: '--h4-accent-soft', type: 'color', description: 'Level-4 marker, trailing tone (unused by the default shape)', default: 'rgba(9,105,218,0.35)' },
  { name: '--h5-accent', type: 'color', description: 'Level-5 marker (diamond)', default: '#0969da' },
  { name: '--h5-accent-soft', type: 'color', description: 'Level-5 marker, trailing tone (unused by the default shape)', default: 'rgba(9,105,218,0.35)' },
  { name: '--h6-accent', type: 'color', description: 'Level-6 marker (hollow chevron)', default: '#0969da' },
  { name: '--h6-accent-soft', type: 'color', description: 'Level-6 marker, trailing tone (unused by the default shape)', default: 'rgba(9,105,218,0.35)' },
  // Whether the h2-h6 glyph is drawn at all, and how wide it is when it is.
  // Split across two tokens because they answer different questions: `off` is a
  // structural choice (themes that carry hierarchy on color and size alone),
  // while the width is a measurement. A theme that turns the marker off keeps
  // its width value, so re-enabling it restores the intended size rather than
  // reverting to the contract default.
  // `wedge` is a second glyph family, not a variant of the first: the chevron
  // ladder ranks its levels by silhouette (solid arrow -> diamond -> hollow),
  // while the wedge ladder shears a parallelogram and ranks by the same
  // two-tone/one-tone/hollow progression at a constant diagonal. A theme built
  // on diagonal geometry cannot express that by recoloring a chevron, which is
  // why this is an enum value rather than another length knob.
  {
    name: '--heading-marker-style',
    type: 'enum',
    description: 'Heading marker glyphs: chevron family, diagonal wedge family, or hidden',
    default: 'chevron',
    values: ['chevron', 'wedge', 'off'],
  },
  { name: '--heading-marker', type: 'length', description: 'Heading marker width when shown', default: '0.52em' },
  { name: '--heading-rule', type: 'color', description: 'Underline rule beneath level-2 headings', default: '#d1d9e0' },
  { name: '--badge-bg', type: 'color', description: 'Inline code and chip background', default: '#f6f8fa' },

  // Tables. `--table-border` is deliberately separate from the shared --border:
  // a table's grid is the densest run of hairlines in the article, and a theme
  // often wants it lighter than the borders it uses on code blocks and chrome —
  // which one shared token cannot express. The cell padding and font size are
  // tokens rather than constants for the same reason the metrics are: table
  // density is a reading preference, and a compact theme and an airy one differ
  // in little else.
  // Which rules the grid draws. `grid` is the full lattice; `horizontal` keeps
  // only the row rules (the Notion/GitHub-docs look, which reads quieter when
  // cells hold prose); `minimal` keeps a single rule under the header and lets
  // whitespace separate the rest. An enum rather than a set of per-edge booleans
  // because the three are a designed set, not an arbitrary combination — and a
  // theme picking one should not have to know which four edges that implies.
  {
    name: '--table-style',
    type: 'enum',
    description: 'Table rule style: full grid, row rules only, or header rule only',
    default: 'grid',
    values: ['grid', 'horizontal', 'minimal'],
  },
  { name: '--table-radius', type: 'length', description: 'Table outer corner radius; 0 for square corners', default: '8px' },
  { name: '--table-header-bg', type: 'color', description: 'Table header row background', default: '#f6f8fa' },
  { name: '--table-header-fg', type: 'color', description: 'Table header row text', default: '#1f2328' },
  { name: '--table-row-alt', type: 'color', description: 'Alternating (even) table row background', default: 'rgba(9,105,218,0.03)' },
  { name: '--table-row-hover', type: 'color', description: 'Table row background on hover', default: 'rgba(9,105,218,0.06)' },
  { name: '--table-border', type: 'color', description: 'Table cell grid lines', default: '#d1d9e0' },
  { name: '--table-border-width', type: 'length', description: 'Table cell grid line thickness; 0 removes the grid', default: '1px' },
  { name: '--table-cell-pad-y', type: 'length', description: 'Table cell padding, vertical', default: '9px' },
  { name: '--table-cell-pad-x', type: 'length', description: 'Table cell padding, horizontal', default: '14px' },
  // In em so it tracks the article's --fs rather than freezing table text at one
  // pixel size while the rest of the body scales around it.
  { name: '--table-font-size', type: 'length', description: 'Table text size, relative to article body', default: '0.88em' },

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

// Keyed by name rather than exposed as a name list like the others: validating
// an enum needs the token's accepted `values`, not merely the knowledge that it
// is one.
export const ENUM_TOKEN_VALUES: Record<string, readonly string[]> = Object.fromEntries(
  TOKEN_CONTRACT.filter((t) => t.type === 'enum').map((t) => [t.name, t.values ?? []]),
);

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
  // 16px rather than 17: h5 and h6 are deliberately sub-1em (see headingStyle in
  // Article.tsx), so a larger base makes body text out-shout the headings under
  // it. Lowering the base keeps every heading's *relative* step intact while
  // narrowing that gap — the alternative, enlarging h5/h6, would collapse them
  // into h4, which is exactly the collision their marker shapes exist to avoid.
  { name: '--fs', description: 'Article base font size', default: 16, min: 15, max: 21, unit: 'px' },
  { name: '--cw', description: 'Article max content width', default: 1280, min: 620, max: 1280, unit: 'px' },
  { name: '--lh', description: 'Article line height', default: 1.7, min: 1.4, max: 2.1, unit: '' },
] as const;

export type ThemeTokens = {
  [K in (typeof TOKEN_CONTRACT)[number]['name']]: string;
};
