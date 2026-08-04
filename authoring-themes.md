# Authoring themes

Themes are JSON files you can import from the theme popover (the swatch icon in the
toolbar → **Import theme…**). Nothing is uploaded anywhere — the file is read and validated
entirely in the browser, then stored in your local IndexedDB alongside the built-in themes.

## File format

```json
{
  "name": "My Theme",
  "mode": "light",
  "tokens": {
    "--bg": "#ffffff",
    "--fg": "#1f2328",
    "--link": "#0969da"
  }
}
```

- `name` — required, shown in the theme list.
- `mode` — `"light"` or `"dark"`; anything else (or omitted) is treated as `"light"`.
  This picks which built-in palette fills in any token your file doesn't set.
- `tokens` — any subset of the tokens below. Everything you omit falls back to the
  base light or dark palette, then to the built-in theme closest to your `mode`.

The full token reference — every color, length, and font token, its purpose, and its default —
is generated from the single source of truth (`src/themes/contract.ts`) into
[`contract.md`](contract.md). Regenerate it after changing the contract with:

```bash
npm run generate:contract
```

That command also regenerates `public/theme-schema.json`, the JSON Schema used to validate
imports, so the two artifacts can never drift apart.

Chrome (toolbar, sidebar, sub-bar, editor pane) and the reading canvas are independent
surfaces: `--chrome` sets the chrome background, while `--chrome-fg`, `--chrome-muted`,
`--chrome-border`, and `--chrome-hl` color the text, borders, and hover states on top of it.
A theme can pair a dark `--chrome` with light `--chrome-*` values (or vice versa) — see
`src/themes/builtin/azure-corporate/tokens.ts` for a worked example (dark navy chrome, light
reading canvas). Omitting the `--chrome-*` set falls back to the base palette, which by
default matches the canvas tokens.

Blockquotes, code blocks, headings, and callouts have their own accent tokens, so a theme can
restyle them without dragging `--link` along. `--quote-accent` draws the blockquote's left bar
and `--quote-fg` its body text; `--code-header-bg` and `--code-header-fg` style the strip above
a code block that carries the language label and copy button; `--heading-accent` and
`--heading-accent-soft` are the two tones of the marker before a heading, and `--heading-rule`
is the hairline under a level-2 heading.

Levels 2 through 6 each draw a marker, and each draws a *different shape*: a full-height
two-tone chevron at h2, an inset two-tone chevron at h3, a single-tone chevron at h4, a
diamond at h5, a hollow chevron at h6. The weight drops as the level descends, which is what makes depth
readable — h4 and h6 differ by only 0.22em of type size, far too little to tell apart on their
own. Note that from h4 down the shapes change *kind* rather than size, because those three
levels share one floored glyph box (see below) and so have no size step left to differ by.
h1 has no marker: it opens the document rather than sitting in the outline.

No marker is allowed to render lighter than a body-list bullet, since a heading outranks the
list beneath it. `--heading-marker` is an em length, so it shrinks with each level's font-size
and would leave h5 and h6 as specks; the glyph box is therefore floored at a minimum size.
That floor is a fraction of `--fs`, not a fixed pixel value, because the bullet it is matched
against is sized off `--fs` too — pinning it in px would let the ratio drift as the reader
changes font size. A theme that enlarges `--heading-marker` is unaffected: the floor only ever
raises the bottom of the ladder, and at the default it binds only h5 and h6.

Each level also has its own color pair — `--h2-accent` / `--h2-accent-soft` through
`--h6-accent` / `--h6-accent-soft` — so a theme that colors its heading levels differently can
dress each marker in its own heading's hue instead of forcing five glyphs through one accent.
Levels left unset inherit `--heading-accent`, so a theme written before these existed keeps
its marker color across all five. The `-soft` tone is the trailing half of the two-tone glyphs
(h2 and h3); the one-tone shapes below them ignore it, but the token exists at every level so
a theme can restyle a level without first knowing which shape it draws.
`azure-corporate` is the worked example: each `--h*-accent` there matches the `--h*-fg` of the
same level exactly, so every marker reads as part of its heading.

The marker is optional. `--heading-marker` is its width, and setting it to `0` removes the
glyph entirely — not merely hides it — for themes that would rather carry hierarchy on color,
size, and spacing alone. `github-light` and `sepia-book` ship with it off; `azure-corporate`
and `night-owl` keep it. Note that the glyph sits in the text column, so a theme with the
marker on indents h2–h6 text by the marker width plus a `0.42em` gap, while h1 stays flush
left. That offset is the trade for having a marker; the h2 rule is unaffected and still spans
from the article's left edge. The accent tokens above stay meaningful either way, so a theme
that turns the marker back on gets correctly dressed glyphs.
GitHub-style callouts
(`> [!NOTE]`, `> [!TIP]`, `> [!IMPORTANT]`, `> [!WARNING]`, `> [!CAUTION]`) render as accented
cards drawing on `--link`, `--ok`/`--ok-bg`, `--warn`/`--warn-bg`, and `--danger`/`--danger-bg`.
The same cards are produced by `<blockquote alt="info|success|warn|danger">`, so both callout
syntaxes are styled by one set of tokens.
`src/themes/builtin/azure-corporate/tokens.ts` is again the worked example.

