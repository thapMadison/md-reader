interface ProgressBarProps {
  progress: number;
  loading: boolean;
}

export function ProgressBar({ progress, loading }: ProgressBarProps) {
  return (
    <div
      data-progress="true"
      style={{ flex: '0 0 2px', background: 'var(--chrome)', position: 'relative', zIndex: 29, overflow: 'hidden' }}
    >
      <div
        style={{
          height: 2,
          background: 'var(--link)',
          width: loading ? '25%' : `${Math.round(progress * 100)}%`,
          animation: loading ? 'indet 1.1s linear infinite' : 'none',
          transition: 'width .1s linear',
        }}
      />
    </div>
  );
}
