import type { ThemeTokens } from '../../contract';

// Ported from `phycat.dark.css` + `phycat.abyss.css` in the Phycat Typora theme
// — an upstream stylesheet, not a file in this repo, so the comments below quote
// the declarations they came from rather than pointing at a path that isn't
// here.
//
// Phycat's dark base is one stylesheet with a family of thin variant files over
// it; Abyss is the deepest of them — a midnight blue ground at #0f111a under an
// electric cyan, with a Night Owl syntax set. It is also the variant the base's
// hardcoded Dracula values fit worst: #282a36 for the fence is a warm gray
// sitting in a cold blue page, and #191a21 for the sidebar is lighter than this
// variant's own article. Both are derived here instead — see --code-bg and
// --chrome. The structural notes are the same ones recorded in phycat-vampire,
// repeated because this file has to stand on its own.
export const tokens: ThemeTokens = {
  // --bg-color.
  '--bg': '#0f111a',
  // The base hardcodes `#typora-sidebar { background-color: #191a21 }`, which is
  // *lighter* than this variant's page — the chrome would read as raised where
  // every other variant has it recessed. Derived instead as a step down from
  // --bg-color along its own hue, which is what the hardcode does for the
  // variant it was written against.
  '--chrome': '#080a11',
  '--fg': '#d6deeb',
  // --text-color-secondary, unchanged at 5.50 on the page. Phycat has exactly
  // two text tones — --text-color for headings, --text-color-secondary for
  // everything else — so body copy and metadata genuinely share one value here
  // rather than this being a shortcut. The same #7e8c9f needed lightening in the
  // Vampire port and does not here, purely because this page is darker.
  '--muted': '#7e8c9f',
  // --primary-color, unchanged at 13.68 on the page — the brightest link of the
  // three variants by a wide margin.
  '--link': '#00f3ff',
  // `#write p { color: var(--text-color-secondary) }`. Keeping paragraphs on the
  // secondary tone is the whole reason the base's headings read as headings; it
  // is not a detail to normalise away.
  '--body-fg': '#7e8c9f',
  // Every level takes --text-color. Rank comes from size and from the ::before
  // glyph ladder, not from hue.
  '--h1-fg': '#d6deeb',
  '--h2-fg': '#d6deeb',
  '--h3-fg': '#d6deeb',
  '--h4-fg': '#d6deeb',
  '--h5-fg': '#d6deeb',
  '--h6-fg': '#d6deeb',
  '--border': '#1f2233',
  // The base hardcodes `.cm-s-inner.CodeMirror { background-color: #282a36 }` —
  // a warm gray more than twice as light as this page. The other two variants
  // are repaired by compositing their own --code-block-bg over --bg-color, but
  // this one authors `rgba(15,17,26,0.6)`, which *is* #0f111a: the composite
  // degenerates to the page itself and gives no step at all. Stepped down by
  // hand instead, to the same relative depth the other two land on.
  '--code-bg': '#0b0d15',
  // `blockquote { background-color: rgba(0,0,0,.2) }` — a darkening wash, not a
  // tint, and the same in every variant.
  '--quote-bg': 'rgba(0,0,0,0.20)',
  // Phycat has no <mark> styling to port. Struck from --primary-color, matching
  // this variant's own --item-hover-bg-color, and held at 8% — this cyan is the
  // brightest primary of the three, so the alpha that keeps --body-fg above AA
  // on a highlight is correspondingly lower.
  '--hl': 'rgba(0,243,255,0.08)',
  // `border: 1px solid color-mix(in srgb, var(--secondary-color), transparent
  // 70%)`. This app's quote accent is one solid bar rather than a ring at 30%
  // alpha, so it takes --secondary-color at full strength.
  '--quote-accent': '#2979ff',
  '--quote-fg': '#7e8c9f',
  // `.md-fences::before { background-color: color-mix(in srgb,
  // var(--primary-color), transparent 95%) }`, composited over the fence.
  '--code-header-bg': '#0a1921',
  // The base hardcodes #6272a4 for the language label — Dracula's comment blue,
  // and at 4.12 on the fence just short of readable. Replaced by this variant's
  // own --text-color-secondary, which is what a quiet label should be and lands
  // at 5.23.
  '--code-header-fg': '#7e8c9f',
  '--heading-accent': '#00f3ff',
  '--heading-accent-soft': 'rgba(0,243,255,0.35)',
  '--h2-accent': '#00f3ff',
  '--h2-accent-soft': 'rgba(0,243,255,0.35)',
  '--h3-accent': '#00f3ff',
  '--h3-accent-soft': 'rgba(0,243,255,0.35)',
  '--h4-accent': '#00f3ff',
  '--h4-accent-soft': 'rgba(0,243,255,0.35)',
  '--h5-accent': '#00f3ff',
  '--h5-accent-soft': 'rgba(0,243,255,0.35)',
  '--h6-accent': '#00f3ff',
  '--h6-accent-soft': 'rgba(0,243,255,0.35)',
  // On: Phycat really does mark every heading with a glyph in --primary-color —
  // a 40x4 pill under h1, a left bar on h3, a filled dot on h4, a hollow ring on
  // h5, a dash on h6 — and ranks the levels by that silhouette. The chevron
  // family is the app's version of the same idea.
  '--heading-marker-style': 'chevron',
  '--heading-marker': '0.52em',
  // `#write h2 { border-top: 1px solid rgba(255,255,255,.08) }`. Phycat puts the
  // rule above h2 and this app puts it below, so the position moves but the
  // weight does not; resolved to the palette's --border-color and then lifted a
  // step. #1f2233 sits at 1.20 against this page — fine for the structural
  // hairlines --border draws around a surface the eye already has an edge for,
  // too faint for a rule that has to be seen on its own under a heading.
  '--heading-rule': '#282c45',
  // Phycat's scale, in rem against `html { font-size: 16px }` and a 1rem body,
  // so the rem figures convert to em one-for-one. h5 and h6 are the same size
  // upstream — they separate by glyph, which is why the marker family is on.
  '--h1-size': '1.8em',
  '--h2-size': '1.4em',
  '--h3-size': '1.25em',
  '--h4-size': '1.15em',
  '--h5-size': '1.1em',
  '--h6-size': '1.1em',
  '--h1-weight': '700',
  '--heading-weight': '700',
  '--heading-line-height': '1.4',
  // `#write { font-size: 1rem }` against this app's own 16px base.
  '--body-size-scale': '1',
  // `#write { line-height: 2.25 }` against this app's 1.7 base. Deliberate:
  // Phycat pairs it with `letter-spacing: 1.1px` and `word-spacing: 2px` this
  // app has no token for.
  '--body-line-height-scale': '1.324',
  // Inline code: `background-color: color-mix(in srgb, var(--primary-color),
  // transparent 90%)`.
  '--badge-bg': 'rgba(0,243,255,0.10)',
  // Outer border, interior rules on every cell, and a filled thead — `grid` is
  // the only faithful value.
  '--table-style': 'grid',
  '--table-radius': '8px',
  // `th { background-color: color-mix(in srgb, var(--primary-color), transparent
  // 95%) ; color: var(--primary-color) }`.
  '--table-header-bg': 'rgba(0,243,255,0.05)',
  '--table-header-fg': '#00f3ff',
  // Phycat has no zebra striping — the grid does the separating — but a fully
  // transparent value is the one thing --table-style: grid is documented not to
  // take. Set to the table's own `rgba(255,255,255,.02)` fill.
  '--table-row-alt': 'rgba(255,255,255,0.02)',
  // `tr:hover { background-color: rgba(255,255,255,.03) }`.
  '--table-row-hover': 'rgba(255,255,255,0.03)',
  '--table-border': '#1f2233',
  '--table-border-width': '1px',
  // `th, td { padding: 10px 15px }`.
  '--table-cell-pad-y': '10px',
  '--table-cell-pad-x': '15px',
  // `table { font-size: 14px }` against the 16px body.
  '--table-font-size': '0.875em',
  '--math-fg': '#d6deeb',
  '--math-bg': '#0b0d15',
  // Phycat authors no semantic feedback colors — it has --primary/--secondary/
  // --accent and nothing that means "error" or "success". Neither of this
  // variant's other two slots can serve: --secondary-color is another blue and
  // --accent-color is magenta. Taken from Night Owl instead, the palette this
  // variant's syntax set is already drawn from, so the callouts stay in family:
  // its red, and the gold and green already present below.
  '--danger': '#ff5874',
  '--danger-bg': 'rgba(255,88,116,0.14)',
  '--warn': '#ecc48d',
  '--warn-bg': 'rgba(236,196,141,0.14)',
  '--ok': '#addb67',
  '--ok-bg': 'rgba(173,219,103,0.14)',
  '--edge-shadow': 'rgba(0,0,0,0.35)',
  // Phycat runs 16px on blockquotes, 8px on tables and 5px on fences. This app
  // scales its smaller surfaces down from one token, so the token takes the
  // largest of the three and the rest follow.
  '--surface-radius': '16px',
  '--surface-corner': 'round',
  '--chrome-fg': '#d6deeb',
  '--chrome-muted': '#7e8c9f',
  // `#typora-sidebar { border-right: 1px solid rgba(255,255,255,.05) }`.
  '--chrome-border': 'rgba(255,255,255,0.05)',
  // --item-hover-bg-color, verbatim.
  '--chrome-hl': 'rgba(0,243,255,0.08)',
  '--chrome-accent-shape': 'flat',
  // Phycat's decoration is `--bg-style: radial-gradient(#ffffff 1px, transparent
  // 1px)` — a fine dot field, shared by all three neon variants. It is painted
  // on the *article* (`#write::before`) and this app has no article-pattern
  // token, only a chrome one, so the motif moves to the chrome rather than being
  // dropped. Halftone is the app's dot pattern.
  '--chrome-pattern': 'halftone',
  // --texture-opacity, verbatim — and the same figure this app treats as the
  // reference density.
  '--chrome-pattern-opacity': '0.05',
  '--chrome-pattern-ink': 'light',
  // The base wires CodeMirror to a set of --code-* variables each variant fills
  // in. Abyss's is Night Owl, cut for a dark editor, so only the comment tone
  // was out — and that one only narrowly.
  '--syn-kw': '#c792ea',
  '--syn-str': '#ecc48d',
  '--syn-fn': '#82aaff',
  // --code-comment is #637777, which lands at 4.10 on the fence. Lightened along
  // its own hue to 4.51.
  '--syn-cm': '#697e7e',
  '--syn-num': '#f78c6c',
  '--syn-type': '#addb67',
  // `.cm-operator { color: var(--code-keyword) }` — operators share the keyword
  // tone rather than getting one of their own.
  '--syn-op': '#c792ea',
  '--syn-var': '#d6deeb',
  // --code-property. The base sends `.cm-attribute` to --code-function instead,
  // but this app's --syn-attr covers object keys more than HTML attributes, so
  // it takes the property tone.
  '--syn-attr': '#80cbc4',
  // `.cm-tag { color: var(--code-keyword); font-weight: 700 }`.
  '--syn-tag': '#c792ea',
  '--syn-meta': '#7fdbca',
  '--syn-lit': '#f78c6c',
  // `#typora-sidebar { font-family: "LXGW WenKai", -apple-system, sans-serif }`
  // with the CJK face dropped — isFontStackValue's ASCII \w rejects the name,
  // and on a machine that has it installed it would take over Latin text nobody
  // chose it for.
  '--font-ui': "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,sans-serif",
  // `#write p { font-family: Optima-Regular, Optima, "LXGW WenKai",
  // PingFangSC-light, PingFangTC-light, "PingFang SC", Cambria, Cochin, Georgia,
  // Times, "Times New Roman", serif }`, with the four CJK entries dropped for the
  // reason above. What is left is the serif Phycat actually renders Latin text
  // in, and the reason a neon theme reads as a document rather than a terminal.
  '--font-body': "Optima-Regular,Optima,Cambria,Cochin,Georgia,Times,'Times New Roman',serif",
  // `html { font-family: "LXGW WenKai" }` is the only family headings inherit,
  // so with the CJK face gone they land on the same serif as the paragraphs.
  // (The contract forbids var() here, so the repetition is how "same face" is
  // said.)
  '--font-heading': "Optima-Regular,Optima,Cambria,Cochin,Georgia,Times,'Times New Roman',serif",
  // `CascadiaCode, "Lucida Console", Consolas, Courier, monospace`. The bare
  // CascadiaCode token names an @font-face whose ttf ships beside the Typora
  // theme and not with this app, so 'Cascadia Code' — the family name the font
  // registers under once installed — is added behind it. Consolas backs both and
  // is present on every Windows machine, so this stack always resolves without
  // anything being loaded from index.html.
  '--font-mono': "CascadiaCode,'Cascadia Code','Lucida Console',Consolas,'Courier New',monospace",
};
