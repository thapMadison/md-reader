import { useId } from 'react';
import type { ChromePattern } from '@/features/theming/ThemeContext';
import type { LayoutMode } from '@/hooks/useBreakpoint';
import {
  GLITCH_CYAN,
  GLITCH_RED,
  LAYER,
  NOTCH_CLIP_ID,
  SIDEBAR_FACETS,
  TOOLBAR_FACETS,
  accent,
  alpha,
  effectivePattern,
  facetLayerStyle,
  inkColor,
  notchPath,
} from './chromePatternStyles';

// Decorative patterns for the two chrome surfaces: the 48px toolbar and the
// 240px sidebar. Selected by --chrome-pattern, tuned by --chrome-pattern-opacity
// and --chrome-pattern-ink.
//
// The overlay layers only. The values they are drawn from — the alpha
// arithmetic, the facet polygons, the notch geometry — and the styles the panels
// apply to *themselves* live in chromePatternStyles.ts, which the panels import
// directly. See that file's header for why the seam falls there.
//
// Every geometry here is fixed by the app rather than by the theme, and that is
// the design: the tokens choose *which* motif and *how strong*, never where its
// lines fall. A theme that could place the geometry could place it through the
// file names, and the whole reason these patterns are safe to ship is that the
// one thing they must never do is not expressible.
//
// The reading surface never takes a pattern. These two panels are chrome — the
// user looks *past* them — and a texture behind body text is a different and much
// worse proposition than a texture behind a toolbar.
//
// Two structural notes that shape everything below:
//
//   * Both panels already provide the frame these need: `position: relative` and
//     `overflow: hidden` on the panel, `position: relative` on its content. So a
//     pattern is a set of absolutely-positioned siblings rendered *first*, which
//     the content then paints over. Nothing here participates in layout.
//   * Every layer is `pointer-events: none`. These sit above the panel fill and
//     below its controls, and a decorative div that swallowed a click on a file
//     row would be the most annoying possible bug to track down.

export interface PatternProps extends ChromePattern {
  mode: LayoutMode;
}

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

function SidebarChevron({ ink, opacityScale }: PatternProps) {
  // Chevrons at 45 degrees, drifting to the bottom of the panel: the motif has
  // gravity, piling up at the floor and thinning as it rises. Two scales — a
  // coarse pair of gradients and a finer, fainter pair — which is what keeps it
  // from reading as a single mechanical hatch.
  //
  // Each "line" is a gradient whose two color stops sit 0.8% apart, which is how
  // you draw a hairline with a gradient: the stops are close enough to be a hard
  // edge but not identical, so the line survives fractional device pixels
  // instead of dropping out at some zoom levels.
  const wide = inkColor(ink, alpha(0.05, opacityScale));
  const fine = inkColor(ink, alpha(0.038, opacityScale));
  return (
    <div
      data-chrome-pattern="chevron"
      style={{
        ...LAYER,
        backgroundImage: [
          `linear-gradient(45deg, transparent 49.6%, ${wide} 49.6%, ${wide} 50.4%, transparent 50.4%)`,
          `linear-gradient(-45deg, transparent 49.6%, ${wide} 49.6%, ${wide} 50.4%, transparent 50.4%)`,
          `linear-gradient(45deg, transparent 24.7%, ${fine} 24.7%, ${fine} 25.3%, transparent 25.3%)`,
          `linear-gradient(-45deg, transparent 24.7%, ${fine} 24.7%, ${fine} 25.3%, transparent 25.3%)`,
        ].join(', '),
        // Square tiles the width of the panel, anchored to the bottom: a 45°
        // motif only meets itself across a tile boundary when the tile is
        // square, and anchoring to the floor is what makes the pile read as
        // resting on it rather than as cropped by it.
        backgroundSize: '240px 240px',
        backgroundPosition: '0 100%',
        backgroundRepeat: 'repeat-y',
        // Gone well before the file list starts. The fade runs out at 58% of the
        // panel from the bottom, and the lowest file name in a full library sits
        // at about 55% — so the mask is what keeps this motif off the text, the
        // same job the facet polygons do by their vertices.
        maskImage: 'linear-gradient(to top, #000 0%, #000 18%, transparent 58%)',
        WebkitMaskImage: 'linear-gradient(to top, #000 0%, #000 18%, transparent 58%)',
      }}
    />
  );
}

