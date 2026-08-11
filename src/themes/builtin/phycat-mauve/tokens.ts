import type { ThemeTokens } from '../../contract';

// Ported from `phycat.light.css` + `phycat.mauve.css` in the Phycat Typora theme
// — an upstream stylesheet, not a file in this repo, so the comments below quote
// the declarations they came from rather than pointing at a path that isn't
// here.
//
// Phycat's light half works nothing like its dark half. The dark base gives each
// variant a full palette — ground, text, borders, a syntax set. The light base
// gives them one accent ramp (--element-color and four tints of it) and hardcodes
// everything else: the page is Typora's own white, body copy is #333, quotes are
// #555, fences are #f8f8f8 with a One Light syntax set. So a light variant is a
// single hue applied to an otherwise fixed design, and Mauve is the orchid one.
//
// That fixed part is shared verbatim with phycat-caramel; only the ramp, the
// chrome and the feedback tones differ between the two files. Mauve's ramp is
// the paler of the two, which is why two of its steps needed deepening where
// Caramel's did not — see --chrome and --quote-bg.
export const tokens: ThemeTokens = {
  // No light variant defines --bg-color at all, so `#write` keeps Typora's white.
  '--bg': '#ffffff',
  // The light base never fills the sidebar either — `#typora-sidebar {
  // background-color: var(--bg-color) }` against a variable nothing defines — so
  // the chrome has to come from the ramp. Mauve's --element-color-soo-shallow is
  // #fafafc, a 1.5% tint that no chrome would read as a panel at all; deepened
  // toward --element-color-so-shallow until the boundary between chrome and page
  // is actually visible. Caramel's own soo-shallow is a cream at #fffbeb and
  // needed no such step.
  '--chrome': '#f5eff7',
  '--fg': '#333333',
  // Phycat's light base authors no muted tone — it has body text, quote text and
  // the accent ramp and nothing between. Mixed from --element-color-deep toward
  // the page until it is clearly quieter than #333 without dropping below AA on
  // either the page (5.57) or the chrome (4.93).
  '--muted': '#6f6478',
  // `a { color: #333 }` with `a:hover, a:visited { color:
  // var(--element-color-deep) }`. Links that are body-colored until hovered do
  // not work in a reader with no editor around them, so the deep tone — which
  // this palette authors precisely as the step cut for legible text — moves to
  // the resting state.
  '--link': '#6a3f7a',
  '--body-fg': '#333333',
  // `#write h1 { color: #222 }`.
  '--h1-fg': '#222222',
  // h2 upstream is white text on an --head-title-h2-background gradient pill
  // (`padding: 5px 12px; border-radius: 8px`), which this app has no way to draw
  // — a heading here is text, not a filled block. So h2 takes the palette's deep
  // tone instead: the level stays visibly the accent's, and the color is the one
  // the variant authors for text on a light ground.
  '--h2-fg': '#6a3f7a',
  // h3-h6 inherit body color and carry the accent in their ::before glyph
  // instead — the left bar, the filled dot, the hollow ring, the dash.
  '--h3-fg': '#333333',
  '--h4-fg': '#333333',
  '--h5-fg': '#333333',
  '--h6-fg': '#333333',
  // Cool hairline. The base's own interior rule is a flat #f0f0f0; tinted into
  // the ramp's hue so borders belong to the theme rather than sitting neutral.
  '--border': '#ece4ef',
  // `.cm-s-inner.CodeMirror { background: #f8f8f8 }` — hardcoded in the base and
  // therefore the same neutral gray in every light variant, Mauve included.
  '--code-bg': '#f8f8f8',
  // `blockquote { background-color: var(--element-color-soo-shallow) }`, with no
  // border at all upstream — the wash is the whole treatment. Taken from
  // --element-color-so-shallow rather than soo-shallow, for the reason recorded
  // at --chrome: soo-shallow is #fafafc here, and a quote card washed 1.5% away
  // from the page is not a card. The variant's own comment names so-shallow the
  // highlight and quote step, so this is also what it was written for.
  '--quote-bg': '#f3e5f5',
  '--hl': 'rgba(160,110,180,0.14)',
  // Phycat's quotes have no accent bar; this app's do. --element-color, which
  // unlike Caramel's amber already clears the 3:1 a solid graphic element needs
  // and so is used unchanged.
  '--quote-accent': '#a06eb4',
  // `blockquote { color: #555 }`.
  '--quote-fg': '#555555',
  // `.md-fences::before` — the language strip, `#f8f8f8` with a base64
  // traffic-lights SVG and `border-radius: 5px 5px 0 0`. Stepped one shade off
  // the fence so the strip is visible as a strip without the SVG this app does
  // not draw.
  '--code-header-bg': '#f1f1f1',
  // The strip's own #7e7e7e, darkened from 3.59 to 4.51 against that ground.
  '--code-header-fg': '#6e6e6e',
  '--heading-accent': '#a06eb4',
  '--heading-accent-soft': 'rgba(160,110,180,0.35)',
  '--h2-accent': '#a06eb4',
  '--h2-accent-soft': 'rgba(160,110,180,0.35)',
  '--h3-accent': '#a06eb4',
  '--h3-accent-soft': 'rgba(160,110,180,0.35)',
  '--h4-accent': '#a06eb4',
  '--h4-accent-soft': 'rgba(160,110,180,0.35)',
  '--h5-accent': '#a06eb4',
  '--h5-accent-soft': 'rgba(160,110,180,0.35)',
  '--h6-accent': '#a06eb4',
  '--h6-accent-soft': 'rgba(160,110,180,0.35)',
  // On, unlike the Konayuki ports: Phycat really does mark every heading with a
  // glyph in --head-title-color — a 40x4 pill under h1, a 5px left bar on h3, a
  // filled 10px dot on h4, a hollow ring on h5, a dash on h6 — and ranks the
  // levels by that silhouette. The chevron family is the app's version of the
  // same idea.
  '--heading-marker-style': 'chevron',
  '--heading-marker': '0.52em',
  // --element-color-shallow, the ramp step the base uses for its own hairlines
  // (the dashed `hr`, the table's outer ring).
  '--heading-rule': '#d4b6e0',
  // Phycat's scale, in rem against `html { font-size: 16px }` and a 1rem body,
  // so the rem figures convert to em one-for-one. h5 and h6 are the same size
  // upstream — they separate by glyph, which is why the marker family is on.
  '--h1-size': '1.8em',
  '--h2-size': '1.4em',
  '--h3-size': '1.3em',
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
  // --element-color-linecode-background: inline code gets its own ground here,
  // separate from the fence's neutral gray.
  '--badge-bg': '#f2eff9',
  // Outer border, interior rules on every cell, and a filled thead — `grid` is
  // the only faithful value.
  '--table-style': 'grid',
  // `table { border-radius: 8px; overflow: hidden }`.
  '--table-radius': '8px',
  // `th { background-color: var(--element-color-soo-shallow); color:
  // var(--element-color-deep); font-weight: 700 }`, on the deepened step for the
  // reason recorded at --quote-bg.
  '--table-header-bg': '#f3e5f5',
  '--table-header-fg': '#6a3f7a',
  // Phycat has no zebra striping — the grid does the separating — but a fully
  // transparent value is the one thing --table-style: grid is documented not to
  // take. Set below the visual weight of the 1px rules it sits between.
  '--table-row-alt': 'rgba(160,110,180,0.03)',
  // `tr:hover { background-color: var(--element-color-soo-shallow) }`, as an
  // alpha so it composites over the stripe above rather than replacing it.
  '--table-row-hover': 'rgba(160,110,180,0.06)',
  // The base's interior rule is a flat #f0f0f0, which sits at 1.14 on white —
  // fine in Typora, where the table also carries an --element-color-shallow
  // outer ring, but this app draws one border for the whole table and that
  // hairline is then the only thing holding the grid together. Tinted into the
  // ramp and deepened one step so it does.
  '--table-border': '#e6dcea',
  '--table-border-width': '1px',
  // `th, td { padding: 8px 12px }`.
  '--table-cell-pad-y': '8px',
  '--table-cell-pad-x': '12px',
  // `table { font-size: 14px }` against the 16px body.
  '--table-font-size': '0.875em',
  '--math-fg': '#333333',
  '--math-bg': '#f8f8f8',
  // Phycat's light half authors no semantic feedback colors — it has one accent
  // ramp and nothing that means "error" or "success". Unlike the dark variants
  // there is no second or third palette color to borrow. Chosen as the quietest
  // red/amber/green that clear AA on the page, on the chrome, and on their own
  // callout washes — that last ground is what sets the depth, and it is the same
  // for both light variants, so this trio matches phycat-caramel's exactly.
  '--danger': '#c62828',
  '--danger-bg': 'rgba(198,40,40,0.10)',
  '--warn': '#985906',
  '--warn-bg': 'rgba(152,89,6,0.10)',
  '--ok': '#2a722e',
  '--ok-bg': 'rgba(42,114,46,0.10)',
  '--edge-shadow': 'rgba(0,0,0,0.08)',
  // Phycat runs 16px on blockquotes, 8px on tables and 5px on fences. This app
  // scales its smaller surfaces down from one token, so the token takes the
  // largest of the three and the rest follow.
  '--surface-radius': '16px',
  '--surface-corner': 'round',
  // --appui-color-text, the one token the variants author specifically for
  // interface chrome rather than the article.
  '--chrome-fg': '#4a235a',
  '--chrome-muted': '#6f6478',
  '--chrome-border': '#ece4ef',
  // --glass-bg-color is `#f0d7f91a` — the ramp's pale orchid at 10% alpha.
  '--chrome-hl': 'rgba(160,110,180,0.14)',
  '--chrome-accent-shape': 'flat',
  // `--bg-style: var(--bg-shape-cross)` — a diagonal cross-hatch masked over the
  // article at 12% (`#write::before`). This app has no article-pattern token,
  // only a chrome one, so the motif moves to the chrome rather than being
  // dropped; chevron is the app's 45-degree hairline pattern.
  '--chrome-pattern': 'chevron',
  '--chrome-pattern-opacity': '0.05',
  '--chrome-pattern-ink': 'dark',
  // The light base's CodeMirror set is One Light, hardcoded — every light
  // variant renders code identically, regardless of its ramp, so this block is
  // the same one phycat-caramel carries. It was cut against a white editor and
  // struck here against the base's own #f8f8f8 fence, where most of it landed
  // short; seven of the twelve are darkened along their own hue below. Hue and
  // relative rank are preserved throughout, so the block still reads as One
  // Light.
  '--syn-kw': '#a626a4',
  // #50a14f at 3.02.
  '--syn-str': '#40803f',
  // `.cm-def` — #c18401 at 3.01.
  '--syn-fn': '#986801',
  // #9a9a9a at 2.65, the worst of the set: a mid gray on a near-white ground.
  // Comments stay the quietest thing in the block; they just stop being
  // unreadable.
  '--syn-cm': '#727272',
  // #1694b6 at 3.33.
  '--syn-num': '#127c99',
  '--syn-type': '#626161',
  // #0abe00 at 2.36. One Light gives operators a vivid green of their own, which
  // lands close to the string green once both are darkened; the saturation gap
  // between them is what keeps them apart, and it is no smaller than upstream's.
  '--syn-op': '#078500',
  '--syn-var': '#b92121',
  // `.cm-attribute` — #8f6aa8 at 4.12.
  '--syn-attr': '#8962a3',
  // `.cm-tag` resolves to the keyword tone.
  '--syn-tag': '#a626a4',
  // `.cm-meta` — #4078f2 at 3.81.
  '--syn-meta': '#2b69f1',
  // `.cm-atom` shares the keyword tone.
  '--syn-lit': '#a626a4',
  // The light base gives the sidebar no family of its own, so this is the app's
  // usual system sans for chrome.
  '--font-ui': "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,sans-serif",
  // `#write p { font-family: Optima-Regular, Optima, "LXGW WenKai",
  // PingFangSC-light, PingFangTC-light, "PingFang SC", Cambria, Cochin, Georgia,
  // Times, "Times New Roman", serif }`, with the four CJK entries dropped —
  // isFontStackValue's ASCII \w rejects the names, and on a machine that has them
  // installed they would take over Latin text nobody chose them for.
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
