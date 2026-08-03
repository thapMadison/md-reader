import { useEffect, useState } from 'react';

export const BP_DESKTOP = 1200;
export const BP_TABLET = 768;

export type LayoutMode = 'desktop' | 'tablet' | 'mobile';

function modeForWidth(width: number): LayoutMode {
  if (width >= BP_DESKTOP) return 'desktop';
  if (width >= BP_TABLET) return 'tablet';
  return 'mobile';
}

export function useBreakpoint(): LayoutMode {
  const [mode, setMode] = useState<LayoutMode>(() =>
    modeForWidth(typeof window !== 'undefined' ? window.innerWidth : BP_DESKTOP),
  );

  useEffect(() => {
    const onResize = () => setMode(modeForWidth(window.innerWidth));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return mode;
}
