import type { ThemeTokens } from '../../contract';

// A near-black navy canvas with a cobalt accent. The two navies are kept as two
// distinct surfaces: #000a14 is the document canvas, #001428 the sidebar and
// titlebar chrome — so the chrome reads as a frame around the article rather
// than as more of the same wash.
export const tokens: ThemeTokens = {
  '--bg': '#000a14',
  '--chrome': '#001428',
  '--fg': '#e9eef5',
  '--muted': '#7c93ad',
  // Orange links against the blue canvas — the source theme's most distinctive
  // pairing, and the one place it deliberately leaves the blue family.
  '--link': '#ff9600',
  // Six hues, one per level, exactly as the source assigns them. On this near
  // black navy each clears 4.5:1, which the blue accent (#22a9ff, 5.6:1) also
  // does — but the blue is spent on strong/marker chrome there, so headings keep
  // their own ladder.
  '--body-fg': '#e9eef5',
  '--h1-fg': '#8fe28f',
  '--h2-fg': '#f0eb8e',
  '--h3-fg': '#f1b77c',
  '--h4-fg': '#f17cde',
  '--h5-fg': '#987cf1',
  '--h6-fg': '#7cf1de',
  '--border': '#0d3a63',
  // Pure black, a full step below --bg: the source draws code on #000000 inside
  // a #0063a1 border, so the fence reads as an inset rather than a raised card.
  '--code-bg': '#000000',
  '--quote-bg': 'rgba(0,74,148,0.24)',
  '--hl': 'rgba(34,169,255,0.12)',
  '--quote-accent': '#0685ff',
  '--quote-fg': '#ffffff',
  '--code-header-bg': '#001e3b',
  '--code-header-fg': '#7c93ad',
  // The shared pair stays blue (#22a9ff, the theme's accent) for anything that
  // doesn't consult the per-level tokens; each level below then takes its own
  // heading's hue, so a marker reads as part of the heading it precedes.
  '--heading-accent': '#22a9ff',
  '--heading-accent-soft': 'rgba(34,169,255,0.34)',
  '--h2-accent': '#f0eb8e',
  '--h2-accent-soft': 'rgba(240,235,142,0.34)',
  '--h3-accent': '#f1b77c',
  '--h3-accent-soft': 'rgba(241,183,124,0.34)',
  // h4-h6 draw single-tone shapes, so the -soft tone goes unused by the default
  // glyphs; set in palette anyway so switching a level to a two-tone shape later
  // doesn't land off-hue.
  '--h4-accent': '#f17cde',
  '--h4-accent-soft': 'rgba(241,124,222,0.34)',
  '--h5-accent': '#987cf1',
  '--h5-accent-soft': 'rgba(152,124,241,0.34)',
  '--h6-accent': '#7cf1de',
  '--h6-accent-soft': 'rgba(124,241,222,0.34)',
  // Kept on: with six heading hues the marker is what ties each glyph to its
  // level, and on a canvas this dark the accent shape is the cheapest way to
  // make a heading findable when scanning.
  '--heading-marker-style': 'chevron',
  '--heading-marker': '0.52em',
  // Green, matching the source's <hr> rule rather than its blue panel borders —
  // the h2 underline and the horizontal rule are the same gesture there.
  '--heading-rule': '#9bd22d',
  // Yellow-on-black inline code, the source's --code-bg/--code-text pair.
  '--badge-bg': '#000000',
  // Full grid: the source draws every cell edge in #1c89cd over a black fill,
  // and unlike a light-rule lattice on a mid-dark canvas, these rules sit close
  // enough to the fill to frame the cells without out-shouting them.
  '--table-style': 'grid',
  '--table-radius': '4px',
  '--table-header-bg': '#004a94',
  '--table-header-fg': '#ffffff',
  '--table-row-alt': 'rgba(34,169,255,0.05)',
  '--table-row-hover': 'rgba(34,169,255,0.12)',
  '--table-border': '#1c89cd',
  '--table-border-width': '1px',
  '--table-cell-pad-y': '8px',
  '--table-cell-pad-x': '12px',
  '--table-font-size': '0.88em',
  '--math-fg': '#e9eef5',
  '--math-bg': 'rgba(34,169,255,0.07)',
  '--danger': '#ff8787',
  '--danger-bg': 'rgba(255,135,135,0.12)',
  '--warn': '#f1b77c',
  '--warn-bg': 'rgba(241,183,124,0.12)',
  '--ok': '#9bd22d',
  '--ok-bg': 'rgba(155,210,45,0.12)',
  '--edge-shadow': 'rgba(0,0,0,0.55)',
  // 4px, matching the source theme's own uniform 4px on fences, quotes, inline
  // code and images — the same value its --table-radius already carries.
  '--surface-radius': '4px',
  // Rounded, matching the source theme's own soft 4px corners.
  '--surface-corner': 'round',
  '--chrome-fg': '#e9eef5',
  '--chrome-muted': '#b9c6d6',
  '--chrome-border': '#1c89cd',
  '--chrome-hl': 'rgba(34,169,255,0.12)',
  '--chrome-accent-shape': 'flat',
  // Mapped from the source's CodeMirror token colors; these are checked against
  // --code-bg (#000000) rather than --bg.
  '--syn-kw': '#22a9ff',
  '--syn-str': '#9bd22d',
  '--syn-fn': '#22a9ff',
  '--syn-cm': '#8e8e8e',
  '--syn-num': '#ff8787',
  '--syn-type': '#9bd22d',
  '--syn-op': '#d4d4d4',
  '--syn-var': '#f0eb8e',
  '--syn-attr': '#7cb7f1',
  '--syn-tag': '#569cd6',
  '--syn-meta': '#f1b77c',
  '--syn-lit': '#bd9aff',
  '--font-ui': "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,sans-serif",
  '--font-body': "Arial,-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,sans-serif",
  '--font-mono': "Consolas,'Cascadia Mono',ui-monospace,'SF Mono',Menlo,monospace",
};
