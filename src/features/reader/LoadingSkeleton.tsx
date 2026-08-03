interface LoadingSkeletonProps {
  label: string;
}

function bar(width: string, height: number, delay: number, extra?: React.CSSProperties) {
  return {
    height,
    width,
    borderRadius: height >= 100 ? 10 : height >= 20 ? 5 : 4,
    background: 'var(--border)',
    animation: `shimmer 1.2s ease-in-out ${delay}s infinite`,
    ...extra,
  };
}

export function LoadingSkeleton({ label }: LoadingSkeletonProps) {
  return (
    <div data-skeleton="true" style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '56px 48px' }}>
      <div style={bar('55%', 30, 0)} />
      <div style={bar('35%', 12, 0, { marginBottom: 10 })} />
      <div style={bar('100%', 12, 0.1)} />
      <div style={bar('96%', 12, 0.2)} />
      <div style={bar('90%', 12, 0.3)} />
      <div style={bar('100%', 160, 0.4, { margin: '8px 0' })} />
      <div style={bar('92%', 12, 0.5)} />
      <div style={bar('60%', 12, 0.6)} />
      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>Loading {label}…</div>
    </div>
  );
}
