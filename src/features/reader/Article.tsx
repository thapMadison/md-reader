import { Children, cloneElement, isValidElement, useEffect, useMemo, useState, type ReactNode } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import type { PluggableList } from 'unified';
import type { Element as HastElement } from 'hast';
import { sanitizeSchema } from './pipeline/sanitize';
import { hasMath, MATH_OPTIONS } from './pipeline/math';
import { CodeBlock } from './CodeBlock';
import { MarkdownImage } from './MarkdownImage';
import { reactNodeToText } from './reactText';
import { isNumericColumn } from './tableAlign';
import { buildHeadingIds } from './pipeline/parse';
import { CHIP_RADIUS, CORNER_SHAPE, MARK_RADIUS, SURFACE_RADIUS } from './radius';
import { useHeadingMarkerStyle, useTableStyle } from '@/features/theming/ThemeContext';

interface ArticleProps {
  source: string;
  padding: string;
}

// Heading color is per-level (--h1-fg … --h6-fg) rather than inherited from the
// article, so a theme can tint h1 without dragging body text along. These are
// distinct from --heading-accent* and --heading-rule, which color the chevron
// glyph and the rule under h2 — not the heading text itself.
//
// Spacing carries the hierarchy that size can no longer carry on its own. By h4
// the type is only 1.02em and by h6 it is 0.8em, so adjacent levels differ by a
// fraction the eye cannot rank; what does rank is the gap above each heading,
// which halves roughly per level (h2 1.8em -> h3 2em* -> h4 1.7 -> h5 1.45 ->
// h6 1.25) while the gap *below* shrinks in step. That widening ratio between
// space-above and space-below is what binds a heading to the content under it
// rather than to the block above — the same job an indent would do, without
// moving anything off the left edge.
//
// (*h3 sits above h2 deliberately: h2 already owns a horizontal rule, which
// reads as separation on its own, so h3 needs more raw space to feel as
// distinct from the prose above it as the ruled h2 does.)
//
// Margins are in em, so every gap scales with the reader's --fs rather than
// freezing at one font size.
const headingStyle = (level: 1 | 2 | 3 | 4 | 5 | 6): React.CSSProperties => {
  switch (level) {
    case 1:
      return {
        fontSize: '2.1em',
        lineHeight: 1.25,
        fontWeight: 700,
        letterSpacing: '-0.02em',
        margin: '0.6em 0 0.5em',
        color: 'var(--h1-fg)',
      };
    case 2:
      return {
        fontSize: '1.5em',
        fontWeight: 650,
        letterSpacing: '-0.015em',
        margin: '1.8em 0 0.7em',
        paddingBottom: '0.35em',
        borderBottom: '1px solid var(--heading-rule)',
        color: 'var(--h2-fg)',
      };
    case 3:
      return { fontSize: '1.18em', fontWeight: 650, margin: '2em 0 0.55em', color: 'var(--h3-fg)' };
    case 4:
      return { fontSize: '1.02em', fontWeight: 650, margin: '1.7em 0 0.45em', color: 'var(--h4-fg)' };
    case 5:
      return {
        fontSize: '0.92em',
        fontWeight: 650,
        letterSpacing: '.01em',
        margin: '1.45em 0 0.35em',
        color: 'var(--h5-fg)',
      };
    case 6:
      return {
        fontSize: '0.8em',
        fontWeight: 600,
        color: 'var(--h6-fg)',
        textTransform: 'uppercase',
        letterSpacing: '.06em',
        margin: '1.25em 0 0.3em',
      };
  }
};

// Headings carrying a marker pin their own line-height rather than inheriting
// the article's 1.7, both to tighten multi-line headings and to give the glyph
// a known line box to center against.
const CHEVRON_LINE_HEIGHT = 1.35;

// Gap between the marker and the heading text, in em of the heading's own
// font-size.
const CHEVRON_GAP = '0.42em';

// Levels that draw a marker. h1 is deliberately excluded: it is the document
// title, appears once, is already twice the size of anything else, and marking
// it would only push the one line a reader never has to hunt for off the left
// edge of the page.
type MarkerLevel = 2 | 3 | 4 | 5 | 6;

