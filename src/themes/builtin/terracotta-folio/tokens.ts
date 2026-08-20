import type { ThemeTokens } from '../../contract';

// Terracotta Folio: a warm terracotta-and-sage serif reading theme, small
// corner radius, full-bordered table. Adapted from VLOOK "fancy"
// (VLOOK-src-V2026.7/src/less/theme/vlook-fancy.less) — kept here as a
// lineage note rather than this theme's identity, since the accent system,
// heading markers, and chrome pattern below are this contract's own
// vocabulary and the font stack is a wholesale Google Fonts substitution for
// VLOOK's own (@theme1 #D97757 / @theme2 #629987, `.applyFontStyle(serif)`,
// a full-bordered "simple" table). Terracotta leads the accent system, sage
// takes the secondary/odd heading levels and the blockquote, mirroring the
// balance fancy's own @aHoverColor split drew between its link color and
// theme2.
export const tokens: ThemeTokens = {
  '--bg': '#faf9f5', // fancy's @thmBgLight
  '--chrome': '#f2e9dd',
  '--fg': '#2b2118',
  '--muted': '#7a6b5c',
  // fancy's @aColor is @theme1 (#D97757) unmodified; darkened here to clear
  // 4.5:1 on the page — the raw hex sits at 4.37.
  '--link': '#b45837',
  '--body-fg': '#2b2118',
  '--h1-fg': '#241b13',
  '--h2-fg': '#2b2118',
  '--h3-fg': '#2b2118',
  '--h4-fg': '#2b2118',
  '--h5-fg': '#2b2118',
  '--h6-fg': '#7a6b5c',
  '--border': '#e7dcc9',
  '--code-bg': '#fbf4ea',
  // fancy's @theme2 (sage) as a wash rather than @theme1 — the quote accent
  // below is sage, so the wash it sits on matches.
  '--quote-bg': 'rgba(98,153,135,0.08)',
  '--hl': 'rgba(184,90,56,0.09)',
  '--quote-accent': '#4e8674',
  '--quote-fg': '#2b2118',
  '--code-header-bg': '#efe4d3',
  // Darkened from --muted for the same 4.5:1 reason as --link; the two shades
  // sitting on different grounds (page vs. this deeper cream) need different
  // amounts of correction even though both start from the same source gray.
  '--code-header-fg': '#726456',
  // theme1/theme2 alternate down the heading ladder — terracotta leads (h2, h4,
  // h6), sage takes the levels between (h3, h5), the same two-color rhythm
  // fancy itself draws between its link and hover colors.
  '--heading-accent': '#c1633c',
  '--heading-accent-soft': 'rgba(193,99,60,0.34)',
  '--h2-accent': '#c1633c',
  '--h2-accent-soft': 'rgba(193,99,60,0.34)',
  '--h3-accent': '#4e8674',
  '--h3-accent-soft': 'rgba(78,134,116,0.34)',
  '--h4-accent': '#c1633c',
  '--h4-accent-soft': 'rgba(193,99,60,0.34)',
  '--h5-accent': '#4e8674',
  '--h5-accent-soft': 'rgba(78,134,116,0.34)',
  '--h6-accent': '#c1633c',
  '--h6-accent-soft': 'rgba(193,99,60,0.34)',
  '--heading-marker-style': 'chevron',
  '--heading-marker': '0.52em',
  '--heading-rule': '#e7dcc9',
  // fancy's own heading scale isn't stated in em against a body size the way
  // this contract needs, so only h1 is nudged up from the base scale — serif
  // display text carries a slightly larger opening size better than the sans
  // default does.
  '--h1-size': '2.2em',
  '--h2-size': '1.5em',
  '--h3-size': '1.18em',
  '--h4-size': '1.02em',
  '--h5-size': '0.92em',
  '--h6-size': '0.8em',
  '--h1-weight': '700',
  '--heading-weight': '650',
  // Serif faces read tighter than sans at the same line-height number; opened
  // up slightly from the 1.25 default so descenders in a heading don't crowd.
  '--heading-line-height': '1.28',
  '--body-size-scale': '1',
  '--body-line-height-scale': '1.05',
  '--badge-bg': '#f1e4d2',
  // fancy's own @thmTableStyle is `simple` — core.less borders every cell on
  // all sides, the fullest lattice VLOOK draws.
  '--table-style': 'grid',
  // fancy's @thmRadiusStyle is `small`.
  '--table-radius': '6px',
  '--table-header-bg': '#f1e4d2',
  '--table-header-fg': '#2b2118',
  '--table-row-alt': 'rgba(184,90,56,0.05)',
  '--table-row-hover': 'rgba(184,90,56,0.09)',
  '--table-border': '#e7dcc9',
  '--table-border-width': '1px',
  '--table-cell-pad-y': '10px',
  '--table-cell-pad-x': '16px',
  '--table-font-size': '0.9em',
  '--math-fg': '#2b2118',
  '--math-bg': 'rgba(184,90,56,0.06)',
  '--danger': '#c1392b',
  '--danger-bg': 'rgba(193,57,43,0.08)',
  '--warn': '#996914',
  '--warn-bg': 'rgba(153,105,20,0.07)',
  '--ok': '#3f7a5e',
  '--ok-bg': 'rgba(63,122,94,0.08)',
  '--edge-shadow': 'rgba(43,33,24,0.13)',
  '--surface-radius': '6px',
  '--surface-corner': 'round',
  '--chrome-fg': '#2b2118',
  '--chrome-muted': '#756758',
  '--chrome-border': '#e3d5c0',
  '--chrome-hl': 'rgba(184,90,56,0.10)',
  '--chrome-accent-shape': 'flat',
  // fancy has no chrome decoration of its own (it styles Typora's sidebar
  // through unrelated tokens) — aura picked as the warmest, least geometric
  // motif on offer, matching a theme with no hard edges anywhere else in it.
  '--chrome-pattern': 'aura',
  '--chrome-pattern-opacity': '0.05',
  '--chrome-pattern-ink': 'dark',
  '--syn-kw': '#b3341f',
  '--syn-str': '#2e6650',
  '--syn-fn': '#7a4f86',
  '--syn-cm': '#7c6e5d',
  '--syn-num': '#a15a1e',
  '--syn-type': '#35695a',
  '--syn-op': '#6b4a33',
  '--syn-var': '#8a4b2e',
  '--syn-attr': '#2e6650',
  '--syn-tag': '#b3341f',
  '--syn-meta': '#7c6e5d',
  '--syn-lit': '#7a4f86',
  '--font-ui': "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,sans-serif",
  // fancy's `.applyFontStyle(serif)`. Merriweather is the Google Fonts serif
  // already loaded in index.html (see sepia-book, which carries the same
  // stack); fancy's own CJK serif names are dropped for the reason sepia-book
  // drops its own — non-ASCII fails isFontStackValue and would only resolve on
  // a machine with a font this theme never asked for.
  '--font-body':
    "Merriweather,Charter,'Iowan Old Style','Palatino Linotype','Book Antiqua','Noto Serif',Georgia,serif",
  '--font-heading':
    "Merriweather,Charter,'Iowan Old Style','Palatino Linotype','Book Antiqua','Noto Serif',Georgia,serif",
  // fancy's serif style resolves @serifMono to Go Mono then `--b-fm-serif-mono`
  // (Courier / Courier New) — a serif mono, deliberately, so the code face
  // belongs to the same family as the Merriweather body above rather than
  // dropping to a neutral system sans-mono. IBM Plex Mono leads as the
  // screen-legible stand-in for Courier (see index.html); Go Mono is dropped
  // as it ships with no OS and would never resolve.
  '--font-mono': "'IBM Plex Mono','Courier New',Courier,ui-monospace,SFMono-Regular,Menlo,monospace",
};
