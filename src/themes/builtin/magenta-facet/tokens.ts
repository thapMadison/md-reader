import type { ThemeTokens } from '../../contract';

// Magenta Facet: a moody dark theme pairing magenta and indigo, serif body,
// square corners, a three-line table, faceted diagonal chrome pattern.
// Adapted from VLOOK "solaris" (vlook-solaris.less) — kept here as a
// lineage note rather than this theme's identity (@theme1 #B24D7A / @theme2
// #6868B0, set in `.applyFontStyle(book)`, @thmRadiusStyle `none`, and a
// `report` table — core.less's own 三线表, "three-line table": a top/bottom
// frame and one rule under the header, no vertical or interior row lines at
// all, mapped here to `minimal` rather than the full-lattice `grid` this
// file first shipped with). Magenta leads every accent; indigo takes the
// alternating levels, matching solaris's own @aHoverColor split. facet —
// diagonal planes — is the one motif that reads as moody rather than
// merely dark, and pairs with the wedge marker/chrome-accent-shape the way
// azure-corporate's own diagonal geometry does.
export const tokens: ThemeTokens = {
  '--bg': '#241f2a', // solaris's @thmBgDark
  '--chrome': '#1a1620',
  '--fg': '#ede3e9',
  '--muted': '#9c8ca0',
  '--link': '#e07aa8', // brightened from @theme1 for 4.5:1 on this dark ground
  '--body-fg': '#ede3e9',
  '--h1-fg': '#f6eef3',
  '--h2-fg': '#ede3e9',
  '--h3-fg': '#ede3e9',
  '--h4-fg': '#ede3e9',
  '--h5-fg': '#ede3e9',
  '--h6-fg': '#b3a3b8',
  '--border': '#382c40',
  '--code-bg': '#1d1822',
  // solaris's raw @theme1 (#B24D7A) as a wash.
  '--quote-bg': 'rgba(178,77,122,0.10)',
  '--hl': 'rgba(224,122,168,0.12)',
  '--quote-accent': '#e07aa8',
  '--quote-fg': '#ede3e9',
  '--code-header-bg': '#221c29',
  '--code-header-fg': '#9c8ca0',
  '--heading-accent': '#e07aa8',
  '--heading-accent-soft': 'rgba(224,122,168,0.34)',
  '--h2-accent': '#e07aa8',
  '--h2-accent-soft': 'rgba(224,122,168,0.34)',
  '--h3-accent': '#9a9ae0',
  '--h3-accent-soft': 'rgba(154,154,224,0.34)',
  '--h4-accent': '#e07aa8',
  '--h4-accent-soft': 'rgba(224,122,168,0.34)',
  '--h5-accent': '#9a9ae0',
  '--h5-accent-soft': 'rgba(154,154,224,0.34)',
  '--h6-accent': '#e07aa8',
  '--h6-accent-soft': 'rgba(224,122,168,0.34)',
  // Wedge, paired with the facet chrome pattern below and --chrome-accent-shape
  // — the same three-token diagonal set azure-corporate uses for its own
  // sheared geometry.
  '--heading-marker-style': 'wedge',
  '--heading-marker': '0.52em',
  '--heading-rule': '#382c40',
  // book-style faces read well at a slightly larger, looser opening size;
  // matches the same nudge fancy makes for its own serif.
  '--h1-size': '2.2em',
  '--h2-size': '1.5em',
  '--h3-size': '1.18em',
  '--h4-size': '1.02em',
  '--h5-size': '0.92em',
  '--h6-size': '0.8em',
  '--h1-weight': '700',
  '--heading-weight': '650',
  '--heading-line-height': '1.28',
  '--body-size-scale': '1',
  '--body-line-height-scale': '1.05',
  '--badge-bg': '#221c29',
  // solaris's own @thmTableStyle is `report` — see the header comment above.
  '--table-style': 'minimal',
  // solaris's @thmRadiusStyle is `none`.
  '--table-radius': '0',
  '--table-header-bg': '#221c29',
  '--table-header-fg': '#f6eef3',
  '--table-row-alt': 'rgba(224,122,168,0.07)',
  '--table-row-hover': 'rgba(224,122,168,0.12)',
  '--table-border': '#382c40',
  '--table-border-width': '1px',
  '--table-cell-pad-y': '9px',
  '--table-cell-pad-x': '14px',
  '--table-font-size': '0.88em',
  '--math-fg': '#ede3e9',
  '--math-bg': 'rgba(224,122,168,0.08)',
  '--danger': '#ff6b78',
  '--danger-bg': 'rgba(255,107,120,0.12)',
  '--warn': '#e8b34f',
  '--warn-bg': 'rgba(232,179,79,0.10)',
  '--ok': '#6fcb9f',
  '--ok-bg': 'rgba(111,203,159,0.10)',
  '--edge-shadow': 'rgba(0,0,0,0.30)',
  // Square, for the reason the table already is: @thmRadiusStyle `none`.
  '--surface-radius': '0',
  '--surface-corner': 'round',
  '--chrome-fg': '#ede3e9',
  '--chrome-muted': '#9c8ca0',
  '--chrome-border': '#2e2436',
  '--chrome-hl': 'rgba(224,122,168,0.14)',
  // The diagonal carried into the active sidebar row, matching the facet
  // panel below — see the contract's own note on why these two are paired.
  '--chrome-accent-shape': 'wedge',
  // No decoration in the source theme — facet picked for the moodiest, most
  // structural motif on offer, the one that reads as mass and shadow rather
  // than as a surface print.
  '--chrome-pattern': 'facet',
  '--chrome-pattern-opacity': '0.05',
  '--chrome-pattern-ink': 'light',
  '--syn-kw': '#ff6b9e',
  '--syn-str': '#6fcb9f',
  '--syn-fn': '#9a9ae0',
  '--syn-cm': '#9a8ca0',
  '--syn-num': '#e8b34f',
  '--syn-type': '#7cb8e8',
  '--syn-op': '#c9bed0',
  '--syn-var': '#e8b34f',
  '--syn-attr': '#7cb8e8',
  '--syn-tag': '#ff6b9e',
  '--syn-meta': '#9a8ca0',
  '--syn-lit': '#9a9ae0',
  '--font-ui': "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,sans-serif",
  // solaris's `.applyFontStyle(book)`. Merriweather again (see vlook-fancy for
  // the same substitution and the reasoning behind dropping the source
  // theme's CJK names) — a different mood entirely on this dark, magenta
  // ground despite sharing the physical face with fancy's light one.
  '--font-body':
    "Merriweather,Charter,'Iowan Old Style','Palatino Linotype','Book Antiqua','Noto Serif',Georgia,serif",
  '--font-heading':
    "Merriweather,Charter,'Iowan Old Style','Palatino Linotype','Book Antiqua','Noto Serif',Georgia,serif",
  // solaris's book style resolves @bookMono to `--b-fm-serif-mono` (Courier /
  // Courier New) and nothing else — the most explicitly serif-mono of the
  // seven, matching the Merriweather body above. See index.html for why IBM
  // Plex Mono leads Courier New here.
  '--font-mono': "'IBM Plex Mono','Courier New',Courier,ui-monospace,SFMono-Regular,Menlo,monospace",
};
