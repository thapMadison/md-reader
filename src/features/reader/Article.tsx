import { useMemo, type ReactNode } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CodeBlock } from './CodeBlock';
import { MarkdownImage } from './MarkdownImage';
import { slugify } from './pipeline/headings';

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
        borderBottom: '1px solid var(--border)',
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

function textOf(node: ReactNode): string {
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (node && typeof node === 'object' && 'props' in node) {
    return textOf((node as { props: { children?: ReactNode } }).props.children);
  }
  return '';
}

function makeHeadingFactory() {
  let used: Record<string, number> = {};
  let isFirst = true;
  // ReactMarkdown re-invokes these components on every re-render of the same
  // document (e.g. scroll-driven state changes elsewhere in the tree), not just
  // once per parse — so the dedup counters must be rewound before each render
  // pass, or ids drift upward every render and stop matching the TOC's cached ids.
  const reset = () => {
    used = {};
    isFirst = true;
  };
  const heading = function heading(level: 1 | 2 | 3 | 4 | 5 | 6) {
    return function Heading({ children }: { children?: ReactNode }) {
      const text = textOf(children);
      let id = isFirst && level === 1 ? 'top' : slugify(text);
      isFirst = false;
      if (used[id] !== undefined) {
        used[id] += 1;
        id = `${id}-${used[id]}`;
      } else {
        used[id] = 0;
      }
      const Tag = `h${level}` as const;
      return (
        <Tag id={id} data-toc={id} style={headingStyle(level)}>
          {children}
        </Tag>
      );
    };
  };
  return { heading, reset };
}

function buildComponents(): { components: Components; resetHeadingIds: () => void } {
  const { heading, reset } = makeHeadingFactory();
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
    blockquote: ({ children }) => (
      <blockquote
        style={{
          margin: '1.4em 0',
          padding: '0.8em 1.2em',
          borderLeft: '3px solid var(--link)',
          background: 'var(--quote-bg)',
          borderRadius: '0 8px 8px 0',
        }}
      >
        {children}
      </blockquote>
    ),
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
      if (className?.startsWith('language-')) {
        return <CodeBlock className={className}>{children}</CodeBlock>;
      }
      return (
        <code
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.85em',
            background: 'var(--code-bg)',
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
    img: ({ src, alt }) => (
      <div style={{ margin: '1.6em 0' }}>
        <MarkdownImage src={typeof src === 'string' ? src : undefined} alt={alt} />
        {alt && <p style={{ textAlign: 'center', fontSize: '0.78em', color: 'var(--muted)', margin: '0.7em 0 0' }}>{alt}</p>}
      </div>
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
    th: ({ children }) => (
      <th style={{ textAlign: 'left', padding: '9px 14px', border: '1px solid var(--border)', background: 'var(--code-bg)', fontWeight: 650, whiteSpace: 'nowrap' }}>
        {children}
      </th>
    ),
    tr: ({ children }) => <tr>{children}</tr>,
    td: ({ children }) => <td style={{ padding: '9px 14px', border: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{children}</td>,
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
  return { components, resetHeadingIds: reset };
}

export function Article({ source, padding }: ArticleProps) {
  // eslint-disable-next-line react-hooks/exhaustive-deps -- recreate per document so heading-id dedup state resets
  const { components, resetHeadingIds } = useMemo(() => buildComponents(), [source]);
  // Rewind the dedup counters before every render pass (not just when source
  // changes) — ReactMarkdown re-invokes heading components on any re-render,
  // and without this the generated ids drift on each one.
  resetHeadingIds();

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
        lineHeight: 1.7,
        color: 'var(--fg)',
      }}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {source}
      </ReactMarkdown>
    </article>
  );
}
