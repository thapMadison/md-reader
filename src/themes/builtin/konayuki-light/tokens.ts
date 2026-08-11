import type { ThemeTokens } from '../../contract';

// Ported from `konayuki-light.css` in the Konayuki 0.1.2 Typora theme — an
// upstream stylesheet, not a file in this repo, so the comments below quote the
// declarations they came from rather than pointing at a path that isn't here.
//
// Konayuki ("powder snow") is warm paper under a cool accent: a cream page at
// #fffdf8 with slate-blue text and one sky-blue primary running through links,
// rules and callouts. Its light and dark variants are the *same stylesheet* with
// a different :root — every rule below is shared with konayuki-dark, so the two
// ports differ only in palette, which is why the structural notes live in both
// files rather than one.
//
// The defining structural move is that Konayuki carries hierarchy on rules, not
// on glyphs: h1 gets a 2px primary underline, h2 and h3 get 1px border-color
// underlines, and there are no marker decorations anywhere. See
// --heading-marker-style.
export const tokens: ThemeTokens = {
  // Konayuki's --bg-color. Warm cream rather than white; the whole theme is
  // built on this being slightly off-paper.
  '--bg': '#fffdf8',
  // Konayuki's sidebar is `linear-gradient(160deg, var(--sidebar-bg),
  // var(--sidebar-bg-2))` where --sidebar-bg *is* --bg-color. This app's chrome
  // is one flat color, so it takes the far end of that gradient (#f8f5f0) —
  // taking the near end would make the chrome and the page the same value and
  // erase the boundary the gradient exists to imply.
  '--chrome': '#f8f5f0',
  '--fg': '#2c3e50',
  // Konayuki's --text-muted is #7f8c8d, which lands at 3.42 on its own page and
  // 3.20 on the chrome — it was cut for a theme whose muted text is mostly
  // sidebar metadata at a larger size. Darkened along its own hue until it
  // clears 4.5 on both grounds (4.81 / 4.50).
  '--muted': '#687374',
  // Konayuki's --primary-color is #4a90e2, a soft sky blue that reads at 3.24 on
  // the cream page — under AA for body-copy links, which is the one place this
  // token is unavoidably small text. Darkened along the same hue to 4.84 on the
  // page and 4.53 on the chrome. The original tone survives untouched wherever
  // it is a shape rather than a glyph: see --quote-accent and the wash tokens.
  '--link': '#1f6ac3',
  '--body-fg': '#2c3e50',
  // Konayuki colors h1-h5 with --text-color and only h6 with --text-subtle. The
  // levels are ranked by size and by the rules under them, not by hue.
  '--h1-fg': '#2c3e50',
  '--h2-fg': '#2c3e50',
  '--h3-fg': '#2c3e50',
  '--h4-fg': '#2c3e50',
  '--h5-fg': '#2c3e50',
  '--h6-fg': '#687374',
  // Konayuki's --border-color.
  '--border': '#e9e3d8',
  // --code-bg-color. Note it is *warmer and darker* than the page, not lighter —
  // which is why the syntax set below is struck against this and not against --bg.
  '--code-bg': '#f7f4ef',
  // Konayuki styles `blockquote` and `.md-alert` with one shared rule that
  // defaults to the note callout, so a plain quote and a [!NOTE] look identical
  // by design. Both take --callout-note-bg (#2563eb1a) and a 4px
  // --callout-note-color bar. Ported as-is rather than differentiated.
  '--quote-bg': 'rgba(37,99,235,0.10)',
  '--hl': 'rgba(74,144,226,0.08)',
  // Konayuki's --callout-note-color, kept at its source value: this is a 4px bar,
  // not text, so the darkening --link needed does not apply — and it clears 4.5
  // against its own wash anyway (4.62).
  '--quote-accent': '#2563eb',
  '--quote-fg': '#2c3e50',
  // Konayuki's fences are one flat block with no header strip to port. Stepped
  // one shade off --code-bg so the language label reads as a strip rather than
  // floating in the code, which is the smallest deviation that keeps the app's
  // own chrome legible.
  '--code-header-bg': '#f0ebe3',
  '--code-header-fg': '#5f696a',
  '--heading-accent': '#1f6ac3',
  '--heading-accent-soft': 'rgba(31,106,195,0.32)',
  '--h2-accent': '#1f6ac3',
  '--h2-accent-soft': 'rgba(31,106,195,0.32)',
  '--h3-accent': '#1f6ac3',
  '--h3-accent-soft': 'rgba(31,106,195,0.32)',
  '--h4-accent': '#1f6ac3',
  '--h4-accent-soft': 'rgba(31,106,195,0.32)',
  '--h5-accent': '#1f6ac3',
  '--h5-accent-soft': 'rgba(31,106,195,0.32)',
  '--h6-accent': '#1f6ac3',
  '--h6-accent-soft': 'rgba(31,106,195,0.32)',
  // Off, and this is the theme's central claim rather than a preference.
  // Konayuki draws no ::before on any heading — no `#` marks, no bullets, no
  // glyphs of any kind. It ranks its six levels with size, weight 700, and the
  // underline rules on h1/h2/h3. Leaving chevrons on would put a decoration in
  // the heading line that the source stylesheet spends its whole heading block
  // deliberately not having. The accent pairs above stay set so re-enabling the
  // markers gives the theme's own blue rather than the contract default.
  '--heading-marker-style': 'off',
  '--heading-marker': '0.52em',
  // Konayuki's h2/h3 rule: `1px solid var(--border-color)`. Its h1 rule is
  // heavier and takes the primary (`2px solid var(--primary-color)`), but this
  // app draws a rule under h2 only, so the h2 value is the one that ports.
  '--heading-rule': '#e9e3d8',
  // Konayuki's heading scale, in rem against a 16px root and a 1rem body — so
  // the rem figures convert to em one-for-one. A wide, evenly-stepped ladder
  // that bottoms out exactly at body size: nothing here sinks below the
  // paragraphs it heads.
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
  // Konayuki sets `html { font-size: 16px }` and `#write { font-size: 1rem }`,
  // which is this app's own base — no scaling needed.
  '--body-size-scale': '1',
  // `#write { line-height: 1.8 }` against this app's 1.7 base. The generous
  // leading is half of why the theme reads as airy; the other half is the 90ch
  // measure, which is a user metric here and not a theme's to set.
  '--body-line-height-scale': '1.059',
  // Inline code takes --code-bg-color, same as the fences.
  '--badge-bg': '#f7f4ef',
  // Konayuki boxes tables completely — outer border, `border-collapse: separate`
  // with interior 1px rules on every cell, and a filled thead. `grid` is the only
  // faithful value.
  '--table-style': 'grid',
  // --radius-medium, the radius Konayuki clips the table to (with
  // `overflow: hidden`, which is how the corners survive the header fill).
  '--table-radius': '8px',
  // `thead { background: var(--code-bg-color) }` — the header shares its ground
  // with code, which is what ties the two block elements together visually.
  '--table-header-bg': '#f7f4ef',
  '--table-header-fg': '#2c3e50',
  // Konayuki has no zebra striping at all — its grid does the separating. A
  // fully transparent value is the one thing --table-style: grid is documented
  // not to take, so this is set as faintly as it can be and still exist: at
  // 0.025 alpha it is below the weight of the 1px rules it sits between.
  '--table-row-alt': 'rgba(74,144,226,0.025)',
  // --table-row-hover-bg (#4a90e20a).
  '--table-row-hover': 'rgba(74,144,226,0.05)',
  // --table-border-color, which Konayuki keeps distinct from --border-color and
  // one step warmer.
  '--table-border': '#e2ddd3',
  '--table-border-width': '1px',
  // `th, td { padding: 0.8em 1em }`, resolved against the 16px body.
  '--table-cell-pad-y': '13px',
  '--table-cell-pad-x': '16px',
  // Konayuki does not shrink table text — cells inherit the article's 1rem. Kept
  // at full size rather than pulled to the app default of 0.88em, because the
  // 13/16px padding above was cut for text at this size and the two together are
  // what make the grid read as roomy rather than dense.
  '--table-font-size': '1em',
  '--math-fg': '#2c3e50',
  // `.mathjax-block` takes --code-bg-color: display math and fenced code share a
  // ground here.
  '--math-bg': '#f7f4ef',
  // Konayuki's --callout-caution-color (#dc2626), darkened just enough to clear
  // 4.5 on the chrome as well as the page (4.83 / 4.52) — the hue is unchanged.
  '--danger': '#db2323',
  // The washes keep the source colors untouched at Konayuki's own 0x1a alpha
  // (10%), since a background tint has no contrast floor to meet.
  '--danger-bg': 'rgba(220,38,38,0.10)',
  // --callout-warning-color (#d97706), darkened from 3.13 to 4.83 on the page.
  '--warn': '#aa5d05',
  '--warn-bg': 'rgba(217,119,6,0.10)',
  // --callout-tip-color (#16a34a), darkened from 3.24 to 4.82.
  '--ok': '#12823b',
  '--ok-bg': 'rgba(22,163,74,0.10)',
  // --shadow-small is `0 2px 8px rgba(0,0,0,0.08)`; Konayuki's depth is uniformly
  // soft and neutral rather than tinted.
  '--edge-shadow': 'rgba(0,0,0,0.08)',
  // --radius-medium. Konayuki runs three radii — 6px small (inline code, quotes),
  // 8px medium (fences, tables, math), 12px large — and the app's single surface
  // token takes the middle one, which is the value most of the boxed surfaces use.
  '--surface-radius': '8px',
  '--surface-corner': 'round',
  '--chrome-fg': '#2c3e50',
  // Konayuki's --sidebar-muted is #6f7f90, which lands at 3.78 on the chrome it
  // sits on. Darkened along its hue to 4.72.
  '--chrome-muted': '#626f7d',
  // --sidebar-border-strong.
  '--chrome-border': '#e4ded4',
  // --sidebar-hover (#4a90e214) rounded up slightly; Konayuki's active row also
  // carries a left border and a gradient that this app's single highlight color
  // has to stand in for.
  '--chrome-hl': 'rgba(74,144,226,0.10)',
  '--chrome-accent-shape': 'flat',
  // Rulework: gradient rules along the sidebar's right edge and the toolbar's
  // bottom, and no texture at all. Konayuki has no pattern, gradient mesh or
  // grain anywhere — its chrome is a flat wash bounded by deliberately strong
  // dividers (--sidebar-border-strong, --sidebar-divider-color, and a 2px
  // accent under the active tab). Rulework is the only value that decorates by
  // drawing those edges rather than by adding a surface the source doesn't have.
  '--chrome-pattern': 'rulework',
  '--chrome-pattern-opacity': '0.05',
  // Dark ink: the chrome is a near-white cream, so white rules would vanish.
  '--chrome-pattern-ink': 'dark',
  // Konayuki's CodeMirror set, hue for hue, darkened where its own values fell
  // under 4.5 against --code-bg (#f7f4ef, which is darker than the page — the
  // source was checked against neither). Four needed it: the ochre builtin, the
  // brown comment, the sky-blue property, and nothing else. The relationships are
  // Konayuki's — rust keywords, olive strings, amber numbers, brown comments,
  // one blue for object keys — only the lightness is this app's.
  '--syn-kw': '#8f3f2a',
  '--syn-str': '#4d7c0f',
  // cm-builtin (--syntax-variable-3, #a16207) at 4.49; nudged to 4.63.
  '--syn-fn': '#9e6007',
  // --syntax-comment (#9a7b66) at 3.55; darkened to 4.62.
  '--syn-cm': '#846957',
  '--syn-num': '#b45309',
  // cm-variable-2 (#9a3412), Konayuki's second identifier tone.
  '--syn-type': '#9a3412',
  // Konayuki leaves cm-operator and cm-variable on --syntax-identifier, which is
  // `var(--code-text-color)` — operators and plain identifiers are simply the
  // code's own text color, uncolored.
  '--syn-op': '#3b2f2a',
  '--syn-var': '#3b2f2a',
  // The one rule where Konayuki's light and dark stylesheets genuinely differ:
  // light sends `.cm-property` to --primary-color, dark sends it to
  // --syntax-variable-2. So object keys are the theme's signature blue here, and
  // the same darkening --link needed applies (3.00 on the code ground → 4.90).
  '--syn-attr': '#1f6ac3',
  '--syn-tag': '#a11b1b',
  // cm-meta shares --syntax-comment.
  '--syn-meta': '#846957',
  // cm-atom shares --syntax-number.
  '--syn-lit': '#b45309',
  // Konayuki's --font-ui. Its CJK entries ('PingFang SC', 'Hiragino Sans GB',
  // 'Microsoft YaHei', 'Noto Sans CJK SC', 'Source Han Sans SC') are dropped for
  // the reason sepia-book drops its own: isFontStackValue's ASCII \w rejects the
  // names, and on a machine that has them installed they would take over Latin
  // text that nobody chose them for.
  '--font-ui': "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,sans-serif",
  // Konayuki aliases --font-body straight to --font-ui: one face for the whole
  // theme, chrome and article alike.
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
  // everywhere else, which keeps the ligatures the source is asking for.
  '--font-mono': "'Maple Mono NF CN','Fira Code',Consolas,Monaco,'Courier New',monospace",
};