function SidebarRulework({ ink, opacityScale }: PatternProps) {
  // Zero texture — the whole motif is one line. The sidebar's right edge stops
  // being a flat hairline and becomes a gradient that is firm at the ends and
  // nearly gone through the middle, so the panel reads as held at its corners.
  //
  // Drawn as a 1px-wide layer pinned to the right edge rather than as a border,
  // because a border cannot carry a gradient along its length. It paints over
  // the panel's own borderRight, which stays for every other pattern.
  const strong = inkColor(ink, alpha(0.22, opacityScale));
  const faint = inkColor(ink, alpha(0.05, opacityScale));
  return (
    <div
      data-chrome-pattern="rulework"
      style={{
        ...LAYER,
        left: 'auto',
        width: 1,
        backgroundImage: `linear-gradient(to bottom, ${strong}, ${faint} 55%, ${strong})`,
      }}
    />
  );
}

function SidebarAura({ opacityScale }: PatternProps) {
  // No geometry at all: a light source off the panel's top-left corner, spilling
  // down and fading out. The toolbar carries the same source from the same
  // corner, so the two panels read as one lit surface rather than as two boxes
  // that happen to share a tint.
  //
  // Color comes from --link rather than from ink, and that is the point of the
  // motif — it is the theme's own accent bleeding into the chrome. Ink here
  // would be a grey smudge.
  //
  // Percentages over 100 are deliberate: the gradient's shape is larger than the
  // box, so what lands on the panel is the *middle* of the falloff rather than a
  // complete ellipse with a visible far edge.
  return (
    <div
      data-chrome-pattern="aura"
      style={{
        ...LAYER,
        backgroundImage: [
          `radial-gradient(150% 60% at 0% -6%, ${accent(alpha(0.17, opacityScale))}, transparent 70%)`,
          `radial-gradient(120% 45% at 100% 106%, ${accent(alpha(0.13, opacityScale))}, transparent 72%)`,
        ].join(', '),
      }}
    />
  );
}

// Film grain: isotropic noise, no direction and no rhythm. The one motif drawn
// with a filter rather than with gradients, because that is the only way to get
// noise that does not visibly tile.
//
// Deliberately NOT a data-URI. `data:image/svg+xml;utf8,...` carries a semicolon,
// and a semicolon inside a style value terminates the declaration — the pattern
// silently disappears and takes the rest of the rule with it. Rendering the SVG
// as a real element sidesteps the question entirely.
//
// The filter id has to be unique per instance: both panels mount this at once,
// and two <filter> elements sharing an id in one document means whichever
// rendered first wins for both. useId is what guarantees they differ.
function GrainLayer({ ink, opacityScale, testId }: PatternProps & { testId: string }) {
  const id = useId();
  const filterId = `grain-${id.replace(/[^\w-]/g, '')}`;
  // Dark ink runs lighter than white. The noise is a full-range field and reads
  // heavier as black over a paper-colored chrome than as white over a dark one,
  // so matching them by eye means giving the dark direction a lower ceiling
  // rather than the same number.
  const opacity = alpha(ink === 'dark' ? 0.08 : 0.17, opacityScale);
  return (
    <svg
      data-chrome-pattern={testId}
      aria-hidden="true"
      style={{ ...LAYER, width: '100%', height: '100%', opacity }}
    >
      <filter id={filterId}>
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} stitchTiles="stitch" />
        {/* The turbulence is a *generator*: it replaces the element it filters
            rather than tinting it, so a fill on the rect below never survives
            and the raw output is grey-brown colored noise. Over a light chrome
            that averages to the panel's own lightness and disappears.

            So the color channels are discarded and the noise is rerouted into
            alpha instead — the last row samples red and drops the constant, and
            every earlier row is zeroed. What comes out is transparent-to-opaque
            black, which `feFlood` then paints the actual ink through. That makes
            the ink direction real: it is a flood color now, not a fill the
            filter was always going to throw away. */}
        <feColorMatrix
          type="matrix"
          values="0 0 0 0 0
                  0 0 0 0 0
                  0 0 0 0 0
                  1 0 0 0 0"
          result="noiseAlpha"
        />
        <feFlood floodColor={ink === 'dark' ? '#000' : '#fff'} result="ink" />
        <feComposite in="ink" in2="noiseAlpha" operator="in" />
      </filter>
      {/* The filter generates its own output across the whole region, so this
          rect is only the box that gives it somewhere to render. */}
      <rect width="100%" height="100%" filter={`url(#${filterId})`} />
    </svg>
  );
}

