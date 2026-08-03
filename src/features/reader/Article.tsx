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
import { buildHeadingIds } from './pipeline/parse';

interface ArticleProps {
  source: string;
  padding: string;
}

const headingStyle = (level: 1 | 2 | 3 | 4 | 5 | 6): React.CSSProperties => {
  switch (level) {
    case 1:
      return { fontSize: '2.1em', lineHeight: 1.25, fontWeight: 700, letterSpacing: '-0.02em', margin: '0.6em 0 0.5em' };
    case 2:
      return {
        fontSize: '1.5em',
        fontWeight: 650,
        letterSpacing: '-0.015em',
        margin: '1.8em 0 0.7em',
        paddingBottom: '0.35em',
        borderBottom: '1px solid var(--heading-rule)',
      };
    case 3:
      return { fontSize: '1.18em', fontWeight: 650, margin: '1.5em 0 0.6em' };
    case 4:
      return { fontSize: '1.02em', fontWeight: 650, margin: '1.3em 0 0.5em' };
    case 5:
      return { fontSize: '0.92em', fontWeight: 650, letterSpacing: '.01em', margin: '1.2em 0 0.4em' };
    case 6:
      return {
        fontSize: '0.8em',
        fontWeight: 600,
        color: 'var(--muted)',
        textTransform: 'uppercase',
        letterSpacing: '.06em',
        margin: '1.2em 0 0.4em',
      };
  }
};

// Headings carrying a chevron pin their own line-height rather than inheriting
// the article's 1.7, both to tighten multi-line headings and to give the glyph
// a known line box to center against.
const CHEVRON_LINE_HEIGHT = 1.35;

// Two-tone angled chevron rendered before h2/h3. Inline SVG rather than a
// ::before pseudo-element because markdown styling here is entirely inline
// style objects — a pseudo-element would have to live in index.css, splitting
// article styling across two mechanisms — and two tones need two fills.
function HeadingChevron() {
  return (
    <svg
      viewBox="0 0 10 14"
      aria-hidden="true"
      focusable="false"
      // Sized in em so the glyph tracks the heading's font-size. Centering it on
      // the first line box is what keeps it aligned when the heading wraps: the
      // line box is CHEVRON_LINE_HEIGHT em tall, the glyph 0.72em, so half the
      // difference centers it — independent of heading level or letter case.
      style={{
        flex: 'none',
        width: '0.52em',
        height: '0.72em',
        marginRight: '0.42em',
        marginTop: `calc((${CHEVRON_LINE_HEIGHT}em - 0.72em) / 2)`,
      }}
    >
      <path d="M0 0 L5 7 L0 14 Z" fill="var(--heading-accent)" />
      <path d="M5 0 L10 7 L5 14 Z" fill="var(--heading-accent-soft)" />
    </svg>
  );
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

function textOf(node: ReactNode): string {
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (node && typeof node === 'object' && 'props' in node) {
    return textOf((node as { props: { children?: ReactNode } }).props.children);
  }
  return '';
}

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
function makeHeadingFactory(headingIds: Map<number, string>) {
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
      const showChevron = level === 2 || level === 3;
      return (
        <Tag
          id={id}
          data-toc={id}
          // flex-start (not center) so the chevron stays on the first line of a
          // heading that wraps to two lines instead of floating mid-block.
          style={{
            ...headingStyle(level),
            ...(showChevron
              ? { display: 'flex', alignItems: 'flex-start', lineHeight: CHEVRON_LINE_HEIGHT }
              : {}),
          }}
        >
          {showChevron && <HeadingChevron />}
          {children}
        </Tag>
      );
    };
  };
  return { heading };
}