// Per-level marker shapes, all on one 10x14 viewBox so a single width/height
// pair positions every level identically and the glyphs share an optical
// baseline. Size alone cannot separate these levels — h4 is 1.02em and h6 is
// 0.8em, a difference the eye cannot rank — so the *shape* carries the depth:
//
//   h2  two-tone chevron, full height   — section break
//   h3  two-tone chevron, inset         — same glyph, visibly lighter
//   h4  single-tone chevron             — the pair collapses to one arrow
//   h5  diamond                         — the arrow rotates; still pointed
//   h6  hollow chevron                  — the arrow empties out
//
// Note the ladder changes *kind* from h4 down, not just size. h4-h6 all sit on
// the same floored box (see MARKER_MIN_WIDTH), so a size step between them is
// no longer available — h5 as a smaller arrow was indistinguishable from h4.
//
// Every level fills most of its viewBox rather than shrinking inside it. The
// glyph already scales with the heading's font-size, so drawing it small *and*
// scaling it down compounds: h6's dot was r=1.9 of a 10-wide box at 0.8em and
// came out 2.7px across — barely a third of the ~5.9px body-list bullet, on an
// element that outranks the list. A marker should never be lighter than a
// bullet, so the small levels are drawn near the edges of the box and depth is
// carried by silhouette and by the size the heading already gives them.
//
// Rendered as inline SVG rather than a ::before pseudo-element because markdown
// styling here is entirely inline style objects (a pseudo-element would have to
// live in index.css, splitting article styling across two mechanisms) and the
// two-tone shapes need two fills.
//
// `lead`/`trail` name the two tones; shapes that use one tone simply ignore
// `trail`, which is why every level still carries an --h*-accent-soft token.
const MARKER_SHAPES: Record<MarkerLevel, (lead: string, trail: string) => ReactNode> = {
  2: (lead, trail) => (
    <>
      <path d="M0 0 L5 7 L0 14 Z" fill={lead} />
      <path d="M5 0 L10 7 L5 14 Z" fill={trail} />
    </>
  ),
  // Same silhouette as h2 but inset top and bottom, so it reads as the same
  // family one step down rather than as a different mark.
  3: (lead, trail) => (
    <>
      <path d="M0.5 1.5 L5.25 7 L0.5 12.5 Z" fill={lead} />
      <path d="M5.25 1.5 L10 7 L5.25 12.5 Z" fill={trail} />
    </>
  ),
  // One tone only: at h4's size a second fill is two shades inside ~9px and
  // muddies into a smudge rather than reading as two halves. Drawn wide and
  // full-height rather than inset: h4 is the first level to hit
  // MARKER_MIN_WIDTH, so from here down the box no longer shrinks and the
  // silhouette is the only thing left to rank the levels by. A narrow arrow
  // here came out lighter than the h5 diamond below it, inverting the ladder.
  4: (lead) => <path d="M0.5 1 L8.5 7 L0.5 13 Z" fill={lead} />,
  // Rotated, not smaller. h5 used to be a scaled-down copy of h4's arrow, and
  // once both levels sit on the same floored box the few units between them
  // were invisible — the two read as one rank. A diamond differs by *angle*,
  // which survives at any size, while the points keep it in the same directional
  // family as the arrows above (a plain square reads as a different system, and
  // an outline arrow came out lighter than the body-list bullet).
  //
  // Equal half-diagonals, so the diamond is as wide as it is tall on screen.
  // The 10x14 viewBox maps to a 10:14 element, so units are square and no
  // aspect correction is needed here — the taller box just leaves headroom
  // above and below, which is what centres the glyph on the text line.
  5: (lead) => <path d="M5 2.6 L9.4 7 L5 11.4 L0.6 7 Z" fill={lead} />,
  // Hollow, closing the ladder: h2-h5 are all solid, so drawing the last level
  // as an outline drops its weight below every one of them without needing a
  // size step the floored box no longer allows.
  //
  // The stroke width is tuned against measured painted pixels, not the bounding
  // box — a stroke has almost no relationship between the two. The floor is a
  // body-list bullet: a heading marker should never render lighter than the
  // bullets in the list beneath it, and below roughly a 2.0 stroke this one
  // does. The ceiling is the solid h5 diamond above it, which must stay heavier
  // or the ladder inverts. Re-measure both if either moves.
  6: (lead) => (
    <path
      d="M1.9 2.8 L6.9 7 L1.9 11.2"
      fill="none"
      stroke={lead}
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
};

// The second glyph family, selected by --heading-marker-style: wedge. Same
// 10x14 viewBox, same lead/trail contract, same depth ladder as the chevrons
// above (two-tone -> two-tone inset -> one-tone -> rotated -> hollow) so the
// levels stay rankable — only the geometry changes, from a pointed arrow to a
// sheared parallelogram.
//
// The shear is a constant 3 units of run over the full 14 of rise across every
// level, which is what makes the family read as one system: the diagonal never
// changes angle, only what it encloses. A per-level angle was tried first and
// the levels stopped looking related — the eye reads differing slopes as
// different marks rather than as depth.
//
// Kept as full-bleed slabs rather than the chevrons' inset silhouettes because
// a parallelogram loses its diagonal the moment it gets small: the slope is
// carried by the long edge, so shortening it is what a size step already does
// to h5 and h6. Depth here comes from fill count and from hollowing out, both
// of which survive at 0.8em.
const WEDGE_SHAPES: Record<MarkerLevel, (lead: string, trail: string) => ReactNode> = {
  // Full-height slab split down the shear, both halves filled — the heaviest
  // mark in the family, matching the two-tone chevron's rank at h2.
  2: (lead, trail) => (
    <>
      <path d="M3 0 L6.5 0 L3.5 14 L0 14 Z" fill={lead} />
      <path d="M7 0 L10.5 0 L7.5 14 L4 14 Z" fill={trail} />
    </>
  ),
  // Same two-tone split, inset top and bottom by the same 1.5 units the h3
  // chevron uses, so the two families step down at identical rates.
  3: (lead, trail) => (
    <>
      <path d="M3.32 1.5 L6.82 1.5 L4.18 12.5 L0.68 12.5 Z" fill={lead} />
      <path d="M7.32 1.5 L10.82 1.5 L8.18 12.5 L4.68 12.5 Z" fill={trail} />
    </>
  ),
  // One tone: at h4's size the second fill muddies, exactly as it does on the
  // chevron. Widened to span the box so the single slab keeps the weight the
  // two halves had.
  4: (lead) => <path d="M3.2 1 L8.6 1 L5.8 13 L0.4 13 Z" fill={lead} />,
  // The h5 step is a shortened slab, not a rotation. The chevron family rotates
  // here because its arrow has a point to turn; a parallelogram rotated is just
  // another parallelogram, so this level instead halves the rise and keeps the
  // slope, which reads as the same mark one rank down.
  5: (lead) => <path d="M3.9 4 L8.5 4 L6.6 10.6 L2 10.6 Z" fill={lead} />,
  // Hollow, closing the ladder the same way the chevron's h6 does — but the
  // stroke is 1.5, not that glyph's 2.25, and the slab is wider than the h5
  // above it rather than narrower.
  //
  // Both differences come from the same measurement. The chevron's h6 is an
  // *open* path: its stroke has no interior to fill, so a heavy 2.25 still
  // reads as a line. This one is a closed quadrilateral, and at h6's floored
  // 7.7px box a 2.25 stroke leaves under a pixel of hole in the middle — the
  // glyph renders as a solid smudge, collapsing into the filled h5 above it and
  // inverting the ladder. Widening the slab buys interior for the hole and
  // thinning the stroke keeps that hole open at the smallest size the box
  // reaches. Re-measure both together if either changes: they trade against
  // each other, and the constraint is that the hole must survive at 7.7px while
  // the mark stays no lighter than a body-list bullet.
  6: (lead) => (
    <path
      d="M3.5 3.6 L8.8 3.6 L7.3 10.4 L2 10.4 Z"
      fill="none"
      stroke={lead}
      strokeWidth="1.5"
      strokeLinejoin="miter"
    />
  ),
};

// Glyph families, keyed by the --heading-marker-style value that selects them.
// `off` never reaches here — it is answered earlier, by markerIsHidden, since
// it decides whether the element renders at all rather than what it draws.
const MARKER_FAMILIES: Record<string, Record<MarkerLevel, (lead: string, trail: string) => ReactNode>> = {
  chevron: MARKER_SHAPES,
  wedge: WEDGE_SHAPES,
};

// Smallest the marker box is allowed to get. --heading-marker is in em, so it
// scales with each *heading's* font-size and compounds with the smaller glyphs:
// at h6 (0.8em) a 0.52em box is ~7px wide, and a shape inside it cannot reach a
// body-list bullet. This floor decouples the bottom of the ladder from the
// heading size so h5/h6 stay at least as heavy as a bullet.
//
// Expressed against --fs, not the heading's own em and not a fixed px. The thing
// being matched is the body bullet, which is sized off --fs, so the floor has to
// track --fs or the ratio drifts with the reader's font-size setting: pinned at
// 9px it measured 1.02x a bullet at --fs 17 but 1.42x at --fs 16, because the
// bullet shrank and the floor didn't. Tying it to --fs holds the ratio steady
// across the whole 15-21px range.
//
// 0.60 is measured, not chosen: it puts h6 at 1.04x a bullet, the closest the
// sweep got without dropping under it (0.45 lands at 0.93x). Re-measure if the
// h6 stroke or the bullet's own size changes. h4 leaves the floor behind at this
// value — its own 0.52em is already wider — so it only binds h5 and h6.
const MARKER_MIN_WIDTH = 'calc(var(--fs, 16px) * 0.60)';

// `width` is the theme's --heading-marker rather than a constant, so a theme
// can resize the glyph. Whether the glyph is drawn at all is a separate
// question, answered by --heading-marker-style and handled by the heading
// rather than here.
//
// `family` is that same token's other job: which glyph set to draw from. An
// unrecognized value falls back to the chevrons rather than rendering nothing —
// validation already rejects values outside the enum, so this only catches a
// contract that gains a family name the renderer hasn't implemented yet, where
// a missing glyph is a worse failure than the wrong one.
function HeadingMarker({ level, width, family }: { level: MarkerLevel; width: string; family: string }) {
  const shapes = MARKER_FAMILIES[family] ?? MARKER_SHAPES;
  // Per-level token. The shared accent is a fallback for contexts that bypass
  // mergeThemeTokens and set only the older pair; for themes, that inheritance
  // is resolved in merge.ts instead, since the per-level token is always set by
  // then and would otherwise shadow the shared one.
  const lead = `var(--h${level}-accent, var(--heading-accent))`;
  const trail = `var(--h${level}-accent-soft, var(--heading-accent-soft))`;
  // One expression for the box width, reused by height and the centering offset
  // so the floor can never apply to one dimension and not the others — that
  // would stretch the glyph off its 10:14 aspect at exactly the small levels the
  // floor exists to protect.
  const boxWidth = `max(${width}, ${MARKER_MIN_WIDTH})`;
  return (
    <svg
      viewBox="0 0 10 14"
      aria-hidden="true"
      focusable="false"
      // In-flow flex item: the glyph sits in the text column and indents the
      // heading by its own width plus the gap. That indent is deliberate — a
      // theme that opts into the marker is opting into the offset with it.
      //
      // Height tracks width at the glyph's own 10:14 aspect so resizing the
      // marker doesn't stretch it. Centering on the first line box is what keeps
      // it aligned when the heading wraps: the line box is CHEVRON_LINE_HEIGHT
      // em tall, so half the leftover centers the glyph — independent of
      // heading level or letter case.
      style={{
        flex: 'none',
        width: boxWidth,
        height: `calc(${boxWidth} * 1.4)`,
        marginRight: CHEVRON_GAP,
        marginTop: `calc((${CHEVRON_LINE_HEIGHT}em - ${boxWidth} * 1.4) / 2)`,
      }}
    >
      {shapes[level](lead, trail)}
    </svg>
  );
}

// Collects the text of every body cell, grouped by column index.
//
// This has to happen at the <table> level rather than in the td component: "is
// this column numeric?" is a question about every cell in the column, and a td
// sees only itself. Deciding per-cell would right-align a lone number sitting in
// an otherwise prose column, which is exactly the misalignment B5 exists to fix.
//
// react-markdown hands this component already-rendered React elements, not mdast
// nodes, so the walk is over element children rather than a syntax tree — hence
// reactNodeToText for the leaf text.
function bodyColumnTexts(children: ReactNode): string[][] {
  const columns: string[][] = [];
  // Only tbody rows count. A numeric header label ("2024") must not make an
  // otherwise-prose column look numeric, and the header cell is styled by its
  // own rule anyway.
  for (const section of Children.toArray(children)) {
    if (!isValidElement(section) || section.type !== 'tbody') continue;
    const sectionChildren = (section.props as { children?: ReactNode }).children;
    for (const row of Children.toArray(sectionChildren)) {
      if (!isValidElement(row)) continue;
      const rowChildren = (row.props as { children?: ReactNode }).children;
      let col = 0;
      for (const cell of Children.toArray(rowChildren)) {
        if (!isValidElement(cell)) continue;
        const cellProps = cell.props as { children?: ReactNode; colSpan?: number };
        (columns[col] ??= []).push(reactNodeToText(cellProps.children));
        // A spanning cell covers several columns; advancing by the span keeps
        // every later cell in this row under the right column index.
        col += Math.max(1, cellProps.colSpan ?? 1);
      }
    }
  }
  return columns;
}

// A theme turns the marker off with --heading-marker-style: off. This used to
// parse a number out of --heading-marker and test it against zero, which is
// what an enum-shaped choice costs when it is encoded as a length: every
// spelling of zero ("0", "0em", "0.0px") had to round-trip through parseFloat
// to recover a boolean the theme already knew.
function markerIsHidden(markerStyle: string): boolean {
  return markerStyle === 'off';
}

// GitHub-style alerts: `> [!NOTE]` and friends. remark-gfm leaves them as a
// plain blockquote whose first paragraph opens with the literal marker, so the
// blockquote component detects and strips it.
const CALLOUTS = {
  NOTE: { accent: 'var(--link)', bg: 'var(--quote-bg)', label: 'Note', icon: 'ℹ' },
  TIP: { accent: 'var(--ok)', bg: 'var(--ok-bg)', label: 'Tip', icon: '✓' },
  IMPORTANT: { accent: 'var(--link)', bg: 'var(--quote-bg)', label: 'Important', icon: '★' },
  WARNING: { accent: 'var(--warn)', bg: 'var(--warn-bg)', label: 'Warning', icon: '!' },
  CAUTION: { accent: 'var(--danger)', bg: 'var(--danger-bg)', label: 'Caution', icon: '⚠' },
} as const;

const CALLOUT_RE = /^\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][ \t]*\r?\n?/i;

