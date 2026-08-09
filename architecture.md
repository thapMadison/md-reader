# Architecture

MDReader is a single-page React app. All state — open files, theme preferences, scroll
positions — lives in the browser (IndexedDB + in-memory), and rendering is a pure function
of that state.

There is one server-side component, and it is deliberately kept off the data path: a
Cloudflare Worker (`workers/gist-auth/`) that exchanges an OAuth `code` for a GitHub token.
Everything else, including all gist traffic, goes straight from the browser to
`api.github.com`. See [GitHub sync](#github-sync).

## Layers

```
src/
  app/            UI shell: shell layout, toolbar, sidebar, editor pane, content area
  features/       Feature modules, each owning its own state + components
    library/      Open-file list, dirty tracking, storage/filesystem wiring
    theming/      Theme provider, DOM application, picker popover
    reader/       Markdown rendering pipeline + components (code, mermaid, images)
    toc/          Heading extraction, scrollspy, scroll restoration
    sync/         Push/pull state machine, sync pill, conflict banner
  services/
    storage/      IndexedDB-backed persistence, behind an interface (+ in-memory fake)
    filesystem/   File System Access API + <input>/drag-drop fallback
    gist/         GitHub Gist API + OAuth, behind an interface (+ in-memory fake)
  themes/         Token contract, built-in theme palettes, validation/merge for imports
  hooks/          Cross-cutting hooks (viewport breakpoint)
workers/
  gist-auth/      Cloudflare Worker: OAuth code → token exchange. The only server.
```

Dependency direction is one-way: `app` consumes `features`, `features` consume `services`
and `themes`, nothing below reaches back up into `app`.

## Composition root

`App.tsx` nests five context providers, outermost to innermost:

```
StorageProvider → ThemeProvider → LibraryProvider → GistAuthProvider → SyncProvider → AppShell
```

`ThemeProvider` and `LibraryProvider` both call `useStorage()` internally (to persist theme
choice and open-file state respectively), so `StorageProvider` must be outermost.
`SyncProvider` sits *inside* `LibraryProvider` because it reads `useLibrary()`; the reverse
never happens, which is what keeps the dependency one-way. It is a separate context rather
than more of `LibraryContext` for a concrete reason: `LibraryContext` rebuilds its value
object every render, so every consumer re-renders on each keystroke — folding a gist poll
into that would re-render the editor on network timing. `AppShell`
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

A file authored in the app (`LibraryContext.createFile`, reached from the + beside the
sidebar's Files header — one menu for both things the list can gain) is a
snapshot by the same definition — no handle exists, and none ever will, because there is no
disk file to point one at. Its bytes live in IndexedDB and, if the user opts in, in a gist;
that is the whole of its existence. It is created with a seeded `# Title`, not empty, so
`originalContent` is something Revert can meaningfully return to for the life of the file.

Names are the constraint on creating one. Files are keyed on bare basename, and nothing in
the library asks before reusing a key, so `createFile` resolves a clash to `Notes 2.md`
before writing the record rather than replacing what is there — creating a blank document
must never be a way to destroy a real one. The name it settled on is what it returns, and
the row that appears carries it, so a resolved clash is visible rather than silent.

Either way, in-app edits (`LibraryContext.editContent`) only ever touch `editedContent`;
`originalContent` — and the file on disk — is never written to. "Revert" simply resets
`editedContent` back to `originalContent`.

`editedContent` **is** persisted to IndexedDB, on a 1s debounce plus a flush on
`visibilitychange`/`pagehide` and on switching files. That is a safety net against losing
typing to a closed tab, not a sync mechanism: it writes locally and never touches the
network. Writing per keystroke instead of debouncing would rewrite the whole record —
content included — for every character.

`contentUpdatedAt` sits beside it and bumps only when the content actually changes.
`savedAt` cannot serve that purpose: it is rewritten on every persist, including the
write-back pass during hydration, so it means "last touched", not "last changed".

`services/storage` is a small interface (`StorageService`) with one IndexedDB-backed
implementation (`idbStorage.ts`) and one in-memory fake (`fakeStorage.ts`) used in tests —
nothing outside `services/storage` imports `idb` directly.

## GitHub sync

The point of the feature: open a file on the laptop, read it on the phone, without loading
it twice. Each synced document gets its own **secret gist**.

`services/gist` mirrors the `services/storage` shape — an interface (`GistService`) with one
`fetch`-backed implementation (`githubGist.ts`) and one in-memory fake (`fakeGist.ts`).
`features/sync` holds the state machine on top.

Sync is opt-in per file and orthogonal to how the file was opened. A `snapshot` file lacks a
*disk* handle, not a *cloud* one — pushing its content to a gist needs no handle at all,
which is exactly what makes laptop → gist → iPhone work on Safari and iOS.

### The one backend, and why it exists

GitHub's Device Flow cannot run from a browser: `github.com/login/oauth/access_token` sends
no CORS headers and does not answer preflight. `api.github.com` **does** send
`Access-Control-Allow-Origin: *`, so the entire Gist API is reachable client-side — only the
token exchange is not.

Hence `workers/gist-auth/`: one `POST /token` endpoint holding the client secret. It is not
on the data path and never sees a gist. If it goes down, existing users keep working
(GitHub tokens do not expire); only new sign-ins break.

Its origin allowlist is an **exact string match, never `*` and never a suffix test** — this
endpoint mints tokens, so a wildcard would let any page on the web borrow the OAuth App as
its own exchange service.

### Comparing versions: hashes, not clocks

`contentUpdatedAt` is the user's clock and a gist's `updated_at` is GitHub's. **They are
never compared to each other** — a few minutes of clock skew would silently invert the
answer. Instead:

```ts
const localChanged  = record.syncedContentHash !== contentHash(current);
const remoteChanged = remoteMeta.updatedAt > (record.remoteUpdatedAt ?? 0);
```

`remoteUpdatedAt` is a *watermark* of the last reconciled remote state, only ever compared
against another GitHub timestamp. `syncedContentHash` (FNV-1a, `hash.ts`) makes "did this
change locally" a fact rather than a guess, so re-saving identical content does not offer a
pointless push.

Those two booleans give the whole state machine — `idle` / `local-ahead` / `remote-ahead` /
`conflict`. A conflict is **never** auto-resolved; the banner offers keep-mine, take-theirs,
or keep-both (pulled in as a new `name (from GitHub).md`, which destroys nothing).

One trap worth knowing: `stateOf` returns `idle` before the first `listGists` lands, because
an empty remote list makes `remoteChanged` false. `idle` therefore cannot be used as a
"the list has arrived" signal — `listed` exists for that.

### Push and pull are both user-driven

**Push has exactly one trigger: Sync (Ctrl/Cmd+S).** Not for rate limits — 5000 req/hour
against a few dozen is under 1% — but because every `PATCH` creates a gist revision.
Auto-pushing would turn version history, one of the reasons to pick Gist, into a keystroke
log.

**Pull happens when the user opens a file**, and on nothing else. A focus listener was built
and removed: it needs a throttle so alt-tabbing does not fire a request per switch, and any
window wide enough to do that also swallows the one return that mattered ("I just edited
the gist on github.com") — showing stale state at exactly the moment the user came back to
check. Reload and switching files both route through the same effect, so refreshing is
already in the user's hands.

The open-file effect must depend on **which file is active**, not on its sync state: typing
is what moves a file from `idle` to `local-ahead`, so depending on state means one request
per character.

### Two write paths into one record

`persistFile` (content) reads a record and writes it **whole**; `patchSync` (metadata)
touches only the sync fields. Run concurrently, `persistFile` can read the metadata before
`patchSync` writes and land after it, rewinding the hash and watermark while the content
moves forward. Nothing looks wrong until a reload, when the hash describes content that no
longer exists, `localChanged` goes true, and a conflict the user already resolved comes
back — real data loss, not a cosmetic glitch.

So a pull writes content and metadata in **one** `saveFile` (`applyExternalContent`), and a
folder move writes through the narrow `setFolder` rather than rebuilding the record. Push
stays on `patchSync` because it never touches content. Tests for this must **remount**:
asserting in-session state passes while the record on disk is already wrong.

### Sharp edges in the Gist API

- **`truncated: true` is a hard error, never content.** GitHub clips above 1MB and returns a
  *partial* string. Writing that over the user's complete copy is silent corruption, and the
  next push would send the truncation back as the new truth.
- **`MAX_SYNC_FILE_BYTES` is 1MB**, measured in UTF-8 bytes via `TextEncoder` — `.length`
  under-counts CJK and emoji three- to four-fold. Above it a file still opens and reads
  normally; it just cannot be sync-enabled. The reader gives out before the API does:
  `react-markdown` on a 10MB document locks the tab, and the phone is the device this
  feature exists for.
- **A delete naming a file the gist does not have is a 422, and it fails the whole
  request** — content included. Folder metadata used to travel as a second file, so every
  ungrouped file asked to delete one that was usually not there, and the rejection took the
  content down with it. Now the app writes exactly one file per gist and there is no delete
  to send.
- **gist.github.com titles a gist after its alphabetically first file.** A dotfile beside
  the document therefore *becomes* the gist's name in the user's list — the reason folder
  metadata moved out of `.mdreader.json` and into the description. A backup feature must
  never look, on the service, like it stored something other than what the app says it did.
- **Files are bound by `gistId`, never by name.** Library files are keyed on bare basename,
  so two `README.md`s already collide locally; with sync, name-binding would let one
  machine's README overwrite another's gist. A file without a `gistId` always creates a new
  gist — a duplicate is recoverable, an overwrite is not.
- **Secret is unlisted, not private.** GitHub has no private tier. Anyone with the URL can
  read it, with no way to revoke one person short of deleting the gist. The UI says so in
  those words, because "secret" reads as "private".
- **StrictMode invokes updaters twice**, so every value must be derived *before* the
  `setState` updater. A `createGist()` inside one creates two gists.

### Folder membership rides in the gist description

A gist is a flat bag of files with no room for library-wide structure, and each document has
its own gist — so anything the library knows that GitHub does not has to travel with the
file. The description carries it: `[mdreader] Notes.md {"folderId":"…","folderName":"Work"}`,
written in the **same `PATCH`** as the content — no second write to fail on its own, no
second conflict engine — and leaving the gist holding exactly one file, the document.

Both fields, not just the id. `folderId` comes from `crypto.randomUUID()` on whichever
device first made the folder, so reconciliation tries id first, then a case-insensitive name
match (keeping the local id), then creates the folder with the remote id. Convergence with
no central registry.

The description is rewritten whole on every push, so **an absent tag means ungrouped** and a
pull moves the file out. That is the only way "I took this out of a folder" reaches the other
devices. It reads as a statement rather than as silence precisely because the app writes the
field every time — the earlier sidecar file could not make that claim, since a gist that
never had one was indistinguishable from a file that had left its folder.

Read back by scanning for the first `{` the rest of the string parses from, not by splitting
on a separator: file names and folder names may both contain braces, and they share the
field. A tag that will not parse is treated as no tag — the document still opens, ungrouped.

### The token

Stored in its own IndexedDB object store (`auth`, added in `DB_VERSION` 2), **not** in
preferences: `clearAll()` empties that store, so the sidebar's "Clear all" button would sign
the user out.

It is readable by any XSS on this origin, which promotes `pipeline/sanitize.ts` from a
theming boundary to the thing standing between untrusted markdown and a GitHub credential.
That is the security consequence of enabling `rehypeRaw`, and it is why the sanitizer is not
optional. The token is scoped to `gist` alone, so even a leak cannot reach repositories.

The client secret lives only in the Worker, set via `wrangler secret put`, and never enters
source control or the client.

## Responsive layout

`useBreakpoint` classifies the viewport into `mobile` / `tablet` / `desktop`. Each shell
component takes `mode` as a prop and derives its own layout from it (padding, whether the
TOC rail/sidebar drawer/mobile sub-bar render) — there's no separate mobile component tree.
