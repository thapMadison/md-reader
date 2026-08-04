import { useState } from 'react';
import { BrokenImageIcon } from '@/components/ui/icons';

interface MarkdownImageProps {
  src?: string;
  alt?: string;
}

export function MarkdownImage({ src, alt }: MarkdownImageProps) {
  // Keyed on `src` rather than held in a plain flag: React reuses this
  // component instance when only the URL changes, so a stale `failed` kept
  // showing the broken-image placeholder after the author fixed the path in
  // the editor.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const failed = !!src && failedSrc === src;

  if (failed || !src) {
    // A span, not a div: an image is always parsed inside a paragraph, and a
    // block-level fallback there would be invalid nesting. display:flex makes it
    // lay out identically.
    return (
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 6,
          height: 140,
          border: '1.5px dashed var(--border)',
          borderRadius: 10,
          background: 'var(--code-bg)',
          color: 'var(--muted)',
        }}
      >
        <BrokenImageIcon />
        <span style={{ fontSize: 12 }}>Image failed to load</span>
        <span style={{ fontSize: 10.5, fontFamily: 'var(--font-mono)' }}>{src}</span>
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      style={{ width: '100%', borderRadius: 10, display: 'block' }}
      onError={() => setFailedSrc(src)}
    />
  );
}