// Second way to mark a callout: `<blockquote alt="info">`, which needs no
// marker line inside the quote body. Values are intent-named rather than
// GitHub's noun-named so authors can pick by meaning; each maps onto an
// existing CALLOUTS entry so both syntaxes render identically and there is
// only one place to restyle.
const ALT_CALLOUTS: Record<string, keyof typeof CALLOUTS> = {
  info: 'NOTE',
  note: 'NOTE',
  success: 'TIP',
  tip: 'TIP',
  important: 'IMPORTANT',
  warn: 'WARNING',
  warning: 'WARNING',
  danger: 'CAUTION',
  caution: 'CAUTION',
};


// Removes the leading `[!NOTE]` marker from a callout's rendered children.
// Returns null when the marker is not a plain leading string on the first
// paragraph — the caller then falls back to a normal blockquote instead of
// rewriting an element tree it doesn't understand.
function stripCalloutMarker(children: ReactNode): ReactNode | null {
  const nodes = Children.toArray(children);
  // react-markdown pads block children with literal "\n" strings, so the first
  // paragraph is not necessarily at index 0.
  const firstIdx = nodes.findIndex((n) => typeof n !== 'string' || n.trim() !== '');
  const first = nodes[firstIdx];
  if (!isValidElement<{ children?: ReactNode }>(first)) return null;

  const inner = Children.toArray(first.props.children);
  const lead = inner[0];
  if (typeof lead !== 'string' || !CALLOUT_RE.test(lead)) return null;

  const rest = lead.replace(CALLOUT_RE, '');
  const newInner = rest ? [rest, ...inner.slice(1)] : inner.slice(1);

  // Marker was the whole paragraph (`> [!NOTE]` on its own line) — drop the
  // now-empty <p> so the callout body starts at the real content.
  const replacement =
    newInner.length === 0 ? null : cloneElement(first, undefined, ...newInner);

  const out = [...nodes];
  if (replacement === null) out.splice(firstIdx, 1);
  else out[firstIdx] = replacement;
  return out;
}

