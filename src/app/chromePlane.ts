import type { CSSProperties } from 'react';

// The angled planes cut across the chrome surfaces — toolbar and sidebar —
// tinted with the theme's --chrome-plane.
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
// Every layer is painted unconditionally and tinted with --chrome-plane. A theme
// that leaves that token at its zero-alpha default paints fully transparent
// polygons, which composite to exactly the --chrome underneath — the same pixels
// as before this existed, with no JS branch to get there.

// Where the planes may be drawn, and it is a contrast constraint expressed as
// geometry. Overlapping layers compound: measured over azure-corporate's chrome,
// one plane leaves --chrome-muted at 6.02, two stacked at 4.82, and all three
// with the sliver at 3.12 — below the 4.5 floor no matter how far the sliver's
// alpha is dropped (0.13 still only reaches 3.94). So the fix is not a weaker
// tint, it is keeping text off the stack: every vertex below sits in the lower
// part of the panel, under the file list, and the sliver is placed where it
// crosses only one plane and never their overlap. The one label inside the
// planes is the storage line at the very bottom, which sits on a single layer.
interface Facet {
  // Fraction of --chrome-plane this layer carries, 0..1. Relative rather than
  // absolute so a theme raising or lowering the token moves every plane together
  // and their relationships hold.
  //
  // Capped at 1 by construction: these are fed to color-mix as percentages, and
  // a value over 100% is not merely clamped — it is invalid, and the whole
  // declaration is dropped, so the layer would silently vanish. The token
  // therefore represents the *strongest* layer (the sliver at 1) and the planes
  // are fractions beneath it, rather than the token being a mid-tone that the
  // sliver has to exceed.
  readonly strength: number;
  readonly polygon: string;
}

// Sidebar: two planes crossing low in the panel, plus the bright sliver — the
// three-element structure the reference is built on. The crossing is what
// produces a third tone without a third color, exactly as overlapping translucent
// planes do in the source artwork.
// The library list is the constraint on every Y below, and it is a tighter one
// than it looks. Rows are 48px with their size/mtime line, so seven files reach
// ~430px down an 810px panel — past the midpoint. The highest vertex here is
// 72%, putting the topmost edge around y=580, clear of a list that long.
//
// This was measured rather than assumed, and the first attempt got it wrong: an
// earlier version entered at 54% and was caught on screen cutting straight
// through two file names. Rendering the candidates against a full list, rather
// than the two or three files a quick test tends to have, is what showed it.
export const SIDEBAR_FACETS: readonly Facet[] = [
  // Upper plane, entering at the left edge and rising to the right.
  { strength: 0.32, polygon: 'polygon(0% 96%, 100% 50%, 100% 100%, 0% 100%)' },
  // Lower plane, steeper, crossing the first in the lower right.
  { strength: 0.5, polygon: 'polygon(30% 100%, 100% 86%, 100% 100%)' },
  // The sliver, at full token strength. Routed down the left margin, where only
  // the upper plane reaches — it never crosses the lower plane's triangle, so it
  // never lands on a two-plane stack.
  { strength: 1, polygon: 'polygon(0% 45%, 27% 100%, 39% 100%, 25% 80%)' },
];

// Toolbar: 48px tall and full width, so the planes here are near-vertical shears
// rather than the shallow crossings the sidebar can host. Anchored to the right
// half — past the filename, before the theme picker — so the geometry crosses the
// bar's empty middle rather than any of its text.
export const TOOLBAR_FACETS: readonly Facet[] = [
  { strength: 0.32, polygon: 'polygon(46% 0%, 62% 0%, 50% 100%, 58% 100%)' },
  { strength: 0.5, polygon: 'polygon(62% 0%, 100% 0%, 100% 100%, 74% 100%)' },
  { strength: 1, polygon: 'polygon(40% 0%, 43% 0%, 55% 100%, 52% 100%)' },
];

// One absolutely-positioned layer per facet, sized to the surface and clipped to
// its polygon.
//
// `color-mix` scales the theme's tint per layer. It is the only step here the
// theme cannot express itself: --chrome-plane is a single color, and these planes
// need it at three strengths. A browser without color-mix support drops the
// declaration and the layer paints nothing, which degrades to a flatter chrome
// rather than a broken one — the same fallback posture as --surface-corner.
export function facetLayerStyle(facet: Facet): CSSProperties {
  return {
    position: 'absolute',
    inset: 0,
    // Decoration only — the layers sit above the surface background but below its
    // content, and must never intercept a click meant for a file row.
    pointerEvents: 'none',
    background: `color-mix(in srgb, var(--chrome-plane) ${facet.strength * 100}%, transparent)`,
    clipPath: facet.polygon,
  };
}
