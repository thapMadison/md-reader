import { useState, type ReactNode } from 'react';
import { MermaidBlock } from './MermaidBlock';

interface CodeBlockProps {
  className?: string;
  children: ReactNode;
}

function extractText(node: ReactNode): string {
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (node && typeof node === 'object' && 'props' in node) {
    return extractText((node as { props: { children?: ReactNode } }).props.children);
  }
  return '';
}

export function CodeBlock({ className, children }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [hovered, setHovered] = useState(false);
  const lang = /language-(\w+)/.exec(className ?? '')?.[1] ?? 'text';
  const code = extractText(children);

  if (lang === 'mermaid') {
    return <MermaidBlock source={code} />;
  }

  const handleCopy = () => {
    navigator.clipboard?.writeText(code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      data-codeblock
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setCopied(false);
      }}
      style={{ margin: '1.4em 0', background: 'var(--code-bg)', border: '1px solid var(--border)', borderRadius: 9, overflow: 'hidden' }}
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
            border: '1px solid var(--border)',
            borderRadius: 5,
            background: 'var(--bg)',
            color: 'var(--fg)',
            cursor: 'pointer',
          }}
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre style={{ margin: 0, padding: '16px 18px', overflowX: 'auto', fontFamily: 'var(--font-mono)', fontSize: '0.78em', lineHeight: 1.65 }}>
        <code className={className}>{children}</code>
      </pre>
    </div>
  );
}