// Heading ids are looked up from a map precomputed off the source, keyed by each
// heading's start offset, rather than counted as the headings render.
//
// Counting during render is what the previous version did, and it was wrong: React
// may invoke a component more than once per commit (StrictMode does exactly this in
// development), so every heading was counted twice against one rewind and came out
// with a spurious "-1" suffix — breaking every TOC anchor. Rewinding more often
// cannot fix that, because a render pass is not an observable boundary. A lookup
// has no such dependency: the same heading yields the same id however often it renders.
function makeHeadingFactory(headingIds: Map<number, string>, markerStyle: string) {
  const hideMarker = markerIsHidden(markerStyle);
  const heading = function heading(level: 1 | 2 | 3 | 4 | 5 | 6) {
    return function Heading({ children, node }: { children?: ReactNode; node?: HastElement }) {
      const offset = node?.position?.start.offset;
      const sourceId = offset !== undefined ? headingIds.get(offset) : undefined;
      const Tag = `h${level}` as const;

      // Headings a plugin synthesized rather than the author writing them have no
      // source position, so they are absent from the id map. remark-gfm's
      // visually-hidden "Footnotes" label is one: slugging it would mint a second
      // `id="footnotes"` colliding with a real heading of that name, and would put
      // a screen-reader-only label in the TOC. Leave the plugin's own id and
      // classes intact and skip data-toc so the TOC ignores it.
      if (sourceId === undefined) {
        const props = node?.properties ?? {};
        // hast stores className as an array of tokens, not a string — joining is
        // what preserves remark-gfm's `sr-only`, which is what keeps the label
        // visually hidden.
        const className = Array.isArray(props.className)
          ? props.className.join(' ')
          : typeof props.className === 'string'
            ? props.className
            : undefined;
        // Deliberately no headingStyle(): a synthesized label is not part of the
        // author's document outline, and applying the article's heading margins
        // and font-size to a visually-hidden element only fights the clipping.
        return (
          <Tag id={typeof props.id === 'string' ? props.id : undefined} className={className}>
            {children}
          </Tag>
        );
      }

      const id = sourceId;
      const markerLevel = !hideMarker && level !== 1 ? level : null;
      return (
        <Tag
          id={id}
          data-toc={id}
          // The marker is a flex item, so it indents the heading text by its
          // own width plus the gap. Kept in flow on purpose: a theme that turns
          // the marker on is accepting that offset, and hanging the glyph in the
          // margin instead would put it outside the column the reader's eye is
          // tracking. Themes that don't want the indent set
          // --heading-marker-style to `off` and get no glyph at all.
          //
          // Every marked level indents by the same em amount, so the indent
          // tracks each level's own font-size and h2 ends up stepped further in
          // than h6 — depth reads as a taper rather than as one flat offset.
          //
          // h2's borderBottom still spans the full row, marker included, so the
          // rule keeps starting at the article's left edge even though the text
          // above it does not.
          //
          // flex-start (not center) so the marker stays on the first line of a
          // heading that wraps to two lines instead of floating mid-block.
          style={{
            ...headingStyle(level),
            ...(markerLevel
              ? { display: 'flex', alignItems: 'flex-start', lineHeight: CHEVRON_LINE_HEIGHT }
              : {}),
          }}
        >
          {markerLevel && <HeadingMarker level={markerLevel} width="var(--heading-marker)" family={markerStyle} />}
          {children}
        </Tag>
      );
    };
  };
  return { heading };
}

