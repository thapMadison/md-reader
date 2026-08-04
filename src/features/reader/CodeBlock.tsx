import { useState, type ReactNode } from 'react';
import { MermaidBlock } from './MermaidBlock';
import { reactNodeToText } from './reactText';
import { CARD_RADIUS, CHIP_RADIUS, CORNER_SHAPE } from './radius';

interface CodeBlockProps {
  className?: string;
  children: ReactNode;
}

export function CodeBlock({ className, children }: CodeBlockProps) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');
  const [hovered, setHovered] = useState(false);
  const copied = copyState !== 'idle';
  const lang = /language-(\w+)/.exec(className ?? '')?.[1] ?? 'text';
  const code = reactNodeToText(children);

  if (lang === 'mermaid') {
    return <MermaidBlock source={code} />;
  }

  // "Copied!" is shown only once the write actually resolves. Setting it
  // eagerly claimed success even when the clipboard write was rejected — which
  // it is on any non-secure origin, and whenever the document lacks focus.
  const handleCopy = () => {
    const write = navigator.clipboard?.writeText(code);
    if (!write) {
      setCopyState('error');
      setTimeout(() => setCopyState('idle'), 1500);
      return;
    }
    write.then(
      () => {
        setCopyState('copied');
        setTimeout(() => setCopyState('idle'), 1500);
      },
      () => {
        setCopyState('error');
        setTimeout(() => setCopyState('idle'), 1500);
      },
    );
  };

  return (
    <div
      data-codeblock
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setCopyState('idle');
      }}
      style={{ margin: '1.4em 0', background: 'var(--code-bg)', border: '1px solid var(--border)', borderRadius: CARD_RADIUS, ...CORNER_SHAPE, overflow: 'hidden' }}
    >
      {/* Header strip is a sibling of <pre>, so it stays put when code scrolls horizontally. */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          padding: '6px 10px 6px 14px',
          background: 'var(--code-header-bg)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontFamily: 'var(--font-mono)',
            color: 'var(--code-header-fg)',
            textTransform: 'uppercase',
            letterSpacing: '.08em',
            fontWeight: 600,
          }}
        >
          {lang}
        </span>
        <button
          data-copy
          onClick={handleCopy}
          style={{
            opacity: hovered || copied ? 1 : 0,
            transition: 'opacity .15s',
            height: 21,
            padding: '0 8px',
            fontSize: 10.5,
            fontFamily: 'var(--font-ui)',
            border: `1px solid ${copyState === 'error' ? 'var(--danger)' : 'var(--border)'}`,
            borderRadius: CHIP_RADIUS,
            ...CORNER_SHAPE,
            background: 'var(--bg)',
            color: copyState === 'error' ? 'var(--danger)' : 'var(--fg)',
            cursor: 'pointer',
          }}
        >
          {copyState === 'copied' ? 'Copied!' : copyState === 'error' ? 'Copy failed' : 'Copy'}
        </button>
      </div>
      <pre style={{ margin: 0, padding: '16px 18px', overflowX: 'auto', fontFamily: 'var(--font-mono)', fontSize: '0.78em', lineHeight: 1.65 }}>
        <code className={className}>{children}</code>
      </pre>
    </div>
  );
}