function SidebarHalftone({ ink, opacityScale }: PatternProps) {
  // A printer's density ramp: one dot, growing toward the floor of the panel.
  // Three bands stacked bottom-up, each with a larger dot on a larger grid than
  // the one above it, each fading out at its own top — so the growth reads as
  // continuous even though it is drawn in three discrete steps.
  //
  // The bands are separate elements rather than three backgrounds on one, because
  // each needs its own mask: a single element can hold three background layers
  // but only one mask, and the staggered fades are what hide the seams.
  const bands = [
    { key: 'lower', bottom: 0, height: 150, dot: 3.4, gap: 4.1, grid: 23, a: 0.115, fade: 60 },
    { key: 'middle', bottom: 137, height: 137, dot: 2.1, gap: 2.9, grid: 20, a: 0.085, fade: 40 },
    { key: 'upper', bottom: 263, height: 137, dot: 1.3, gap: 1.9, grid: 17, a: 0.06, fade: 20 },
  ];
  return (
    <>
      {bands.map((b) => {
        const mask = `linear-gradient(to top, #000 ${b.fade}%, transparent)`;
        return (
          <div
            key={b.key}
            data-chrome-pattern="halftone"
            style={{
              ...LAYER,
              top: 'auto',
              bottom: b.bottom,
              height: b.height,
              // Two stops, a fraction apart: solid to the dot's radius, then
              // transparent. The small gap between them is the antialiasing —
              // without it every dot has a hard aliased rim.
              backgroundImage: `radial-gradient(circle, ${inkColor(ink, alpha(b.a, opacityScale))} ${b.dot}px, transparent ${b.gap}px)`,
              backgroundSize: `${b.grid}px ${b.grid}px`,
              maskImage: mask,
              WebkitMaskImage: mask,
            }}
          />
        );
      })}
    </>
  );
}

function SidebarUnprinted({ ink, opacityScale }: PatternProps) {
  // Construction lines: two diagonals crossing the panel corner to corner, as if
  // the chrome had been set out but never printed. The panel itself goes
  // transparent (see unprintedPanelStyle) — this is the only thing drawn in it.
  //
  // calc() around the midpoint rather than percentage stops, because these are
  // single hairlines rather than bands: a half-pixel either side of 50% is a 1px
  // line at any panel size, where a percentage width would thicken with the box.
  const line = inkColor(ink, alpha(0.13, opacityScale));
  const rule = (deg: number) =>
    `linear-gradient(${deg}deg, transparent calc(50% - .5px), ${line} calc(50% - .5px), ${line} calc(50% + .5px), transparent calc(50% + .5px))`;
  return (
    <div
      data-chrome-pattern="unprinted"
      style={{ ...LAYER, backgroundImage: `${rule(45)}, ${rule(-45)}` }}
    />
  );
}

function SidebarFigureGround({ mode }: PatternProps) {
  // Figure and ground trade places: the sidebar's fill becomes the page
  // background, and --chrome shrinks into two angled masses — one gripping the
  // Open file button at the top, one carrying the footer at the bottom.
  //
  // Fixed pixel heights rather than percentages. Each mass has to end at a
  // specific place relative to the *controls* it wraps, and those controls are a
  // fixed number of pixels from their edge — a percentage would slide across
  // them as the window resizes, which is exactly the failure this motif is prone
  // to. The upper mass ends at 154px with its diagonal starting at 97px, which
  // clears the first file row; the row carries a matching margin-top so the two
  // cannot drift into each other.
  //
  // Not scaled by opacity: these are solid masses of the theme's own chrome
  // color, not ink over it. Thinning them would leave the file list floating on
  // a half-tint of a background it is supposed to have swapped away from.
  if (mode === 'mobile') return null;
  return (
    <>
      <div
        data-chrome-pattern="figureground"
        style={{
          ...LAYER,
          bottom: 'auto',
          height: 154,
          background: 'var(--chrome)',
          clipPath: 'polygon(0 0, 100% 0, 100% 97px, 0 154px)',
        }}
      />
      <div
        data-chrome-pattern="figureground"
        style={{
          ...LAYER,
          top: 'auto',
          height: 137,
          background: 'var(--chrome)',
          clipPath: 'polygon(0 49px, 100% 0, 100% 100%, 0 100%)',
        }}
      />
    </>
  );
}

