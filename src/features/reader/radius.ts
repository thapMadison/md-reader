import type { CSSProperties } from 'react';

// The article's corner-radius scale, all derived from the theme's
// --surface-radius so a theme sets one value and every boxed surface follows.
//
// Three steps rather than one shared value, because the surfaces differ by an
// order of magnitude in size: an 8px radius that reads as a gently rounded card
// on a full-width code block eats most of a 0.15em inline-code chip, and the
// old hardcoded constants encoded exactly that relationship (9-10px fences and
// images, 8px quotes, 5px chips, 3px marks). The fractions below preserve those
// ratios against the 8px default, so a theme that never sets the token renders
// as it did before.
//
// calc() keeps the arithmetic in CSS rather than parsing the token in JS: the
// value can carry any unit the length validator allows, and only the browser
// knows what 0.6 * 1em is at this element. That is safe here — unlike
// --heading-marker, which is read back to size an SVG and compute a matching
// negative margin, nothing needs these numbers outside the style declaration.
//
// Every step is multiplicative, so --surface-radius: 0 zeroes all of them and a
// theme gets genuinely square corners everywhere rather than square cards with
// still-rounded chips.
//
// Lives in its own module rather than in Article.tsx because the surfaces that
// consume it are spread across CodeBlock, MermaidBlock and MarkdownImage too —
// and the whole point of the token is that they round in step.

// Blockquotes, callouts, <details> — the mid-size surfaces, at the token itself.
export const SURFACE_RADIUS = 'var(--surface-radius)';

// Fences, mermaid frames and images sit a touch rounder, as they did at 9-10 vs 8.
export const CARD_RADIUS = 'calc(var(--surface-radius) * 1.125)';

// Inline code, kbd, task checkboxes, small buttons — the 5/8 ratio from the old
// constants.
export const CHIP_RADIUS = 'calc(var(--surface-radius) * 0.625)';

// Highlight marks, the smallest boxed thing in the article (3/8).
export const MARK_RADIUS = 'calc(var(--surface-radius) * 0.375)';

// Whether those radii are drawn as rounds or as 45-degree cuts. Set on every
// surface that sets a radius above, because `corner-shape` only reshapes the
// corners of the element it is declared on — there is no inheritance to lean on.
//
// React drops unknown CSS properties from a style object silently, and
// `cornerShape` is not in the DOM typings yet, so this is spelled as a
// CSSProperties fragment spread into each surface rather than a bare value: the
// cast happens once, here, instead of at every call site.
//
// A browser without `corner-shape` support ignores the declaration and keeps the
// `border-radius` beside it, so a beveled theme falls back to rounded corners.
// That is the whole fallback story — there is no feature test and no JS branch,
// because a theme's corner treatment is decoration and the degraded state is a
// perfectly good design rather than a broken one.
export const CORNER_SHAPE = { cornerShape: 'var(--surface-corner)' } as CSSProperties;
