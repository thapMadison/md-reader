import type { ThemeTokens } from '../../contract';

export const tokens: ThemeTokens = {
  '--bg': '#f7f0e3',
  '--chrome': '#f0e7d3',
  '--fg': '#3d3226',
  '--muted': '#8a7a63',
  '--link': '#9c5a1a',
  '--body-fg': '#3d3226',
  '--h1-fg': '#3d3226',
  '--h2-fg': '#3d3226',
  '--h3-fg': '#3d3226',
  '--h4-fg': '#3d3226',
  '--h5-fg': '#3d3226',
  '--h6-fg': '#8a7a63',
  '--border': '#ddd0b6',
  '--code-bg': '#efe4cd',
  '--quote-bg': 'rgba(156,90,26,0.06)',
  '--hl': 'rgba(156,90,26,0.09)',
  '--quote-accent': '#9c5a1a',
  '--quote-fg': '#3d3226',
  '--code-header-bg': '#efe4cd',
  '--code-header-fg': '#8a7a63',
  '--heading-accent': '#9c5a1a',
  '--heading-accent-soft': 'rgba(156,90,26,0.30)',
  '--h2-accent': '#9c5a1a',
  '--h2-accent-soft': 'rgba(156,90,26,0.30)',
  '--h3-accent': '#9c5a1a',
  '--h3-accent-soft': 'rgba(156,90,26,0.30)',
  '--h4-accent': '#9c5a1a',
  '--h4-accent-soft': 'rgba(156,90,26,0.30)',
  '--h5-accent': '#9c5a1a',
  '--h5-accent-soft': 'rgba(156,90,26,0.30)',
  '--h6-accent': '#9c5a1a',
  '--h6-accent-soft': 'rgba(156,90,26,0.30)',
  // No marker: a print-book theme sets headings in type, not in dingbats.
  '--heading-marker-style': 'off',
  '--heading-marker': '0.52em',
  '--heading-rule': '#ddd0b6',
  '--badge-bg': '#efe4cd',
  // Row rules only, square corners: a typeset book table separates rows with
  // horizontal rules and never boxes them in, and rounded corners are a screen
  // idiom this theme is deliberately not borrowing.
  '--table-style': 'horizontal',
  '--table-radius': '0',
  '--table-header-bg': '#efe4cd',
  '--table-header-fg': '#3d3226',
  '--table-row-alt': 'rgba(156,90,26,0.04)',
  '--table-row-hover': 'rgba(156,90,26,0.09)',
  '--table-border': '#ddd0b6',
  '--table-border-width': '1px',
  // Roomier than the contract default: a print-book theme sets tables the way a
  // typeset page does, with the air around the type doing the separating work
  // that heavier rules would otherwise have to do.
  '--table-cell-pad-y': '11px',
  '--table-cell-pad-x': '16px',
  '--table-font-size': '0.9em',
  '--math-fg': '#3d3226',
  '--math-bg': 'rgba(156,90,26,0.06)',
  '--danger': '#a03d2e',
  '--danger-bg': 'rgba(160,61,46,0.08)',
  '--warn': '#b25e0f',
  '--warn-bg': 'rgba(178,94,15,0.07)',
  '--ok': '#5e6e34',
  '--ok-bg': 'rgba(94,110,52,0.08)',
  '--edge-shadow': 'rgba(61,50,38,0.15)',
  // Square, for the reason the table corners already are: rounding is a screen
  // idiom, and a typeset page has no rounded rectangles anywhere on it. The
  // table was only the one surface that could say so before this token existed.
  '--surface-radius': '0',
  // Moot at radius 0 — a corner shape needs a radius to reshape — but stated
  // rather than left to the base theme, so raising the radius later gives this
  // theme the round it would want and not whatever the fallback happened to be.
  '--surface-corner': 'round',
  '--chrome-fg': '#3d3226',
  '--chrome-muted': '#8a7a63',
  '--chrome-border': '#ddd0b6',
  '--chrome-hl': 'rgba(156,90,26,0.09)',
  '--chrome-accent-shape': 'flat',
  // Grain, for the same reason the plane is absent: this theme is paper, and
  // paper has tooth. It is the one motif with no geometry at all — no direction,
  // no repeat — which is what keeps it from reading as a printed pattern *on*
  // the stock rather than as the stock itself.
  '--chrome-pattern': 'grain',
  // The reference density. Grain already runs lighter in the dark-ink direction
  // (see GrainLayer), so the correction for this theme's paper is made in the
  // renderer rather than by pulling this number down.
  '--chrome-pattern-opacity': '0.06',
  // Black ink over a warm light chrome. The renderer also runs grain lighter in
  // this direction (see GrainLayer): full-range noise reads heavier as black on
  // paper than as white on a dark panel.
  '--chrome-pattern-ink': 'dark',
  '--syn-kw': '#a03d2e',
  '--syn-str': '#5e6e34',
  '--syn-fn': '#2d6a7a',
  '--syn-cm': '#a4906f',
  '--syn-num': '#b25e0f',
  '--syn-type': '#7a5230',
  '--syn-op': '#8a6a3a',
  '--syn-var': '#6b4a2f',
  '--syn-attr': '#2d6a7a',
  '--syn-tag': '#5e6e34',
  '--syn-meta': '#a4906f',
  '--syn-lit': '#a03d2e',
  '--font-ui': "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,sans-serif",
  '--font-body': "Charter,'Iowan Old Style','Noto Serif',Georgia,serif",
  '--font-mono': "ui-monospace,'SF Mono',SFMono-Regular,Menlo,Consolas,monospace",
};
