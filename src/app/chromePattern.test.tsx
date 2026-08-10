import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ENUM_TOKEN_VALUES } from '@/themes/contract';
import { NotchClipDefs, SidebarPatternLayer, ToolbarPatternLayer } from './chromePattern';
import {
  NOTCHED_TOOLBAR,
  SIDEBAR_FACETS,
  TOOLBAR_FACETS,
  effectivePattern,
  facetLayerStyle,
  isStructuralPattern,
} from './chromePatternStyles';
import { tokens as azure } from '@/themes/builtin/azure-corporate/tokens';
import type { LayoutMode } from '@/hooks/useBreakpoint';

// Every pattern the contract allows, minus the one that draws nothing. Derived
// from the contract rather than listed here, so a value added to the enum
// without a renderer fails these tests instead of shipping as a silent no-op.
const DRAWN = ENUM_TOKEN_VALUES['--chrome-pattern'].filter((p) => p !== 'none');

const renderSidebar = (pattern: string, over: Partial<Parameters<typeof SidebarPatternLayer>[0]> = {}) =>
  render(
    <SidebarPatternLayer
      pattern={pattern}
      ink="light"
      opacityScale={1}
      mode="desktop"
      {...over}
    />,
  ).container;

const renderToolbar = (pattern: string, over: Partial<Parameters<typeof ToolbarPatternLayer>[0]> = {}) =>
  render(
    <ToolbarPatternLayer
      pattern={pattern}
      ink="light"
      opacityScale={1}
      mode="desktop"
      {...over}
    />,
  ).container;

const layersIn = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLElement>('[data-chrome-pattern]'));

describe('chrome pattern layers', () => {
  // The one property every layer must have, checked across all of them rather
  // than per-motif. These divs cover the whole panel and sit above its fill, so
  // a single one that forgets to be inert eats clicks on the file rows
  // underneath — and it would look like the sidebar had stopped responding,
  // with nothing in the DOM to suggest a decoration was to blame.
  it('never intercepts a pointer event, on either panel or any pattern', () => {
    for (const pattern of DRAWN) {
      for (const renderPanel of [renderSidebar, renderToolbar]) {
        for (const layer of layersIn(renderPanel(pattern))) {
          expect(layer.style.pointerEvents, `${pattern}`).toBe('none');
        }
      }
    }
  });

  // `notched` is the exception, and deliberately: it is a clip on the panel's
  // own silhouette rather than anything drawn inside it, so it has no overlay on
  // either surface. Every other value has to reach the sidebar — the toolbar is
  // allowed to stay silent for the motifs it expresses through its own elements.
  it('draws something for every pattern that is an overlay at all', () => {
    for (const pattern of DRAWN.filter((p) => p !== 'notched')) {
      expect(layersIn(renderSidebar(pattern)).length, pattern).toBeGreaterThan(0);
    }
    expect(layersIn(renderSidebar('notched'))).toHaveLength(0);
  });

  it('draws nothing for none', () => {
    expect(layersIn(renderSidebar('none'))).toHaveLength(0);
    expect(layersIn(renderToolbar('none'))).toHaveLength(0);
  });

  // An unknown value reaches here only if validation and the merge default have
  // both been bypassed — a stored theme edited by hand, say. Undecorated chrome
  // is the right outcome; a crash in a decoration layer would take the whole
  // sidebar down with it.
  it('renders undecorated chrome for a pattern it does not know', () => {
    expect(layersIn(renderSidebar('mystery-motif'))).toHaveLength(0);
    expect(layersIn(renderToolbar('mystery-motif'))).toHaveLength(0);
  });
});

