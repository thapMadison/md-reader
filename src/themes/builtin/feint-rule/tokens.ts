import type { ThemeTokens } from '../../contract';

// Feint Rule: the most restrained of this group — a single-hue blue theme,
// no heading marker, small radius, full-lattice table, plain ruled chrome
// pattern. Adapted from VLOOK "note" (vlook-note.less) — kept here as a
// lineage note rather than this theme's identity (@theme1 and @theme2 are
// two shades of the same blue, #0075DE / #005BAB, rather than a
// contrasting pair, set in `.applyFontStyle(local)` — no custom face at
// all — with a `modern` table). The single-hue accent system is the
// adaptation of that restraint: every heading level shares one blue rather
// than alternating two hues, the marker is switched off entirely, and
// rulework — plain ruled lines, no texture — is the one chrome pattern that
// matches a theme with no decoration anywhere in its own stylesheet.
export const tokens: ThemeTokens = {
  '--bg': '#ffffff',
  '--chrome': '#f3f7fc',
  '--fg': '#1b2733',
  '--muted': '#5c7181',
  '--link': '#0075de', // note's @theme1, unmodified — clears 4.57:1
  '--body-fg': '#1b2733',
  '--h1-fg': '#12202e',
  '--h2-fg': '#1b2733',
  '--h3-fg': '#1b2733',
  '--h4-fg': '#1b2733',
  '--h5-fg': '#1b2733',
  '--h6-fg': '#5c7181',
  '--border': '#d9e5f0',
  '--code-bg': '#eef3f8',
  '--quote-bg': 'rgba(0,117,222,0.05)',
  '--hl': 'rgba(0,117,222,0.08)',
  // note's @theme2 (#005BAB) — the deeper of its two blues, used the way
  // note's own @aHoverColor uses it: one step darker than the base accent.
  '--quote-accent': '#005bab',
  '--quote-fg': '#1e3247',
  '--code-header-bg': '#e6eef6',
  '--code-header-fg': '#596e7d',
  // One hue for every level, not an alternating pair — note's own theme1/
  // theme2 are two shades of the same blue rather than a contrasting split,
  // and carrying that restraint into the heading system is the point.
  '--heading-accent': '#0075de',
  '--heading-accent-soft': 'rgba(0,117,222,0.34)',
  '--h2-accent': '#0075de',
  '--h2-accent-soft': 'rgba(0,117,222,0.34)',
  '--h3-accent': '#0075de',
  '--h3-accent-soft': 'rgba(0,117,222,0.34)',
  '--h4-accent': '#0075de',
  '--h4-accent-soft': 'rgba(0,117,222,0.34)',
  '--h5-accent': '#0075de',
  '--h5-accent-soft': 'rgba(0,117,222,0.34)',
  '--h6-accent': '#0075de',
  '--h6-accent-soft': 'rgba(0,117,222,0.34)',
  // note carries its hierarchy on weight, size, and the rule beneath h2 rather
  // than on a glyph — the one theme here besides sepia-book to switch it off.
  '--heading-marker-style': 'off',
  '--heading-marker': '0.52em',
  '--heading-rule': '#d9e5f0',
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
  '--badge-bg': '#e6eef6',
  // note's own @thmTableStyle is `modern` — VLOOK's own built-in default, a
  // full lattice with zebra striping; this theme's restraint shows up in the
  // single-hue accent system and the switched-off marker instead, not here.
  '--table-style': 'grid',
  // note's @thmRadiusStyle is `small`.
  '--table-radius': '6px',
  '--table-header-bg': '#e6eef6',
  '--table-header-fg': '#12202e',
  '--table-row-alt': 'rgba(0,117,222,0.04)',
  '--table-row-hover': 'rgba(0,117,222,0.08)',
  '--table-border': '#d9e5f0',
  '--table-border-width': '1px',
  '--table-cell-pad-y': '10px',
  '--table-cell-pad-x': '16px',
  '--table-font-size': '0.88em',
  '--math-fg': '#1b2733',
  '--math-bg': 'rgba(0,117,222,0.05)',
  '--danger': '#c1272d',
  '--danger-bg': 'rgba(193,39,45,0.08)',
  '--warn': '#9c6b12',
  '--warn-bg': 'rgba(156,107,18,0.07)',
  '--ok': '#1a7f53',
  '--ok-bg': 'rgba(26,127,83,0.08)',
  '--edge-shadow': 'rgba(27,39,51,0.12)',
  '--surface-radius': '5px',
  '--surface-corner': 'round',
  '--chrome-fg': '#1b2733',
  '--chrome-muted': '#5c7181',
  '--chrome-border': '#d9e5f0',
  '--chrome-hl': 'rgba(0,117,222,0.08)',
  '--chrome-accent-shape': 'flat',
  // note's name, taken literally: ruled lines, no texture — the one pattern
  // with no fill or fill-adjacent geometry, matching a theme with none.
  '--chrome-pattern': 'rulework',
  '--chrome-pattern-opacity': '0.05',
  '--chrome-pattern-ink': 'dark',
  '--syn-kw': '#c1272d',
  '--syn-str': '#1a7e52',
  '--syn-fn': '#6b3fa0',
  '--syn-cm': '#5f7080',
  '--syn-num': '#005bab',
  '--syn-type': '#a6540a',
  '--syn-op': '#005bab',
  '--syn-var': '#a6540a',
  '--syn-attr': '#005bab',
  '--syn-tag': '#1a7e52',
  '--syn-meta': '#5f7080',
  '--syn-lit': '#6b3fa0',
  // note's `.applyFontStyle(local)` is deliberately no custom face at all —
  // the contract's own system-stack default is the faithful port, not a
  // substitution.
  '--font-ui': "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,sans-serif",
  '--font-body': "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,sans-serif",
  '--font-heading': "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,sans-serif",
  '--font-mono': "ui-monospace,'SF Mono',SFMono-Regular,Menlo,Consolas,monospace",
};
