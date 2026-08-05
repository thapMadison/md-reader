import { describe, expect, it } from 'vitest';
import { SIDEBAR_FACETS, TOOLBAR_FACETS, facetLayerStyle } from './chromePlane';

// Parses the Y coordinates out of a `polygon(x% y%, ...)` string.
const yCoords = (polygon: string): number[] =>
  [...polygon.matchAll(/(-?[\d.]+)%\s+(-?[\d.]+)%/g)].map((m) => Number(m[2]));

describe('chrome plane facets', () => {
  // The constraint that actually protects legibility, and the one a careless
  // edit breaks silently: overlapping planes compound, so --chrome-muted falls
  // to 4.95 where two cross and 3.94 under the sliver. Text is kept off those
  // zones geometrically rather than by tinting, which means the geometry itself
  // has to hold. A first version entered at 54% and cut through two file names.
  //
  // 70% is the floor rather than the measured 72% so the design has room to
  // breathe without a test edit, while still failing anything that climbs back
  // toward the middle of the list.
  it('keeps every sidebar plane below the file list', () => {
    for (const facet of SIDEBAR_FACETS) {
      for (const y of yCoords(facet.polygon)) {
        expect(y, facet.polygon).toBeGreaterThanOrEqual(70);
      }
    }
  });

  // color-mix rejects a percentage over 100 outright — it does not clamp, it
  // drops the whole declaration, so an out-of-range strength makes the layer
  // silently invisible rather than merely too bright. That failure mode is
  // exactly the kind a screenshot review misses on a theme whose plane is subtle.
  it('keeps every facet strength within the range color-mix accepts', () => {
    for (const facet of [...SIDEBAR_FACETS, ...TOOLBAR_FACETS]) {
      expect(facet.strength).toBeGreaterThan(0);
      expect(facet.strength).toBeLessThanOrEqual(1);
    }
  });

  it('renders each layer as inert decoration tinted by the theme token', () => {
    const style = facetLayerStyle(SIDEBAR_FACETS[0]);

    expect(style.pointerEvents).toBe('none');
    expect(style.position).toBe('absolute');
    expect(style.background).toContain('var(--chrome-plane)');
    expect(style.clipPath).toBe(SIDEBAR_FACETS[0].polygon);
  });
});
