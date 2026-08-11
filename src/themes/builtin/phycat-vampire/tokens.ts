import type { ThemeTokens } from '../../contract';

// Ported from `phycat.dark.css` + `phycat.vampire.css` in the Phycat Typora
// theme — an upstream stylesheet, not a file in this repo, so the comments below
// quote the declarations they came from rather than pointing at a path that
// isn't here.
//
// Phycat ships as a family, not a theme: one dark base stylesheet plus a set of
// thin variant files that override nothing but `:root`. Vampire is the Dracula
// variant, and the only one of the three ported here whose palette the base was
// actually written against — several of the base's hardcoded values (the fence
// gray, the sidebar fill, the language-strip gray) are Dracula's own. Radiation
// and Abyss inherit those same hardcoded values upstream and look wrong for it;
// see the notes in their files for what had to be derived instead. Here they are
// simply correct, so this file is the closest of the three to the source.
//
// The base's defining move is that headings take --text-color while body copy
// takes --text-color-secondary: paragraphs sit deliberately dimmer than the
// things above them. That survives the port, repaired to AA — see --body-fg.
export const tokens: ThemeTokens = {
  // --bg-color.
  '--bg': '#282a36',
  // `#typora-sidebar { background-color: #191a21 }` — hardcoded in the base
  // rather than taken from the variant, and #191a21 is Dracula's own darker
  // ground, so for this variant the hardcode happens to be the right answer.
  '--chrome': '#191a21',
  '--fg': '#f8f8f2',
  // --text-color-secondary (#7e8c9f), lightened along its own hue from 4.16 on
  // the page. Phycat has exactly two text tones — --text-color for headings,
  // --text-color-secondary for everything else — so body copy and metadata
  // genuinely share one value here rather than this being a shortcut, which also
  // means this one value has to clear AA on every wash the app puts text on. The
  // binding ground is --hl below, not the page: 5.24 on the page, 6.38 on the
  // chrome, 4.55 on a highlight.
  '--muted': '#929eae',
  // --primary-color (#ff5555), lightened along its own hue. At 4.53 on the page
  // it had no headroom left for the two lighter grounds Phycat also puts it on:
  // its own 10% wash behind inline code (4.04) and its 5% wash behind table
  // headers (4.29). The washes themselves stay struck from the unlightened
  // #ff5555, where the difference does not show.
  '--link': '#ff7070',
  // `#write p { color: var(--text-color-secondary) }`. Keeping paragraphs on the
  // secondary tone is the whole reason the base's headings read as headings; it
  // is not a detail to normalise away. Repaired to AA as above.
  '--body-fg': '#929eae',
  // Every level takes --text-color: `#write h1..h6 { color: var(--text-color) }`.
  // Rank comes from size and from the ::before glyph ladder, not from hue.
  '--h1-fg': '#f8f8f2',
  '--h2-fg': '#f8f8f2',
  '--h3-fg': '#f8f8f2',
  '--h4-fg': '#f8f8f2',
  '--h5-fg': '#f8f8f2',
  '--h6-fg': '#f8f8f2',
  '--border': '#44475a',
  // The base hardcodes `.cm-s-inner.CodeMirror { background-color: #282a36 }`,
  // which for this variant equals the page — a fence indistinguishable from the
  // article, which this app draws as a card and cannot show that way. Every
  // variant separately authors --code-block-bg (here `rgba(0,0,0,0.3)`) that the
  // base then never references anywhere; composited over --bg-color it gives the
  // step down the fence needs. Same derivation in all three neon ports.
  '--code-bg': '#1c1d26',
  // `blockquote { background-color: rgba(0,0,0,.2) }` — a darkening wash, not a
  // tint, and the same in every variant.
  '--quote-bg': 'rgba(0,0,0,0.20)',
  // Phycat has no <mark> styling to port. Struck from --primary-color, matching
  // what the other two variants author for their own hover wash, and held at 12%
  // — the alpha above which a lightening wash pushes --body-fg under AA.
  '--hl': 'rgba(255,85,85,0.12)',
  // `border: 1px solid color-mix(in srgb, var(--secondary-color), transparent
  // 70%)`. This app's quote accent is one solid bar rather than a ring at 30%
  // alpha, so it takes --secondary-color at full strength.
  '--quote-accent': '#bd93f9',
  '--quote-fg': '#929eae',
  // `.md-fences::before { background-color: color-mix(in srgb,
  // var(--primary-color), transparent 95%) }`, composited over the fence.
  '--code-header-bg': '#272028',
  // The base hardcodes #6272a4 for the language label — Dracula's comment blue,
  // and at 3.56 on the fence too quiet to read as a label. Replaced by the
  // variant's own --text-color-secondary, which is what a quiet label should be
  // and lands at 4.64.
  '--code-header-fg': '#7e8c9f',
  '--heading-accent': '#ff5555',
  '--heading-accent-soft': 'rgba(255,85,85,0.35)',
  '--h2-accent': '#ff5555',
  '--h2-accent-soft': 'rgba(255,85,85,0.35)',
  '--h3-accent': '#ff5555',
  '--h3-accent-soft': 'rgba(255,85,85,0.35)',
  '--h4-accent': '#ff5555',
  '--h4-accent-soft': 'rgba(255,85,85,0.35)',
  '--h5-accent': '#ff5555',
  '--h5-accent-soft': 'rgba(255,85,85,0.35)',
  '--h6-accent': '#ff5555',
  '--h6-accent-soft': 'rgba(255,85,85,0.35)',
  // On, unlike the Konayuki ports: Phycat really does mark every heading with a
  // glyph in --primary-color — a 40x4 pill under h1, a left bar on h3, a filled
  // dot on h4, a hollow ring on h5, a dash on h6 — and ranks the levels by that
  // silhouette. The chevron family is the app's version of the same idea.
  '--heading-marker-style': 'chevron',
  '--heading-marker': '0.52em',
  // `#write h2 { border-top: 1px solid rgba(255,255,255,.08) }`. Phycat puts the
  // rule above h2 and this app puts it below, so the position moves but the
  // weight does not; resolved to the palette's --border-color.
  '--heading-rule': '#44475a',
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
  // `#write { line-height: 2.25 }` against this app's 1.7 base. The airiest of
  // the ported themes by a wide margin, and deliberate: Phycat pairs it with
  // `letter-spacing: 1.1px` and `word-spacing: 2px` this app has no token for.
  '--body-line-height-scale': '1.324',
  // Inline code: `background-color: color-mix(in srgb, var(--primary-color),
  // transparent 90%)`.
  '--badge-bg': 'rgba(255,85,85,0.10)',
  // Outer border, interior rules on every cell, and a filled thead — `grid` is
  // the only faithful value.
  '--table-style': 'grid',
  '--table-radius': '8px',
  // `th { background-color: color-mix(in srgb, var(--primary-color), transparent
  // 95%) ; color: var(--primary-color) }`.
  '--table-header-bg': 'rgba(255,85,85,0.05)',
  '--table-header-fg': '#ff7070',
  // Phycat has no zebra striping — the grid does the separating — but a fully
  // transparent value is the one thing --table-style: grid is documented not to
  // take. Set to the table's own `rgba(255,255,255,.02)` fill, which is below
  // the visual weight of the rules it sits between.
  '--table-row-alt': 'rgba(255,255,255,0.02)',
  // `tr:hover { background-color: rgba(255,255,255,.03) }`.
  '--table-row-hover': 'rgba(255,255,255,0.03)',
  '--table-border': '#44475a',
  '--table-border-width': '1px',
  // `th, td { padding: 10px 15px }`.
  '--table-cell-pad-y': '10px',
  '--table-cell-pad-x': '15px',
  // `table { font-size: 14px }` against the 16px body.
  '--table-font-size': '0.875em',
  '--math-fg': '#f8f8f2',
  '--math-bg': '#1c1d26',
  // Phycat authors no semantic feedback colors — it has --primary/--secondary/
  // --accent and nothing that means "error" or "success". Taken from the three
  // Dracula tones already present in this variant's own syntax set, so the
  // callouts stay inside the palette: red, orange, green. The red is two steps
  // lighter than --primary-color — far enough that a danger callout is not
  // mistaken for a link, and far enough to stay readable on its own 14% wash.
  '--danger': '#ff8080',
  '--danger-bg': 'rgba(255,128,128,0.14)',
  '--warn': '#ffb86c',
  '--warn-bg': 'rgba(255,184,108,0.14)',
  '--ok': '#50fa7b',
  '--ok-bg': 'rgba(80,250,123,0.14)',
  '--edge-shadow': 'rgba(0,0,0,0.35)',
  // Phycat runs 16px on blockquotes, 8px on tables and 5px on fences. This app
  // scales its smaller surfaces down from one token, so the token takes the
  // largest of the three and the rest follow.
  '--surface-radius': '16px',
  '--surface-corner': 'round',
  '--chrome-fg': '#f8f8f2',
  '--chrome-muted': '#929eae',
  // `#typora-sidebar { border-right: 1px solid rgba(255,255,255,.05) }`.
  '--chrome-border': 'rgba(255,255,255,0.05)',
  // --item-hover-bg-color is `rgba(22,22,22,0.14)` here — a *darkening* wash,
  // which is invisible against a chrome this close to black. Replaced by a
  // primary tint at comparable strength, matching what the other two variants
  // author for themselves.
  '--chrome-hl': 'rgba(255,85,85,0.12)',
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
  // in. Dracula, essentially verbatim: cut for a dark editor, so only the
  // comment tone was out.
  '--syn-kw': '#ff79c6',
  '--syn-str': '#f1fa8c',
  '--syn-fn': '#50fa7b',
  // --code-comment is #6272a4, which lands at 3.56 on the fence. Lightened along
  // its own hue to 4.60. Comments stay the quietest thing in the block; they
  // just stop being unreadable.
  '--syn-cm': '#7785b0',
  '--syn-num': '#bd93f9',
  '--syn-type': '#8be9fd',
  // `.cm-operator { color: var(--code-keyword) }` — operators share the keyword
  // tone rather than getting one of their own.
  '--syn-op': '#ff79c6',
  '--syn-var': '#f8f8f2',
  // --code-property. The base sends `.cm-attribute` to --code-function instead,
  // but this app's --syn-attr covers object keys more than HTML attributes, so
  // it takes the property tone.
  '--syn-attr': '#66d9ef',
  // `.cm-tag { color: var(--code-keyword); font-weight: 700 }`.
  '--syn-tag': '#ff79c6',
  '--syn-meta': '#ffb86c',
  '--syn-lit': '#bd93f9',
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