function buildComponents(headingIds: Map<number, string>, markerStyle: string): Components {
  const { heading } = makeHeadingFactory(headingIds, markerStyle);
  const components: Components = {
    h1: heading(1),
    h2: heading(2),
    h3: heading(3),
    h4: heading(4),
    h5: heading(5),
    h6: heading(6),
    p: ({ children }) => <p style={{ margin: '0 0 1.15em' }}>{children}</p>,
    strong: ({ children }) => <strong style={{ fontWeight: 650 }}>{children}</strong>,
    del: ({ children }) => <del style={{ opacity: 0.65 }}>{children}</del>,
    hr: () => <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '2.2em 0' }} />,
    // Raw-HTML inline elements. Reachable only now that rehypeRaw is in the
    // chain; before this they were dropped before ever becoming nodes.
    kbd: ({ children }) => (
      <kbd
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.8em',
          lineHeight: 1,
          padding: '0.25em 0.5em',
          background: 'var(--badge-bg)',
          border: '1px solid var(--border)',
          // Bottom edge slightly heavier — the usual "physical keycap" cue.
          borderBottomWidth: 2,
          borderRadius: CHIP_RADIUS,
          ...CORNER_SHAPE,
          color: 'var(--fg)',
          whiteSpace: 'nowrap',
        }}
      >
        {children}
      </kbd>
    ),
    mark: ({ children }) => (
      <mark style={{ background: 'var(--hl)', color: 'inherit', padding: '0.08em 0.22em', borderRadius: MARK_RADIUS, ...CORNER_SHAPE }}>{children}</mark>
    ),
    details: ({ children, ...props }) => (
      <details
        open={(props as { open?: boolean }).open}
        style={{
          margin: '1.4em 0',
          padding: '0.7em 1.1em',
          background: 'var(--quote-bg)',
          border: '1px solid var(--border)',
          borderRadius: SURFACE_RADIUS,
          ...CORNER_SHAPE,
        }}
      >
        {children}
      </details>
    ),
    summary: ({ children }) => (
      <summary style={{ cursor: 'pointer', fontWeight: 650, color: 'var(--fg)' }}>{children}</summary>
    ),
    blockquote: ({ children, ...props }) => {
      const match = CALLOUT_RE.exec(reactNodeToText(children));

      // Two sources, marker first: an explicit `[!NOTE]` inside the quote wins
      // over the alt attribute when a document somehow carries both, so the
      // pre-existing GitHub syntax never changes meaning.
      const altRaw = (props as { alt?: unknown }).alt;
      const altKind = typeof altRaw === 'string' ? ALT_CALLOUTS[altRaw.trim().toLowerCase()] : undefined;
      const kind = match ? (match[1].toUpperCase() as keyof typeof CALLOUTS) : altKind;
      const callout = kind ? CALLOUTS[kind] : undefined;

      // Only the marker form needs stripping — the alt form keeps its body
      // verbatim because the marker never appears in the text.
      const body = callout && match ? stripCalloutMarker(children) : children;

      // stripCalloutMarker returns null when the marker isn't a plain leading
      // string it can safely remove — fall back to a normal blockquote rather
      // than rendering the raw "[!NOTE]" text or mangling the element tree.
      if (!callout || !kind || body === null) {
        return (
          <blockquote
            style={{
              margin: '1.4em 0',
              padding: '0.9em 1.3em',
              borderLeft: '4px solid var(--quote-accent)',
              background: 'var(--quote-bg)',
              // Left corners stay square regardless of the theme: the accent bar
              // is a flat 4px edge, and shaping the side it sits on — rounding
              // or beveling — would pull the fill away from it and leave a notch.
              // Zeroing the radius on that side also neutralizes --surface-corner
              // there, since a corner shape needs a radius to have anything to
              // reshape.
              borderRadius: `0 ${SURFACE_RADIUS} ${SURFACE_RADIUS} 0`,
              ...CORNER_SHAPE,
              color: 'var(--quote-fg)',
            }}
          >
            {children}
          </blockquote>
        );
      }

      return (
        <blockquote
          data-callout={kind}
          style={{
            margin: '1.4em 0',
            padding: '0.9em 1.3em',
            borderLeft: `4px solid ${callout.accent}`,
            background: callout.bg,
            // Left corners stay square regardless of the theme, as above: the
            // accent bar is a flat 4px edge that no corner shape should cut into.
            borderRadius: `0 ${SURFACE_RADIUS} ${SURFACE_RADIUS} 0`,
            ...CORNER_SHAPE,
            color: 'var(--quote-fg)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              marginBottom: '0.5em',
              color: callout.accent,
              fontSize: '0.78em',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '.07em',
            }}
          >
            <span aria-hidden="true">{callout.icon}</span>
            {callout.label}
          </div>
          {body}
        </blockquote>
      );
    },
    ul: ({ children, className }) => {
      const isTask = className?.includes('contains-task-list');
      return (
        <ul
          style={
            isTask
              ? { listStyle: 'none', padding: 0, margin: '0 0 1.15em', display: 'flex', flexDirection: 'column', gap: 8 }
              : { listStyle: 'disc', margin: '0 0 1.15em', paddingLeft: '1.4em' }
          }
        >
          {children}
        </ul>
      );
    },
    ol: ({ children }) => <ol style={{ listStyle: 'decimal', margin: '0 0 1.15em', paddingLeft: '1.4em' }}>{children}</ol>,
    // Same reason as the `a` renderer: footnote definitions are <li
    // id="user-content-fn-1">, the target of every [^1] reference.
    li: ({ children, className, id }) => {
      const isTask = className?.includes('task-list-item');
      if (isTask) {
        return <li id={id}>{children}</li>;
      }
      return (
        <li id={id} style={{ margin: '0 0 0.4em' }}>
          {children}
        </li>
      );
    },
    input: ({ checked }) => (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'flex-start',
          flex: 'none',
          width: 17,
          height: 17,
          marginTop: 3,
          marginRight: 10,
          borderRadius: CHIP_RADIUS,
          ...CORNER_SHAPE,
          boxSizing: 'border-box',
          ...(checked
            ? { background: 'var(--link)', color: '#fff', alignItems: 'center', justifyContent: 'center', fontSize: 11 }
            : { border: '1.5px solid var(--border)', background: 'var(--bg)' }),
        }}
      >
        {checked ? '✓' : ''}
      </span>
    ),
    code: ({ className, children }) => {
      // `includes`, not `startsWith`: rehype-highlight prepends its own `hljs`
      // class, so a fenced block arrives as "hljs language-js" and a
      // startsWith check would misroute it to the inline-code branch below.
      if (className?.includes('language-')) {
        return <CodeBlock className={className}>{children}</CodeBlock>;
      }
      return (
        <code
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.85em',
            background: 'var(--badge-bg)',
            border: '1px solid var(--border)',
            borderRadius: CHIP_RADIUS,
            ...CORNER_SHAPE,
            padding: '0.15em 0.4em',
          }}
        >
          {children}
        </code>
      );
    },
    pre: ({ children }) => <>{children}</>,
    // Wrapper and caption are spans set to display:block, not a div and a p.
    // Markdown always parses an image into a paragraph, so a block-level element
    // here produces `<p><div>…</div></p>`, which is invalid: the browser closes
    // the paragraph early and React logs a nesting error. A span is phrasing
    // content, so it nests legally while still laying out as a block.
    img: ({ src, alt }) => (
      <span style={{ display: 'block', margin: '1.6em 0' }}>
        <MarkdownImage src={typeof src === 'string' ? src : undefined} alt={alt} />
        {alt && (
          <span
            style={{
              display: 'block',
              textAlign: 'center',
              fontSize: '0.78em',
              color: 'var(--muted)',
              margin: '0.7em 0 0',
            }}
          >
            {alt}
          </span>
        )}
      </span>
    ),
    // Two nested wrappers, and both are load-bearing:
    //
    //   outer (data-table-frame) — carries the rounded border and clips to it.
    //   inner (data-table-wrap)  — the scroll port.
    //
    // They cannot be merged. `overflow: hidden` is what makes a radius actually
    // cut the square corners of the table inside it, but `hidden` and `auto`
    // are mutually exclusive on the same axis, and the inner element needs
    // `auto` on both: X for wide tables, Y so the sticky header below has a
    // scrolling ancestor to pin against. Capping at viewport height means short
    // tables never scroll internally and only long ones do.
    //
    // The border lives on the frame rather than on the table's own edge cells,
    // so `--table-style` can drop the interior rules without also erasing the
    // outline — the two are separate decisions.
    table: ({ children }) => {
      // Auto right-alignment for numeric columns (see tableAlign.ts for what
      // counts as one). Emitted as a data attribute rather than an inline style
      // on each cell because the alignment has to reach *every* cell in the
      // column, header included, and a td component cannot know its own index —
      // whereas `:nth-child` in CSS gets it from the DOM for free. This mirrors
      // how --table-style and zebra striping are already handled.
      //
      // The generated selectors are scoped by this attribute, so a column that
      // remark-gfm already aligned explicitly keeps its inline textAlign: an
      // inline style beats a stylesheet rule regardless of specificity.
      const numeric = bodyColumnTexts(children)
        .map((cells, i) => (isNumericColumn(cells) ? i + 1 : 0))
        .filter((n) => n > 0);
      return (
        <div
          data-table-frame=""
          data-numeric-cols={numeric.length ? numeric.join(' ') : undefined}
          style={{
            margin: '1.4em 0',
            border: 'var(--table-border-width) solid var(--table-border)',
            // Size from --table-radius, which stays independent (a theme can want
            // a square data grid inside a rounded article), but shape from the
            // shared --surface-corner: whether corners are cut or curved is one
            // statement about the design, and a rounded table in a beveled
            // article would read as two languages on one page.
            borderRadius: 'var(--table-radius)',
            ...CORNER_SHAPE,
            overflow: 'hidden',
          }}
        >
          <div
            data-table-wrap=""
            style={{
              overflowX: 'auto',
              overflowY: 'auto',
              maxHeight: '82vh',
              background:
                'linear-gradient(90deg,var(--bg) 33%,transparent) left/28px 100% no-repeat local,' +
                'linear-gradient(270deg,var(--bg) 33%,transparent) right/28px 100% no-repeat local,' +
                'linear-gradient(90deg,var(--edge-shadow),transparent) left/12px 100% no-repeat scroll,' +
                'linear-gradient(270deg,var(--edge-shadow),transparent) right/12px 100% no-repeat scroll',
            }}
          >
            <table
              style={{
                width: 'max-content',
                minWidth: '100%',
                borderCollapse: 'collapse',
                fontSize: 'var(--table-font-size)',
              }}
            >
              {children}
            </table>
          </div>
        </div>
      );
    },
    // No `whiteSpace: nowrap` on cells. Forcing every cell onto one line made
    // any table with prose in it — especially Vietnamese, where words are
    // multi-syllable and diacritics widen the run — stretch far past the
    // viewport and rely on horizontal scrolling to read at all. Cells now wrap
    // naturally; the wrapper below still scrolls for genuinely wide tables.
    //
    // `style` is spread from the node rather than dropped: remark-gfm encodes a
    // column's alignment row (`:---`, `:---:`, `---:`) as a textAlign on every
    // cell in that column, so discarding it silently threw away the one piece of
    // table formatting Markdown can express. It is spread last so an explicit
    // alignment wins over the left default.
    // Cell rules are not set here. Which edges a cell draws depends on
    // --table-style, and an inline style cannot branch on a CSS variable — so
    // the borders live in index.css under `article[data-table-style]`, where a
    // selector can. Padding stays inline: it is unconditional.
    //
    // The left-alignment default is *also* in CSS now, and it has to be. As an
    // inline style it beat the numeric-column rule at any specificity, so the
    // header label stayed left while its own numbers were right-aligned under
    // it. Inline is now reserved for alignment the author wrote explicitly,
    // which is precisely the thing that should outrank the auto-detection.
    th: ({ children, style }) => (
      <th
        style={{
          padding: 'var(--table-cell-pad-y) var(--table-cell-pad-x)',
          background: 'var(--table-header-bg)',
          color: 'var(--table-header-fg)',
          fontWeight: 650,
          // Pins the header row while the body scrolls under it. The background
          // above is not optional once this is set — a transparent sticky header
          // would let the scrolled rows show through it.
          position: 'sticky',
          top: 0,
          zIndex: 1,
          ...style,
        }}
      >
        {children}
      </th>
    ),
    // Zebra striping and row hover are done in index.css via `tbody tr:nth-child`
    // and `:hover` rather than here: an inline style would need a row index this
    // component cannot see and cannot express a pseudo-class at all, while CSS
    // gets both from the DOM for free.
    tr: ({ children }) => <tr>{children}</tr>,
    td: ({ children, style }) => (
      <td style={{ padding: 'var(--table-cell-pad-y) var(--table-cell-pad-x)', ...style }}>
        {children}
      </td>
    ),
    sup: ({ children }) => <sup>{children}</sup>,
    section: ({ children, className, ...rest }) => {
      if (className !== 'footnotes') {
        return (
          <section className={className} {...rest}>
            {children}
          </section>
        );
      }
      return (
        <div style={{ margin: '2.6em 0 0', paddingTop: '1.1em', borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>
            Footnotes
          </div>
          <div style={{ margin: 0, paddingLeft: '1.3em', fontSize: '0.82em', color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {children}
          </div>
        </div>
      );
    },
    // `id` must be forwarded, not dropped: remark-gfm emits the footnote
    // reference as <a id="user-content-fnref-1">, and that id is the anchor the
    // backref link jumps back to. Without it the ↩ button scrolls nowhere.
    a: ({ href, children, className, id }) => {
      if (className === 'data-footnote-backref') {
        return (
          <a href={href} id={id} style={{ fontSize: '0.9em' }}>
            ↩
          </a>
        );
      }
      return (
        <a href={href} id={id} style={{ color: 'var(--link)' }}>
          {children}
        </a>
      );
    },
  };
  return components;
}

// Module-level so the array keeps a stable identity across renders — a fresh
// array each render makes ReactMarkdown rebuild its unified processor every
// time.
//
// The order is load-bearing:
//   1. rehypeRaw     — parses author-written raw HTML into real hast nodes.
//                      Must run first; nothing downstream can see raw HTML.
//   2. rehypeSanitize — drops everything not on the allowlist. Must run
//                      immediately after raw and BEFORE the two plugins below,
//                      because those generate markup we trust and want kept.
//                      Sanitizing last would delete the hljs classes and KaTeX
//                      spans they just produced.
//   3. rehypeHighlight — adds hljs-* classes to fenced code.
//
// `detect: false` keeps highlighting opt-in per fence: without a language tag
// highlight.js guesses, and a wrong guess paints prose-like blocks in scattered
// keyword colors. An unregistered language (```vue) is not a hazard here —
// rehype-highlight v7 records it as a vfile message and leaves the block
// unstyled rather than throwing.
const REHYPE_PLUGINS: PluggableList = [
  rehypeRaw,
  [rehypeSanitize, sanitizeSchema],
  [rehypeHighlight, { detect: false }],
];

const REMARK_PLUGINS: PluggableList = [remarkGfm];

interface MathPlugins {
  remark: PluggableList;
  rehype: PluggableList;
}

// Loads remark-math, rehype-katex and KaTeX's stylesheet only for documents
// that actually contain math, mirroring how MermaidBlock defers `mermaid`.
// Skipping this saves ~1.2MB of KaTeX web fonts on every math-free document.
//
// The module cache makes repeat calls cheap, so a reader flipping between
// several math documents pays the download once per session.
let mathPluginsPromise: Promise<MathPlugins> | null = null;

function loadMathPlugins(): Promise<MathPlugins> {
  mathPluginsPromise ??= Promise.all([
    import('remark-math'),
    import('rehype-katex'),
    import('katex/dist/katex.min.css'),
  ]).then(([remarkMath, rehypeKatex]) => ({
    remark: [[remarkMath.default, MATH_OPTIONS]] as PluggableList,
    rehype: [rehypeKatex.default] as PluggableList,
  }));
  return mathPluginsPromise;
}

function useMathPlugins(source: string): MathPlugins | null {
  const needsMath = useMemo(() => hasMath(source), [source]);
  const [plugins, setPlugins] = useState<MathPlugins | null>(null);

  useEffect(() => {
    if (!needsMath) return;
    let cancelled = false;
    loadMathPlugins().then(
      (loaded) => {
        if (!cancelled) setPlugins(loaded);
      },
      // A failed chunk fetch (offline, blocked CDN) must not blank the article —
      // the document still renders, just with the math left as literal text.
      () => {},
    );
    return () => {
      cancelled = true;
    };
  }, [needsMath]);

  return needsMath ? plugins : null;
}

export function Article({ source, padding }: ArticleProps) {
  // Read as a value, not left to CSS: the marker style decides whether the
  // chevron element is rendered at all, and `display: none` on a themeable glyph
  // would still cost a DOM node per heading in long documents. The glyph's width
  // stays in CSS — only the on/off choice has to be visible to JS.
  const markerStyle = useHeadingMarkerStyle();
  const components = useMemo(
    () => buildComponents(buildHeadingIds(source), markerStyle),
    [source, markerStyle],
  );

  // Mirrored onto an attribute below because CSS can match `[data-table-style]`
  // but cannot select on the value of `var(--table-style)`.
  const tableStyle = useTableStyle();

  // Null until (and unless) the document needs math and the chunk has arrived.
  // Before then the document renders normally with the formulas as plain text,
  // then re-renders once with them typeset.
  const math = useMathPlugins(source);

  const remarkPlugins = useMemo(
    () => (math ? [...REMARK_PLUGINS, ...math.remark] : REMARK_PLUGINS),
    [math],
  );
  // rehype-katex is appended last, after sanitize, so the spans and MathML it
  // produces are never stripped. Its input comes from remark-math, which has
  // already turned the formulas into dedicated nodes upstream of the raw-HTML
  // parse, so appending here does not widen what raw HTML can do.
  const rehypePlugins = useMemo(
    () => (math ? [...REHYPE_PLUGINS, ...math.rehype] : REHYPE_PLUGINS),
    [math],
  );
  return (
    <article
      data-table-style={tableStyle}
      style={{
        width: '100%',
        maxWidth: 'var(--cw)',
        margin: '0 auto',
        boxSizing: 'border-box',
        padding,
        fontFamily: 'var(--font-body)',
        fontSize: 'var(--fs)',
        lineHeight: 'var(--lh, 1.7)',
        color: 'var(--body-fg)',
        // Break only where a break is legal (never mid-syllable), but allow an
        // unbroken run with no break opportunity — a long URL or path — to wrap
        // rather than push the article into horizontal scroll.
        wordBreak: 'normal',
        overflowWrap: 'break-word',
      }}
    >
      <ReactMarkdown remarkPlugins={remarkPlugins} rehypePlugins={rehypePlugins} components={components}>
        {source}
      </ReactMarkdown>
    </article>
  );
}
