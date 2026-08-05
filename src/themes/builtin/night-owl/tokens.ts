import type { ThemeTokens } from '../../contract';

export const tokens: ThemeTokens = {
  '--bg': '#011627',
  '--chrome': '#01111e',
  '--fg': '#d6deeb',
  '--muted': '#5f7e97',
  '--link': '#82aaff',
  '--body-fg': '#d6deeb',
  '--h1-fg': '#d6deeb',
  '--h2-fg': '#d6deeb',
  '--h3-fg': '#d6deeb',
  '--h4-fg': '#d6deeb',
  '--h5-fg': '#d6deeb',
  '--h6-fg': '#5f7e97',
  '--border': '#1d3b53',
  '--code-bg': '#0b2942',
  '--quote-bg': 'rgba(130,170,255,0.07)',
  '--hl': 'rgba(130,170,255,0.10)',
  '--quote-accent': '#82aaff',
  '--quote-fg': '#d6deeb',
  '--code-header-bg': '#0b2942',
  '--code-header-fg': '#5f7e97',
  '--heading-accent': '#82aaff',
  '--heading-accent-soft': 'rgba(130,170,255,0.32)',
  '--h2-accent': '#82aaff',
  '--h2-accent-soft': 'rgba(130,170,255,0.32)',
  '--h3-accent': '#82aaff',
  '--h3-accent-soft': 'rgba(130,170,255,0.32)',
  // Every heading here is the same near-white, so one blue dresses all six
  // markers; the levels are told apart by the shape alone.
  '--h4-accent': '#82aaff',
  '--h4-accent-soft': 'rgba(130,170,255,0.32)',
  '--h5-accent': '#82aaff',
  '--h5-accent-soft': 'rgba(130,170,255,0.32)',
  '--h6-accent': '#82aaff',
  '--h6-accent-soft': 'rgba(130,170,255,0.32)',
  // Kept: on a dark canvas the accent glyph is the cheapest way to make a
  // heading findable when scanning, since the contrast range for text is
  // narrower than it is on the light themes.
  '--heading-marker-style': 'chevron',
  '--heading-marker': '0.52em',
  '--heading-rule': '#1d3b53',
  // The pre-token heading scale, stated rather than inherited: these are the
  // values Article.tsx hardcoded before the scale became themeable, so this
  // theme's headings are unchanged by that move.
  '--h1-size': '2.1em',
  '--h2-size': '1.5em',
  '--h3-size': '1.18em',
  '--h4-size': '1.02em',
  '--h5-size': '0.92em',
  '--h6-size': '0.8em',
  '--h1-weight': '700',
  '--heading-weight': '650',
  '--heading-line-height': '1.25',
  // Unscaled: this theme reads at the base metric.
  '--body-size-scale': '1',
  '--body-line-height-scale': '1',
  '--badge-bg': '#0b2942',
  // Row rules only: on a dark canvas a full lattice of light rules reads as a
  // brighter object than the text it contains, which is the opposite of what a
  // dark theme is for. The zebra wash carries row tracking instead.
  '--table-style': 'horizontal',
  '--table-radius': '8px',
  '--table-header-bg': '#0b2942',
  '--table-header-fg': '#c5e4fd',
  '--table-row-alt': 'rgba(130,170,255,0.05)',
  '--table-row-hover': 'rgba(130,170,255,0.10)',
  // Lighter than the shared --border (#1d3b53): on a dark canvas a full-strength
  // grid reads as a lattice competing with the text inside it.
  '--table-border': '#1d3b53',
  '--table-border-width': '1px',
  '--table-cell-pad-y': '9px',
  '--table-cell-pad-x': '14px',
  '--table-font-size': '0.88em',
  '--math-fg': '#d6deeb',
  '--math-bg': 'rgba(130,170,255,0.07)',
  '--danger': '#ef5350',
  '--danger-bg': 'rgba(239,83,80,0.12)',
  '--warn': '#ffcb8b',
  '--warn-bg': 'rgba(255,203,139,0.10)',
  '--ok': '#7fdbca',
  '--ok-bg': 'rgba(127,219,202,0.10)',
  '--edge-shadow': 'rgba(0,0,0,0.5)',
  '--surface-radius': '8px',
  // Rounded, like the editor theme this one is drawn from.
  '--surface-corner': 'round',
  '--chrome-fg': '#d6deeb',
  '--chrome-muted': '#5f7e97',
  '--chrome-border': '#1d3b53',
  '--chrome-hl': 'rgba(130,170,255,0.10)',
  '--chrome-accent-shape': 'flat',
  // Chevrons, drifting to the floor of the sidebar. The motif suits a theme
  // named for a night bird better than a texture does, and this palette has the
  // headroom for it: the chrome is deep enough that white ink at the reference
  // density reads without coming anywhere near the file names.
  '--chrome-pattern': 'chevron',
  // The reference density. Also what every custom dark theme inherits, since
  // this is the base dark palette.
  '--chrome-pattern-opacity': '0.05',
  // White ink, and this is also the value every custom *dark* theme inherits —
  // night-owl is the base dark palette, so a theme that names no ink of its own
  // gets the one that suits a dark chrome.
  '--chrome-pattern-ink': 'light',
  '--syn-kw': '#c792ea',
  '--syn-str': '#ecc48d',
  '--syn-fn': '#82aaff',
  '--syn-cm': '#637777',
  '--syn-num': '#f78c6c',
  '--syn-type': '#ffcb8b',
  '--syn-op': '#7fdbca',
  '--syn-var': '#d7dbe0',
  '--syn-attr': '#c5e478',
  '--syn-tag': '#7fdbca',
  '--syn-meta': '#c792ea',
  '--syn-lit': '#ff5874',
  '--font-ui': "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,sans-serif",
  '--font-body': "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,sans-serif",
  // Matches --font-body: an editor theme, where headings are structure rather
  // than typography and a display face would be out of register.
  '--font-heading': "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,sans-serif",
  '--font-mono': "ui-monospace,'SF Mono',SFMono-Regular,Menlo,Consolas,monospace",
};
