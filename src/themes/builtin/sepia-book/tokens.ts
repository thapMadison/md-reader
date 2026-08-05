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
  // Folio's own scale and weight, which is what a condensed display face is cut
  // for: Oswald at the 650 the base scale used reads as a heavy sans rather than
  // as a display face, and folio sets its headings at 500 with tight 1.08 leading
  // and a much wider size spread (4rem down to 1.085rem) than the base 2.1em/0.8em.
  //
  // Converted from folio's rem to em because these track --fs, so a reader who
  // scales the article up keeps the proportion; folio's body is 17px against a
  // 16px root, so its 4rem h1 is 3.76 times its own body text, not 4.
  //
  // These are em of the article, which --body-size-scale has already set to
  // folio's own 18.445px — so each value is simply folio's heading against
  // folio's body: its 4rem h1 over its 1.085rem body is 3.687em, and so on. No
  // correction for the scale is needed, because the em these multiply is the
  // same size as the em folio's own ratios were struck against.
  '--h1-size': '3.687em',
  '--h2-size': '2.212em',
  '--h3-size': '1.659em',
  // Folio sets h4, h5 and h6 all at 1.3rem (1.198em). Kept only for h4 here:
  // this app draws marker glyphs at h5 and h6 and ranks levels by size, so three
  // identical sizes would flatten the bottom of the ladder that the markers and
  // the h6 uppercase treatment are both working to rank. The steps below h4 are
  // narrow ones — folio's intent is a scale that stops descending, not one that
  // keeps halving.
  '--h4-size': '1.198em',
  '--h5-size': '1.1em',
  '--h6-size': '1.02em',
  '--h1-weight': '500',
  '--heading-weight': '500',
  '--heading-line-height': '1.08',
  // Folio reads at 18.445px on 1.82 leading (its html is 17px and #write 1.085rem).
  // Against this app's 16px/1.7 base that is 1.153 and 1.071 — a book theme is set
  // larger and looser than a screen theme, and with the heading scale now well
  // clear of 1em there is no longer a sub-1em heading for body text to out-shout.
  '--body-size-scale': '1',
  '--body-line-height-scale': '1.071',
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
  // Folio's reading stack, CJK names dropped — this theme is not typesetting
  // Chinese, and Sarasa/Songti sitting second and third meant a machine with
  // either one installed rendered body text in a face nobody chose. Merriweather
  // comes from the Google Fonts link in index.html, and the Charter/Iowan run
  // behind it keeps the theme on a book serif if the CDN is blocked or offline.
  '--font-body':
    "Merriweather,Charter,'Iowan Old Style','Palatino Linotype','Book Antiqua','Noto Serif',Georgia,serif",
  // Folio's display face, and the reason --font-heading exists: setting headings
  // in a condensed sans against a serif text face is the print convention this
  // theme is after, and it is the difference the reading face alone cannot make.
  // Arial Narrow / Helvetica Neue Condensed carry the condensed silhouette if
  // the CDN is unreachable. Folio's CJK display names are dropped rather than
  // carried: isFontStackValue's \w is ASCII-only, so a CJK family name fails
  // validation, and those names only ever resolved against the .TTF folio
  // bundles and this theme does not.
  '--font-heading': "Oswald,'Arial Narrow','Helvetica Neue Condensed',sans-serif",
  // Sarasa Mono dropped for the reason it left the body stack: it was only ever
  // there to carry CJK, which this theme does not set.
  '--font-mono': "ui-monospace,'SF Mono',SFMono-Regular,Menlo,Monaco,Consolas,monospace",
};
