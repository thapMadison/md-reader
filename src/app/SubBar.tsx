import { ChevronDownIcon } from '@/components/ui/icons';
import type { TocEntry } from '@/features/toc/types';

interface SubBarProps {
  editing: boolean;
  mobileTab: 'source' | 'preview';
  onShowSourceTab: () => void;
  onShowPreviewTab: () => void;
  showTocDropdown: boolean;
  activeTocLabel: string;
  tocSheetOpen: boolean;
  onToggleTocSheet: () => void;
  toc: TocEntry[];
  activeTocId: string | null;
  onTocSelect: (id: string) => void;
}

export function SubBar({
  editing,
  mobileTab,
  onShowSourceTab,
  onShowPreviewTab,
  showTocDropdown,
  activeTocLabel,
  tocSheetOpen,
  onToggleTocSheet,
  toc,
  activeTocId,
  onTocSelect,
}: SubBarProps) {
  return (
    <div data-subbar="true" style={{ flex: 'none', background: 'var(--chrome)', color: 'var(--chrome-fg)', borderBottom: '1px solid var(--chrome-border)', zIndex: 28 }}>
      <div style={{ height: 36, display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px' }}>
        {editing && (
          <div style={{ display: 'flex', gap: 2, padding: 2, background: 'transparent', border: '1px solid var(--chrome-border)', borderRadius: 7 }}>
            <button
              onClick={onShowSourceTab}
              style={{
                height: 22,
                padding: '0 12px',
                border: 'none',
                borderRadius: 5,
                fontSize: 11.5,
                fontWeight: 600,
                fontFamily: 'var(--font-ui)',
                cursor: 'pointer',
                background: mobileTab === 'source' ? 'var(--chrome-hl)' : 'transparent',
                color: mobileTab === 'source' ? 'var(--chrome-fg)' : 'var(--chrome-muted)',
              }}
            >
              Source
            </button>
            <button
              onClick={onShowPreviewTab}
              style={{
                height: 22,
                padding: '0 12px',
                border: 'none',
                borderRadius: 5,
                fontSize: 11.5,
                fontWeight: 600,
                fontFamily: 'var(--font-ui)',
                cursor: 'pointer',
                background: mobileTab === 'preview' ? 'var(--chrome-hl)' : 'transparent',
                color: mobileTab === 'preview' ? 'var(--chrome-fg)' : 'var(--chrome-muted)',
              }}
            >
              Preview
            </button>
          </div>
        )}
        {showTocDropdown && (
          <button
            onClick={onToggleTocSheet}
            style={{
              flex: 1,
              minWidth: 0,
              height: 26,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              padding: '0 10px',
              border: '1px solid var(--chrome-border)',
              borderRadius: 7,
              background: 'transparent',
              color: 'var(--chrome-muted)',
              fontSize: 11.5,
              fontFamily: 'var(--font-ui)',
              cursor: 'pointer',
            }}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>On this page — {activeTocLabel}</span>
            <ChevronDownIcon />
          </button>
        )}
      </div>
      {tocSheetOpen && (
        <div style={{ maxHeight: 240, overflowY: 'auto', borderTop: '1px solid var(--chrome-border)', padding: '6px 12px 10px', background: 'var(--chrome)' }}>
          {toc.map((t) => {
            const on = t.id === activeTocId;
            return (
              <a
                key={t.id}
                href={`#${t.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  onTocSelect(t.id);
                }}
                style={{
                  display: 'block',
                  padding: `7px 10px 7px ${14 + (t.level - 1) * 13}px`,
                  borderLeft: `2px solid ${on ? 'var(--link)' : 'var(--chrome-border)'}`,
                  fontSize: 12.5,
                  color: on ? 'var(--chrome-fg)' : 'var(--chrome-muted)',
                  fontWeight: on ? 600 : 400,
                  textDecoration: 'none',
                }}
              >
                {t.label}
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
