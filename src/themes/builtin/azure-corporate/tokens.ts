import type { ThemeTokens } from '../../contract';

export const tokens: ThemeTokens = {
  '--bg': '#f7f9fb',
  '--chrome': '#111c2e',
  '--fg': '#111c2e',
  '--muted': '#5a6b80',
  '--link': '#1782c4',
  // Heading levels cycle the four section accents this theme's UI uses for
  // OUTPUT / PROGRESS / IMPROVEMENT / IMPACT, so nesting depth reads as color
  // rather than size alone. The accents are darkened from their chip values:
  // as chips they sit on a fill and only need 3:1, but as heading text on --bg
  // they carry the glyph, and h4-h6 are small (1.02em down to 0.8em). Every
  // value below clears 4.5:1 on both --bg and the blockquote wash; the raw chip
  // cyan (#1a9ed4) came in at 2.89 and would have been unreadable at 0.8em.
  '--body-fg': '#263449',
  '--h1-fg': '#0f1b2d',
  '--h2-fg': '#b8420e',
  '--h3-fg': '#1665a8',
  '--h4-fg': '#0f7350',
  '--h5-fg': '#6d3bc4',
  '--h6-fg': '#0b6a8a',
  '--border': '#d8e0e9',
  '--code-bg': '#eef2f7',
  '--quote-bg': 'rgba(41,163,224,0.07)',
  '--hl': 'rgba(41,163,224,0.10)',
  '--quote-accent': '#29a3e0',
  '--quote-fg': '#22334d',
  '--code-header-bg': '#e4ecf4',
  '--code-header-fg': '#4a5d75',
  // This theme gives every heading level its own hue, so each marker takes the
  // hue of the heading it precedes and reads as part of that heading rather
  // than as a separate accent. Each --h*-accent below matches the --h*-fg of
  // the same level exactly. The shared pair is the fallback for anything that
  // doesn't consult the per-level tokens (the print block), kept teal because
  // it has to sit beside both the warm h2 and the cool h3.
  '--heading-accent': '#0d9bb5',
  '--heading-accent-soft': 'rgba(13,155,181,0.34)',
  '--h2-accent': '#b8420e',
  '--h2-accent-soft': 'rgba(184,66,14,0.34)',
  '--h3-accent': '#1665a8',
  '--h3-accent-soft': 'rgba(22,101,168,0.34)',
  // h4-h6 draw single-tone shapes, so the -soft tone is unused by the default
  // glyphs; it is set to each level's own hue anyway so a theme edit that
  // switches one of these levels to a two-tone shape stays in palette.
  '--h4-accent': '#0f7350',
  '--h4-accent-soft': 'rgba(15,115,80,0.34)',
  '--h5-accent': '#6d3bc4',
  '--h5-accent-soft': 'rgba(109,59,196,0.34)',
  '--h6-accent': '#0b6a8a',
  '--h6-accent-soft': 'rgba(11,106,138,0.34)',
  // The marker is this theme's signature, and with every level carrying a
  // different hue it is also what ties each heading to its section accent.
  //
  // Wedge rather than chevron: this theme's geometry is diagonal — sheared
  // planes and beveled corners rather than curves and points — and the wedge
  // family shears a constant slope where the chevron family draws arrowheads.
  // The depth ladder is identical between the two, so switching families costs
  // nothing in how readably the levels rank.
  '--heading-marker-style': 'wedge',
  '--heading-marker': '0.52em',
  '--heading-rule': '#c9d9e8',
  '--badge-bg': '#e8eef5',
  // Full grid: this theme is for spec and status tables, where every cell is a
  // discrete value and the vertical rules are what stop the eye drifting across
  // columns. Softer corners match the rest of its UI surfaces.
  '--table-style': 'grid',
  // Beveled like every other surface (--surface-corner shapes both), but deeper
  // than --surface-radius rather than equal to it. The frame is ~650px wide
  // where a fence is the same width but far shorter, so the same 7px cut that
  // reads clearly on a code block is proportionally lost on the table — the
  // corner treatment has to grow with the surface to stay legible as a facet.
  //
  // 12px is the top of that range, not the middle. Past it the cut starts eating
  // into the header band, and a notched header on a data grid reads as damage
  // rather than as geometry.
  '--table-radius': '12px',
  '--table-header-bg': '#e4ecf4',
  '--table-header-fg': '#0f1b2d',
  '--table-row-alt': 'rgba(41,163,224,0.05)',
  '--table-row-hover': 'rgba(41,163,224,0.10)',
  '--table-border': '#d8e0e9',
  '--table-border-width': '1px',
  // Denser than the contract default: this theme is for spec and status tables,
  // where fitting more rows on screen beats the air around each one.
  '--table-cell-pad-y': '7px',
  '--table-cell-pad-x': '13px',
  '--table-font-size': '0.86em',
  '--math-fg': '#111c2e',
  '--math-bg': 'rgba(41,163,224,0.06)',
  '--danger': '#e5534b',
  '--danger-bg': 'rgba(229,83,75,0.10)',
  '--warn': '#c9860d',
  '--warn-bg': 'rgba(201,134,13,0.10)',
  '--ok': '#2f8f63',
  '--ok-bg': 'rgba(47,143,99,0.10)',
  '--edge-shadow': 'rgba(17,28,46,0.14)',
  // Beveled, not rounded and not square. This theme's geometry is diagonal: the
  // wedge markers shear rather than curve, and a rounded card under a sheared
  // glyph reads as two design languages sharing a page. Square was the closest
  // this theme could get before --surface-corner existed; a 45-degree cut is
  // what it was actually reaching for, and it states the diagonal on the corner
  // itself rather than merely declining to curve it.
  //
  // 7px because the cut has to survive being scaled down. The chip step is
  // 0.625 of this, so 7px leaves inline code a 4.4px notch — visible as a cut
  // rather than as a rounding error — while a card at 1.125 lands on 7.9px,
  // deep enough to read across a full-width fence without eating its corner.
  //
  // On a browser without corner-shape this falls back to a 7px round, which is
  // a milder version of the same intent rather than a broken one.
  '--surface-radius': '7px',
  '--surface-corner': 'bevel',
  '--chrome-fg': '#e8eef6',
  '--chrome-muted': '#93a6bd',
  '--chrome-border': '#2a3b55',
  '--chrome-hl': 'rgba(41,163,224,0.16)',
  // The diagonal, carried into the chrome. The reference this theme is drawn
  // from cuts angled planes across its canvas; the active file row is where
  // that gesture can land without costing anything, since it is already the one
  // element in the sidebar meant to pull the eye, and its label sits on
  // --chrome-fg rather than the dimmer --chrome-muted the inactive rows use.
  '--chrome-accent-shape': 'wedge',
  // The same diagonal across the chrome fill itself — the plane the reference
  // actually cuts, where the wedge above is only its echo on one row.
  //
  // `facet` and not `chevron`, despite chevrons being the reference design's
  // pick for this theme: the planes are already this theme's diagonal geometry,
  // stated at the scale of the whole panel and measured against its own text
  // (see the facet section of chromePattern.tsx). A second motif over them would be two
  // decorations competing at different frequencies, and the planes are the one
  // with the contrast figures behind it.
  '--chrome-pattern': 'facet',
  // Contrast is protected by where the facets are, not by how faint they are, and
  // chromePattern.test.tsx enforces it geometrically: no facet may cover the
  // file-name column at all, which is why every name here measures 6.86 — the full
  // contrast of --chrome-muted on bare --chrome, at this reference density. The
  // storage line at the bottom is the one place the planes do cross text, pinned
  // at 5.22 where two layers meet — still comfortably clear of 4.5, since a black
  // shadow face only ever moves the ground away from --chrome-muted's blue.
  '--chrome-pattern-opacity': '0.05',
  // A light theme with a near-black chrome — which is exactly why the ink is a
  // token rather than something derived from `mode`. The article is light; the
  // chrome the pattern sits on is not.
  '--chrome-pattern-ink': 'light',
  '--syn-kw': '#b3245f',
  '--syn-str': '#0a5c3e',
  '--syn-fn': '#7038b8',
  '--syn-cm': '#6b7a8d',
  '--syn-num': '#a14a06',
  '--syn-type': '#0d6ea3',
  '--syn-op': '#1782c4',
  '--syn-var': '#8a4d1f',
  '--syn-attr': '#0d6ea3',
  '--syn-tag': '#0a5c3e',
  '--syn-meta': '#6b7a8d',
  '--syn-lit': '#b3245f',
  '--font-ui': "-apple-system,'Space Grotesk','Segoe UI',Helvetica,sans-serif",
  '--font-body': "-apple-system,'Space Grotesk','Segoe UI',Helvetica,sans-serif",
  '--font-mono': "ui-monospace,'SF Mono',SFMono-Regular,Menlo,Consolas,monospace",
};
