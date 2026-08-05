import { describe, expect, it } from 'vitest';
import { SIDEBAR_FACETS, TOOLBAR_FACETS, facetLayerStyle } from './chromePlane';
import { tokens as azure } from '@/themes/builtin/azure-corporate/tokens';

// Parses the vertices out of a `polygon(x% y%, ...)` string.
const points = (polygon: string): { x: number; y: number }[] =>
  [...polygon.matchAll(/(-?[\d.]+)%\s+(-?[\d.]+)%/g)].map((m) => ({ x: Number(m[1]), y: Number(m[2]) }));

// Standard even-odd ray cast: is (x, y) inside the polygon?
const covers = (poly: { x: number; y: number }[], x: number, y: number): boolean => {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) hit = !hit;
  }
  return hit;
};

describe('chrome plane facets', () => {
  // The constraint that actually protects legibility, and the one a careless
  // edit breaks silently: overlapping planes compound, so --chrome-muted falls
  // to 4.82 where two cross and 3.12 under a three-layer stack. Text is kept off
  // those zones geometrically rather than by tinting — no alpha rescues the
  // third layer — which means the geometry itself has to hold. A first version
  // entered at 54% and was caught on screen cutting through two file names.
  //
  // Stated as "clear of the text column" rather than "below the list", because a
  // blanket y-floor is the wrong shape for the constraint: a facet is free to sit
  // at any height in the empty left margin, and a floor would reject it for a
  // vertex that costs no legibility. What matters is whether a facet overlaps the
  // band the file names occupy, which is a rectangle in *both* axes: names run
  // from x≈15% to the panel's right edge, and the lowest of them ends at 54.8%
  // with a full library.
  //
  // Tested by sampling the rectangle rather than by comparing vertex extents, and
  // the difference is not pedantry — a bounding box is wrong for the shapes this
  // file actually holds. The main wedge rises to 56% at x=0% and falls to 98% by
  // x=100%, so its highest vertex and its rightmost vertex are opposite ends of a
  // slope, never the same point; an extent check reads that pair as "reaches 56%
  // *and* spans to the right edge" and rejects a facet whose edge is already at
  // 62% by the time it passes under the leftmost glyph. Sampling asks the question
  // the contrast constraint actually poses: is any point a name occupies covered?
  const TEXT_LEFT = 15;
  const TEXT_BOTTOM = 54.8;

  it('keeps every sidebar plane clear of the file name column', () => {
    for (const facet of SIDEBAR_FACETS) {
      const pts = points(facet.polygon);
      // Half a percent across, a fifth down — finer than the 6% a row occupies,
      // so no row can slip between samples.
      for (let x = TEXT_LEFT; x <= 100; x += 0.5) {
        for (let y = 0; y <= TEXT_BOTTOM; y += 0.2) {
          if (!covers(pts, x, y)) continue;
          expect.fail(`${facet.polygon} covers the file names at ${x}% ${y.toFixed(1)}%`);
        }
      }
    }
  });

  // The storage line is the one piece of chrome text the planes are allowed to
  // reach, and the guard above says nothing about it — it stops at the file list.
  // Two facets do run to the bottom edge and cross over the left third of it, so
  // "the planes cross where the panel is empty" is true of the names and only
  // partly true here.
  //
  // Pinned rather than merely bounded, and the exact figures are the point. The
  // crossing measures 4.02 against --chrome-muted, under the 4.5 the file names
  // hold, which is a trade this file makes deliberately: the line is a secondary
  // readout, and lifting the highlight off it would cost the lit face its corner.
  // What must not happen is that figure drifting lower unnoticed — a fourth layer
  // over the same zone, a deeper strength, a wedge extended past 92%. An upper
  // bound would let it slide to 4.4; equality makes any change to the stack here
  // fail and demand a fresh measurement.
  //
  // Computed from the tokens rather than transcribed, so the number tracks the
  // theme instead of recording what it once was. azure-corporate is the only
  // builtin with a non-zero --chrome-plane; on the other four every facet is fully
  // transparent and the line sits on bare chrome.
  it('holds the storage line at the contrast the facets were measured to leave', () => {
    // Read from the theme rather than transcribed from it. A measurement pinned
    // this tightly is only meaningful if it is measuring the shipped colors, and
    // a copied literal would keep asserting 4.02 after a palette edit made it
    // false — passing while describing a screen nobody sees.
    const hex = (value: string): number[] => {
      const m = /^#([0-9a-f]{6})$/i.exec(value);
      if (!m) throw new Error(`expected a 6-digit hex, got ${value}`);
      return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16));
    };
    const rgba = (value: string): { rgb: number[]; alpha: number } => {
      const m = /^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)$/.exec(value);
      if (!m) throw new Error(`expected rgba(), got ${value}`);
      return { rgb: [+m[1], +m[2], +m[3]], alpha: +m[4] };
    };

    const CHROME = hex(azure['--chrome']);
    const MUTED = hex(azure['--chrome-muted']); // what the line is drawn in
    const { rgb: PLANE, alpha: PLANE_ALPHA } = rgba(azure['--chrome-plane']);
    const STORAGE_Y = 94; // where the line sits, as a % of panel height

    const channel = (c: number): number => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    const luminance = ([r, g, b]: number[]): number =>
      0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
    const contrast = (a: number[], b: number[]): number => {
      const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
      return (hi + 0.05) / (lo + 0.05);
    };
    const composite = (fg: number[], alpha: number, bg: number[]): number[] =>
      fg.map((c, i) => c * alpha + bg[i] * (1 - alpha));

    // Which facets cover a point on the line, in paint order.
    const stackAt = (x: number): readonly (typeof SIDEBAR_FACETS)[number][] =>
      SIDEBAR_FACETS.filter((facet) => covers(points(facet.polygon), x, STORAGE_Y));

    // Composite them exactly as facetLayerStyle renders them: a shadow tints with
    // the token, a highlight paints white through a mask cut from it, so both land
    // at strength × the token's alpha.
    const at = (x: number): number => {
      let bg = CHROME;
      for (const facet of stackAt(x)) {
        bg =
          facet.tone === 'shadow'
            ? composite(PLANE, PLANE_ALPHA * facet.strength, bg)
            : composite([255, 255, 255], PLANE_ALPHA * facet.strength, bg);
      }
      return contrast(MUTED, bg);
    };

    // Checked as a profile across the line rather than as a single worst case,
    // and the difference is one a mutation caught: the crossing that produces the
    // darkest reading sits on the left, so extending the right-hand wedge to the
    // floor added a second layer over x=40..100% and dropped that stretch to 3.94
    // — while `Math.min` still reported the left-hand figure and the test still
    // passed. One number cannot describe a line whose stack changes along it.
    //
    // Grouped by how many layers cover each point rather than by hard-coded x
    // ranges, because the ranges are a consequence of the polygons and move
    // whenever a vertex does. Pinning "x=0..32 is 4.02" would make every geometry
    // edit look like a contrast regression: shifting the highlight's corner from
    // 94% to 92% pulls a 2.5%-wide sliver out of the crossing without changing
    // what any depth actually measures. Depth is the thing with a contrast
    // meaning, so depth is what gets pinned.
    const byDepth = new Map<number, number[]>();
    for (let x = 0; x <= 100; x += 0.5) {
      const depth = stackAt(x).length;
      byDepth.set(depth, [...(byDepth.get(depth) ?? []), at(x)]);
    }

    // Bare chrome past the wedge's reach, one layer under it, two where the
    // highlight crosses. A third would mean a facet was extended over this line.
    expect([...byDepth.keys()].sort()).toEqual([0, 1, 2]);

    const readings = (depth: number): number[] => byDepth.get(depth)!;
    // Every point at a given depth must read the same: the facets covering the
    // line are flat fills, so a spread here means an unexpected partial overlap.
    for (const [depth, values] of byDepth) {
      expect(Math.max(...values) - Math.min(...values), `depth ${depth} is not uniform`).toBeLessThan(0.01);
    }

    expect(readings(0)[0]).toBeCloseTo(6.86, 2); // bare --chrome
    expect(readings(1)[0]).toBeCloseTo(5.62, 2); // the large wedge alone
    expect(readings(2)[0]).toBeCloseTo(4.02, 2); // wedge + lit face
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
