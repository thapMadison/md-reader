import type { ThemeTokens } from '../../contract';

// Ported from `konayuki-dark.css` in the Konayuki 0.1.2 Typora theme — an
// upstream stylesheet, not a file in this repo, so the comments below quote the
// declarations they came from rather than pointing at a path that isn't here.
//
// The dark half of Konayuki, and not a darkened version of the light one: the
// light variant is warm cream under a sky blue, this one is a Tokyo Night
// palette (#1a1b26 ground, #7aa2f7 primary, the whole familiar violet/green/
// orange syntax set). The two stylesheets are byte-identical apart from their
// :root blocks and exactly one rule — see --syn-attr — so the structural notes
// below are the same ones recorded in konayuki-light, repeated here because
// this file has to stand on its own.
//
// Where the light port had to darken half its palette to reach AA, this one
// needed a single fix: Tokyo Night's colors were cut for a dark editor and land
// where they should. Only the comment gray was out.
export const tokens: ThemeTokens = {
  // Konayuki's --bg-color.
  '--bg': '#1a1b26',
  // The far end of the sidebar's `linear-gradient(160deg, var(--sidebar-bg),
  // var(--sidebar-bg-2))`, where --sidebar-bg is --bg-color itself. Taking the
  // near end would collapse the chrome into the page; this app's chrome is one
  // flat color and has to pick the end that states the boundary.
  '--chrome': '#1f2233',
  '--fg': '#e5e9f0',
  // --text-muted, unchanged: 7.04 on the page, 6.48 on the chrome.
  '--muted': '#9aa5ce',
  // --primary-color, unchanged at 6.79. The light variant had to darken its own
  // primary to reach AA; this one does not, which is the clearest single
  // difference between the two palettes.
  '--link': '#7aa2f7',
  '--body-fg': '#e5e9f0',
  // h1-h5 take --text-color and only h6 takes --text-subtle. Rank comes from
  // size and from the rules under h1/h2/h3, not from hue.
  '--h1-fg': '#e5e9f0',
  '--h2-fg': '#e5e9f0',
  '--h3-fg': '#e5e9f0',
  '--h4-fg': '#e5e9f0',
  '--h5-fg': '#e5e9f0',
  '--h6-fg': '#a9b1d6',
  '--border': '#2a2f45',
  // --code-bg-color: a step *lighter* than the page here, where the light
  // variant's is a step darker. The syntax set below is struck against this.
  '--code-bg': '#24283b',
  // Konayuki styles `blockquote` and `.md-alert` with one shared rule defaulting
  // to the note callout, so a plain quote and a [!NOTE] are the same object by
  // design — --callout-note-bg over a 4px --callout-note-color bar. Ported as-is.
  // The dark washes run at 0x24 (14%) where light runs at 0x1a (10%).
  '--quote-bg': 'rgba(96,165,250,0.14)',
  '--hl': 'rgba(122,162,247,0.10)',
  // --callout-note-color, which Konayuki keeps distinct from --primary-color.
  '--quote-accent': '#60a5fa',
  '--quote-fg': '#e5e9f0',
  // Konayuki's fences are one flat block with no header strip to port. Stepped
  // back onto the chrome value so the language label reads as a strip; the
  // border under it does the rest.
  '--code-header-bg': '#1f2233',
  '--code-header-fg': '#9aa5ce',
  '--heading-accent': '#7aa2f7',
  '--heading-accent-soft': 'rgba(122,162,247,0.35)',
  '--h2-accent': '#7aa2f7',
  '--h2-accent-soft': 'rgba(122,162,247,0.35)',
  '--h3-accent': '#7aa2f7',
  '--h3-accent-soft': 'rgba(122,162,247,0.35)',
  '--h4-accent': '#7aa2f7',
  '--h4-accent-soft': 'rgba(122,162,247,0.35)',
  '--h5-accent': '#7aa2f7',
  '--h5-accent-soft': 'rgba(122,162,247,0.35)',
  '--h6-accent': '#7aa2f7',
  '--h6-accent-soft': 'rgba(122,162,247,0.35)',
  // Off, for the reason recorded in konayuki-light: the source draws no ::before
  // on any heading and ranks its six levels with size, weight 700, and the
  // underline rules on h1/h2/h3. The accent pairs above stay set so re-enabling
  // markers gives this theme's blue rather than the contract default.
  '--heading-marker-style': 'off',
  '--heading-marker': '0.52em',
  // The h2/h3 rule (`1px solid var(--border-color)`). Konayuki's h1 rule is 2px
  // of --primary-color, but this app draws a rule under h2 only.
  '--heading-rule': '#2a2f45',
  // Konayuki's heading scale, in rem against a 16px root and a 1rem body, so the
  // rem figures convert to em one-for-one. Bottoms out exactly at body size.
  '--h1-size': '2.1em',
  '--h2-size': '1.8em',
  '--h3-size': '1.5em',
  '--h4-size': '1.25em',
  '--h5-size': '1.1em',
  '--h6-size': '1em',
  // `#write h1..h6 { font-weight: 700 }` — one weight for all six.
  '--h1-weight': '700',
  '--heading-weight': '700',
  '--heading-line-height': '1.25',
  // `html { font-size: 16px }` and `#write { font-size: 1rem }` — this app's own
  // base.
  '--body-size-scale': '1',
  // `#write { line-height: 1.8 }` against this app's 1.7 base.
  '--body-line-height-scale': '1.059',
  '--badge-bg': '#24283b',
  // Outer border, `border-collapse: separate` with interior rules on every cell,
  // and a filled thead — `grid` is the only faithful value.
  '--table-style': 'grid',
  // --radius-medium, the radius the table is clipped to.
  '--table-radius': '8px',
  '--table-header-bg': '#24283b',
  '--table-header-fg': '#e5e9f0',
  // Konayuki has no zebra striping — its grid does the separating — but a fully
  // transparent value is the one thing --table-style: grid is documented not to
  // take. Set below the visual weight of the 1px rules it sits between.
  '--table-row-alt': 'rgba(122,162,247,0.03)',
  // --table-row-hover-bg (#7aa2f70a).
  '--table-row-hover': 'rgba(122,162,247,0.06)',
  // --table-border-color, a step lighter than --border-color so the grid reads
  // inside the darker page.
  '--table-border': '#3b4261',
  '--table-border-width': '1px',
  // `th, td { padding: 0.8em 1em }`, resolved against the 16px body.
  '--table-cell-pad-y': '13px',
  '--table-cell-pad-x': '16px',
  // Konayuki does not shrink table text — cells inherit the article's 1rem. The
  // padding above was cut for text at this size; the two together are what make
  // the grid read as roomy rather than dense.
  '--table-font-size': '1em',
  '--math-fg': '#e5e9f0',
  // `.mathjax-block` takes --code-bg-color: display math and fenced code share a
  // ground.
  '--math-bg': '#24283b',
  // --callout-caution-color, unchanged at 6.35.
  '--danger': '#fb7185',
  '--danger-bg': 'rgba(251,113,133,0.14)',
  // --callout-warning-color, unchanged at 10.24.
  '--warn': '#fbbf24',
  '--warn-bg': 'rgba(251,191,36,0.14)',
  // --callout-tip-color, unchanged at 8.89.
  '--ok': '#34d399',
  '--ok-bg': 'rgba(52,211,153,0.14)',
  // --shadow-small is `0 2px 8px rgba(0,0,0,0.3)` here — nearly four times the
  // light variant's alpha, which is what keeps depth visible against a near-black
  // ground.
  '--edge-shadow': 'rgba(0,0,0,0.30)',
  // --radius-medium. Konayuki runs 6px small / 8px medium / 12px large; the app's
  // single surface token takes the middle one, which most boxed surfaces use.
  '--surface-radius': '8px',
  '--surface-corner': 'round',
  '--chrome-fg': '#e5e9f0',
  '--chrome-muted': '#9aa5ce',
  '--chrome-border': '#2a2f45',
  // --sidebar-hover (#7aa2f71f); the active row's #7aa2f72e also carries a left
  // border and a gradient that a single highlight color has to stand in for.
  '--chrome-hl': 'rgba(122,162,247,0.13)',
  '--chrome-accent-shape': 'flat',
  // Rulework, for the reason recorded in konayuki-light: the source has no
  // pattern, mesh or grain anywhere, and decorates its chrome entirely with
  // deliberately strong dividers (--sidebar-border-strong,
  // --sidebar-divider-color at #ffffff0f, a 2px accent under the active tab).
  // Rulework draws those edges instead of adding a surface the source lacks.
  '--chrome-pattern': 'rulework',
  '--chrome-pattern-opacity': '0.05',
  // Light ink: the chrome is near-black, so black rules would vanish. This is
  // the one chrome token whose value is inverted from the light port.
  '--chrome-pattern-ink': 'light',
  // Konayuki's CodeMirror set — Tokyo Night, essentially verbatim. Cut for a dark
  // editor, so unlike the light variant it needed almost nothing: every value
  // below is the source's own except the comment.
  '--syn-kw': '#bb9af7',
  '--syn-str': '#9ece6a',
  // cm-builtin (--syntax-variable-3).
  '--syn-fn': '#0db9d7',
  // --syntax-comment is #526270, which lands at 2.32 on --code-bg — the one color
  // in either variant that fails outright rather than narrowly. Lightened along
  // its own hue to 4.60. Comments stay the quietest thing in the block; they just
  // stop being unreadable.
  '--syn-cm': '#8193a2',
  '--syn-num': '#ff9e64',
  // cm-variable-2, Konayuki's second identifier tone.
  '--syn-type': '#7dcfff',
  // cm-operator and cm-variable both sit on --syntax-identifier, which here is a
  // pale cyan rather than the light variant's `var(--code-text-color)`: operators
  // and plain identifiers carry a tint in the dark palette and none in the light.
  '--syn-op': '#c0f0f5',
  '--syn-var': '#c0f0f5',
  // The one rule where the two stylesheets genuinely differ. Dark sends
  // `.cm-property` to --syntax-variable-2, so object keys share the identifier
  // tone; light sends it to --primary-color instead, making them the theme's
  // signature blue. Everything else in both files is byte-identical.
  '--syn-attr': '#7dcfff',
  '--syn-tag': '#f7768e',
  // cm-meta shares --syntax-comment, so it takes the same lightening.
  '--syn-meta': '#8193a2',
  // cm-atom shares --syntax-number.
  '--syn-lit': '#ff9e64',
  // Konayuki's --font-ui. Its CJK entries ('PingFang SC', 'Hiragino Sans GB',
  // 'Microsoft YaHei', 'Noto Sans CJK SC', 'Source Han Sans SC') are dropped for
  // the reason sepia-book drops its own: isFontStackValue's ASCII \w rejects the
  // names, and on a machine that has them installed they would take over Latin
  // text nobody chose them for.
  '--font-ui': "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,sans-serif",
  // Konayuki aliases --font-body to --font-ui: one face for chrome and article
  // alike.
  '--font-body': "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,sans-serif",
  // And --font-heading to --font-ui as well — no display face anywhere in it.
  // (The contract forbids var() here, so the repetition is how "same face" is
  // said.)
  '--font-heading': "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,sans-serif",
  // Konayuki's --font-mono verbatim. Maple Mono NF CN is a Nerd Font that ships
  // on no platform and is not on Google Fonts, so it resolves only where the
  // reader has already installed it — kept because it is the face Konayuki names
  // first and costs nothing to miss. Fira Code sits right behind it and *is*
  // loaded from index.html, so it is what this theme actually renders code in
  // everywhere else.
  '--font-mono': "'Maple Mono NF CN','Fira Code',Consolas,Monaco,'Courier New',monospace",
};
