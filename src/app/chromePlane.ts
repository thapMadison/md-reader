import type { CSSProperties } from 'react';

// The angled planes cut across the chrome surfaces — toolbar and sidebar.
//
// This is the background half of the angular-geometry work. --chrome-accent-shape
// states the diagonal on the active row; this states it on the surface itself.
//
// Built from clip-path polygons rather than gradients, and the reason is a hard
// limitation rather than a preference. A gradient's color stops can be placed at
// the same position to give a genuinely crisp edge, so sharpness was never the
// problem — the angle was. A linear-gradient's boundary is always perpendicular
// to its axis, so a steep (near-vertical) edge requires a near-horizontal axis,
// and in a 240px-wide sidebar that means the whole gradient resolves across a few
// dozen pixels instead of running the height of the panel. There is no angle that
// is both steep and full-height in a narrow box. Polygons have no such coupling:
// each vertex is placed independently, so an edge can be as steep as the design
// wants and still span the surface.
//
// clip-path was rejected for --surface-corner and is used here, which is not a
// contradiction — the objections there do not apply. On article surfaces it clips
// the border away at each cut corner and fights `overflow: auto`. These planes
// carry no border, never scroll, and live in their own absolutely-positioned
// layer behind the content, so nothing they clip is anything anyone needs.
//
// The structure follows the reference artwork's own markup, which builds its
// canvas from four flat facets: large wedges anchored to the corners, a couple of
// them darkening and a couple lightening, plus one narrow full-height sliver. Two
// details there are load-bearing and were arrived at only by reading it:
//
//   * Facets carry *different hues*, not one tint at several alphas — a darker
//     blue for the shadow planes, white for the highlights. A single hue at three
//     opacities can only ever step in one direction, which is why the first
//     version of this file read as a fade rather than as folded planes.
//   * Every plane spans the full box corner to corner. They read as folds in one
//     continuous surface precisely because none of them is a shape sitting *on*
//     the panel; they are cuts *through* it.

// Which direction a facet moves the surface it sits on.
//
// `shadow` deepens toward the theme's own chrome color, `highlight` lifts toward
// white. Two tones rather than one is what lets these read as folds: a fold has a
// lit face and a shaded face, and a stack of same-direction tints has neither.
type FacetTone = 'shadow' | 'highlight';

interface Facet {
  readonly tone: FacetTone;
  // How much of the tone this layer carries, 0..1 — read as a fraction of
  // --chrome-plane in both tones, so a theme's single token sets the ceiling for
  // the whole stack and an alpha-zero token silences all of it.
  //
  // What differs is only how the fraction is applied: a shadow scales the token's
  // color through color-mix, while a highlight paints white and is scaled by the
  // token through a mask (see facetLayerStyle). The consequence worth knowing is
  // that a highlight's on-screen alpha is strength × the token's alpha, not
  // strength — so these run higher than the reference artwork's raw 0.11/0.16,
  // which are the *resulting* alphas rather than the multipliers.
  //
  // Capped at 1 by construction: the shadow path feeds these to color-mix as
  // percentages, and a value over 100% is not merely clamped — it is invalid, and
  // the whole declaration is dropped, so the layer would silently vanish rather
  // than merely render too bright.
  readonly strength: number;
  readonly polygon: string;
}

// Where the planes may be drawn, and it is a contrast constraint expressed as
// geometry rather than as a weaker tint. Overlapping layers compound: measured
// over azure-corporate's chrome, one plane leaves --chrome-muted at 6.02 and two
// stacked at 4.82, while a three-layer stack falls to 3.12 and cannot be rescued
// by lowering alpha (0.13 still only reaches 3.94).
//
// So the planes cross where the panel is empty. The library list is the binding
// constraint and a tighter one than it looks: rows are 48px with their size/mtime
// line, so seven files reach ~430px down an 810px panel. An early version entered
// at 54% and was caught on screen cutting through two file names — rendering
// candidates against a *full* list, not the two or three a quick test tends to
// have, is what surfaced it.
//
// The wedges below therefore take their mass from the bottom two corners and
// meet low, leaving the upper panel — where the names are — on flat --chrome.
export const SIDEBAR_FACETS: readonly Facet[] = [
  // Large wedge rising from the bottom-left corner: the main shaded face.
  { tone: 'shadow', strength: 0.5, polygon: 'polygon(0% 66%, 100% 98%, 100% 100%, 0% 100%)' },
  // Counter-wedge from the bottom-right, crossing the first. The overlap is what
  // produces a third tone without a third layer, as it does in the reference.
  { tone: 'shadow', strength: 0.75, polygon: 'polygon(100% 78%, 100% 100%, 18% 100%)' },
  // Lit face, catching the left flank above the crossing.
  { tone: 'highlight', strength: 0.42, polygon: 'polygon(0% 80%, 46% 100%, 12% 100%, 0% 94%)' },
  // The sliver. Narrow, and routed through the lower left where it crosses at
  // most one wedge — never the overlap.
  { tone: 'highlight', strength: 0.62, polygon: 'polygon(10% 100%, 100% 76%, 10% 0%, 10% 100%)' },
];

