import { useEffect, useId, useRef, useState } from 'react';

interface MermaidBlockProps {
  source: string;
}

const DIAGRAM_TYPE_RE = /^(graph|flowchart|sequenceDiagram|stateDiagram|erDiagram|gantt|pie)\b/;

export function MermaidBlock({ source }: MermaidBlockProps) {
  const id = useId().replace(/:/g, '-');
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [svg, setSvg] = useState<string | null>(null);

  const head = (source.trim().split('\n')[0] ?? '').trim();
  const looksValid = DIAGRAM_TYPE_RE.test(head);
  const invalidTypeError = looksValid
    ? null
    : `line 1: unknown diagram type "${head.split(/\s/)[0] || '(empty)'}"`;

  useEffect(() => {
    if (!looksValid) {
      return;
    }
    let cancelled = false;
    import('mermaid').then(async ({ default: mermaid }) => {
      try {
        mermaid.initialize({ startOnLoad: false, securityLevel: 'strict' });
        const { svg: rendered } = await mermaid.render(`mermaid-${id}`, source);
        if (!cancelled) {
          setSvg(rendered);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(`line 1: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, [source, looksValid, id]);

  const displayError = invalidTypeError ?? error;

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
