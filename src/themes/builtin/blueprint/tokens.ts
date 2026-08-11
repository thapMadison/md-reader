import type { ThemeTokens } from '../../contract';

// A cyanotype drawing: Prussian ground, white line work, redlines on top.
//
// Drawn for `unprinted`, which empties the chrome — no fill, dashed rules for
// every edge, two construction diagonals across the panel, and a dimension
// callout lettered in --font-mono. That is a drafting set that has been set out
// but never printed, and this palette is the paper it would have been set out
// on. The motif already reaches for the mono face and the theme's --link for its
// dashed controls, so both are chosen here for what that motif does with them
// rather than for the article alone.
//
// --chrome is close to --bg on purpose, and it is the one value in this file
// that is *not* about the desktop. `unprinted` is structural, so the mobile
// drawer falls back to `none` and shows a solid --chrome panel; making it a near
// neighbour of the canvas keeps that fallback reading as the same drawing rather
// than as a different theme's sidebar sliding in.
export const tokens: ThemeTokens = {
  '--bg': '#0e2a48',
  '--chrome': '#123354',
  '--fg': '#e8f2fb',
  '--muted': '#93b4d2',
  // The redline: the annotation ink a drawing is marked up in, and the one color
  // on the sheet that is not part of the drawing itself. `unprinted` draws every
  // button as a dashed outline in this token, so it is the theme's control color
  // before it is its link color.
  '--link': '#ff7a66',
  '--body-fg': '#e8f2fb',
  // One ink, ranked by how hard the line was pressed. A drawing separates its
  // title block from its notes by weight and size, not by hue — so the levels run
  // white down through the blues rather than taking six colors.
  '--h1-fg': '#ffffff',
  '--h2-fg': '#d6ecff',
  '--h3-fg': '#b6d5f0',
  '--h4-fg': '#a3c6e6',
  '--h5-fg': '#93b4d2',
  '--h6-fg': '#7fa3c4',
  '--border': '#2c5a86',
  '--code-bg': '#0a2038',
  '--quote-bg': 'rgba(255,255,255,0.05)',
  '--hl': 'rgba(255,255,255,0.08)',
  '--quote-accent': '#ff7a66',
  '--quote-fg': '#e8f2fb',
  '--code-header-bg': '#123354',
  '--code-header-fg': '#93b4d2',
  '--heading-accent': '#ff7a66',
  '--heading-accent-soft': 'rgba(255,122,102,0.35)',
  // Every marker is a redline, at every level. The heading colors above are the
  // drawing; the markers are the markup on it, and markup is one pen.
  '--h2-accent': '#ff7a66',
  '--h2-accent-soft': 'rgba(255,122,102,0.35)',
  '--h3-accent': '#ff7a66',
  '--h3-accent-soft': 'rgba(255,122,102,0.35)',
  '--h4-accent': '#ff7a66',
  '--h4-accent-soft': 'rgba(255,122,102,0.35)',
  '--h5-accent': '#ff7a66',
  '--h5-accent-soft': 'rgba(255,122,102,0.35)',
  '--h6-accent': '#ff7a66',
  '--h6-accent-soft': 'rgba(255,122,102,0.35)',
  // Wedge: the motif's own drawing is two diagonals crossing the panel corner to
  // corner, so the article's markers shear at the same angle rather than
  // introducing a chevron the sheet has nowhere else.
  '--heading-marker-style': 'wedge',
  '--heading-marker': '0.5em',
  '--heading-rule': '#4a7fae',
  // A drawing's title block is set tight and small — the sheet's own space
  // belongs to the drawing, not to its labels.
  '--h1-size': '1.85em',
  '--h2-size': '1.4em',
  '--h3-size': '1.15em',
  '--h4-size': '1em',
  '--h5-size': '0.9em',
  '--h6-size': '0.82em',
  // Lighter than the app default at both levels. Drafting lettering is a
  // single-stroke gothic: one constant pen width, with size doing the ranking. A
  // 700-weight h1 would be a printed headline on a hand-lettered sheet.
  '--h1-weight': '600',
  '--heading-weight': '550',
  '--heading-line-height': '1.25',
  '--body-size-scale': '0.97',
  '--body-line-height-scale': '1.03',
  '--badge-bg': '#0a2038',
  // A schedule table off the drawing's title block: full grid, square, tight.
  '--table-style': 'grid',
  '--table-radius': '0',
  '--table-header-bg': '#123354',
  '--table-header-fg': '#ffffff',
  '--table-row-alt': 'rgba(255,255,255,0.03)',
  '--table-row-hover': 'rgba(255,122,102,0.08)',
  '--table-border': '#4a7fae',
  '--table-border-width': '1px',
  '--table-cell-pad-y': '7px',
  '--table-cell-pad-x': '12px',
  '--table-font-size': '0.85em',
  '--math-fg': '#e8f2fb',
  '--math-bg': 'rgba(255,255,255,0.05)',
  // Kept off --link's exact hue. On a sheet where the accent is already a
  // redline, an error that used the same red would be indistinguishable from an
  // ordinary annotation.
  '--danger': '#ff6f6f',
  '--danger-bg': 'rgba(255,111,111,0.12)',
  '--warn': '#ffc46b',
  '--warn-bg': 'rgba(255,196,107,0.12)',
  '--ok': '#7fd7a8',
  '--ok-bg': 'rgba(127,215,168,0.12)',
  '--edge-shadow': 'rgba(0,0,0,0.5)',
  // Square. A drawing is straightedge work and has no radius anywhere in it.
  '--surface-radius': '0',
  // Stated even though a 0 radius makes the two shapes coincide: it records
  // which way the corner should go if the radius is ever raised, so a reader who
  // opens this up gets a cut corner rather than a round one.
  '--surface-corner': 'bevel',
  '--chrome-fg': '#e8f2fb',
  '--chrome-muted': '#a9c6df',
  // Brighter than --border, because `unprinted` promotes this hairline to the
  // panel's only edge — the fill is gone, so what is left has to actually draw
  // the boundary rather than merely mark it.
  '--chrome-border': '#4a7fae',
  '--chrome-hl': 'rgba(255,255,255,0.09)',
  // Wedge, matching the construction diagonals the motif rules across the panel.
  '--chrome-accent-shape': 'wedge',
  '--chrome-pattern': 'unprinted',
  // Above the reference density. The motif's construction lines are authored at
  // 0.13 and its callouts at 0.45, both of which are hairline-thin against a
  // ground this dark; 0.07 lifts the drawing to where it reads as line work
  // rather than as a smudge, and stays well under the 0.15 ceiling.
  '--chrome-pattern-opacity': '0.07',
  // White ink. The chrome is Prussian blue, and the drawing on it is a cyanotype
  // — white lines are literally what this process produces.
  '--chrome-pattern-ink': 'light',
  // Checked against --code-bg (#0a2038). The blues are the sheet, the redline is
  // the markup, and the green and amber are the two colored pencils a marked-up
  // print picks up in practice.
  '--syn-kw': '#ff9d8c',
  '--syn-str': '#7fd7a8',
  '--syn-fn': '#8fd0ff',
  '--syn-cm': '#6b93b6',
  '--syn-num': '#ffc46b',
  '--syn-type': '#b6d5f0',
  '--syn-op': '#a3c6e6',
  '--syn-var': '#e8f2fb',
  '--syn-attr': '#8fd0ff',
  '--syn-tag': '#ff9d8c',
  '--syn-meta': '#6b93b6',
  '--syn-lit': '#c9b3ff',
  // Mono for the chrome, which is the point rather than a flourish: `unprinted`
  // letters its own dimension callouts in var(--font-mono) and sets them beside
  // the file list, so a proportional UI face would leave the motif's annotations
  // looking like something a different theme had left behind.
  '--font-ui': "Consolas,'Cascadia Mono',ui-monospace,'SF Mono',Menlo,monospace",
  // The body is the specification, not the drawing — a neutral grotesque, which
  // is what the written half of a set is actually typed in.
  '--font-body': "'Helvetica Neue',Helvetica,Arial,sans-serif",
  // Headings return to the drafting hand: they are the sheet's own labels.
  '--font-heading': "Consolas,'Cascadia Mono',ui-monospace,'SF Mono',Menlo,monospace",
  '--font-mono': "Consolas,'Cascadia Mono',ui-monospace,'SF Mono',Menlo,monospace",
};
