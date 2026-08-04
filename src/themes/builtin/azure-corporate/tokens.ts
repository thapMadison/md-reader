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
  // This theme colors h2 and h3 differently, so each chevron takes its own
  // heading's hue and the glyph reads as part of the heading rather than as a
  // separate accent. The shared pair below is the fallback for anything that
  // doesn't consult the per-level tokens (the print block), kept teal because
  // it has to sit beside both the warm h2 and the cool h3.
  '--heading-accent': '#0d9bb5',
  '--heading-accent-soft': 'rgba(13,155,181,0.34)',
  '--h2-accent': '#b8420e',
  '--h2-accent-soft': 'rgba(184,66,14,0.34)',
  '--h3-accent': '#1665a8',
  '--h3-accent-soft': 'rgba(22,101,168,0.34)',
  // The chevron is this theme's signature mark, and with h2/h3 carrying
  // different hues it is also what ties each heading to its section accent.
  '--heading-marker': '0.52em',
  '--heading-rule': '#c9d9e8',
  '--badge-bg': '#e8eef5',
  '--table-header-bg': '#e4ecf4',
  '--table-row-alt': 'rgba(41,163,224,0.05)',
  '--math-fg': '#111c2e',
  '--math-bg': 'rgba(41,163,224,0.06)',
  '--danger': '#e5534b',
  '--danger-bg': 'rgba(229,83,75,0.10)',
  '--warn': '#c9860d',
  '--warn-bg': 'rgba(201,134,13,0.10)',
  '--ok': '#2f8f63',
  '--ok-bg': 'rgba(47,143,99,0.10)',
  '--edge-shadow': 'rgba(17,28,46,0.14)',
  '--chrome-fg': '#e8eef6',
  '--chrome-muted': '#93a6bd',
  '--chrome-border': '#2a3b55',
  '--chrome-hl': 'rgba(41,163,224,0.16)',
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
