import type { ThemeTokens } from '../../contract';

// An 80-column punch card: manila stock, carbon ink, one index red.
//
// Unlike the ported themes in this folder, this one has no upstream editor
// theme — it is drawn for a motif instead. `notched` cuts a repeating step down
// the sidebar's trailing edge and takes a matching step out of the toolbar, and
// the object that geometry belongs to is a tab-cut filing card. Everything else
// here follows from that: two ink colors because a card was printed in two, a
// beveled surface corner because a card's own corner is clipped, and a column
// grid on tables because a card is a grid of columns.
//
// The two stocks are kept a clear step apart — #f2ead6 for the reading canvas,
// #ded0ae for the chrome — and that separation is load-bearing rather than
// decorative. `notched` clips the panel, so every cut shows --bg through it; two
// near-identical creams would leave the notches invisible and the motif would
// read as a panel with a missing border.
export const tokens: ThemeTokens = {
  '--bg': '#f2ead6',
  '--chrome': '#ded0ae',
  '--fg': '#2e2317',
  '--muted': '#6e5f47',
  // Index red — the second and only other color on the card, used for the ruled
  // field marks. It carries links, the h1, and every heading marker here, so the
  // whole theme stays to the two inks a card actually had.
  '--link': '#b3241f',
  '--body-fg': '#2e2317',
  // The card's printed legend was red and its typed content black. h1 takes the
  // legend, h2-h6 step down the carbon ladder — hierarchy by ink density, which
  // is the only ladder a two-color print process has.
  '--h1-fg': '#b3241f',
  '--h2-fg': '#2e2317',
  '--h3-fg': '#3d3020',
  '--h4-fg': '#4c3c28',
  '--h5-fg': '#5b4930',
  '--h6-fg': '#6e5f47',
  '--border': '#c9b894',
  '--code-bg': '#e9dfc4',
  '--quote-bg': 'rgba(179,36,31,0.06)',
  '--hl': 'rgba(179,36,31,0.10)',
  '--quote-accent': '#b3241f',
  '--quote-fg': '#2e2317',
  '--code-header-bg': '#d5c59f',
  '--code-header-fg': '#5d5039',
  '--heading-accent': '#b3241f',
  '--heading-accent-soft': 'rgba(179,36,31,0.35)',
  // One accent for every level, unlike the per-level hues some themes here set.
  // The heading colors above already rank the levels; a second ladder in the
  // markers would be a third color the press never had.
  '--h2-accent': '#b3241f',
  '--h2-accent-soft': 'rgba(179,36,31,0.35)',
  '--h3-accent': '#b3241f',
  '--h3-accent-soft': 'rgba(179,36,31,0.35)',
  '--h4-accent': '#b3241f',
  '--h4-accent-soft': 'rgba(179,36,31,0.35)',
  '--h5-accent': '#b3241f',
  '--h5-accent-soft': 'rgba(179,36,31,0.35)',
  '--h6-accent': '#b3241f',
  '--h6-accent-soft': 'rgba(179,36,31,0.35)',
  // Wedge rather than chevron: the notch cuts in and out on a 17px diagonal, and
  // the wedge glyph family is the one that shears at a constant angle. The
  // markers state in the article the same cut the chrome states in its edge.
  '--heading-marker-style': 'wedge',
  '--heading-marker': '0.5em',
  '--heading-rule': '#b3241f',
  // A tight ladder. Card stock is dense by nature — 80 columns in 7-3/8 inches —
  // and a display-sized h1 would be the one element on the page that had never
  // been near a card.
  '--h1-size': '1.9em',
  '--h2-size': '1.42em',
  '--h3-size': '1.16em',
  '--h4-size': '1.02em',
  '--h5-size': '0.92em',
  '--h6-size': '0.82em',
  '--h1-weight': '700',
  '--heading-weight': '650',
  '--heading-line-height': '1.2',
  // Slightly under the base metric, for the same density reason as the scale.
  '--body-size-scale': '0.98',
  '--body-line-height-scale': '1',
  '--badge-bg': '#e9dfc4',
  // The full lattice, square. A punch card is a ruled grid of numbered columns,
  // so this is the one table style that is a reproduction rather than a choice.
  '--table-style': 'grid',
  '--table-radius': '0',
  '--table-header-bg': '#d5c59f',
  '--table-header-fg': '#2e2317',
  '--table-row-alt': 'rgba(46,35,23,0.03)',
  '--table-row-hover': 'rgba(179,36,31,0.07)',
  '--table-border': '#c9b894',
  '--table-border-width': '1px',
  '--table-cell-pad-y': '7px',
  '--table-cell-pad-x': '11px',
  '--table-font-size': '0.85em',
  '--math-fg': '#2e2317',
  '--math-bg': 'rgba(46,35,23,0.04)',
  // A step deeper than --link, so an error is not merely the theme's accent
  // appearing somewhere unexpected.
  '--danger': '#8c1d18',
  '--danger-bg': 'rgba(140,29,24,0.09)',
  '--warn': '#7d5a0e',
  '--warn-bg': 'rgba(125,90,14,0.09)',
  '--ok': '#47661f',
  '--ok-bg': 'rgba(71,102,31,0.09)',
  '--edge-shadow': 'rgba(46,35,23,0.16)',
  // 5px, cut rather than rounded. A card's leading corner is clipped at an angle
  // so a deck can only be stacked one way round; every boxed surface in the
  // article repeats that clip.
  '--surface-radius': '5px',
  '--surface-corner': 'bevel',
  '--chrome-fg': '#2e2317',
  // Darker than --muted, which is measured against --bg. The chrome stock is a
  // full step deeper than the canvas, so a secondary tone that clears 4.5 on the
  // page only reaches 4.05 on the panel — this is the value that clears both.
  '--chrome-muted': '#5d5039',
  '--chrome-border': '#c2ae87',
  '--chrome-hl': 'rgba(179,36,31,0.10)',
  // The notch is a diagonal step in the panel's edge; the wedge is a diagonal
  // step in the active row's. Pairing them means the sidebar states one angle
  // rather than two — the same argument that pairs `wedge` with `facet`, applied
  // to the other motif built on a 45-degree cut.
  '--chrome-accent-shape': 'wedge',
  '--chrome-pattern': 'notched',
  // The reference density. `notched` is a clip rather than an overlay, so it
  // reads no alpha at all — the value is stated so switching this theme to an
  // inked motif starts from the calibrated strength.
  '--chrome-pattern-opacity': '0.05',
  // Black ink: the chrome is manila stock, and white on it would be nothing.
  '--chrome-pattern-ink': 'dark',
  // Checked against --code-bg (#e9dfc4), not --bg. The palette stays inside the
  // card's world — carbon, index red, a field green — with an indigo and a plum
  // added where the language genuinely has more than three kinds of token.
  '--syn-kw': '#a3201b',
  '--syn-str': '#47661f',
  '--syn-fn': '#3a4a7a',
  '--syn-cm': '#6b5e46',
  '--syn-num': '#7d5a0e',
  '--syn-type': '#6b3f8a',
  '--syn-op': '#4c3c28',
  '--syn-var': '#2e2317',
  '--syn-attr': '#3a4a7a',
  '--syn-tag': '#47661f',
  '--syn-meta': '#6b5e46',
  '--syn-lit': '#6b3f8a',
  // A tight grotesque for the chrome, which is where a card's small printed
  // legends were set. Tahoma rather than the Arial Narrow this asked for first:
  // Arial Narrow's character set stops at Latin-1, so every Vietnamese vowel
  // carrying both a shape mark and a tone mark — ầ ế ữ ộ — fell out of it and
  // was rendered by Arial instead, at a different width, mid-word. Tahoma is the
  // narrowest face on the shortlist that draws them itself.
  '--font-ui': "Tahoma,'Segoe UI',Arial,sans-serif",
  // A serif for prose. The card is the filing system, not the reading matter —
  // running long-form text in the card's own typewriter face would make the
  // article an artifact of the chrome rather than the thing it holds.
  //
  // Cambria for the same reason Tahoma is above, and it is the more expensive
  // loss of the two: Georgia lacks the same vowels, so a Vietnamese paragraph
  // came out as Georgia with roughly one glyph in ten dropping into Palatino —
  // two serifs alternating inside single words. Cambria and Constantia both
  // carry the full set; Georgia is now absent from the stack rather than demoted
  // down it, since a later position would only postpone the same mixing.
  '--font-body': "Cambria,Constantia,'Palatino Linotype',Palatino,serif",
  // The interpreted line printed along a card's top edge, in the fixed pitch it
  // was punched at — which is why the headings, not the body, take the mono.
  '--font-heading': "Consolas,'Cascadia Mono',ui-monospace,'SF Mono',Menlo,monospace",
  '--font-mono': "Consolas,'Cascadia Mono',ui-monospace,'SF Mono',Menlo,monospace",
};
