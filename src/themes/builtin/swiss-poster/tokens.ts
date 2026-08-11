import type { ThemeTokens } from '../../contract';

// A Swiss poster: warm stock, one vermilion, a grotesque, and no ornament.
//
// Drawn for `figureground`, which is the poster designer's own device — the
// sidebar gives up its fill to the page and --chrome comes back as two sheared
// masses, one gripping the Open-file button and one carrying the footer, with
// the toolbar's logo cluster as a third. Figure and ground trade places. Nothing
// else in this file is allowed to compete with that: markers off, table rules
// reduced to one, radius zero, hierarchy carried by size and weight alone.
//
// The palette is constrained by the motif in a way worth stating plainly,
// because it is the trap this theme exists to avoid. `figureground` swaps the
// panel fill to --bg but leaves the text on --chrome-fg, so the file list ends
// up on the *page* color while the footer and the logo tab stay on the *chrome*
// color — one text token over two different grounds. That means --bg and
// --chrome cannot sit at opposite ends of the lightness scale: a white page with
// a black mass leaves no value for --chrome-fg that clears 4.5 on both (the
// arithmetic bottoms out around 4.1 on each side). So the two surfaces separate
// by hue and saturation instead, both light enough to take the same near-black
// ink — which is what a two-color poster does anyway.
export const tokens: ThemeTokens = {
  '--bg': '#f2ede1',
  // The vermilion mass. Lighter than the pigment it is named for, and by
  // measurement rather than taste: at a true vermilion the mass tops out at 5.7
  // against pure black, which leaves no room under it for a secondary tone —
  // --chrome-muted lands at 4.1 and the footer's storage line fails. At this
  // value the same dark browns clear 5.4 on the mass and 12.9 on the page.
  '--chrome': '#ef7a52',
  '--fg': '#1c1410',
  '--muted': '#6b5a4e',
  // The poster red, a step deeper than the mass so the two never read as an
  // accident of the same ink at two opacities.
  '--link': '#bd2f18',
  '--body-fg': '#1c1410',
  // Black, with one red subhead. The whole hierarchy is size and weight — see
  // the scale below, which is the widest in this folder — and the single red
  // level is the poster's one moment of color in the type.
  '--h1-fg': '#1c1410',
  '--h2-fg': '#bd2f18',
  '--h3-fg': '#1c1410',
  '--h4-fg': '#2b211b',
  '--h5-fg': '#3a2f26',
  '--h6-fg': '#6b5a4e',
  '--border': '#c9bda2',
  '--code-bg': '#e8e1cf',
  '--quote-bg': 'rgba(189,47,24,0.06)',
  '--hl': 'rgba(189,47,24,0.10)',
  '--quote-accent': '#bd2f18',
  '--quote-fg': '#1c1410',
  '--code-header-bg': '#ddd4c0',
  '--code-header-fg': '#6b5a4e',
  '--heading-accent': '#bd2f18',
  '--heading-accent-soft': 'rgba(189,47,24,0.35)',
  // Set for every level even though the marker is off below, so a reader who
  // turns the glyphs back on gets them in the poster's red rather than in the
  // contract's blue.
  '--h2-accent': '#bd2f18',
  '--h2-accent-soft': 'rgba(189,47,24,0.35)',
  '--h3-accent': '#bd2f18',
  '--h3-accent-soft': 'rgba(189,47,24,0.35)',
  '--h4-accent': '#bd2f18',
  '--h4-accent-soft': 'rgba(189,47,24,0.35)',
  '--h5-accent': '#bd2f18',
  '--h5-accent-soft': 'rgba(189,47,24,0.35)',
  '--h6-accent': '#bd2f18',
  '--h6-accent-soft': 'rgba(189,47,24,0.35)',
  // Off. This is the structural choice the token exists for: the International
  // Style carries rank on size, weight and position, and a decorative glyph in
  // front of every heading is exactly what it was a reaction against.
  '--heading-marker-style': 'off',
  '--heading-marker': '0.52em',
  '--heading-rule': '#bd2f18',
  // The widest ladder in this folder, and deliberately so — with no markers and
  // no rules doing the ranking, the size steps have to carry all of it. 3em to
  // 0.85em is a poster's own range compressed into a reading column.
  '--h1-size': '3em',
  '--h2-size': '1.9em',
  '--h3-size': '1.35em',
  '--h4-size': '1.1em',
  '--h5-size': '0.95em',
  '--h6-size': '0.85em',
  // Bold and set tight. A grotesque at 3em with the app's default 1.25 leading
  // reads as a web page with a big headline; at 1.05 it reads as type that was
  // set rather than defaulted.
  //
  // 700, not the 800 this started at, and the correction runs both ways. On
  // Windows the Helvetica stack below resolves to Arial, and Arial at 800 is not
  // a heavier Arial — the platform substitutes Arial Black, a separate display
  // face whose character set stops short of the Vietnamese vowels that carry two
  // marks, so those glyphs came back in Times New Roman: a serif, inside the
  // headline of a poster whose whole argument is one grotesque. 700 keeps Arial
  // Bold, which draws them. It is also the more faithful weight — the posters
  // this is named for are set in Helvetica Bold, and Arial Black was never
  // Helvetica in the first place.
  '--h1-weight': '700',
  '--heading-weight': '700',
  '--heading-line-height': '1.05',
  '--body-size-scale': '1',
  '--body-line-height-scale': '1.05',
  '--badge-bg': '#e8e1cf',
  // Minimal: one rule under the header, whitespace for the rest, and a
  // transparent header fill so nothing boxes the data in. The generous padding
  // is the grid doing the separating — which is the same argument as the
  // markers, applied to a table.
  '--table-style': 'minimal',
  '--table-radius': '0',
  '--table-header-bg': 'rgba(0,0,0,0)',
  '--table-header-fg': '#1c1410',
  '--table-row-alt': 'rgba(0,0,0,0)',
  '--table-row-hover': 'rgba(189,47,24,0.06)',
  // Full black rather than the hairline grey the other themes use here: with one
  // rule left on the table, that rule is a design element and is drawn like one.
  '--table-border': '#1c1410',
  '--table-border-width': '1px',
  '--table-cell-pad-y': '12px',
  '--table-cell-pad-x': '16px',
  '--table-font-size': '0.92em',
  '--math-fg': '#1c1410',
  '--math-bg': 'rgba(28,20,16,0.03)',
  '--danger': '#bd2f18',
  '--danger-bg': 'rgba(189,47,24,0.08)',
  '--warn': '#8a5a00',
  '--warn-bg': 'rgba(138,90,0,0.08)',
  '--ok': '#2f6b3a',
  '--ok-bg': 'rgba(47,107,58,0.08)',
  '--edge-shadow': 'rgba(28,20,16,0.16)',
  // Square, everywhere. The masses this motif cuts are straight-edged polygons;
  // a rounded code block beside them would be the only curve on the sheet.
  '--surface-radius': '0',
  '--surface-corner': 'bevel',
  // Near-black, and it has to clear 4.5 twice — once on the vermilion mass
  // (6.55) and once on the page the panel fill is swapped to (15.5). See the
  // header comment for why that is two measurements rather than one.
  '--chrome-fg': '#1c1410',
  // The same test at the secondary level: 5.47 on the mass, 12.97 on the page.
  '--chrome-muted': '#3a1f14',
  '--chrome-border': '#b8492a',
  // A neutral dark wash rather than a tint of either surface, because it lands
  // on both: a vermilion-tinted highlight is invisible on the vermilion mass,
  // and a cream one is invisible on the page.
  '--chrome-hl': 'rgba(28,20,16,0.10)',
  // Wedge. `figureground` shears the top mass from 97px down to 154px and cuts
  // 23px off the logo tab's trailing edge — the active row taking the same
  // diagonal is the motif's own geometry restated at row scale.
  '--chrome-accent-shape': 'wedge',
  '--chrome-pattern': 'figureground',
  // The reference density. `figureground` draws its masses in solid --chrome and
  // deliberately ignores this knob — thinning them would leave the file list on
  // a half-tint of a background it just swapped away from — so the value is here
  // for the same reason github-light states it: as the calibrated starting point
  // if the pattern is ever changed.
  '--chrome-pattern-opacity': '0.05',
  // Black ink, matching the light chrome, though this motif reads no ink either.
  '--chrome-pattern-ink': 'dark',
  // Checked against --code-bg (#e8e1cf), which is the tightest surface here: it
  // caps a legible token at roughly 0.129 relative luminance, so several of these
  // are a step darker than the same hue would be elsewhere in the palette.
  '--syn-kw': '#b02b16',
  '--syn-str': '#2f6b3a',
  '--syn-fn': '#6b3f8a',
  '--syn-cm': '#655b4e',
  '--syn-num': '#8a5a00',
  '--syn-type': '#0f5f6b',
  '--syn-op': '#3a2f26',
  '--syn-var': '#1c1410',
  '--syn-attr': '#0f5f6b',
  '--syn-tag': '#b02b16',
  '--syn-meta': '#655b4e',
  '--syn-lit': '#6b3f8a',
  // One grotesque for everything. This is the theme's other structural claim:
  // the International Style set an entire poster — headline, body and caption —
  // in a single face at different sizes, and a second family anywhere here would
  // undo it.
  '--font-ui': "'Helvetica Neue',Helvetica,Arial,sans-serif",
  '--font-body': "'Helvetica Neue',Helvetica,Arial,sans-serif",
  '--font-heading': "'Helvetica Neue',Helvetica,Arial,sans-serif",
  // The one exception, and only because code needs the fixed pitch to be code.
  '--font-mono': "'Cascadia Mono',Consolas,ui-monospace,'SF Mono',Menlo,monospace",
};
