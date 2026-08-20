import type { ThemeTokens } from '../../contract';

// Tracking error: a tape read back through a head that has lost the signal.
//
// Drawn for `databend`, the one motif in the contract that imitates a specific
// physical artifact rather than a decorative texture — a scanline field, four
// bands that have slipped sideways and sheared, a wordmark split into red and
// cyan ghosts, and a notch bitten out of the active row as if a line had been
// displaced. Every other theme in this folder could survive its pattern being
// switched off; this one is named after its.
//
// That imitation is why the palette is built the way it is. The motif's channel
// split is fixed by the app (GLITCH_RED / GLITCH_CYAN in chromePatternStyles.ts)
// because the artifact is only legible in the colors it actually happens in — so
// the theme cannot tint the glitch and instead has to *belong* to it. The
// magenta below is chosen to sit between those two fixed channels rather than
// beside them, since one of the four torn bands is drawn in --link.
export const tokens: ThemeTokens = {
  '--bg': '#08070d',
  '--chrome': '#100e18',
  '--fg': '#e4e0ef',
  '--muted': '#8d86a8',
  // The band color. `databend` draws its widest tear in this token at 30% of the
  // reference alpha, so --link is a chrome material here before it is a link —
  // a muted accent would leave the tear reading as a shadow rather than as data.
  '--link': '#ff3d8f',
  '--body-fg': '#e4e0ef',
  // The channel split, carried into the article: white at the top, then the two
  // separated channels at h2 and h3, then the violet ground reasserting itself
  // down to h6. The heading ladder is the same signal decaying that the chrome
  // shows torn.
  '--h1-fg': '#ffffff',
  '--h2-fg': '#ff3d8f',
  '--h3-fg': '#47e0ff',
  '--h4-fg': '#c6bde8',
  '--h5-fg': '#a49cc2',
  '--h6-fg': '#8d86a8',
  '--border': '#2c2740',
  '--code-bg': '#050409',
  '--quote-bg': 'rgba(255,61,143,0.08)',
  '--hl': 'rgba(255,61,143,0.12)',
  '--quote-accent': '#47e0ff',
  '--quote-fg': '#e4e0ef',
  '--code-header-bg': '#100e18',
  '--code-header-fg': '#8d86a8',
  '--heading-accent': '#ff3d8f',
  '--heading-accent-soft': 'rgba(255,61,143,0.35)',
  // The markers alternate between the two channels rather than running one
  // accent down the ladder — the same separation the heading colors make, at
  // glyph scale. h2/h4/h6 take the magenta channel, h3/h5 the cyan.
  '--h2-accent': '#ff3d8f',
  '--h2-accent-soft': 'rgba(255,61,143,0.35)',
  '--h3-accent': '#47e0ff',
  '--h3-accent-soft': 'rgba(71,224,255,0.35)',
  '--h4-accent': '#ff3d8f',
  '--h4-accent-soft': 'rgba(255,61,143,0.35)',
  '--h5-accent': '#47e0ff',
  '--h5-accent-soft': 'rgba(71,224,255,0.35)',
  '--h6-accent': '#ff3d8f',
  '--h6-accent-soft': 'rgba(255,61,143,0.35)',
  // Wedge. Two of the motif's four bands are drawn with skewX — the tear is a
  // shear, not a straight cut — and the wedge family is the one that shears at a
  // constant angle.
  '--heading-marker-style': 'wedge',
  '--heading-marker': '0.55em',
  '--heading-rule': '#ff3d8f',
  '--h1-size': '2.2em',
  '--h2-size': '1.55em',
  '--h3-size': '1.2em',
  '--h4-size': '1.02em',
  '--h5-size': '0.92em',
  '--h6-size': '0.82em',
  '--h1-weight': '700',
  '--heading-weight': '650',
  '--heading-line-height': '1.2',
  // Down a little, up a little. Both are corrections for the mono body below
  // rather than preferences: a fixed-pitch face sets wider than a proportional
  // one at the same nominal size, and needs more leading to stay readable over a
  // long paragraph.
  '--body-size-scale': '0.95',
  '--body-line-height-scale': '1.08',
  '--badge-bg': '#050409',
  // The full lattice, square — a test card. The header is the one place the
  // magenta is allowed to sit as a field rather than as a tear.
  '--table-style': 'grid',
  '--table-radius': '0',
  '--table-header-bg': '#1a1526',
  '--table-header-fg': '#ff3d8f',
  '--table-row-alt': 'rgba(255,255,255,0.02)',
  '--table-row-hover': 'rgba(255,61,143,0.10)',
  '--table-border': '#2c2740',
  '--table-border-width': '1px',
  '--table-cell-pad-y': '7px',
  '--table-cell-pad-x': '12px',
  '--table-font-size': '0.86em',
  '--math-fg': '#e4e0ef',
  '--math-bg': 'rgba(255,61,143,0.06)',
  // Warm red rather than the magenta, which is already the theme's own accent
  // and is drawn in the chrome as decoration — an error has to be the one red
  // here that is not part of the artifact.
  '--danger': '#ff6b6b',
  '--danger-bg': 'rgba(255,107,107,0.14)',
  '--warn': '#ffc857',
  '--warn-bg': 'rgba(255,200,87,0.14)',
  '--ok': '#5ef0b0',
  '--ok-bg': 'rgba(94,240,176,0.14)',
  '--edge-shadow': 'rgba(0,0,0,0.6)',
  // Square. A raster has no curves, and the tears are horizontal by
  // construction — a rounded surface would be the one shape on screen that no
  // scanline could have produced.
  '--surface-radius': '0',
  '--surface-corner': 'bevel',
  '--chrome-fg': '#e4e0ef',
  // A step lighter than --h5-fg, which is otherwise the same violet. The tears
  // are drawn *over* the file rows, so this token is read against the band
  // composite rather than against --chrome: see the opacity note below.
  '--chrome-muted': '#aaa2c8',
  '--chrome-border': '#3a3356',
  '--chrome-hl': 'rgba(255,61,143,0.14)',
  // Flat, and this is the one place this theme declines a diagonal. `databend`
  // clips the active row itself (DATABEND_ACTIVE_ROW) with a displaced bite out
  // of its trailing edge; a wedge underneath would put two different cuts on the
  // same edge, and the motif's damage would read as the theme's geometry gone
  // wrong rather than as damage.
  '--chrome-accent-shape': 'flat',
  '--chrome-pattern': 'databend',
  // Above the reference density, but not as far above as the motif invites.
  // The tears are the theme, and at 0.05 they sit at the strength the geometry
  // was drawn to be *tasteful* at — too quiet to be the subject of a theme named
  // after them. The ceiling is not the 0.15 clamp, though, it is the widest
  // band: `databend` draws it in --link at 30% of the reference alpha and lays
  // it across the file rows, so --chrome-muted is read against the composite
  // rather than against --chrome. At 0.075 that composite drops this pairing to
  // 3.68:1 and the filenames under the tear stop clearing contrast; 0.06 holds
  // them at 4.73 while still reading a fifth stronger than reference.
  '--chrome-pattern-opacity': '0.06',
  '--chrome-pattern-ink': 'light',
  // Checked against --code-bg (#050409). The two channels do the work, with the
  // violets as the ground between them.
  '--syn-kw': '#ff3d8f',
  '--syn-str': '#5ef0b0',
  '--syn-fn': '#47e0ff',
  // Lifted well off the background: the obvious dimmer violet measured 3.7 here,
  // and a comment that fails is a comment nobody reads.
  '--syn-cm': '#7f77a3',
  '--syn-num': '#ffc857',
  '--syn-type': '#c6bde8',
  '--syn-op': '#a49cc2',
  '--syn-var': '#e4e0ef',
  '--syn-attr': '#47e0ff',
  '--syn-tag': '#ff3d8f',
  '--syn-meta': '#7f77a3',
  '--syn-lit': '#b98cff',
  // Mono everywhere, body included — the only theme in this folder that does it.
  // An on-screen display is a character grid: it has one face at one pitch
  // because that is the only thing the hardware could draw. Setting the article
  // in a proportional face would make the reading column the one region of this
  // theme that was never on the tape. The metric scales above are what pay for
  // it.
  // JetBrains Mono leads the stack — loaded in index.html — so the one face
  // this theme depends on is the same face on every reader rather than
  // whichever system mono a given OS happens to ship. The system stack still
  // sits behind it unchanged, for a blocked or offline font CDN.
  '--font-ui': "'JetBrains Mono','Cascadia Mono',Consolas,ui-monospace,'SF Mono',Menlo,monospace",
  '--font-body': "'JetBrains Mono','Cascadia Mono',Consolas,ui-monospace,'SF Mono',Menlo,monospace",
  '--font-heading': "'JetBrains Mono','Cascadia Mono',Consolas,ui-monospace,'SF Mono',Menlo,monospace",
  '--font-mono': "'JetBrains Mono','Cascadia Mono',Consolas,ui-monospace,'SF Mono',Menlo,monospace",
};
