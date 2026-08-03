import { useRef } from 'react';
import type { LayoutMode } from '@/hooks/useBreakpoint';

interface EditorPaneProps {
  mode: LayoutMode;
  source: string;
  editorWidth: number;
  resizing: boolean;
  onChange: (value: string) => void;
  onRevert: () => void;
  onStartResize: (startX: number, startWidth: number) => void;
}

export function EditorPane({ mode, source, editorWidth, resizing, onChange, onRevert, onStartResize }: EditorPaneProps) {
  const isMobile = mode === 'mobile';
  const taRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const el = e.currentTarget;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const next = `${el.value.slice(0, start)}  ${el.value.slice(end)}`;
      onChange(next);
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = start + 2;
      });
    }
  };

  return (
    <>
      <section
        data-editor="true"
        style={{
          flex: isMobile ? '1 1 auto' : `0 0 ${editorWidth}px`,
          minWidth: 220,
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--chrome)',
          color: 'var(--chrome-fg)',
          transition: 'background .25s',
        }}
      >
        <div style={{ flex: '0 0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px', borderBottom: '1px solid var(--chrome-border)' }}>
          <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--chrome-muted)', textTransform: 'uppercase', letterSpacing: '.07em' }}>
            Markdown source
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 10.5, color: 'var(--chrome-muted)', fontFamily: 'var(--font-mono)' }}>{source.length.toLocaleString()} chars</span>
            <button
              onClick={onRevert}
              style={{
                height: 20,
                padding: '0 8px',
                fontSize: 10.5,
                fontFamily: 'var(--font-ui)',
                border: '1px solid var(--chrome-border)',
                borderRadius: 5,
                background: 'transparent',
                color: 'var(--chrome-muted)',
                cursor: 'pointer',
              }}
            >
              Revert
            </button>
          </div>
        </div>
        <textarea
          ref={taRef}
          value={source}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          style={{
            flex: 1,
            minHeight: 0,
            width: '100%',
            boxSizing: 'border-box',
            resize: 'none',
            border: 'none',
            outline: 'none',
            background: 'transparent',
            color: 'var(--chrome-fg)',
            fontFamily: 'var(--font-mono)',
            fontSize: 13,
            lineHeight: 1.75,
            padding: '20px 22px',
            tabSize: 2,
          }}
        />
      </section>
      {!isMobile && (
        <div
          onMouseDown={(e) => {
            e.preventDefault();
            onStartResize(e.clientX, editorWidth);
          }}
          style={{ flex: '0 0 5px', width: 5, cursor: 'col-resize', background: resizing ? 'var(--link)' : 'var(--chrome-border)' }}
        />
      )}
    </>
  );
}
