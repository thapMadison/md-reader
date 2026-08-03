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

The full token reference — every color/font token, its purpose, and its default value —
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

## Validation rules

An imported file is rejected (with inline error messages in the popover, not a silent
failure) if:

- It isn't a JSON object, or has no `name`.
- It has no `tokens` (or `vars` — accepted as an alias) object, or that object is empty.
- Any key isn't one of the known tokens. Typos and renames get a suggestion — e.g.
  `--code-background` resolves to `unknown token "--code-background" (did you mean
  --code-bg?)` — via a prefix check first, then Levenshtein distance for near-miss typos.
- Any color token's value isn't a valid color string (checked with `isColorValue` in
  `src/themes/schema.ts`). `--font-body` is exempt from this check since it's a font stack,
  not a color.

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
