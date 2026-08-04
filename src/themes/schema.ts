// Value-level validation for theme token values.
//
// This is the security boundary for imported themes: every value that reaches
// `style.setProperty` in ThemeContext passes through one of the predicates
// below. `merge.ts` allowlists the token *name*; this file constrains the
// token *value*. Both are needed — a permitted name carrying arbitrary CSS is
// still arbitrary CSS.
//
// Deliberately hand-written rather than schema-library-driven: the checks are
// regex predicates over strings, which a schema library would only wrap.

const COLOR_RE = /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

// Anchored at BOTH ends, and the argument list may only contain the characters
// a color function actually takes. An unanchored prefix test accepted
// `rgb(0,0,0) url(https://tracker.example/pixel)` — a value that satisfies
// "starts with rgb(" but ends up as a background that phones home when the
// theme is applied. The interior class excludes '(' so no second function can
// be smuggled in.
const FUNC_COLOR_RE = /^(rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color)\([0-9a-z%.,\-+/\s]*\)$/i;

export const isColorValue = (v: unknown): v is string =>
  typeof v === 'string' && (COLOR_RE.test(v) || FUNC_COLOR_RE.test(v));

// A single CSS length: a number with an optional unit. `calc()`, `var()` and
// multi-value shorthands are refused — this token is read back into JS to size
// an SVG and compute a negative margin, and a value only the browser can
// resolve would leave those two out of step. A bare `0` is legal CSS and is
// how a theme turns the chevron off.
const LENGTH_RE = /^-?(\d+\.?\d*|\.\d+)(em|rem|px|ch|ex)?$/;

export const isLengthValue = (v: unknown): v is string =>
  typeof v === 'string' && LENGTH_RE.test(v.trim());

// A font stack is a comma-separated list of family names, optionally quoted.
// Font tokens previously bypassed validation entirely — they are strings, so
// `v as string` accepted numbers and objects, and any CSS fragment rode through
// to setProperty. Characters that would let a value escape its declaration or
// start a nested function are refused outright.
const FONT_STACK_RE = /^[\w\s,'"-]+$/;

export const isFontStackValue = (v: unknown): v is string =>
  typeof v === 'string' &&
  v.trim().length > 0 &&
  v.length <= 300 &&
  FONT_STACK_RE.test(v) &&
  !v.includes(';');
