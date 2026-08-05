import { describe, expect, it } from 'vitest';
import { SIDEBAR_FACETS, TOOLBAR_FACETS, facetLayerStyle } from './chromePlane';

// Parses the Y coordinates out of a `polygon(x% y%, ...)` string.
const yCoords = (polygon: string): number[] =>
  [...polygon.matchAll(/(-?[\d.]+)%\s+(-?[\d.]+)%/g)].map((m) => Number(m[2]));

describe('chrome plane facets', () => {
  // The constraint that actually protects legibility, and the one a careless
  // edit breaks silently: overlapping planes compound, so --chrome-muted falls
  // to 4.82 where two cross and 3.12 under a three-layer stack. Text is kept off
  // those zones geometrically rather than by tinting — no alpha rescues the
  // third layer — which means the geometry itself has to hold. A first version
  // entered at 54% and was caught on screen cutting through two file names.
  //
  // 70% is the floor rather than the 76% the facets actually use, so the design
  // has room to breathe without a test edit, while still failing anything that
  // climbs back toward the middle of the list. Rows are 48px, so seven files
  // reach ~53% of an 810px panel: the gap between 53% and 70% is the margin,
  // and it is not large enough to spend.
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

  // The opt-out contract, and the one this file exists to defend after getting
  // it wrong: --chrome-plane at zero alpha must silence *every* facet, because
  // the layers are rendered unconditionally on all five themes. Shadows get that
  // for free by mixing the token. Highlights do not — their paint is white, which
  // knows nothing about the theme — so each one has to be gated by the token
  // through a mask. An earlier version left that out and put a white sliver
  // across Sepia Book and Night Owl, which no test caught because the assertions
  // all read the token rather than the layer.
  it('routes every facet through the theme token, so opting out silences all of them', () => {
    for (const facet of [...SIDEBAR_FACETS, ...TOOLBAR_FACETS]) {
      const style = facetLayerStyle(facet);
      const gated =
        String(style.background).includes('var(--chrome-plane)') ||
        String(style.maskImage).includes('var(--chrome-plane)');

      expect(gated, `${facet.tone} ${facet.polygon} ignores --chrome-plane`).toBe(true);
    }
  });

  // Safari still needs the prefix for mask-image, and the failure mode is not a
  // missing effect but an unmasked one: the layer would paint white at full
  // strength on every theme, including the ones that opted out.
  it('carries the prefixed mask alongside the standard one', () => {
    const highlight = SIDEBAR_FACETS.find((f) => f.tone === 'highlight')!;
    const style = facetLayerStyle(highlight);

    expect(style.WebkitMaskImage).toBe(style.maskImage);
  });
});
