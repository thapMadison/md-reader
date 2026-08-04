import { useEffect, useId, useRef, useState } from 'react';

interface MermaidBlockProps {
  source: string;
}

export function MermaidBlock({ source }: MermaidBlockProps) {
  const id = useId().replace(/:/g, '-');
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [svg, setSvg] = useState<string | null>(null);

  const isEmpty = source.trim() === '';

  // Diagram types are NOT pre-screened against a local list. Mermaid ships new
  // ones every few releases (mindmap, timeline, gitGraph, classDiagram…), so any
  // list kept here drifts into rejecting valid input — mermaid's own parser is
  // the only authority that stays current, and its error message is better than
  // one we could synthesize anyway.
  useEffect(() => {
    if (isEmpty) return;
    let cancelled = false;
    import('mermaid')
      .then(async ({ default: mermaid }) => {
        mermaid.initialize({ startOnLoad: false, securityLevel: 'strict' });
        const { svg: rendered } = await mermaid.render(`mermaid-${id}`, source);
        if (!cancelled) {
          setSvg(rendered);
          setError(null);
        }
      })
      // Covers both a failed chunk fetch (offline) and a parse error. Without a
      // rejection handler the former left an empty bordered box on screen for
      // good, with the reason only visible in the console.
      .catch((err: unknown) => {
        if (!cancelled) {
          setSvg(null);
          setError(err instanceof Error ? err.message : String(err));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [source, isEmpty, id]);

  const displayError = isEmpty ? 'empty diagram' : error;

  if (displayError) {
    return (
      <div style={{ position: 'relative', margin: '1.4em 0', border: '1px solid var(--danger)', background: 'var(--danger-bg)', borderRadius: 9, padding: '14px 16px' }}>
        <span style={{ position: 'absolute', top: 8, right: 10, fontSize: 10.5, fontFamily: 'var(--font-mono)', color: 'var(--muted)', letterSpacing: '.03em' }}>
          mermaid
        </span>
        <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--danger)', marginBottom: 5 }}>Mermaid syntax error</div>
        <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--danger)', lineHeight: 1.5 }}>{displayError}</div>
        <pre
          style={{
            margin: '8px 0 0',
            padding: '10px 12px',
            background: 'var(--code-bg)',
            border: '1px solid var(--border)',
            borderRadius: 7,
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            lineHeight: 1.6,
            color: 'var(--muted)',
            overflowX: 'auto',
          }}
        >
          {source}
        </pre>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', margin: '1.4em 0', border: '1px solid var(--border)', background: 'var(--bg)', borderRadius: 9, padding: '24px 20px' }}>
      <span style={{ position: 'absolute', top: 8, right: 10, fontSize: 10.5, fontFamily: 'var(--font-mono)', color: 'var(--muted)', letterSpacing: '.03em' }}>
        mermaid
      </span>
      <div
        ref={containerRef}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}
        dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
      />
    </div>
  );
}