function SidebarDatabend({ ink, opacityScale }: PatternProps) {
  // Deliberate corruption: a scanline field over the whole panel, plus a handful
  // of bands that have slipped sideways and sheared.
  //
  // The bands overflow the panel on both sides (left/right negative) so they
  // read as torn *through* the surface rather than as stripes drawn inside it —
  // a band that stopped neatly at both edges would look like a design element,
  // which is the opposite of the intent.
  //
  // Every one of them is decoration only. The glitch never touches a control's
  // real text: the wordmark's channel split (see databendWordmarkStyle) is a
  // text-shadow, which offsets a *copy* of the glyphs while the glyphs
  // themselves stay exactly where they are and stay fully legible.
  const bands = [
    { key: 'a', top: 150, height: 13, background: accent(alpha(0.3, opacityScale)), transform: 'skewX(-18deg)' },
    { key: 'b', top: 163, height: 4, background: `${GLITCH_RED}${alpha(0.28, opacityScale)})`, transform: 'translateX(13px)' },
    { key: 'c', bottom: 74, height: 19, background: `${GLITCH_CYAN}${alpha(0.14, opacityScale)})`, transform: 'translateX(-11px) skewX(14deg)' },
    { key: 'd', bottom: 60, height: 3, background: inkColor(ink, alpha(0.16, opacityScale)), transform: 'translateX(20px)' },
  ];
  const scan = inkColor(ink, alpha(0.022, opacityScale));
  return (
    <>
      <div
        data-chrome-pattern="databend"
        style={{
          ...LAYER,
          backgroundImage: `repeating-linear-gradient(0deg, ${scan} 0 1px, transparent 1px 3px)`,
        }}
      />
      {bands.map(({ key, ...band }) => (
        <div
          key={key}
          data-chrome-pattern="databend"
          style={{
            position: 'absolute',
            pointerEvents: 'none',
            left: -8,
            right: -8,
            ...band,
          }}
        />
      ))}
    </>
  );
}

function SidebarFacet({ opacityScale }: PatternProps) {
  // The contrast figures above are pinned at the reference density by the facet
  // tests; opacityScale reaches the layers the same way it reaches every other
  // pattern's alpha() call.
  return (
    <>
      {SIDEBAR_FACETS.map((facet) => (
        <div
          key={facet.polygon}
          data-chrome-facet
          data-chrome-pattern="facet"
          style={facetLayerStyle(facet, opacityScale)}
        />
      ))}
    </>
  );
}