### Article text color

`--body-fg` colors paragraph text and `--h1-fg` … `--h6-fg` color heading text, one token per
level. Note the split from the accent tokens above: `--heading-accent`, the `--h*-accent` pairs,
and `--heading-rule` draw the *marker glyph and the rule*, never the letters — so a theme can
tint the h2 text and leave its marker alone, or the reverse.

These are also separate from `--fg`, which colors chrome (toolbar, sidebar, dialogs) as well as
the canvas. Recoloring the article through `--fg` would drag the surrounding UI with it;
`--body-fg` and the `--h*-fg` set change only what is inside the article. A theme that wants the
default uniform look simply repeats its `--fg` value across all seven.

```json
{
  "name": "Colorful headings",
  "mode": "light",
  "tokens": {
    "--body-fg": "#333333",
    "--h1-fg": "#d63384",
    "--h2-fg": "#6f42c1"
  }
}
```

Omitted levels fall back to the base palette, so a theme only lists the ones it changes.

### Syntax highlighting

Twelve `--syn-*` tokens color fenced code. They are grouped by *role* rather than by
language, so a theme sets twelve colors instead of tracking the ~40 class names highlight.js
can emit; anything outside these groups falls back to `--fg`.

| Token | Colors |
| --- | --- |
| `--syn-kw` | keywords (`const`, `def`, `return`) |
| `--syn-str` | strings and regular expressions |
| `--syn-fn` | function names and built-ins |
| `--syn-cm` | comments (also rendered italic) |
| `--syn-num` | numbers |
| `--syn-type` | types and class names |
| `--syn-op` | operators and punctuation |
| `--syn-var` | variables, template substitutions, parameters |
| `--syn-attr` | attributes, object keys, CSS class/id selectors |
| `--syn-tag` | HTML/XML tags and CSS element selectors |
| `--syn-meta` | decorators, preprocessor directives, shebangs |
| `--syn-lit` | literals (`true`/`false`/`null`) and symbols |

Because these are colors on a code background, check them against `--code-bg` rather than
`--bg`. The mapping from highlight.js classes to these tokens lives in `src/index.css`.

### Tables and math

`--table-header-bg` fills the header row and `--table-row-alt` the even body rows (zebra
striping); keep the latter subtle, since it sits under body text. `--math-fg` colors KaTeX
formulas and `--math-bg` fills the block behind a `$$…$$` display formula.

## Validation rules

An imported file is rejected (with inline error messages in the popover, not a silent
failure) if:

- It isn't a JSON object, or has no `name`.
- It has no `tokens` (or `vars` — accepted as an alias) object, or that object is empty.
- Any key isn't one of the known tokens. Typos and renames get a suggestion — e.g.
  `--code-background` resolves to `unknown token "--code-background" (did you mean
  --code-bg?)` — via a prefix check first, then Levenshtein distance for near-miss typos.
- A token's value doesn't match the type it's declared with in the contract. Each type has
  its own predicate in `src/themes/schema.ts`: `isColorValue` for colors, `isFontStackValue`
  for the font stacks (`--font-ui`, `--font-body`, `--font-mono`), and `isLengthValue` for
  `--heading-marker`, which takes a bare number with an optional unit (`0`, `0.52em`) and
  rejects `calc()` and `var()` — that value is read back in JavaScript, not only by CSS.

Up to 6 errors are shown at once. Unknown keys are always dropped rather than silently
passed through — this is the security boundary that keeps a theme file from ever injecting
arbitrary CSS: every token value is applied with `element.style.setProperty(name, value)`
onto a fixed allowlist of custom-property names, never as raw stylesheet or `innerHTML`
content.

## Exporting

**Export current** in the popover downloads the active theme (built-in or custom) as a
`<id>.json` file in the exact `{ name, mode, tokens }` shape above — including tokens it
inherited from the base palette, so it can be edited and re-imported as a starting point for
a variant.

## Adding a built-in theme (for contributors)

Built-in themes ship in the app itself rather than being imported at runtime:

1. Create `src/themes/builtin/<slug>/tokens.ts` exporting a `tokens: ThemeTokens` covering
   every token in the contract (see `src/themes/builtin/github-light/tokens.ts` for the
   shape).
2. Create `src/themes/builtin/<slug>/manifest.ts` exporting `{ id, name, mode, badge }`.
3. Add one line to `src/themes/builtin/index.ts`'s `BUILTIN_THEMES` array.

No other code changes are required — the theme picker, dot-preview swatches, and
`mergeThemeTokens` base-palette selection (light themes fall back to the first light
built-in, dark themes to the first dark built-in) all read from that registry.