// Toolbar: 48px tall and full width, so its facets are near-vertical shears
// rather than the shallow crossings the sidebar can host. Anchored to the right
// half — past the filename, before the theme picker — so the geometry crosses the
// bar's empty middle rather than any of its text.
//
// Full-height by construction (every vertex is at 0% or 100%), which is what
// makes them read as continuous cuts rather than as chevrons floating in a strip.
export const TOOLBAR_FACETS: readonly Facet[] = [
  { tone: 'shadow', strength: 0.5, polygon: 'polygon(52% 0%, 68% 0%, 50% 100%, 66% 100%)' },
  { tone: 'shadow', strength: 0.75, polygon: 'polygon(68% 0%, 100% 0%, 100% 100%, 82% 100%)' },
  { tone: 'highlight', strength: 0.42, polygon: 'polygon(44% 0%, 52% 0%, 66% 100%, 58% 100%)' },
  { tone: 'highlight', strength: 0.62, polygon: 'polygon(40% 0%, 42.5% 0%, 56.5% 100%, 54% 100%)' },
];

// One absolutely-positioned layer per facet, sized to the surface and clipped to
// its polygon.
//
// The two tones reach their color by different routes, and the asymmetry is
// forced rather than chosen. A shadow is the theme's own tint, so color-mix can
// simply scale it. A highlight is white — and white is not the theme's to scale,
// which is the whole difficulty: a theme that opts out by setting an alpha-zero
// --chrome-plane silences the shadows automatically, but nothing about `#fff`
// knows the theme said no. Shipping that costs Sepia Book and Night Owl a white
// sliver across the sidebar they never asked for; it was caught on screen.
//
// So the highlight's *paint* is white and its *alpha* comes from the token, via
// a mask built from the token itself. color-mix cannot do this job: it has no way
// to read a color's alpha and use it as a factor, and every spelling that looks
// like it might fails in one of two ways. Mixing white against the token averages
// the alphas — `color-mix(#fff 55%, var(--chrome-plane))` resolves to alpha 0.67,
// a near-solid wedge rather than a lit face. Mixing with a 0% weight, which reads
// like it should preserve only the alpha, discards the token's contribution
// entirely and yields plain white. Both were measured in-browser before this
// landed. A mask sidesteps it: an alpha-zero token makes a fully transparent
// mask, and a fully transparent mask hides the layer.
//
// A browser without color-mix drops the declaration and the layer paints nothing,
// degrading to flatter chrome rather than to something broken — the same fallback
// posture as --surface-corner.
export function facetLayerStyle(facet: Facet): CSSProperties {
  const pct = facet.strength * 100;
  if (facet.tone === 'shadow') {
    return {
      position: 'absolute',
      inset: 0,
      // Decoration only — the layers sit above the surface background but below
      // its content, and must never intercept a click meant for a file row.
      pointerEvents: 'none',
      background: `color-mix(in srgb, var(--chrome-plane) ${pct}%, transparent)`,
      clipPath: facet.polygon,
    };
  }

  // Two flat stops rather than a gradient with any travel: this is a gradient
  // only because mask-image takes an image and not a color, so both stops are the
  // same token and the "gradient" is a constant.
  const mask = 'linear-gradient(var(--chrome-plane), var(--chrome-plane))';
  return {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    background: `rgba(255,255,255,${facet.strength})`,
    maskImage: mask,
    WebkitMaskImage: mask,
    clipPath: facet.polygon,
  };
}
