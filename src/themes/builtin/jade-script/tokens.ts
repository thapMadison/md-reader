import type { ThemeTokens } from '../../contract';

// Inspired by VLOOK "thinking" (vlook-thinking.less): a light, airy teal/blue
// theme (@theme1 #1D9A94 / @theme2 #298BCC), set in `.applyFontStyle(zen)` —
// not `local` as first assumed; font.less's zen group sets the whole reading
// surface in calligraphy — a body face built to read at paragraph size
// (@zenBaseFont "霞鹜文楷"/LXGW WenKai, a Kai script) and a heavier cut of the
// same hand for titles (@zenTitle "阿里妈妈东方大楷"). Both roles are ported to
// one Latin face here, Mali, rather than to two: a script heading over serif
// body text was the earlier draft and it read as two unrelated themes stacked,
// which is not what zen does. See --font-body below.
//
// @thmRadiusStyle is `leaf` — organic, exaggerated rounding; 18px is the
// closest a uniform-corner radius token comes (no asymmetric-corner support).
// @thmTableStyle is `report`, core.less's own 三线表 ("three-line table") —
// an outer top/bottom frame and one rule under the header, no vertical or
// interior row lines at all — which maps to `minimal`, not the `horizontal`
// this file originally shipped with (that mismatch traced back to the same
// wrong-keyword assumption as the font above).
export const tokens: ThemeTokens = {
  '--bg': '#fbfefe',
  '--chrome': '#eef8f8',
  '--fg': '#1c3535',
  '--muted': '#5c7b7b',
  '--link': '#298bcc', // thinking's @theme2, unmodified — clears 4.52:1
  '--body-fg': '#1c3535',
  '--h1-fg': '#122626',
  '--h2-fg': '#1c3535',
  '--h3-fg': '#1c3535',
  '--h4-fg': '#1c3535',
  '--h5-fg': '#1c3535',
  '--h6-fg': '#5c7b7b',
  '--border': '#d3ecea',
  '--code-bg': '#eaf6f5',
  '--quote-bg': 'rgba(41,139,204,0.05)',
  '--hl': 'rgba(41,139,204,0.08)',
  '--quote-accent': '#298bcc',
  '--quote-fg': '#1e3d3d',
  '--code-header-bg': '#e0f1ef',
  '--code-header-fg': '#4f7472',
  // Blue leads (h2, h4, h6); teal — darkened off thinking's raw @theme1 for
  // 4.5:1 on --code-bg — takes the levels between (h3, h5), mirroring
  // thinking's own theme1/theme2 split.
  '--heading-accent': '#298bcc',
  '--heading-accent-soft': 'rgba(41,139,204,0.34)',
  '--h2-accent': '#298bcc',
  '--h2-accent-soft': 'rgba(41,139,204,0.34)',
  '--h3-accent': '#177c77',
  '--h3-accent-soft': 'rgba(23,124,119,0.34)',
  '--h4-accent': '#298bcc',
  '--h4-accent-soft': 'rgba(41,139,204,0.34)',
  '--h5-accent': '#177c77',
  '--h5-accent-soft': 'rgba(23,124,119,0.34)',
  '--h6-accent': '#298bcc',
  '--h6-accent-soft': 'rgba(41,139,204,0.34)',
  // Off: the headings already carry their own identity through the hand they
  // are set in, and a geometric glyph beside a pen-drawn letterform reads as a
  // harder edge than anything else in this theme allows.
  '--heading-marker-style': 'off',
  '--heading-marker': '0.52em',
  '--heading-rule': '#d3ecea',
  '--h1-size': '2.1em',
  '--h2-size': '1.5em',
  '--h3-size': '1.16em',
  '--h4-size': '1.02em',
  '--h5-size': '0.92em',
  '--h6-size': '0.8em',
  // Both are real Mali cuts loaded in index.html, not synthesized bolds — a
  // faux-bolded pen face smears its thin strokes and loses the hand entirely.
  '--h1-weight': '700',
  '--heading-weight': '600',
  // Looser than the contract default — both the airy, uncluttered feel of
  // thinking's own generous spacing, and headroom for Mali's ascenders and
  // descenders, which run long and would clip at a tighter line-height.
  '--heading-line-height': '1.35',
  '--body-size-scale': '1',
  // Body text set in a hand needs more air between lines than a serif does,
  // for the same descender reason as the headings above.
  '--body-line-height-scale': '1.12',
  '--badge-bg': '#e0f1ef',
  // thinking's own @thmTableStyle is `report` — core.less's three-line
  // table: a top/bottom frame and one rule under the header, nothing between
  // body rows and no vertical lines at all. `minimal` is the closest match.
  '--table-style': 'minimal',
  // thinking's @thmRadiusStyle is `leaf`; 18px is the closest a uniform
  // corner radius comes to that organic, exaggerated rounding.
  '--table-radius': '18px',
  '--table-header-bg': '#e0f1ef',
  '--table-header-fg': '#122626',
  '--table-row-alt': 'rgba(41,139,204,0.04)',
  '--table-row-hover': 'rgba(41,139,204,0.08)',
  '--table-border': '#d3ecea',
  '--table-border-width': '1px',
  '--table-cell-pad-y': '10px',
  '--table-cell-pad-x': '16px',
  '--table-font-size': '0.88em',
  '--math-fg': '#1c3535',
  '--math-bg': 'rgba(41,139,204,0.05)',
  '--danger': '#c1272d',
  '--danger-bg': 'rgba(193,39,45,0.08)',
  '--warn': '#9c6b12',
  '--warn-bg': 'rgba(156,107,18,0.07)',
  '--ok': '#1a7f53',
  '--ok-bg': 'rgba(26,127,83,0.08)',
  '--edge-shadow': 'rgba(28,53,53,0.10)',
  // leaf, the roundest of VLOOK's radius keywords — the largest surface
  // radius among these seven themes.
  '--surface-radius': '18px',
  '--surface-corner': 'round',
  '--chrome-fg': '#1c3535',
  '--chrome-muted': '#5c7b7b',
  '--chrome-border': '#d3ecea',
  '--chrome-hl': 'rgba(41,139,204,0.08)',
  '--chrome-accent-shape': 'flat',
  // No decoration in the source theme, and the airy mood this theme leans on
  // reads better with nothing printed on the chrome surface at all.
  '--chrome-pattern': 'none',
  '--chrome-pattern-opacity': '0.05',
  '--chrome-pattern-ink': 'dark',
  '--syn-kw': '#b3245f',
  '--syn-str': '#1a7e52',
  '--syn-fn': '#1f6fa8',
  '--syn-cm': '#5f8583',
  '--syn-num': '#a6540a',
  '--syn-type': '#177c77',
  '--syn-op': '#1f6fa8',
  '--syn-var': '#a6540a',
  '--syn-attr': '#177c77',
  '--syn-tag': '#b3245f',
  '--syn-meta': '#5f8583',
  '--syn-lit': '#6b3fa0',
  // Chrome stays system sans — VLOOK's own zen style only touches the reading
  // surface, never its UI chrome.
  '--font-ui': "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,sans-serif",
  // One face for both roles, which is what zen itself does: @zenFont and
  // @zenTitle are two cuts of the same Kai calligraphy hand, not a script
  // heading sitting on top of unrelated body text. Mali is the port — a
  // pen-drawn Latin face with the same thin-stroke, hand-written register,
  // drawn to stay readable at paragraph length rather than as a display-only
  // script. It carries a true 600/700 for the heading weights above and a true
  // italic for emphasis, so nothing here is synthesized.
  '--font-body': "Mali,Georgia,'Iowan Old Style','Palatino Linotype',cursive,serif",
  '--font-heading': "Mali,Georgia,'Iowan Old Style','Palatino Linotype',cursive,serif",
  // zen resolves @zenMono to Go Mono then `--b-fm-serif-mono` (Courier /
  // Courier New) — the typewriter face is what keeps a code block inside this
  // theme's notebook mood instead of dropping to a neutral system mono. Go
  // Mono is dropped as it ships with no OS; a monospaced calligraphy face does
  // not exist, so IBM Plex Mono's humanist warmth is the nearest the code
  // block gets to the hand-written body around it. See index.html.
  '--font-mono': "'IBM Plex Mono','Courier New',Courier,ui-monospace,SFMono-Regular,Menlo,monospace",
};
