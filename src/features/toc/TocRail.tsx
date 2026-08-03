import type { TocEntry } from './types';

interface TocRailProps {
  toc: TocEntry[];
  activeId: string | null;
  onSelect: (id: string) => void;
}

export function TocRail({ toc, activeId, onSelect }: TocRailProps) {
  return (
    <aside data-toc-rail="true" style={{ flex: '0 0 250px', padding: '32px 20px 20px 8px', overflowY: 'auto', minHeight: 0 }}>
      <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.07em', margin: '0 0 10px 14px' }}>
        On this page
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {toc.map((t) => {
          const on = t.id === activeId;
          return (
            <a
              key={t.id}
              href={`#${t.id}`}
              onClick={(e) => {
                e.preventDefault();
                onSelect(t.id);
              }}
              style={{
                display: 'block',
                padding: `4px 10px 4px ${14 + (t.level - 1) * 13}px`,
                borderLeft: `2px solid ${on ? 'var(--link)' : 'var(--border)'}`,
                fontSize: 12,
                lineHeight: 1.45,
                color: on ? 'var(--link)' : 'var(--muted)',
                fontWeight: on ? 600 : 400,
                textDecoration: 'none',
              }}
            >
              {t.label}
            </a>
          );
        })}
        {toc.length === 0 && (
          <div style={{ fontSize: 12, fontStyle: 'italic', color: 'var(--muted)', padding: '4px 10px 4px 14px', borderLeft: '2px solid var(--border)' }}>
            No headings
          </div>
        )}
      </div>
    </aside>
  );
}
