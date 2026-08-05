import { DragDropIcon } from '@/components/ui/icons';

export function DragOverlay() {
  return (
    <>
      {/* pointerEvents: none for the same reason as the frame below — this is a
          decorative scrim, and while it was hit-testable it swallowed every
          click meant for the sidebar underneath. That matters beyond tidiness:
          a drag that leaves the window without a dragleave (drag out, release)
          strands the overlay, and a click-eating layer is then unrecoverable. */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 50,
          background: 'var(--bg)',
          opacity: 0.92,
          pointerEvents: 'none',
        }}
      />
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
