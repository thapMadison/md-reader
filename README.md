# MDReader

A client-side markdown reader with Typora-quality rendering and a pluggable theme system.
Everything runs in the browser — files are read from disk (or dropped/picked as one-off
snapshots), rendered, and optionally edited in-memory; nothing is ever uploaded, and edits
are never written back to disk.

Live at **https://thapmadison.github.io/md-reader/**.

## Features

- GitHub-flavored markdown rendering (tables, task lists, strikethrough, footnotes) with
  syntax-highlighted code blocks, lazy-loaded Mermaid diagrams, wide-table scroll fade, and
  broken-image fallbacks.
- Math formulas via `$$…$$`, typeset with KaTeX and loaded on demand so documents without
  math never download the font set. (Single-`$` math is off by design, so prices like "$5
  and $10" in ordinary prose stay literal.)
- Sanitized raw HTML: `<kbd>`, `<mark>`, `<details>`/`<summary>` and friends render, while
  scripts, event handlers and inline `style` are stripped — themes remain the only route
  for CSS into the page.
- Callouts in two syntaxes: GitHub's `> [!NOTE]` markers and `<blockquote alt="info">`
  (`info` / `success` / `warn` / `danger`), which render identically.
- Seventeen built-in themes across light and dark, in three groups: six standalone ports
  (GitHub Light, Night Owl, Sepia Book, Azure Corporate, Midnight Cobalt, Rose Quartz); two
  ported families kept whole because that is how they ship upstream — Konayuki's light/dark
  pair and Phycat's five palette variants; and four motif-first designs (Punch Card,
  Blueprint, Swiss Poster, Signal Loss) that start from a structural `--chrome-pattern`
  value instead of from an existing editor theme.
- A JSON import/export pipeline for custom themes — see
  [authoring-themes.md](authoring-themes.md).
- Open files live via the File System Access API (re-readable, permission-gated) or as
  one-off snapshots via `<input type=file>` / drag-drop, with a full
  live/snapshot/prompt/denied state matrix.
- In-memory editor pane with revert-to-disk and dirty tracking; edits never touch the
  original file.
- Scrollspy table of contents, reading-progress bar, and per-file scroll-position
  restoration.
- Responsive layout across desktop, tablet, and mobile breakpoints; print stylesheet; full
  keyboard focus rings.

See [architecture.md](architecture.md) for how these pieces fit together.

## Development

```bash
npm install
npm run dev        # start the dev server
npm run test        # run the vitest suite
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm run build        # production build to dist/, under base path /md-reader/
npm run preview      # serve the production build locally
```

`npm run build` also type-checks (`tsc -b`) before invoking Vite, so a broken build always
fails fast on type errors rather than shipping them.

### Theme contract

`src/themes/contract.ts` is the single source of truth for every themeable token. Running

```bash
npm run generate:contract
```

regenerates [`contract.md`](contract.md) (human-readable token reference) and
`public/theme-schema.json` (JSON Schema used to validate imported theme files) from that
one array — add a token in `contract.ts` and both artifacts stay in sync.

## Deployment

Pushing to `main` runs [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml): lint,
typecheck, test, build, then publish `dist/` to GitHub Pages. `vite.config.ts` sets
`base: '/md-reader/'` so every asset resolves correctly under the repo-scoped Pages URL —
never hardcode absolute asset paths; use imports or `import.meta.env.BASE_URL` instead
(see how `public/sample.md` is fetched in `LibraryContext`).
