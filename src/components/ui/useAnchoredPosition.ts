import { useCallback, useLayoutEffect, useState } from 'react';

export interface AnchoredPosition {
  /** Viewport coordinates, for a `position: fixed` panel. */
  top: number;
  /** Distance from the viewport's right edge — panels here are right-aligned. */
  right: number;
  /** Room between the panel's top and the viewport bottom, for `maxHeight`. */
  maxHeight: number;
}

interface Options {
  /** Gap between the trigger and the panel. */
  gap?: number;
  /** Smallest gap left between the panel and the viewport edges. */
  margin?: number;
}

/**
 * Where to draw a panel so it hangs under the control that opened it.
 *
 * Measured from the trigger rather than written down as constants. The previous
 * `top: 54; right: 52` was a transcription of one particular toolbar — the
 * header's height plus a guess at the width of the buttons to the right of the
 * theme control — and it was wrong in both terms: the popover rendered inside
 * the content row, so `top` stacked on top of the header rather than replacing
 * it, and `right` silently stopped matching the moment the button cluster
 * changed. Numbers describing another element's layout cannot be kept true from
 * here, so this reads them instead.
 *
 * Viewport coordinates, for `position: fixed`. That takes the offset parent out
 * of the answer entirely, which is the other half of the old bug: the same
 * numbers meant different places depending on where the panel happened to be
 * mounted.
 */
export function useAnchoredPosition(
  anchor: HTMLElement | null,
  open: boolean,
  { gap = 6, margin = 8 }: Options = {},
): AnchoredPosition | null {
  const [pos, setPos] = useState<AnchoredPosition | null>(null);

  const measure = useCallback(() => {
    if (!anchor) return;
    const r = anchor.getBoundingClientRect();
    const top = r.bottom + gap;
    setPos({
      top,
      // Right-aligned to the trigger, then held inside the viewport: a control
      // near the right edge would otherwise hang a wide panel off-screen.
      right: Math.max(margin, window.innerWidth - r.right),
      maxHeight: Math.max(0, window.innerHeight - top - margin),
    });
  }, [anchor, gap, margin]);

  // Layout effect, not a plain one: this reads the anchor's box, which can only
  // be done once it is in the DOM, and the result has to be committed before the
  // browser paints. Deferred to a passive effect the panel would paint once at
  // its stale position and then jump. The "cascading render" this trades for is
  // the point — one extra render per open, in exchange for never showing the
  // panel in the wrong place.
  useLayoutEffect(() => {
    if (!open) return;
    // set-state-in-effect is about deriving state that could have been computed
    // during render. This cannot: it is a DOM measurement, and the DOM is
    // exactly the "external system" the rule's own guidance carves out.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    measure();
    // Capture phase so this also sees scrolls in the panes under the header,
    // which do not bubble to window.
    window.addEventListener('scroll', measure, true);
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('scroll', measure, true);
      window.removeEventListener('resize', measure);
    };
  }, [open, measure]);

  return open ? pos : null;
}
