import { useId, type CSSProperties } from 'react';
import type { ChromePattern } from '@/features/theming/ThemeContext';
import type { LayoutMode } from '@/hooks/useBreakpoint';

// Decorative patterns for the two chrome surfaces: the 48px toolbar and the
// 240px sidebar. Selected by --chrome-pattern, tuned by --chrome-pattern-opacity
// and --chrome-pattern-ink.
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

// Scales a layer's own alpha by the theme's strength multiplier. Each motif's
// alphas are authored at the reference density, so this is the only place the
// theme's number enters — the geometry never changes, only its weight.
//
// Clamped at 1 because an alpha above it is invalid rather than merely bright:
// the value lands in an rgba() and a browser drops the whole declaration, which
// would make a layer vanish at exactly the moment a theme asked for more of it.
const alpha = (base: number, scale: number): number => Math.min(1, Number((base * scale).toFixed(4)));

// The pattern's ink, in the direction the theme declared. `light` is white ink
// for a dark chrome, `dark` is black ink for a light one.
//
// This is the failure the ink token exists to prevent, so it is worth stating
// plainly: white at 5% over a near-white chrome is invisible, and black at 5%
// over a near-black chrome is invisible. Neither degrades into "a bit subtle" —
// they degrade into nothing at all, which reads on screen as the pattern having
// silently failed to load.
const inkColor = (ink: 'light' | 'dark', a: number): string =>
  ink === 'light' ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`;

// The theme's accent, thinned. Used by the motifs whose figure is a color rather
// than a texture (aura, rulework, databend), where ink would read as a smudge.
const accent = (a: number): string => `color-mix(in srgb, var(--link) ${Math.round(a * 100)}%, transparent)`;

// Layers that always behave the same way. Spread into every style object below
// rather than repeated, so a layer that forgets to be inert is a visible
// omission rather than a missing line among twenty.
const LAYER: CSSProperties = { position: 'absolute', inset: 0, pointerEvents: 'none' };

export interface PatternProps extends ChromePattern {
  mode: LayoutMode;
}

// The four motifs that restructure the panel rather than overlaying it.
//
// Each one depends on something the mobile drawer does not have: `notched` and
// `figureground` place vertices by panel height, which the drawer changes;
// `databend` tears bands across a panel that, as a drawer, slides over the
// content instead of sitting beside it. `unprinted` is the exception in kind —
// it makes the chrome transparent, which on a drawer floating above the article
// would leave the file list unreadable over body text. All four fall back to
// `none` there, which is a real fallback: the drawer keeps its solid chrome.
const STRUCTURAL = new Set(['notched', 'unprinted', 'figureground', 'databend']);

export const isStructuralPattern = (pattern: string): boolean => STRUCTURAL.has(pattern);

// What a panel should actually draw, once the mobile gate is applied. Both
// panels and every consumer that branches on the pattern (the sidebar's row
// shapes, the toolbar's glitched wordmark) route through this, so the gate can
// never be applied in one place and forgotten in another.
export function effectivePattern(pattern: string, mode: LayoutMode): string {
  if (mode === 'mobile' && isStructuralPattern(pattern)) return 'none';
  return pattern;
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

// The two channel-separation colors every databend layer uses. Fixed by the app
// rather than taken from the theme, and deliberately so: this motif is imitating
// a specific artifact — an analog signal whose red and blue channels have come
// apart — and the artifact is only legible in the colors it actually happens in.
// A theme-tinted "glitch" reads as a decorative stripe.
const GLITCH_RED = 'rgba(255,70,90,';
const GLITCH_CYAN = 'rgba(60,220,255,';

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

// ---------------------------------------------------------------------------
// Facet — the angled planes cut across both chrome surfaces
// ---------------------------------------------------------------------------
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
// The structure follows the reference artwork's own markup, which builds its
// canvas from four flat facets: large wedges anchored to the corners, a couple of
// them darkening and a couple lightening, plus one narrow full-height sliver. The
// sidebar keeps the wedges and drops the sliver — it is the one element that has
// to cross the panel top to bottom, and there is no route for it that misses the
// file names; the toolbar, having no column of text to protect, keeps it. Two
// details in the reference are load-bearing and were arrived at only by reading it:
//
//   * Facets carry *different directions*, not one tint at several alphas — black
//     for the shadow planes, white for the highlights. A single direction at three
//     opacities can only ever step one way, which is why the first version of this
//     geometry read as a fade rather than as folded planes.
//   * Every plane spans the full box corner to corner. They read as folds in one
//     continuous surface precisely because none of them is a shape sitting *on*
//     the panel; they are cuts *through* it.
//
// There used to be a second color token, --chrome-plane, that only this pattern
// read; it was folded into the shared opacity knob so a custom theme has one dial
// for every chrome decoration instead of a second one that only mattered here.

// Which direction a facet moves the surface it sits on.
//
// `shadow` deepens toward black, `highlight` lifts toward white. Two tones rather
// than one is what lets these read as folds: a fold has a lit face and a shaded
// face, and a stack of same-direction tints has neither. Both are direction only —
// neither carries the theme's hue — because a fold's shading is a property of the
// light, not of the surface it falls on, the same way every other pattern's ink is
// just light-or-dark rather than theme-colored. Unlike that ink, though, a facet
// ignores --chrome-pattern-ink entirely: ink picks the one direction that stays
// visible against a chrome of known lightness, while a fold needs both directions
// at once regardless of it.
type FacetTone = 'shadow' | 'highlight';

interface Facet {
  readonly tone: FacetTone;
  // The layer's own alpha at the reference density, the same convention every
  // other motif's alphas follow — facetLayerStyle scales it by opacityScale.
  readonly strength: number;
  readonly polygon: string;
}

// Where the planes may be drawn, kept off the file names by geometry rather than
// by a weaker tint. With shadows a flat black, a facet at these strengths actually
// *raises* the contrast of --chrome-muted against the darkened ground rather than
// eating it — a stack of them measures higher than bare chrome, not lower. The
// geometric constraint is kept anyway: it is what stops a facet from visually
// cutting through a name regardless of what any single contrast number says, and
// it is what the facet tests check.
//
// The library list is a tighter constraint than it looks: rows are 48px with
// their size/mtime line, so seven files reach ~430px down an 810px panel. An
// early version entered at 54% and was caught on screen cutting through two file
// names — rendering candidates against a *full* list, not the two or three a
// quick test tends to have, is what surfaced it.
//
// The wedges below therefore take their mass from the bottom two corners and
// meet low, leaving the upper panel — where the names are — on flat --chrome.
// Measured: every file name sits on bare chrome at 6.86, the full contrast the
// theme's own colors give, because no facet reaches the column at all. The
// storage line at the very bottom is the one exception and is documented on the
// highlight facet below.
export const SIDEBAR_FACETS: readonly Facet[] = [
  // Large wedge rising from the bottom-left corner: the main shaded face.
  { tone: 'shadow', strength: 0.09, polygon: 'polygon(0% 56%, 100% 98%, 100% 100%, 0% 100%)' },
  // Counter-wedge from the bottom-right, crossing the first. The overlap is what
  // produces a third tone without a third layer, as it does in the reference.
  //
  // Stops at 92% rather than running to the bottom edge, which keeps the heaviest
  // facet off the storage line at ~94% — trimmed for the same reason the geometry
  // stays clear of the file names: legibility should not depend on a stack of
  // alphas happening to net out in the right direction.
  { tone: 'shadow', strength: 0.295, polygon: 'polygon(100% 78%, 100% 92%, 18% 92%)' },
  // Lit face, catching the left flank above the crossing.
  //
  // This one and the large wedge at the top of the list both run to the bottom
  // edge, so the storage line is not on bare chrome the way the file names are.
  // Measured at the reference density (opacityScale = 1) on azure-corporate: 6.86
  // on bare chrome, 7.04 under the large wedge alone, 4.97 where this lit face
  // crosses it — see 'holds the storage line' in chromePattern.test.tsx. All
  // three clear 4.5; the black shadow only ever darkens the ground *away* from
  // --chrome-muted's blue, so stacking facets here cannot repeat the failure the
  // old blue-tinted plane had to be measured against.
  //
  // The trailing vertex sits at 92% rather than at the floor, which trims the
  // crossing back off the panel's very edge; it narrows where the two layers meet
  // without changing what the meeting measures. The 'holds the storage line' test
  // pins all three depths and requires each to be uniform, so a fourth layer, a
  // deeper strength, or a wedge extended past 92% fails loudly rather than
  // drifting unnoticed.
  { tone: 'highlight', strength: 0.1192, polygon: 'polygon(0% 80%, 46% 100%, 12% 100%, 0% 92%)' },
];

// Toolbar: 48px tall and full width, so its facets are near-vertical shears
// rather than the shallow crossings the sidebar can host. Anchored to the right
// half — past the filename, before the theme picker — so the geometry crosses the
// bar's empty middle rather than any of its text.
//
// Full-height by construction (every vertex is at 0% or 100%), which is what
// makes them read as continuous cuts rather than as chevrons floating in a strip.
export const TOOLBAR_FACETS: readonly Facet[] = [
  { tone: 'shadow', strength: 0.53, polygon: 'polygon(52% 0%, 68% 0%, 50% 100%, 66% 100%)' },
  { tone: 'shadow', strength: 0.195, polygon: 'polygon(68% 0%, 100% 0%, 100% 100%, 82% 100%)' },
  { tone: 'highlight', strength: 0.1092, polygon: 'polygon(44% 0%, 52% 0%, 66% 100%, 58% 100%)' },
  { tone: 'highlight', strength: 0.2312, polygon: 'polygon(40% 0%, 42.5% 0%, 56.5% 100%, 54% 100%)' },
];

// One layer per facet, clipped to its polygon — LAYER's absolute/inert posture,
// with the tone's direction as a plain rgba scaled the same way alpha() scales
// every other motif.
export function facetLayerStyle(facet: Facet, opacityScale: number): CSSProperties {
  const rgb = facet.tone === 'shadow' ? '0,0,0' : '255,255,255';
  return {
    ...LAYER,
    background: `rgba(${rgb},${alpha(facet.strength, opacityScale)})`,
    clipPath: facet.polygon,
  };
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

// ---------------------------------------------------------------------------
// Structural styling
//
// The four structural patterns cannot be expressed as overlays alone: they
// change the panel's fill, its silhouette, or the shape of controls inside it.
// Those are properties of elements the panels own, so the panels apply them —
// but the *values* live here, beside the overlays they have to agree with.
// ---------------------------------------------------------------------------

// Repeating notch geometry for the sidebar's right edge, as an SVG clipPath.
//
// clip-path: polygon() was the obvious approach and does not work here. A polygon
// takes fixed vertices, so the notches would have to be enumerated for a specific
// panel height and would crowd or stretch on any other — a sidebar is as tall as
// the window.
//
// clipPathUnits="objectBoundingBox" was the second attempt and is just as wrong,
// for the opposite reason: normalized units scale *with* the box, so the notches
// grow taller on a taller window instead of repeating. An edge treatment has to
// hold its size and change its count. So the path is built in user space against
// a generous height and simply runs past the bottom of a shorter panel — the
// clip ignores whatever falls outside the box.
//
// The cost, and it is the one to remember: clip-path clips the panel's box
// shadow and its border along with everything else. See NOTCHED_SIDEBAR.
export const NOTCH_CLIP_ID = 'md-chrome-notch';

// The four numbers, read straight off the spec's worked polygon — its right-edge
// vertices run 88 / 105 / 211 / 228, then repeat from 337.
//
// All in px rather than fractions, because each is about how the cut reads
// against the file rows beside it, and those are a fixed number of pixels tall.
// Shallower than the spec's 20px. At full depth the cut reads as a bite taken
// out of the panel; at 12 it reads as a step in its edge, which is what the
// motif is after — and it leaves the file names, which start 14px in from this
// edge, with room that does not depend on the notch happening to miss them.
const NOTCH_DEPTH = 12;
// The edge before the first cut, and the run it holds between one cut and the
// next: 337 - 228. These are two different measurements and were briefly one
// constant, which put the period 39px short and overlapped every notch with the
// one after it.
const NOTCH_LEAD = 88;
const NOTCH_GAP = 109; // 337 - 228
// How long the edge stays cut in: 211 - 105. Long enough to read as a step in
// the silhouette rather than as a nick.
const NOTCH_CUT = 106;
// The diagonal in and back out: 105 - 88. A notch with vertical walls reads as
// damage; the slope is what makes it geometry, and it matches the sheared planes
// and beveled corners the rest of this theme family is built on.
const NOTCH_SLOPE = 17;
// Derived from the segments rather than declared beside them, so the cycle can
// never disagree with what one cycle actually consumes.
const NOTCH_PERIOD = NOTCH_SLOPE * 2 + NOTCH_CUT + NOTCH_GAP;
// Tall enough to cover any plausible window, since the path is in user space and
// the surplus is simply clipped away.
const NOTCH_SPAN = 4000;
const NOTCH_WIDTH = 240;

// The notch path, built once. Down the right edge: hold straight, cut in on a
// diagonal, hold cut, come back out.
function notchPath(): string {
  const inset = NOTCH_WIDTH - NOTCH_DEPTH;
  const parts: string[] = ['M0,0', `L${NOTCH_WIDTH},0`];
  for (let y = NOTCH_LEAD; y < NOTCH_SPAN; y += NOTCH_PERIOD) {
    parts.push(`L${NOTCH_WIDTH},${y}`);
    parts.push(`L${inset},${y + NOTCH_SLOPE}`);
    parts.push(`L${inset},${y + NOTCH_SLOPE + NOTCH_CUT}`);
    parts.push(`L${NOTCH_WIDTH},${y + NOTCH_SLOPE * 2 + NOTCH_CUT}`);
  }
  parts.push(`L${NOTCH_WIDTH},${NOTCH_SPAN}`, `L0,${NOTCH_SPAN}`, 'Z');
  return parts.join(' ');
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

// How much room the notches need on the content side. Text set hard against the
// deepest point of a notch reads as touching it, so the reading column is pushed
// clear of the whole cut rather than to its floor — comfortably more than
// NOTCH_DEPTH, which is why this is not simply that number.
export const NOTCH_CONTENT_INSET = 24;

// The toolbar's half of the motif: a step down out of the bar's bottom edge,
// ending where the sidebar's own edge begins. The two cuts meet at that corner,
// so the silhouette reads as one continuous frame rather than as two panels that
// each happen to be notched.
//
// Shallower than the sidebar's cut, and that is a constraint rather than a
// preference. The bar is 48px tall and its controls are vertically centered in
// it, so a cut deep enough to be worth seeing is also deep enough to reach the
// wordmark's descenders — the first version took 12px off the whole left 240px
// and clipped the logo and "MDReader" with it. 5px sits below the text box and
// still steps the edge visibly.
const TOOLBAR_NOTCH_DEPTH = 5;

// A percentage would slide this across the logo as the window resizes, which is
// the failure this motif is most prone to — so the vertices are in px, measured
// from the left, and the shape stays put.
//
// Stated as a polygon rather than through the shared clipPath: this is one cut
// at a known place, not a repeat, and inlining it keeps the toolbar from having
// to mount the sidebar's <defs>.
export const NOTCHED_TOOLBAR: CSSProperties = {
  clipPath: `polygon(0 0, 100% 0, 100% 100%, ${NOTCH_WIDTH + NOTCH_SLOPE}px 100%, ${NOTCH_WIDTH}px calc(100% - ${TOOLBAR_NOTCH_DEPTH}px), 0 calc(100% - ${TOOLBAR_NOTCH_DEPTH}px))`,
  // Same reason the sidebar drops its border: a hairline cannot trace this
  // silhouette, so the silhouette replaces it.
  borderBottom: 'none',
};

// Panel-level overrides, keyed by pattern. Returned as partial style objects the
// panels spread over their own base styles.

// `unprinted` empties the chrome: no fill, and every edge becomes a dashed rule.
// The panel's own --chrome is deliberately ignored — that is the motif. What it
// does keep is --chrome-border, so the drawing is still in the theme's palette.
export function unprintedPanelStyle(ink: 'light' | 'dark', edge: 'right' | 'bottom'): CSSProperties {
  const rule = `1px dashed ${inkColor(ink, 0.45)}`;
  return {
    backgroundColor: 'transparent',
    ...(edge === 'right' ? { borderRight: rule } : { borderBottom: rule }),
  };
}

// `figureground` swaps the sidebar's fill for the page background — the masses
// of --chrome are drawn as overlay layers instead. The right edge drops to a
// plain hairline: with the fill gone there is no panel edge left to state, only
// the boundary between two areas of the same color.
export const FIGUREGROUND_SIDEBAR: CSSProperties = {
  backgroundColor: 'var(--bg)',
  borderRight: '1px solid var(--border)',
};

// The toolbar's half of the same swap: the bar takes the page background, and
// the logo cluster becomes the dark mass instead — a tab of --chrome with its
// trailing edge sheared, holding light text.
export const FIGUREGROUND_TOOLBAR: CSSProperties = {
  backgroundColor: 'var(--bg)',
  borderBottom: '1px solid var(--border)',
};

export const FIGUREGROUND_LOGO_TAB: CSSProperties = {
  background: 'var(--chrome)',
  color: 'var(--chrome-fg)',
  clipPath: 'polygon(0 0, 100% 0, calc(100% - 23px) 100%, 0 100%)',
  paddingRight: 30,
  paddingLeft: 14,
  marginLeft: -14,
  alignSelf: 'stretch',
};

// The first file row's clearance under the upper figureground mass. The mass
// ends at 154px on the left and 97px on the right, so a row placed at the top of
// the list would sit on the diagonal — this pushes it below the deepest point.
// The spec calls this out as a mistake already made once; the number is what
// keeps it from recurring.
export const FIGUREGROUND_LIST_OFFSET = 26;

// The wordmark's channel separation. A text-shadow rather than a transform, so
// the real glyphs never move — the red and cyan ghosts are copies offset behind
// fully legible text. That distinction is the whole safety argument for shipping
// a glitch motif in a control surface.
export const DATABEND_WORDMARK: CSSProperties = {
  textShadow: `1.5px 0 ${GLITCH_RED}0.45), -1.5px 0 ${GLITCH_CYAN}0.45)`,
};

export const DATABEND_LOGO: CSSProperties = {
  boxShadow: `3px 0 0 ${GLITCH_RED}0.35), -3px 0 0 ${GLITCH_CYAN}0.35)`,
};

// The active row, notched on its trailing edge as if a scanline had displaced
// it. Applied on top of whatever shape --chrome-accent-shape chose, because it
// is a different question: the accent shape is the theme's geometry, this is the
// motif's damage.
export const DATABEND_ACTIVE_ROW: CSSProperties = {
  clipPath: 'polygon(0 0, 100% 0, 100% 40%, 97% 40%, 97% 58%, 100% 58%, 100% 100%, 0 100%)',
};

// `unprinted` redraws the controls as construction lines too: dashed outlines in
// the accent, no fill. Rows that carry text take a solid page-colored background
// so the diagonal guides do not run through the words.
export const UNPRINTED_BUTTON: CSSProperties = {
  border: '1.2px dashed var(--link)',
  color: 'var(--link)',
  background: 'var(--bg)',
};

export const UNPRINTED_TEXT_ROW: CSSProperties = {
  background: 'var(--bg)',
};

// The sidebar's dimension callout, the counterpart to the toolbar's. Bottom
// rather than top, and lifted clear of the footer block — the spec flags it as
// something to check, and the footer is about 64px tall with its storage line
// and drop hint.
export function unprintedSidebarNote(ink: 'light' | 'dark'): CSSProperties {
  return {
    position: 'absolute',
    right: 6,
    bottom: 96,
    pointerEvents: 'none',
    fontFamily: 'var(--font-mono)',
    fontSize: 9,
    color: inkColor(ink, 0.45),
  };
}

// Applied to the sidebar panel when `notched` is active.
//
// The border goes with it, and not for cosmetic reasons: clip-path cuts the
// element's box including its border, so a bordered panel under this clip shows
// the border following the notches on the flat stretches and disappearing into
// raw cut edges at each bite. A single hairline cannot trace this silhouette, so
// the silhouette replaces it.
//
// The panel's box-shadow has the same problem and is handled where it is set —
// the sidebar only casts one as a mobile drawer, and `notched` is disabled
// there, so the two never coincide.
export const NOTCHED_SIDEBAR: CSSProperties = {
  clipPath: `url(#${NOTCH_CLIP_ID})`,
  borderRight: 'none',
};
