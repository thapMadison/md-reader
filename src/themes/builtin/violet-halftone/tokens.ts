import type { ThemeTokens } from '../../contract';

// Violet Halftone: a playful theme pairing gold and violet, a rounded
// display face, big corner radius, full-lattice table, comic-print halftone
// chrome pattern. Adapted from VLOOK "joint" (vlook-joint.less) — kept here
// as a lineage note rather than this theme's identity (@theme1 #FABB0C /
// @theme2 #6464D1, set in `.applyFontStyle(yuan)`, @thmRadiusStyle `big`, a
// `modern` table). joint's own @aColor (link) is a darkened gold and
// @aHoverColor the violet, but raw gold at any usable lightness collides
// with --warn and --ok, and even darkened it only reaches ~3:1 on white.
// Violet is led instead for every text-bearing accent; gold survives as the
// secondary heading levels and the h3/h5 marker tone, which is closer to
// how joint itself uses gold — as a highlight and cover color, never as
// body-text-adjacent link color.
export const tokens: ThemeTokens = {
  '--bg': '#fffdf5',
  '--chrome': '#fff6dc',
  '--fg': '#2b2440',
  '--muted': '#6f6690',
  '--link': '#6464d1', // joint's @theme2, unmodified — clears 4.81:1
  '--body-fg': '#2b2440',
  '--h1-fg': '#201a33',
  '--h2-fg': '#2b2440',
  '--h3-fg': '#2b2440',
  '--h4-fg': '#2b2440',
  '--h5-fg': '#2b2440',
  '--h6-fg': '#6f6690',
  '--border': '#efe0b8',
  '--code-bg': '#fbf3dc',
  '--quote-bg': 'rgba(100,100,209,0.06)',
  '--hl': 'rgba(100,100,209,0.09)',
  '--quote-accent': '#6464d1',
  '--quote-fg': '#322a4d',
  '--code-header-bg': '#f7ebc7',
  '--code-header-fg': '#6d648e',
  // Violet leads (h2, h4, h6); gold — darkened off joint's raw @theme1 for
  // 4.5:1 on --code-bg — takes the levels between (h3, h5).
  '--heading-accent': '#6464d1',
  '--heading-accent-soft': 'rgba(100,100,209,0.34)',
  '--h2-accent': '#6464d1',
  '--h2-accent-soft': 'rgba(100,100,209,0.34)',
  '--h3-accent': '#b8860b',
  '--h3-accent-soft': 'rgba(184,134,11,0.34)',
  '--h4-accent': '#6464d1',
  '--h4-accent-soft': 'rgba(100,100,209,0.34)',
  '--h5-accent': '#b8860b',
  '--h5-accent-soft': 'rgba(184,134,11,0.34)',
  '--h6-accent': '#6464d1',
  '--h6-accent-soft': 'rgba(100,100,209,0.34)',
  '--heading-marker-style': 'chevron',
  '--heading-marker': '0.52em',
  '--heading-rule': '#efe0b8',
  // A slightly bigger, bouncier scale than the base — the one place this
  // theme's playfulness shows up outside color, since a rounded display face
  // set at the standard scale reads as merely a font swap.
  '--h1-size': '2.3em',
  '--h2-size': '1.55em',
  '--h3-size': '1.2em',
  '--h4-size': '1.05em',
  '--h5-size': '0.95em',
  '--h6-size': '0.82em',
  '--h1-weight': '700',
  '--heading-weight': '650',
  '--heading-line-height': '1.22',
  '--body-size-scale': '1',
  '--body-line-height-scale': '1',
  '--badge-bg': '#f7ebc7',
  // joint's own @thmTableStyle is `modern` — VLOOK's own built-in default: a
  // full lattice, every interior cell border drawn.
  '--table-style': 'grid',
  // joint's @thmRadiusStyle is `big`, its own signature move.
  '--table-radius': '18px',
  '--table-header-bg': '#f7ebc7',
  '--table-header-fg': '#201a33',
  '--table-row-alt': 'rgba(100,100,209,0.05)',
  '--table-row-hover': 'rgba(100,100,209,0.09)',
  '--table-border': '#efe0b8',
  '--table-border-width': '1px',
  // Roomier than the contract default — the big-radius, playful geometry reads
  // cramped under tight padding.
  '--table-cell-pad-y': '11px',
  '--table-cell-pad-x': '18px',
  '--table-font-size': '0.9em',
  '--math-fg': '#2b2440',
  '--math-bg': 'rgba(100,100,209,0.06)',
  '--danger': '#c1272d',
  '--danger-bg': 'rgba(193,39,45,0.08)',
  '--warn': '#9b6c09',
  '--warn-bg': 'rgba(155,108,9,0.07)',
  '--ok': '#2c8453',
  '--ok-bg': 'rgba(44,132,83,0.08)',
  '--edge-shadow': 'rgba(43,36,64,0.12)',
  '--surface-radius': '16px',
  '--surface-corner': 'round',
  '--chrome-fg': '#2b2440',
  '--chrome-muted': '#6f6690',
  '--chrome-border': '#efe0b8',
  '--chrome-hl': 'rgba(100,100,209,0.10)',
  '--chrome-accent-shape': 'flat',
  // No decoration in the source theme — halftone picked for the comic-print
  // dot field its rounded, playful display face suggests.
  '--chrome-pattern': 'halftone',
  '--chrome-pattern-opacity': '0.05',
  '--chrome-pattern-ink': 'dark',
  '--syn-kw': '#b3245f',
  '--syn-str': '#2a7d4f',
  '--syn-fn': '#6262d0',
  '--syn-cm': '#756b83',
  '--syn-num': '#8f6809',
  '--syn-type': '#3e5fa0',
  '--syn-op': '#6262d0',
  '--syn-var': '#936709',
  '--syn-attr': '#3e5fa0',
  '--syn-tag': '#b3245f',
  '--syn-meta': '#756b83',
  '--syn-lit': '#6262d0',
  '--font-ui': "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,sans-serif",
  '--font-body': "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,sans-serif",
  // joint's `.applyFontStyle(yuan)` is a rounded display face; Oswald carries
  // the display-over-text-face contrast this theme wants (see sepia-book,
  // which draws the same distinction for its own condensed headings) while
  // keeping body text on the system stack, since Oswald set as a paragraph
  // face reads cramped at length.
  '--font-heading': "Oswald,'Arial Narrow','Helvetica Neue Condensed',sans-serif",
  // joint's yuan style leads @yuanMono with `--b-fm-serif-mono` (Courier /
  // Courier New) before falling back to the rounded face itself — a typewriter
  // code face against the playful gold/violet page, which is joint's own
  // pairing rather than a neutral default. See index.html for IBM Plex Mono.
  '--font-mono': "'IBM Plex Mono','Courier New',Courier,ui-monospace,SFMono-Regular,Menlo,monospace",
};
