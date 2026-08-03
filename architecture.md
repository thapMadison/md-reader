# Architecture

MDReader is a single-page React app with no backend. All state — open files, theme
preferences, scroll positions — lives in the browser (IndexedDB + in-memory), and rendering
is a pure function of that state.

## Layers

```
src/
  app/            UI shell: shell layout, toolbar, sidebar, editor pane, content area
  features/       Feature modules, each owning its own state + components
    library/      Open-file list, dirty tracking, storage/filesystem wiring
    theming/      Theme provider, DOM application, picker popover
    reader/       Markdown rendering pipeline + components (code, mermaid, images)
    toc/          Heading extraction, scrollspy, scroll restoration
  services/
    storage/      IndexedDB-backed persistence, behind an interface (+ in-memory fake)
    filesystem/   File System Access API + <input>/drag-drop fallback
  themes/         Token contract, built-in theme palettes, validation/merge for imports
  hooks/          Cross-cutting hooks (viewport breakpoint)
```

Dependency direction is one-way: `app` consumes `features`, `features` consume `services`
and `themes`, nothing below reaches back up into `app`.

## Composition root

`App.tsx` nests three context providers, outermost to innermost:

```
StorageProvider → ThemeProvider → LibraryProvider → AppShell
```

`ThemeProvider` and `LibraryProvider` both call `useStorage()` internally (to persist theme
choice and open-file state respectively), so `StorageProvider` must be outermost. `AppShell`
is the only component that reads from all three contexts directly — it derives every prop
passed to the presentational shell components (`Toolbar`, `Sidebar`, `EditorPane`,
`ContentArea`, `TocRail`, `ThemePopover`, `SubBar`) from that combined state. The shell
components themselves hold no state of their own beyond local UI concerns (hover, etc.);
this keeps the design-fidelity surface (which visibility/enabled conditions apply when) in
one place.

Layout-only UI state (sidebar/drawer open, editing mode, mobile tab, resize drag, TOC sheet)
lives in `useLayoutState` (`app/layoutState.ts`) — it's UI chrome state, not document or
theme state, so it doesn't belong in a context.

## Theming

`src/themes/contract.ts` defines every themeable CSS custom property as data (name, type,
description, default). Three artifacts derive from that one array so they can never drift
out of sync with each other:

- `contract.md` — human-readable reference (regenerate with `npm run generate:contract`)
- `public/theme-schema.json` — JSON Schema used client-side to validate imported theme files
- The zod-adjacent runtime validator in `src/themes/validate.ts`

A `Theme` is a manifest (`id`, `name`, `mode`, `badge`) plus a full `ThemeTokens` map. Built-in
themes live under `src/themes/builtin/<name>/{tokens.ts,manifest.ts}`, registered in
`src/themes/builtin/index.ts` — adding a theme is a new folder plus one registry line, no
other code changes.

`ThemeContext` applies the active theme by calling `element.style.setProperty('--token',
value)` for every token onto the document root — never by injecting raw CSS or HTML, which
is the security boundary for imported theme files. Imported themes go through
`validate.ts` (unknown/malformed tokens rejected, with a Levenshtein-based "did you mean
--code-bg?" suggestion) and `merge.ts` (fills anything omitted from the base light/dark
palette) before being persisted via `StorageService.setPreferences`.

## Rendering pipeline

Two concerns are deliberately kept separate:

1. **Pure analysis** (`features/reader/pipeline/`) — `parse.ts` and `headings.ts` extract
   structure (heading list for the TOC) from raw markdown source without touching the DOM.
   This is what's unit-tested in isolation.
2. **DOM rendering** (`features/reader/Article.tsx`) — `react-markdown` + `remark-gfm` with
   a custom component map reproducing the design's element styles (code blocks with
   language label/copy button, Mermaid diagrams, broken-image fallback, wide-table edge
   fade, footnotes).

### Heading ids are derived, never counted

The TOC and the rendered headings must agree on every id or anchors break. Both sides get
them from one pure function, `assignHeadingIds` in `headings.ts`: the TOC via
`extractHeadings`, and the renderer via `buildHeadingIds`, which returns a map keyed by each
heading's start offset in the source. `Article.tsx` looks the id up by the `position`
`react-markdown` passes its heading components.

The lookup is the point. An earlier version assigned ids from a counter mutated as headings
rendered, rewound once per `Article` render. That is not sound: React may invoke a component
more than once per commit — StrictMode does so in development — so every heading was counted
twice and came out with a spurious `-1` suffix, breaking every anchor in the document. A
render pass is not an observable boundary, so no amount of extra rewinding fixes it; deriving
the id from the document instead makes repeat renders idempotent by construction.

Two consequences worth keeping:

- Headings excluded from the TOC (H4–H6) still **consume** their slug, so an `h4 "Overview"`
  followed by an `h2 "Overview"` yields `overview` and `overview-1` rather than a collision.
- Headings a plugin synthesized have no source position and so are absent from the map —
  `remark-gfm`'s visually-hidden "Footnotes" label is the live example. They keep the
  plugin's own id and classes and get no `data-toc`, so they never enter the TOC and never
  collide with an authored heading of the same text.

### Plugin chain and why its order is fixed

`Article.tsx` runs this rehype chain, and the order is load-bearing rather than incidental:

```
rehypeRaw → rehypeSanitize(schema) → rehypeHighlight → [rehypeKatex]
```

- **`rehypeRaw`** parses author-written raw HTML into real hast nodes. It must run first;
  nothing downstream can act on HTML that is still an opaque string.
- **`rehypeSanitize`** must run *immediately after* raw and *before* everything below it.
  After, because its whole job is to filter what `rehypeRaw` just admitted. Before, because
  the plugins below emit markup we generate and trust — sanitizing last would strip the
  `hljs-*` classes and KaTeX spans that had just been added.
- **`rehypeHighlight`** adds `hljs-*` classes to fenced code. `detect: false` keeps
  highlighting opt-in per fence, since a wrong language guess colors prose at random.
- **`rehypeKatex`** is appended only for documents that contain math (see below).

**Why sanitize is not optional.** Enabling `rehypeRaw` means arbitrary HTML from a `.md`
file reaches the DOM, so `pipeline/sanitize.ts` is what keeps that safe. Beyond ordinary XSS
(`script`, `iframe`, `on*` handlers), it also blocks the `style` attribute and `<style>`
elements specifically to preserve the theming boundary described above: theme values reach
the page only through `style.setProperty` against a fixed token allowlist, and a document
carrying its own CSS would route around that allowlist entirely.

The schema is a plain data object with no DOM access, which is why it lives in `pipeline/`
and is unit-tested directly (`sanitize.test.ts` asserts both halves — that dangerous input is
dropped *and* that `hljs-*`/`katex` classes survive; the default schema strips both, so the
allowlist widening is required for highlighting to work at all).

### Lazy-loaded renderers

Mermaid is dynamically `import()`-ed only inside `MermaidBlock.tsx`, so it never lands in
the main bundle chunk — confirmed via `npm run build`, where each Mermaid diagram type gets
its own lazy chunk.

KaTeX follows the same pattern for the same reason, but gated on content rather than on a
component: `pipeline/math.ts#hasMath` checks the source for `$$…$$`, and only then does
`Article.tsx` import `remark-math`, `rehype-katex` and `katex/dist/katex.min.css`. KaTeX's
stylesheet pulls ~1.2MB of web fonts, so math-free documents must not pay for it. `npm run
build` confirms `katex.css`, `katex.js` and `rehype-katex.js` land in separate chunks and
that all font files are referenced only from the lazy `katex-*.css`.

Single-`$` inline math is deliberately disabled (`singleDollarTextMath: false`). With it on,
ordinary prose like "costs $5 and $10" is parsed as a formula and rendered as garbled math —
verified against `remark-math` directly. `$$…$$` covers both inline and display formulas.

Files above 1MB are deferred off the synchronous render path (`useDeferredRender.ts`, via
`requestIdleCallback`) so the loading skeleton reflects real parsing work rather than a
cosmetic delay.

## File opening & persistence

`services/filesystem` distinguishes two ways a file enters the app:

- **Live** — opened via the File System Access API (`showOpenFilePicker`). The
  `FileSystemFileHandle` is persisted in IndexedDB, so on reload MDReader can
  `queryPermission`/`requestPermission` and re-read the file from disk. Permission state
  (`granted` / `prompt` / `denied`) drives the permission banner in the content area.
- **Snapshot** — opened via `<input type=file>` or drag-drop (used automatically when the
  File System Access API isn't supported, e.g. Firefox/Safari). No handle exists; the
  content is a one-time copy with no path back to the original file.

Either way, in-app edits (`LibraryContext.editContent`) only ever mutate `editedContent` in
memory — `originalContent` (and the file on disk) is never written to. "Revert" simply
resets `editedContent` back to `originalContent`.

`services/storage` is a small interface (`StorageService`) with one IndexedDB-backed
implementation (`idbStorage.ts`) and one in-memory fake (`fakeStorage.ts`) used in tests —
nothing outside `services/storage` imports `idb` directly.

## Responsive layout

`useBreakpoint` classifies the viewport into `mobile` / `tablet` / `desktop`. Each shell
component takes `mode` as a prop and derives its own layout from it (padding, whether the
TOC rail/sidebar drawer/mobile sub-bar render) — there's no separate mobile component tree.
