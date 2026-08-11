import type { ThemeTokens } from '../../contract';

// Ported from `phycat.dark.css` + `phycat.radiation.css` in the Phycat Typora
// theme — an upstream stylesheet, not a file in this repo, so the comments below
// quote the declarations they came from rather than pointing at a path that
// isn't here.
//
// Phycat's dark base is one stylesheet with a family of thin variant files over
// it; Radiation is its green one — a near-black ground with a faint green cast,
// a signal green primary and an amber the variant itself labels a warning tone.
// Its syntax set is Material Ocean rather than the base's Dracula.
//
// Two of the base's values are hardcoded Dracula and wrong for this palette: the
// fence background and the sidebar fill. Both are derived here instead, in this
// variant's own hue — see --code-bg and --chrome. The structural notes are the
// same ones recorded in phycat-vampire, repeated because this file has to stand
// on its own.
export const tokens: ThemeTokens = {
  // --bg-color.
  '--bg': '#1b1d1b',
  // The base hardcodes `#typora-sidebar { background-color: #191a21 }`, which is
  // Dracula's darker ground and carries a blue cast this palette does not have.
  // Derived instead as a step down from --bg-color along its own hue, which is
  // what the hardcode is doing for the variant it was written against.
  '--chrome': '#131513',
  '--fg': '#e6e6e6',
  // --text-color-secondary, unchanged at 6.68 on the page. Phycat has exactly
  // two text tones — --text-color for headings, --text-color-secondary for
  // everything else — so body copy and metadata genuinely share one value here
  // rather than this being a shortcut.
  '--muted': '#99a699',
  // --primary-color, unchanged at 10.11 on the page.
  '--link': '#4cd964',
  // `#write p { color: var(--text-color-secondary) }`. Keeping paragraphs on the
  // secondary tone is the whole reason the base's headings read as headings; it
  // is not a detail to normalise away. Unlike the Vampire port this one needed
  // no repair — the green-gray clears AA as authored.
  '--body-fg': '#99a699',
  // Every level takes --text-color. Rank comes from size and from the ::before
  // glyph ladder, not from hue.
  '--h1-fg': '#e6e6e6',
  '--h2-fg': '#e6e6e6',
  '--h3-fg': '#e6e6e6',
  '--h4-fg': '#e6e6e6',
  '--h5-fg': '#e6e6e6',
  '--h6-fg': '#e6e6e6',
  '--border': '#333933',
  // The base hardcodes `.cm-s-inner.CodeMirror { background-color: #282a36 }` —
  // Dracula's gray, visibly blue-violet inside this green-black page. Every
  // variant separately authors --code-block-bg (here `rgba(20,25,20,0.5)`) that
  // the base then never references anywhere; composited over --bg-color it gives
  // both the step down the fence needs and the right hue for it.
  '--code-bg': '#181b18',
  // `blockquote { background-color: rgba(0,0,0,.2) }` — a darkening wash, not a
  // tint, and the same in every variant.
  '--quote-bg': 'rgba(0,0,0,0.20)',
  '--hl': 'rgba(76,217,100,0.14)',
  // `border: 1px solid color-mix(in srgb, var(--secondary-color), transparent
  // 70%)`. This app's quote accent is one solid bar rather than a ring at 30%
  // alpha, so it takes --secondary-color at full strength.
  '--quote-accent': '#ffc107',
  '--quote-fg': '#99a699',
  // `.md-fences::before { background-color: color-mix(in srgb,
  // var(--primary-color), transparent 95%) }`, composited over the fence.
  '--code-header-bg': '#1b251c',
  // The base hardcodes #6272a4 for the language label — Dracula's comment blue,
  // and at 3.69 on the fence too quiet to read as a label. Replaced by this
  // variant's own --text-color-secondary, which is what a quiet label should be
  // and lands at 6.23.
  '--code-header-fg': '#99a699',
  '--heading-accent': '#4cd964',
  '--heading-accent-soft': 'rgba(76,217,100,0.35)',
  '--h2-accent': '#4cd964',
  '--h2-accent-soft': 'rgba(76,217,100,0.35)',
  '--h3-accent': '#4cd964',
  '--h3-accent-soft': 'rgba(76,217,100,0.35)',
  '--h4-accent': '#4cd964',
  '--h4-accent-soft': 'rgba(76,217,100,0.35)',
  '--h5-accent': '#4cd964',
  '--h5-accent-soft': 'rgba(76,217,100,0.35)',
  '--h6-accent': '#4cd964',
  '--h6-accent-soft': 'rgba(76,217,100,0.35)',
  // On: Phycat really does mark every heading with a glyph in --primary-color —
  // a 40x4 pill under h1, a left bar on h3, a filled dot on h4, a hollow ring on
  // h5, a dash on h6 — and ranks the levels by that silhouette. The chevron
  // family is the app's version of the same idea.
  '--heading-marker-style': 'chevron',
  '--heading-marker': '0.52em',
  // `#write h2 { border-top: 1px solid rgba(255,255,255,.08) }`. Phycat puts the
  // rule above h2 and this app puts it below, so the position moves but the
  // weight does not; resolved to the palette's --border-color.
  '--heading-rule': '#333933',
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
  '--badge-bg': 'rgba(76,217,100,0.10)',
  // Outer border, interior rules on every cell, and a filled thead — `grid` is
  // the only faithful value.
  '--table-style': 'grid',
  '--table-radius': '8px',
  // `th { background-color: color-mix(in srgb, var(--primary-color), transparent
  // 95%) ; color: var(--primary-color) }`.
  '--table-header-bg': 'rgba(76,217,100,0.05)',
  '--table-header-fg': '#4cd964',
  // Phycat has no zebra striping — the grid does the separating — but a fully
  // transparent value is the one thing --table-style: grid is documented not to
  // take. Set to the table's own `rgba(255,255,255,.02)` fill.
  '--table-row-alt': 'rgba(255,255,255,0.02)',
  // `tr:hover { background-color: rgba(255,255,255,.03) }`.
  '--table-row-hover': 'rgba(255,255,255,0.03)',
  '--table-border': '#333933',
  '--table-border-width': '1px',
  // `th, td { padding: 10px 15px }`.
  '--table-cell-pad-y': '10px',
  '--table-cell-pad-x': '15px',
  // `table { font-size: 14px }` against the 16px body.
  '--table-font-size': '0.875em',
  '--math-fg': '#e6e6e6',
  '--math-bg': '#181b18',
  // Phycat authors no semantic feedback colors, but this variant comes closer
  // than the other two: its own :root calls --secondary-color an amber warning
  // tone, so the warn slot takes it directly. The red is the soft red from this
  // variant's syntax set, and the success green is --primary-color, which is
  // also the link — acceptable here because green *is* what this palette means
  // by success, and a callout and a link are never confusable shapes.
  '--danger': '#ff5370',
  '--danger-bg': 'rgba(255,83,112,0.14)',
  '--warn': '#ffc107',
  '--warn-bg': 'rgba(255,193,7,0.14)',
  '--ok': '#4cd964',
  '--ok-bg': 'rgba(76,217,100,0.14)',
  '--edge-shadow': 'rgba(0,0,0,0.35)',
  // Phycat runs 16px on blockquotes, 8px on tables and 5px on fences. This app
  // scales its smaller surfaces down from one token, so the token takes the
  // largest of the three and the rest follow.
  '--surface-radius': '16px',
  '--surface-corner': 'round',
  '--chrome-fg': '#e6e6e6',
  '--chrome-muted': '#99a699',
  // `#typora-sidebar { border-right: 1px solid rgba(255,255,255,.05) }`.
  '--chrome-border': 'rgba(255,255,255,0.05)',
  // --item-hover-bg-color, verbatim.
  '--chrome-hl': 'rgba(76,217,100,0.08)',
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
  // in. Radiation's is Material Ocean rather than the base's Dracula, and cut
  // for a dark editor, so only the comment tone was out.
  '--syn-kw': '#ffcb6b',
  '--syn-str': '#c3e88d',
  '--syn-fn': '#4cd964',
  // --code-comment is #546e7a, which lands at 3.22 on the fence. Lightened along
  // its own hue to 4.54. Comments stay the quietest thing in the block; they
  // just stop being unreadable.
  '--syn-cm': '#678796',
  '--syn-num': '#f78c6c',
  '--syn-type': '#82aaff',
  // `.cm-operator { color: var(--code-keyword) }` — operators share the keyword
  // tone rather than getting one of their own.
  '--syn-op': '#ffcb6b',
  '--syn-var': '#e6e6e6',
  // --code-property, which this variant sets to --primary-color. The base sends
  // `.cm-attribute` to --code-function instead, but this app's --syn-attr covers
  // object keys more than HTML attributes, so it takes the property tone.
  '--syn-attr': '#4cd964',
  // `.cm-tag { color: var(--code-keyword); font-weight: 700 }`.
  '--syn-tag': '#ffcb6b',
  '--syn-meta': '#ff5370',
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
