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
    <div data-subbar="true" style={{ flex: 'none', background: 'var(--chrome)', borderBottom: '1px solid var(--border)', zIndex: 28 }}>
      <div style={{ height: 36, display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px' }}>
        {editing && (
          <div style={{ display: 'flex', gap: 2, padding: 2, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 7 }}>
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
                background: mobileTab === 'source' ? 'var(--hl)' : 'transparent',
                color: mobileTab === 'source' ? 'var(--link)' : 'var(--muted)',
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
                background: mobileTab === 'preview' ? 'var(--hl)' : 'transparent',
                color: mobileTab === 'preview' ? 'var(--link)' : 'var(--muted)',
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
              border: '1px solid var(--border)',
              borderRadius: 7,
              background: 'var(--bg)',
              color: 'var(--muted)',
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
        <div style={{ maxHeight: 240, overflowY: 'auto', borderTop: '1px solid var(--border)', padding: '6px 12px 10px', background: 'var(--bg)' }}>
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
                  borderLeft: `2px solid ${on ? 'var(--link)' : 'var(--border)'}`,
                  fontSize: 12.5,
                  color: on ? 'var(--link)' : 'var(--muted)',
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
