import type { ThemeTokens } from '../../contract';

// Emerald Terminal: a dark, phosphor-green-and-indigo technical theme, big
// corner radius, full-lattice table. Adapted from VLOOK "geek"
// (vlook-geek.less) — kept here as a lineage note rather than this theme's
// identity (@theme1 #07C160 / @theme2 #6467EF, set in
// `.applyFontStyle(dyn)`, a technical display face, with a `modern` table).
// Green leads every accent the way geek's own @headerColor and
// @codeTextColor both resolve to @theme1; indigo is reserved for the
// alternating heading levels and function names, mirroring @aHoverColor.
export const tokens: ThemeTokens = {
  '--bg': '#161b19', // geek's @thmBgDark
  '--chrome': '#101513',
  '--fg': '#dceae3',
  '--muted': '#7c9c8f',
  '--link': '#35d67c', // brightened from @theme1 for 4.5:1 on a near-black page
  '--body-fg': '#dceae3',
  '--h1-fg': '#f1faf5',
  '--h2-fg': '#dceae3',
  '--h3-fg': '#dceae3',
  '--h4-fg': '#dceae3',
  '--h5-fg': '#dceae3',
  '--h6-fg': '#8fb6a6',
  '--border': '#223330',
  '--code-bg': '#0f1613',
  // geek's raw @theme1 (#07C160) as a wash — full-strength green reads fine at
  // low alpha even though the text-carrying --link above had to brighten.
  '--quote-bg': 'rgba(7,193,96,0.08)',
  '--hl': 'rgba(53,214,124,0.12)',
  '--quote-accent': '#8385ff',
  '--quote-fg': '#dceae3',
  '--code-header-bg': '#14201c',
  '--code-header-fg': '#7c9c8f',
  '--heading-accent': '#2fe28a',
  '--heading-accent-soft': 'rgba(47,226,138,0.34)',
  '--h2-accent': '#2fe28a',
  '--h2-accent-soft': 'rgba(47,226,138,0.34)',
  '--h3-accent': '#8385ff',
  '--h3-accent-soft': 'rgba(131,133,255,0.34)',
  '--h4-accent': '#2fe28a',
  '--h4-accent-soft': 'rgba(47,226,138,0.34)',
  '--h5-accent': '#8385ff',
  '--h5-accent-soft': 'rgba(131,133,255,0.34)',
  '--h6-accent': '#2fe28a',
  '--h6-accent-soft': 'rgba(47,226,138,0.34)',
  '--heading-marker-style': 'chevron',
  '--heading-marker': '0.52em',
  '--heading-rule': '#223330',
  '--h1-size': '2.1em',
  '--h2-size': '1.5em',
  '--h3-size': '1.18em',
  '--h4-size': '1.02em',
  '--h5-size': '0.92em',
  '--h6-size': '0.8em',
  '--h1-weight': '700',
  '--heading-weight': '650',
  '--heading-line-height': '1.25',
  '--body-size-scale': '1',
  '--body-line-height-scale': '1',
  '--badge-bg': '#14201c',
  // geek's own @thmTableStyle is `modern` — VLOOK's own built-in default: a
  // full lattice (every interior border drawn, only the outer frame dropped)
  // with zebra striping.
  '--table-style': 'grid',
  // geek's @thmRadiusStyle is `big`.
  '--table-radius': '14px',
  '--table-header-bg': '#14201c',
  '--table-header-fg': '#f1faf5',
  '--table-row-alt': 'rgba(53,214,124,0.06)',
  '--table-row-hover': 'rgba(53,214,124,0.12)',
  '--table-border': '#223330',
  '--table-border-width': '1px',
  // Denser than the contract default — a terminal-flavored theme sets its
  // tables the way it sets its code, tight rather than airy.
  '--table-cell-pad-y': '7px',
  '--table-cell-pad-x': '12px',
  '--table-font-size': '0.85em',
  '--math-fg': '#dceae3',
  '--math-bg': 'rgba(53,214,124,0.08)',
  '--danger': '#ff5d5d',
  '--danger-bg': 'rgba(255,93,93,0.12)',
  '--warn': '#e8b33d',
  '--warn-bg': 'rgba(232,179,61,0.10)',
  '--ok': '#2fe28a',
  '--ok-bg': 'rgba(47,226,138,0.10)',
  '--edge-shadow': 'rgba(0,0,0,0.30)',
  '--surface-radius': '14px',
  '--surface-corner': 'round',
  '--chrome-fg': '#e2ede7',
  '--chrome-muted': '#7c9c8f',
  '--chrome-border': '#1c2624',
  '--chrome-hl': 'rgba(53,214,124,0.14)',
  '--chrome-accent-shape': 'flat',
  // No decoration in the source theme — grain picked for the terminal-static
  // texture a green-on-black theme suggests, without imposing directional
  // geometry geek never had.
  '--chrome-pattern': 'grain',
  '--chrome-pattern-opacity': '0.05',
  '--chrome-pattern-ink': 'light',
  '--syn-kw': '#ff6b9e',
  '--syn-str': '#6ee7a8',
  '--syn-fn': '#9c9cff',
  '--syn-cm': '#6e8577',
  '--syn-num': '#5fd3c4',
  '--syn-type': '#8ee6c0',
  '--syn-op': '#c9d8cf',
  '--syn-var': '#e8b33d',
  '--syn-attr': '#5fd3c4',
  '--syn-tag': '#ff6b9e',
  '--syn-meta': '#6e8577',
  '--syn-lit': '#9c9cff',
  // geek's `.applyFontStyle(dyn)` is a technical display face; Space Grotesk
  // is the closest already-loaded analogue (see azure-corporate, which makes
  // the same substitution for its own corporate-tech voice) and is carried
  // into --font-ui too, since geek's own @uiBgColorDark ties the UI chrome to
  // @theme1 the same way the text does.
  '--font-ui': "-apple-system,'Space Grotesk','Segoe UI',Helvetica,sans-serif",
  '--font-body': "-apple-system,'Space Grotesk','Segoe UI',Helvetica,sans-serif",
  '--font-heading': "-apple-system,'Space Grotesk','Segoe UI',Helvetica,sans-serif",
  // Fira Code, for the ligatures a "geek" theme is named for; also loaded from
  // index.html (see rose-quartz for the same pick made for the same reason).
  '--font-mono':
    "'Fira Code',ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono',monospace",
};
