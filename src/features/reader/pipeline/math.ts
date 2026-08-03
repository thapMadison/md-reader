// Math is opt-in per document. KaTeX's stylesheet pulls in ~1.2MB of web fonts,
// which is far too much to load for the majority of documents that contain no
// formulas at all — so the plugin and its CSS are only fetched once a document
// is known to use `$$…$$`.
//
// Only `$$…$$` counts. Single-`$` inline math is deliberately disabled (see
// `MATH_OPTIONS`), so a lone `$` must never trigger the KaTeX download either;
// otherwise every document mentioning a price would pay the font cost.

// Fenced code and inline code are stripped first: a shell snippet is full of
// `$VAR` and `$$` (the PID variable), and none of it is math.
const FENCED_CODE_RE = /```[\s\S]*?```|~~~[\s\S]*?~~~/g;
const INLINE_CODE_RE = /`[^`\n]*`/g;

// `$$` … `$$` with at least one non-`$` character between the delimiters.
const DISPLAY_MATH_RE = /\$\$[^$]+?\$\$/;

/** True when the document contains display math worth loading KaTeX for. */
export function hasMath(source: string): boolean {
  const prose = source.replace(FENCED_CODE_RE, '').replace(INLINE_CODE_RE, '');
  return DISPLAY_MATH_RE.test(prose);
}

// `singleDollarTextMath: false` is the important half of this config. With the
// default (`$…$` enabled) any paragraph containing two dollar amounts — "costs
// $5 and $10" — is silently parsed as a formula and rendered as garbled math.
// Verified against remark-math directly. Turning it off keeps currency in prose
// intact; `$$…$$` still covers both inline and display formulas.
export const MATH_OPTIONS = { singleDollarTextMath: false } as const;