describe('chrome pattern ink', () => {
  // `facet` sits outside the ink question in both directions: its shadow faces
  // are always black and its highlight faces always white, regardless of
  // --chrome-pattern-ink — see FacetTone in chromePattern.tsx. A theme turns those
  // off by naming a different --chrome-pattern, not by naming an ink — so it is
  // excluded here rather than exempted quietly.
  const INKED = DRAWN.filter((p) => p !== 'facet');

  // The failure the ink token exists to prevent, asserted as an absence: white
  // ink over a light chrome is not "subtle", it is invisible, and an invisible
  // pattern reads to a user as a broken one. Checked over every motif because
  // any single hard-coded rgba(255,255,255,…) reintroduces it.
  it('never emits white ink when the theme asked for dark', () => {
    for (const pattern of INKED) {
      for (const renderPanel of [renderSidebar, renderToolbar]) {
        const container = renderPanel(pattern, { ink: 'dark' });
        expect(container.innerHTML, `${pattern}`).not.toMatch(/rgba\(255,\s*255,\s*255/);
      }
    }
  });

  // The mirror of the above: black ink over a near-black chrome disappears just
  // as completely.
  it('never emits black ink when the theme asked for light', () => {
    for (const pattern of INKED) {
      for (const renderPanel of [renderSidebar, renderToolbar]) {
        const container = renderPanel(pattern, { ink: 'light' });
        expect(container.innerHTML, `${pattern}`).not.toMatch(/rgba\(0,\s*0,\s*0/);
      }
    }
  });

  // The flood color, not a fill on the rect. feTurbulence replaces the element
  // it filters instead of tinting it, so a fill never reaches the output — the
  // ink has to be flooded in and composited through the noise. Asserting the
  // flood is what makes this test able to fail if that is ever undone: the
  // earlier version checked the rect's fill, which is precisely the attribute
  // the filter discards, and so passed while the grain rendered as invisible
  // grey-brown noise over sepia-book's paper chrome.
  it('flips the grain ink through the flood color', () => {
    const floodOf = (ink: 'light' | 'dark') =>
      renderSidebar('grain', { ink }).querySelector('feFlood')?.getAttribute('flood-color');

    expect(floodOf('dark')).toBe('#000');
    expect(floodOf('light')).toBe('#fff');
  });

  // The noise has to reach the alpha channel for the flood to be visible at all.
  // Without this the color matrix could be dropped and the layer would render as
  // a flat wash of ink rather than as grain.
  it('routes the noise into alpha rather than leaving it as color', () => {
    const matrix = renderSidebar('grain').querySelector('feColorMatrix');

    expect(matrix?.getAttribute('values')?.split(/\s+/).filter(Boolean)).toEqual([
      '0', '0', '0', '0', '0',
      '0', '0', '0', '0', '0',
      '0', '0', '0', '0', '0',
      '1', '0', '0', '0', '0',
    ]);
    expect(renderSidebar('grain').querySelector('feComposite')?.getAttribute('operator')).toBe('in');
  });
});

describe('grain is drawn as an element, not a data URI', () => {
  // `data:image/svg+xml;utf8,…` carries a semicolon, and a semicolon inside a
  // style value ends the declaration — the pattern vanishes and takes the rest
  // of the rule with it. This is the kind of thing that gets reintroduced by
  // someone simplifying the SVG away, so it is pinned rather than commented.
  it('uses a real svg with a turbulence filter', () => {
    const container = renderSidebar('grain');

    expect(container.querySelector('feTurbulence')).not.toBeNull();
    expect(container.innerHTML).not.toContain('data:image');
  });

  // Both panels mount grain at once. Two <filter> elements sharing an id in one
  // document means whichever rendered first wins for both, which shows up as
  // one panel's grain silently taking the other's settings.
  it('gives each mounted instance its own filter id', () => {
    const { container } = render(
      <>
        <SidebarPatternLayer pattern="grain" ink="light" opacityScale={1} mode="desktop" />
        <ToolbarPatternLayer pattern="grain" ink="light" opacityScale={1} mode="desktop" />
      </>,
    );
    const ids = Array.from(container.querySelectorAll('filter')).map((f) => f.id);

    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
  });
});

describe('notch geometry', () => {
  // Pinned against the spec's own worked polygon, whose right-edge vertices run
  // 88 / 105 / 211 / 228 and then repeat from 337. This is asserted rather than
  // trusted because the geometry was wrong twice: once as eight bites sharing
  // the panel height, which read as perforation and grew with the window, and
  // once with the period stated as its own constant 39px short of what a cycle
  // actually consumes, which overlapped every notch with the next one.
  it('cuts at the periods the spec measured', () => {
    const { container } = render(<NotchClipDefs />);
    const d = container.querySelector('path')!.getAttribute('d')!;
    const ys = Array.from(d.matchAll(/L\d+(?:\.\d+)?,(\d+(?:\.\d+)?)/g)).map((m) => Number(m[1]));

    expect(ys.slice(1, 9)).toEqual([88, 105, 211, 228, 337, 354, 460, 477]);
  });

  // User space, not objectBoundingBox. Normalized units scale with the box, so
  // the notches would stretch taller on a taller window instead of repeating —
  // an edge treatment has to hold its size and change its count.
  it('states the path in user space so the notches repeat rather than stretch', () => {
    const { container } = render(<NotchClipDefs />);

    expect(container.querySelector('clipPath')?.getAttribute('clipPathUnits')).toBe('userSpaceOnUse');
  });

  // The cut is 12px deep out of a 240px panel, so the inner wall sits at 228.
  it('cuts to a constant depth', () => {
    const { container } = render(<NotchClipDefs />);
    const xs = new Set(
      Array.from(container.querySelector('path')!.getAttribute('d')!.matchAll(/L(\d+(?:\.\d+)?),/g)).map((m) =>
        Number(m[1]),
      ),
    );

    expect(xs).toEqual(new Set([0, 228, 240]));
  });

  // The toolbar's cut is bounded by its controls, not by taste. The bar is 48px
  // and its tallest control is a 30px button centered in it, which leaves 9px
  // below — so a cut at or past that depth eats the button, and the first
  // version of this took 12px off the whole left 240px and clipped the logo and
  // wordmark with it. Asserted against the measurement rather than the number,
  // so raising it past the clearance fails here instead of on screen.
  it('keeps the toolbar cut clear of the controls above it', () => {
    const depth = Number(/calc\(100% - (\d+(?:\.\d+)?)px\)/.exec(NOTCHED_TOOLBAR.clipPath as string)![1]);
    const clearanceBelowTallestControl = (48 - 30) / 2;

    expect(depth).toBeLessThan(clearanceBelowTallestControl);
    // And shallower than the sidebar's, which has a whole panel height to cut
    // into rather than 48px.
    expect(depth).toBeLessThan(12);
  });
});

describe('mobile gating', () => {
  const mobile = { mode: 'mobile' as LayoutMode };

  // The four structural motifs each depend on something the drawer does not
  // have — a fixed panel height, or a solid chrome to sit beside rather than
  // float over the article. They fall back to undecorated chrome, which is a
  // real fallback rather than a broken one.
  it('turns the structural patterns off in the drawer', () => {
    for (const pattern of ['notched', 'unprinted', 'figureground', 'databend']) {
      expect(isStructuralPattern(pattern), pattern).toBe(true);
      expect(effectivePattern(pattern, 'mobile'), pattern).toBe('none');
      expect(layersIn(renderSidebar(pattern, mobile)), pattern).toHaveLength(0);
      expect(layersIn(renderToolbar(pattern, mobile)), pattern).toHaveLength(0);
    }
  });

  // The overlays have no such dependency, and turning them off would make the
  // drawer look like a different theme from the sidebar it replaces.
  it('keeps the overlay patterns in the drawer', () => {
    for (const pattern of ['chevron', 'rulework', 'aura', 'grain', 'halftone', 'facet']) {
      expect(isStructuralPattern(pattern), pattern).toBe(false);
      expect(effectivePattern(pattern, 'mobile'), pattern).toBe(pattern);
      expect(layersIn(renderSidebar(pattern, mobile)).length, pattern).toBeGreaterThan(0);
    }
  });

  // The gate has to be one decision. A panel that read the raw token while its
  // structural styling read the gated one — or the reverse — would give the
  // drawer a notched clip with no notches drawn, or transparent chrome with no
  // construction lines on it.
  it('leaves every pattern alone on desktop', () => {
    for (const pattern of DRAWN) {
      expect(effectivePattern(pattern, 'desktop'), pattern).toBe(pattern);
    }
  });
});

describe('pattern strength', () => {
  // The theme's number is a multiplier over each motif's authored alphas, so
  // the assertion is directional rather than exact: more scale means more ink,
  // and zero means none of it.
  // Every alpha the rendered markup carries. jsdom reserializes colors rather
  // than echoing what the component wrote — spaces after the commas, and a fully
  // opaque rgba() collapsed to rgb() with no alpha at all — so both forms are
  // read and the collapsed one counts as the 1 it is.
  const alphasIn = (css: string): number[] =>
    Array.from(css.matchAll(/rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(?:,\s*([\d.]+)\s*)?\)/g)).map((m) =>
      m[1] === undefined ? 1 : Number(m[1]),
    );

  it('scales a motif with the multiplier', () => {
    // The chevron's widest line is authored at 0.05, the reference density, so
    // these are that number through the multiplier and back.
    expect(alphasIn(renderSidebar('chevron', { opacityScale: 0.4 }).innerHTML)).toContain(0.02);
    expect(alphasIn(renderSidebar('chevron', { opacityScale: 3 }).innerHTML)).toContain(0.15);
  });

  // Scoped to the background rather than to the whole element: a mask is a shape
  // and its stops are opaque black by definition, so counting those would read
  // an invisible layer as a fully inked one.
  it('draws nothing at all when the theme asks for zero strength', () => {
    const layer = renderSidebar('chevron', { opacityScale: 0 }).querySelector<HTMLElement>('[data-chrome-pattern]')!;

    for (const a of alphasIn(layer.style.backgroundImage)) {
      expect(a).toBe(0);
    }
  });

  it('never emits an alpha above 1, which a browser would reject outright', () => {
    // Not reachable through the token — the hook clamps the scale at 3 — but the
    // ceiling lives in the renderer too, because an out-of-range alpha does not
    // make a layer bright, it makes the browser drop the whole declaration and
    // the layer vanishes at exactly the moment a theme asked for more of it.
    const layer = renderSidebar('chevron', { opacityScale: 40 }).querySelector<HTMLElement>('[data-chrome-pattern]')!;
    const alphas = alphasIn(layer.style.backgroundImage);

    expect(alphas.length).toBeGreaterThan(0);
    for (const a of alphas) {
      expect(a).toBeLessThanOrEqual(1);
    }
    expect(alphas).toContain(1);
  });
});

describe('facet planes', () => {
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

  // The constraint that actually protects legibility, and the one a careless
  // edit breaks silently: text is kept off the facets geometrically, which means
  // the geometry itself has to hold. A first version entered at 54% and was
  // caught on screen cutting through two file names.
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
  // geometry actually holds. The main wedge rises to 56% at x=0% and falls to 98%
  // by x=100%, so its highest vertex and its rightmost vertex are opposite ends
  // of a slope, never the same point; an extent check reads that pair as "reaches
  // 56% *and* spans to the right edge" and rejects a facet whose edge is already
  // at 62% by the time it passes under the leftmost glyph. Sampling asks the
  // question the constraint actually poses: is any point a name occupies covered?
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
  // Pinned rather than merely bounded, and the exact figures are the point. Both
  // depths now clear the 4.5 the file names hold, because a black shadow moves
  // luminance further from azure's --chrome-muted than the old blue-tinted plane
  // did — the geometry constraint above is what actually protects the line, this
  // pin exists so a fourth layer, a deeper strength, or a wedge extended past 92%
  // fails loudly rather than drifting unnoticed. An upper bound would let a
  // regression slide arbitrarily far; equality makes any change to the stack here
  // demand a fresh measurement.
  //
  // Measured at the reference density (opacityScale = 1), where every facet's
  // `strength` field is already the on-screen alpha.
  it('holds the storage line at the contrast the facets were measured to leave', () => {
    const hex = (value: string): number[] => {
      const m = /^#([0-9a-f]{6})$/i.exec(value);
      if (!m) throw new Error(`expected a 6-digit hex, got ${value}`);
      return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16));
    };

    const CHROME = hex(azure['--chrome']);
    const MUTED = hex(azure['--chrome-muted']); // what the line is drawn in
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

    // Composite them exactly as facetLayerStyle renders them at opacityScale = 1:
    // a shadow is black at its own strength, a highlight is white at its own.
    const at = (x: number): number => {
      let bg = CHROME;
      for (const facet of stackAt(x)) {
        bg =
          facet.tone === 'shadow'
            ? composite([0, 0, 0], facet.strength, bg)
            : composite([255, 255, 255], facet.strength, bg);
      }
      return contrast(MUTED, bg);
    };

    // Checked as a profile across the line rather than as a single worst case,
    // and the difference is one a mutation caught: the crossing that produces the
    // darkest reading sits on the left, so extending the right-hand wedge to the
    // floor added a second layer over x=40..100% and dropped that stretch —
    // while `Math.min` still reported the left-hand figure and the test still
    // passed. One number cannot describe a line whose stack changes along it.
    //
    // Grouped by how many layers cover each point rather than by hard-coded x
    // ranges, because the ranges are a consequence of the polygons and move
    // whenever a vertex does. Pinning "x=0..32 is 5.22" would make every geometry
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
    expect(readings(1)[0]).toBeCloseTo(7.04, 2); // the large wedge alone (black darkens the line's ground)
    expect(readings(2)[0]).toBeCloseTo(4.97, 2); // wedge + lit face (white lifts it back down again)
  });

  it('keeps every facet strength within a valid alpha range', () => {
    for (const facet of [...SIDEBAR_FACETS, ...TOOLBAR_FACETS]) {
      expect(facet.strength).toBeGreaterThan(0);
      expect(facet.strength).toBeLessThanOrEqual(1);
    }
  });

  it('renders each layer as inert decoration in the direction its tone names', () => {
    const shadow = SIDEBAR_FACETS.find((f) => f.tone === 'shadow')!;
    const highlight = SIDEBAR_FACETS.find((f) => f.tone === 'highlight')!;

    const shadowStyle = facetLayerStyle(shadow, 1);
    expect(shadowStyle.pointerEvents).toBe('none');
    expect(shadowStyle.position).toBe('absolute');
    expect(shadowStyle.background).toBe(`rgba(0,0,0,${shadow.strength})`);
    expect(shadowStyle.clipPath).toBe(shadow.polygon);

    const highlightStyle = facetLayerStyle(highlight, 1);
    expect(highlightStyle.background).toBe(`rgba(255,255,255,${highlight.strength})`);
  });

  // The opt-out contract: a theme silences every facet the same way it silences
  // any other pattern, by naming a --chrome-pattern other than `facet`. There is
  // no second color token left to also zero out.
  it('scales every facet by opacityScale, the same knob every other pattern reads', () => {
    for (const facet of [...SIDEBAR_FACETS, ...TOOLBAR_FACETS]) {
      expect(facetLayerStyle(facet, 0).background).toBe(
        facet.tone === 'shadow' ? 'rgba(0,0,0,0)' : 'rgba(255,255,255,0)',
      );
      const doubled = facetLayerStyle(facet, 2).background;
      const expectedAlpha = Math.min(1, facet.strength * 2);
      expect(doubled).toBe(
        facet.tone === 'shadow' ? `rgba(0,0,0,${expectedAlpha})` : `rgba(255,255,255,${expectedAlpha})`,
      );
    }
  });
});