function buildComponents(headingIds: Map<number, string>): Components {
  const { heading } = makeHeadingFactory(headingIds);
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
          borderRadius: 5,
          color: 'var(--fg)',
          whiteSpace: 'nowrap',
        }}
      >
        {children}
      </kbd>
    ),
    mark: ({ children }) => (
      <mark style={{ background: 'var(--hl)', color: 'inherit', padding: '0.08em 0.22em', borderRadius: 3 }}>{children}</mark>
    ),
    details: ({ children, ...props }) => (
      <details
        open={(props as { open?: boolean }).open}
        style={{
          margin: '1.4em 0',
          padding: '0.7em 1.1em',
          background: 'var(--quote-bg)',
          border: '1px solid var(--border)',
          borderRadius: 8,
        }}
      >
        {children}
      </details>
    ),
    summary: ({ children }) => (
      <summary style={{ cursor: 'pointer', fontWeight: 650, color: 'var(--fg)' }}>{children}</summary>
    ),
    blockquote: ({ children, ...props }) => {
      const match = CALLOUT_RE.exec(textOf(children));

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
              borderRadius: '0 8px 8px 0',
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
            borderRadius: '0 8px 8px 0',
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
    li: ({ children, className }) => {
      const isTask = className?.includes('task-list-item');
      if (isTask) {
        return <li>{children}</li>;
      }
      return <li style={{ margin: '0 0 0.4em' }}>{children}</li>;
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
          borderRadius: 4,
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
            borderRadius: 5,
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
    table: ({ children }) => (
      <div
        style={{
          overflowX: 'auto',
          margin: '1.4em 0',
          background:
            'linear-gradient(90deg,var(--bg) 33%,transparent) left/28px 100% no-repeat local,' +
            'linear-gradient(270deg,var(--bg) 33%,transparent) right/28px 100% no-repeat local,' +
            'linear-gradient(90deg,var(--edge-shadow),transparent) left/12px 100% no-repeat scroll,' +
            'linear-gradient(270deg,var(--edge-shadow),transparent) right/12px 100% no-repeat scroll',
        }}
      >
        <table style={{ width: 'max-content', minWidth: '100%', borderCollapse: 'collapse', fontSize: '0.88em' }}>{children}</table>
      </div>
    ),
    // No `whiteSpace: nowrap` on cells. Forcing every cell onto one line made
    // any table with prose in it — especially Vietnamese, where words are
    // multi-syllable and diacritics widen the run — stretch far past the
    // viewport and rely on horizontal scrolling to read at all. Cells now wrap
    // naturally; the wrapper below still scrolls for genuinely wide tables.
    th: ({ children }) => (
      <th
        style={{
          textAlign: 'left',
          padding: '9px 14px',
          border: '1px solid var(--border)',
          background: 'var(--table-header-bg)',
          fontWeight: 650,
        }}
      >
        {children}
      </th>
    ),
    // Zebra striping is done in index.css via `tbody tr:nth-child(even)` rather
    // than here: an inline style would need a row index this component cannot
    // see, while :nth-child gets it from the DOM for free.
    tr: ({ children }) => <tr>{children}</tr>,
    td: ({ children }) => <td style={{ padding: '9px 14px', border: '1px solid var(--border)' }}>{children}</td>,
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
    a: ({ href, children, className }) => {
      if (className === 'data-footnote-backref') {
        return (
          <a href={href} style={{ fontSize: '0.9em' }}>
            ↩
          </a>
        );
      }
      return (
        <a href={href} style={{ color: 'var(--link)' }}>
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
// keyword colors. `ignoreMissing` stops an unknown tag (```vue) from throwing
// mid-render.
const REHYPE_PLUGINS: PluggableList = [
  rehypeRaw,
  [rehypeSanitize, sanitizeSchema],
  [rehypeHighlight, { detect: false, ignoreMissing: true }],
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
  const components = useMemo(() => buildComponents(buildHeadingIds(source)), [source]);

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
      style={{
        width: '100%',
        maxWidth: 'var(--cw)',
        margin: '0 auto',
        boxSizing: 'border-box',
        padding,
        fontFamily: 'var(--font-body)',
        fontSize: 'var(--fs)',
        lineHeight: 'var(--lh, 1.7)',
        color: 'var(--fg)',
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
