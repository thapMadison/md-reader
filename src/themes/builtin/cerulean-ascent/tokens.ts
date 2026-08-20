import type { ThemeTokens } from '../../contract';

// Cerulean Ascent: a crisp blue-and-green theme, every corner square, a
// full-lattice table. Adapted from VLOOK "hope" (vlook-hope.less) — kept
// here as a lineage note rather than this theme's identity (@theme1
// #0B50D9 / @theme2 #77C750, set in `.applyFontStyle(ink)`, @thmRadiusStyle
// `none`, a `modern` table). Blue carries the whole accent system; green is
// reserved for the alternating heading levels and the blockquote, matching
// hope's own @aHoverColor split.
export const tokens: ThemeTokens = {
  '--bg': '#ffffff',
  '--chrome': '#f5f8ff',
  '--fg': '#10233d',
  '--muted': '#55708f',
  '--link': '#0b50d9', // hope's @theme1, unmodified — clears 6.64:1 on white
  '--body-fg': '#10233d',
  '--h1-fg': '#0b1b30',
  '--h2-fg': '#10233d',
  '--h3-fg': '#10233d',
  '--h4-fg': '#10233d',
  '--h5-fg': '#10233d',
  '--h6-fg': '#55708f',
  '--border': '#d7e3f5',
  '--code-bg': '#eff4fc',
  '--quote-bg': 'rgba(11,80,217,0.05)',
  '--hl': 'rgba(11,80,217,0.09)',
  // hope's own @theme2 (#77C750) fails 3:1 on white as a UI accent; darkened
  // to a leaf green that still reads as the same hue pairing.
  '--quote-accent': '#4e9a32',
  '--quote-fg': '#16324f',
  '--code-header-bg': '#e9f0fb',
  // Darkened from --muted the same way --code-header-fg is in every other
  // theme here — the header strip's ground is a step darker than --bg, and
  // needs a step more contrast from its text to clear 4.5:1 there.
  '--code-header-fg': '#546f8d',
  '--heading-accent': '#0b50d9',
  '--heading-accent-soft': 'rgba(11,80,217,0.34)',
  '--h2-accent': '#0b50d9',
  '--h2-accent-soft': 'rgba(11,80,217,0.34)',
  '--h3-accent': '#4e9a32',
  '--h3-accent-soft': 'rgba(78,154,50,0.34)',
  '--h4-accent': '#0b50d9',
  '--h4-accent-soft': 'rgba(11,80,217,0.34)',
  '--h5-accent': '#4e9a32',
  '--h5-accent-soft': 'rgba(78,154,50,0.34)',
  '--h6-accent': '#0b50d9',
  '--h6-accent-soft': 'rgba(11,80,217,0.34)',
  '--heading-marker-style': 'chevron',
  '--heading-marker': '0.52em',
  '--heading-rule': '#d7e3f5',
  '--h1-size': '2.1em',
  '--h2-size': '1.5em',
  '--h3-size': '1.18em',
  '--h4-size': '1.02em',
  '--h5-size': '0.92em',
  '--h6-size': '0.8em',
  '--h1-weight': '700',
  '--heading-weight': '650',
  // Tightened slightly from the 1.25 default — the crisp, no-radius geometry
  // this theme is built on reads better with headings set close than loose.
  '--heading-line-height': '1.22',
  '--body-size-scale': '1',
  '--body-line-height-scale': '1',
  '--badge-bg': '#e9f0fb',
  // hope's own @thmTableStyle is `modern` — VLOOK's own built-in default: a
  // full lattice, every interior cell border drawn.
  '--table-style': 'grid',
  // hope's @thmRadiusStyle is `none`.
  '--table-radius': '0',
  '--table-header-bg': '#e9f0fb',
  '--table-header-fg': '#0b1b30',
  '--table-row-alt': 'rgba(11,80,217,0.04)',
  '--table-row-hover': 'rgba(11,80,217,0.08)',
  '--table-border': '#d7e3f5',
  '--table-border-width': '1px',
  '--table-cell-pad-y': '8px',
  '--table-cell-pad-x': '13px',
  '--table-font-size': '0.87em',
  '--math-fg': '#10233d',
  '--math-bg': 'rgba(11,80,217,0.05)',
  '--danger': '#c1272d',
  '--danger-bg': 'rgba(193,39,45,0.08)',
  '--warn': '#a4690a',
  '--warn-bg': 'rgba(164,105,10,0.07)',
  '--ok': '#2f7d1e',
  '--ok-bg': 'rgba(47,125,30,0.08)',
  '--edge-shadow': 'rgba(16,35,61,0.12)',
  // Square, for the reason the table already is: @thmRadiusStyle `none`.
  '--surface-radius': '0',
  '--surface-corner': 'round',
  '--chrome-fg': '#10233d',
  '--chrome-muted': '#55708f',
  '--chrome-border': '#d7e3f5',
  '--chrome-hl': 'rgba(11,80,217,0.09)',
  '--chrome-accent-shape': 'flat',
  // No decoration in the source theme — chevron picked for the ascending,
  // optimistic geometry the theme's own name suggests.
  '--chrome-pattern': 'chevron',
  '--chrome-pattern-opacity': '0.05',
  '--chrome-pattern-ink': 'dark',
  '--syn-kw': '#c1272d',
  '--syn-str': '#2f7d1e',
  '--syn-fn': '#6b3fa0',
  '--syn-cm': '#617085',
  '--syn-num': '#0b50d9',
  '--syn-type': '#a6540a',
  '--syn-op': '#0b50d9',
  '--syn-var': '#a6540a',
  '--syn-attr': '#0b50d9',
  '--syn-tag': '#2f7d1e',
  '--syn-meta': '#617085',
  '--syn-lit': '#6b3fa0',
  '--font-ui': "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,sans-serif",
  // hope's `.applyFontStyle(ink)`. Inter is the closest already-loaded clean
  // humanist sans (see rose-quartz, which makes the same substitution for its
  // own reading face); the system-first order keeps native rendering on macOS
  // and Windows and only reaches Inter where neither ships one.
  '--font-body':
    "-apple-system,BlinkMacSystemFont,'SF Pro Text',Inter,'Segoe UI','Helvetica Neue',Arial,sans-serif",
  '--font-heading':
    "-apple-system,BlinkMacSystemFont,'SF Pro Text',Inter,'Segoe UI','Helvetica Neue',Arial,sans-serif",
  '--font-mono': "ui-monospace,'SF Mono',SFMono-Regular,Menlo,Consolas,monospace",
};
