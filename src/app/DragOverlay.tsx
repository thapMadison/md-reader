import { DragDropIcon } from '@/components/ui/icons';

export function DragOverlay() {
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, zIndex: 50, background: 'var(--bg)', opacity: 0.92 }} />
      <div
        style={{
          position: 'absolute',
          inset: 14,
          zIndex: 51,
          border: '2.5px dashed var(--link)',
          borderRadius: 14,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          pointerEvents: 'none',
        }}
      >
        <DragDropIcon />
        <div style={{ fontSize: 17, fontWeight: 650, color: 'var(--link)' }}>Drop to open</div>
      </div>
    </>
  );
}
