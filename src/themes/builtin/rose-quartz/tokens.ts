import type { ThemeTokens } from '../../contract';

// Ported from the `rose` Typora theme — an upstream stylesheet, not a file in
// this repo, so the comments below quote the declarations they came from rather
// than pointing at a path that isn't here. A blush Material 3 skin
// whose defining move is that the *shell* is pink and the *page* is white — the
// theme sets --bg-color (window, sidebar) to #f7e9ee and --write-bg-color (the
// article) to white, then floats the article on top with a 24px radius. This
// app already splits those two surfaces, so --chrome takes rose's window tint
// and --bg takes its paper.
export const tokens: ThemeTokens = {
  // Rose's --write-bg-color. The article is the one white thing in the theme,
  // which is what keeps a wash this saturated readable under body text.
  '--bg': '#ffffff',
  // Rose's --bg-color: the window tint the white page sits on.
  '--chrome': '#f7e9ee',
  '--fg': '#4a3b40',
  // Rose leaves secondary text to Typora's own opacity rules (`.6` on inactive
  // sidebar rows), which have no color to port. Struck instead against the two
  // grounds this token actually lands on — 5.05 on the pink chrome, 5.95 on the
  // page — since a mauve at rose's own lightness would have failed both.
  '--muted': '#745d65',
  // Rose's --link-color, and the hue every accent in this theme is a relative of.
  '--link': '#a14a6a',
  '--body-fg': '#4a3b40',
  // Rose's --title-color: headings sit a step darker and cooler than body text
  // rather than taking the accent, which is what keeps six levels of pink from
  // competing with the links running through them.
  '--h1-fg': '#3a2b2f',
  '--h2-fg': '#3a2b2f',
  '--h3-fg': '#3a2b2f',
  '--h4-fg': '#3a2b2f',
  '--h5-fg': '#3a2b2f',
  '--h6-fg': '#745d65',
  // Rose's own --window-border is a neutral #e9e9e9, which reads as dirt against
  // a pink ground. Tinted into the family instead; the neutral survives only on
  // the table, where rose used a different token and meant it (see --table-border).
  '--border': '#e8d5dc',
  '--code-bg': '#f4e9ee',
  // Rose's --blockquote-bg-color, a solid fill rather than a wash: its quotes are
  // rounded pink cards, not indented text with a bar.
  '--quote-bg': '#f6dce4',
  '--hl': 'rgba(161,74,106,0.09)',
  '--quote-accent': '#a14a6a',
  '--quote-fg': '#5a3a44',
  '--code-header-bg': '#f0e0e6',
  '--code-header-fg': '#745d65',
  // Rose's --md-heading-before-color is `var(--link-color)` — the `#` marks are
  // drawn in the accent. This app's chevrons take the same job and the same hue.
  '--heading-accent': '#a14a6a',
  '--heading-accent-soft': 'rgba(161,74,106,0.32)',
  '--h2-accent': '#a14a6a',
  '--h2-accent-soft': 'rgba(161,74,106,0.32)',
  '--h3-accent': '#a14a6a',
  '--h3-accent-soft': 'rgba(161,74,106,0.32)',
  '--h4-accent': '#a14a6a',
  '--h4-accent-soft': 'rgba(161,74,106,0.32)',
  '--h5-accent': '#a14a6a',
  '--h5-accent-soft': 'rgba(161,74,106,0.32)',
  '--h6-accent': '#a14a6a',
  '--h6-accent-soft': 'rgba(161,74,106,0.32)',
  // Kept on, for the reason above: rose is a theme that *shows* its heading
  // marks and tints them with the link color. Turning them off here would drop
  // the one piece of pink rose puts in the heading line.
  '--heading-marker-style': 'chevron',
  '--heading-marker': '0.52em',
  '--heading-rule': '#e8d5dc',
  // Rose's heading scale, converted from its rem values against its own body
  // size: `body { font: 105%/1.65 }` puts the reading face at 16.8px on a 16px
  // root, so its 3rem h1 is 2.86 times its own text, not 3.
  //
  // The shape of the ladder is the point — one very large h1, then a scale that
  // stops descending. Rose's raw h4/h5/h6 are 1rem/0.85rem/0.8rem, i.e. 0.95em,
  // 0.81em and 0.76em of its body, which puts three of six levels *below* body
  // text. Floored at 1em and stepped narrowly from there: the intent is a scale
  // that flattens out, not one that sinks under the paragraphs it heads. Weight
  // 700 and the chevrons carry the rest of the rank.
  '--h1-size': '2.86em',
  '--h2-size': '1.52em',
  '--h3-size': '1.14em',
  '--h4-size': '1em',
  '--h5-size': '0.92em',
  '--h6-size': '0.86em',
  // Rose sets every heading at 700 — no lighter weight for the deeper levels.
  '--h1-weight': '700',
  '--heading-weight': '700',
  // Rose's editorial pass tightens headings to 1.22 (from the 1.25 it starts at).
  '--heading-line-height': '1.22',
  // Rose's 105% body against this app's 16px base.
  '--body-size-scale': '1.05',
  // Rose's `body` declares 1.65 leading and its editorial pass then overrides
  // #write to 1.55 — the article value is the one that governs body text. 1.55
  // against this app's 1.7 base is 0.912.
  '--body-line-height-scale': '0.912',
  // Rose's --sidebar-active-bg-color, which is also its --select-text-bg-color:
  // the same pale blush does chip duty throughout the theme.
  '--badge-bg': '#f9e3ea',
  // Rose boxes its tables completely — outer border, interior rules on every
  // cell, and a filled header row — so `grid` is the only faithful value.
  '--table-style': 'grid',
  // Rose's --hover-radius on the table corners. The large radius is the theme's
  // signature: it rounds tables, quotes, code blocks and sidebar rows all at
  // 16-24px, and a table clipped square here would be the one thing that isn't.
  '--table-radius': '18px',
  '--table-header-bg': '#f7e9ee',
  '--table-header-fg': '#3a2b2f',
  '--table-row-alt': 'rgba(161,74,106,0.035)',
  '--table-row-hover': 'rgba(161,74,106,0.08)',
  // Rose's --table-border-color, kept neutral exactly as it is there. It reads
  // as gray against the pink header but the body rows it separates are on white,
  // which is the ground it was picked for.
  '--table-border': '#e1e3e1',
  '--table-border-width': '1px',
  // Rose pads cells 12px/24px. The vertical is taken as-is; the horizontal is
  // pulled to 20px because rose sets tables inside a 950px column and this app
  // allows 1280px, where 24px of gutter per side stops separating columns and
  // starts stranding them.
  '--table-cell-pad-y': '12px',
  '--table-cell-pad-x': '20px',
  '--table-font-size': '0.9em',
  '--math-fg': '#4a3b40',
  // Rose's --rawblock-edit-panel-bd points at its code-block background, so
  // display math and fenced code share a ground there. Kept as a wash rather
  // than the solid, since display math sits directly on the white page here.
  '--math-bg': 'rgba(161,74,106,0.05)',
  // Material 3's --color-error, which rose imports wholesale and uses for its
  // error states.
  '--danger': '#b3261e',
  '--danger-bg': 'rgba(179,38,30,0.07)',
  // Rose has no warning color of its own — nothing in the Typora surface it
  // styles needs one. Struck as the amber sitting between its M3 error and the
  // olive below, dark enough to clear 4.5 on the page.
  '--warn': '#a3620d',
  '--warn-bg': 'rgba(163,98,13,0.07)',
  // The olive rose gives CodeMirror variables and attributes, reused as the
  // success accent so callouts stay inside the palette the code blocks establish.
  '--ok': '#58692e',
  '--ok-bg': 'rgba(88,105,46,0.08)',
  '--edge-shadow': 'rgba(74,59,64,0.14)',
  // Rose's --radius is 5px and its --hover-radius 24px, and nearly every surface
  // starts at the first and animates to the second on hover. There is no hover
  // state to animate into here, so surfaces are set at the generous end — the
  // rounding *is* the theme, and 5px static would read as a different one.
  '--surface-radius': '16px',
  '--surface-corner': 'round',
  '--chrome-fg': '#4a3b40',
  '--chrome-muted': '#745d65',
  '--chrome-border': '#ecd9e0',
  // Rose's --sidebar-active-bg-color (#f9e3ea) over its --bg-color (#f7e9ee) is
  // a 2-value difference — invisible. Stated as an alpha of the accent instead,
  // which is the same gesture at a strength that actually marks the row.
  '--chrome-hl': 'rgba(161,74,106,0.10)',
  // Rose's active sidebar row is a pill (`border-radius: 0 16px 16px 0`), not a
  // sheared plane.
  '--chrome-accent-shape': 'flat',
  // Aura: a soft light source at the toolbar/sidebar corner, tinted with --link.
  // Rose has no texture anywhere — it is a flat Material surface — but it is
  // built entirely out of soft blush gradients, and aura is the one motif that
  // adds glow rather than grain. Any patterned alternative would put a printed
  // texture on a theme whose whole argument is that the chrome is a tint.
  '--chrome-pattern': 'aura',
  '--chrome-pattern-opacity': '0.06',
  // Dark ink: the chrome is a near-white blush, so white ink would vanish.
  '--chrome-pattern-ink': 'dark',
  // Rose's CodeMirror palette is base16-derived and was cut for a dark editor —
  // its string yellow (#f4bf75) lands at 1.5:1 on rose's own pink code ground,
  // and half the set is under 3:1. Each role keeps rose's hue and is darkened
  // until it clears 4.5 against --code-bg; the relationships between them (red
  // keywords and tags, olive variables and attributes, mauve numbers and atoms,
  // brown comments) are rose's, only the lightness is this app's.
  '--syn-kw': '#ac4142',
  '--syn-str': '#7f611b',
  '--syn-fn': '#985314',
  '--syn-cm': '#8f5536',
  '--syn-num': '#8b5382',
  '--syn-type': '#356d83',
  // Rose's bracket color is #202020, a hard black that outweighs the identifiers
  // it sits between. Warmed into the text family and lightened to sit under them.
  '--syn-op': '#5a4a50',
  '--syn-var': '#58692e',
  '--syn-attr': '#58692e',
  '--syn-tag': '#ac4142',
  '--syn-meta': '#8f5536',
  '--syn-lit': '#8b5382',
  '--font-ui': "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,sans-serif",
  // Rose's editorial pass sets #write in a system UI stack rather than the CJK
  // display face its --font-family-base names first. That override is the one
  // that governs the article, so it is what is ported; the CJK head of the base
  // stack is dropped for the reason sepia-book drops its own — a machine with
  // the font installed would render body text in a face nobody chose here, and
  // isFontStackValue's ASCII \w would reject the name anyway.
  //
  // Inter comes from the Google Fonts link in index.html. Rose's order is kept
  // exactly: the Apple entries win on macOS, so Inter is what the theme actually
  // renders in everywhere else — which is why it had to be loaded rather than
  // left to resolve against a local install.
  '--font-body': "-apple-system,BlinkMacSystemFont,'SF Pro Text',Inter,'Segoe UI','Helvetica Neue',Arial,sans-serif",
  // Rose sets headings in the reading face — no display face anywhere in it —
  // so this repeats --font-body rather than introducing one. (The contract
  // forbids var() here; the repetition is the intended way to say "same face".)
  '--font-heading':
    "-apple-system,BlinkMacSystemFont,'SF Pro Text',Inter,'Segoe UI','Helvetica Neue',Arial,sans-serif",
  // Rose's --font-family-monospace, Sarasa/CJK entries aside. Fira Code is also
  // loaded from index.html, so it resolves on every platform — unlike the body
  // stack there is no system face ahead of it, which makes it the one face this
  // theme renders code in rather than a preference that only some machines see.
  // Its ligatures are the reason rose names it first, and they are the whole
  // difference between it and the Consolas/Menlo run behind it.
  '--font-mono':
    "'Fira Code',ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono',monospace",
};