export function SidebarPatternLayer(props: PatternProps) {
  switch (effectivePattern(props.pattern, props.mode)) {
    case 'chevron':
      return <SidebarChevron {...props} />;
    case 'rulework':
      return <SidebarRulework {...props} />;
    case 'aura':
      return <SidebarAura {...props} />;
    case 'grain':
      return <GrainLayer {...props} testId="grain" />;
    case 'halftone':
      return <SidebarHalftone {...props} />;
    case 'unprinted':
      return <SidebarUnprinted {...props} />;
    case 'figureground':
      return <SidebarFigureGround {...props} />;
    case 'databend':
      return <SidebarDatabend {...props} />;
    case 'facet':
      return <SidebarFacet {...props} />;
    // `none`, and anything a future contract adds before this switch learns
    // about it. Falling through to nothing is the right failure: an unknown
    // pattern renders as undecorated chrome rather than as a crash.
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Toolbar
// ---------------------------------------------------------------------------

function ToolbarChevron({ ink, opacityScale }: PatternProps) {
  // The same 45° angle as the sidebar, but a plain repeating hatch rather than
  // the chevron pile: the bar is 48px tall, which is not enough room for a motif
  // that reads as accumulating. What carries across the two panels is the angle.
  //
  // Fainter than the sidebar's, because the toolbar's text runs the full width of
  // the bar — there is no empty region to confine the pattern to, so it has to be
  // quiet enough to sit under the filename everywhere.
  const line = inkColor(ink, alpha(0.028, opacityScale));
  return (
    <div
      data-chrome-pattern="chevron"
      style={{
        ...LAYER,
        backgroundImage: `repeating-linear-gradient(45deg, ${line} 0 1px, transparent 1px 13px)`,
      }}
    />
  );
}

function ToolbarRulework({ ink, opacityScale }: PatternProps) {
  // A 2px rule along the bottom of the bar, accented for exactly the width of the
  // sidebar and hairline for the rest. It states the column boundary on the
  // toolbar — the eye picks up where the sidebar's edge is going to be before it
  // reaches the panel.
  //
  // 240px is the sidebar's width, hard-coded here because it is hard-coded there
  // too (Sidebar.tsx sets flex-basis and width to it). If that ever becomes a
  // token, these two move together.
  const hairline = inkColor(ink, alpha(0.13, opacityScale));
  return (
    <div
      data-chrome-pattern="rulework"
      style={{
        ...LAYER,
        top: 'auto',
        height: 2,
        backgroundImage: `linear-gradient(90deg, var(--link) 0 240px, ${hairline} 240px)`,
      }}
    />
  );
}

function ToolbarAura({ opacityScale }: PatternProps) {
  // The same corner light as the sidebar. Wider and shallower here so the two
  // falloffs meet at the shared corner — they are one source lighting two
  // surfaces, and a mismatch at the seam is what would give that away.
  return (
    <div
      data-chrome-pattern="aura"
      style={{
        ...LAYER,
        backgroundImage: `radial-gradient(120% 320% at 0% 0%, ${accent(alpha(0.2, opacityScale))}, transparent 62%)`,
      }}
    />
  );
}

function ToolbarHalftone({ ink, opacityScale }: PatternProps) {
  // One fine dot field, fading *in* from the middle toward the right — the
  // opposite direction from the sidebar's ramp, and for the same reason: it puts
  // the density where the bar is empty. The filename runs from the left, so the
  // pattern stays off it and gathers under the button cluster instead.
  const mask = 'linear-gradient(to right, transparent 55%, #000 100%)';
  return (
    <div
      data-chrome-pattern="halftone"
      style={{
        ...LAYER,
        backgroundImage: `radial-gradient(circle, ${inkColor(ink, alpha(0.1, opacityScale))} 1.4px, transparent 2px)`,
        backgroundSize: '14px 14px',
        maskImage: mask,
        WebkitMaskImage: mask,
      }}
    />
  );
}

function ToolbarUnprinted({ ink, opacityScale }: PatternProps) {
  // The toolbar's share of the blueprint: a dimension annotation in the corner,
  // as on a drawing that records the sizes but has not been built yet.
  //
  // Positioned from the top rather than the bottom. The height callout belongs to
  // the bar's own edge, and the bar is 48px — from the bottom it would collide
  // with the border it is measuring.
  return (
    <div
      data-chrome-pattern="unprinted"
      style={{
        ...LAYER,
        left: 'auto',
        right: 8,
        bottom: 'auto',
        top: 3,
        fontFamily: 'var(--font-mono)',
        fontSize: 9,
        color: inkColor(ink, alpha(0.45, opacityScale)),
      }}
    >
      h: 48px
    </div>
  );
}

function ToolbarDatabend({ ink, opacityScale }: PatternProps) {
  // A single slipped band across the bar. One rather than the sidebar's four:
  // the toolbar is 48px and holds text across its whole width, so a field of
  // tears would be sitting on the filename rather than beside it.
  return (
    <div
      data-chrome-pattern="databend"
      style={{
        position: 'absolute',
        pointerEvents: 'none',
        left: 0,
        right: 0,
        top: 12,
        height: 5,
        background: inkColor(ink, alpha(0.06, opacityScale)),
        transform: 'translateX(6px)',
      }}
    />
  );
}

function ToolbarFacet({ opacityScale }: PatternProps) {
  return (
    <>
      {TOOLBAR_FACETS.map((facet) => (
        <div
          key={facet.polygon}
          data-chrome-facet
          data-chrome-pattern="facet"
          style={facetLayerStyle(facet, opacityScale)}
        />
      ))}
    </>
  );
}

export function ToolbarPatternLayer(props: PatternProps) {
  switch (effectivePattern(props.pattern, props.mode)) {
    case 'chevron':
      return <ToolbarChevron {...props} />;
    case 'rulework':
      return <ToolbarRulework {...props} />;
    case 'aura':
      return <ToolbarAura {...props} />;
    case 'grain':
      return <GrainLayer {...props} testId="grain" />;
    case 'halftone':
      return <ToolbarHalftone {...props} />;
    case 'unprinted':
      return <ToolbarUnprinted {...props} />;
    case 'databend':
      return <ToolbarDatabend {...props} />;
    case 'facet':
      return <ToolbarFacet {...props} />;
    // figureground draws nothing over the toolbar — it restyles the bar's fill
    // and its logo cluster instead, which happens in Toolbar.tsx because both
    // are properties of real elements rather than of an overlay.
    // notched likewise: it is a clip on the panel, not a layer in it.
    default:
      return null;
  }
}

// The clip path definition, mounted once by the Sidebar when `notched` is
// active. An SVG that defines a clipPath and draws nothing needs to be out of
// flow and invisible without being `display: none`, which would take the
// definition out of the render tree along with the element.
export function NotchClipDefs() {
  return (
    <svg width="0" height="0" aria-hidden="true" style={{ position: 'absolute', pointerEvents: 'none' }}>
      <defs>
        <clipPath id={NOTCH_CLIP_ID} clipPathUnits="userSpaceOnUse">
          <path d={notchPath()} />
        </clipPath>
      </defs>
    </svg>
  );
}

