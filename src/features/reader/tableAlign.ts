// Auto right-alignment for numeric table columns.
//
// A column of numbers is read by comparing digits in the same place value, which
// only works when the digits line up — right-aligned, the ones column sits under
// the ones column. Left-aligned numbers of differing width put the ones digit of
// "9" under the hundreds digit of "1,204", so the reader has to measure each
// number instead of scanning the shape of the column.
//
// Markdown can already express this with a `---:` delimiter row, and that always
// wins — remark-gfm emits it as an inline style, which outranks the stylesheet
// rule this feeds. What follows only covers the far more common case of a table
// pasted from a spreadsheet or emitted by a tool, where no alignment row was
// written at all.

/**
 * Whether one cell's text reads as a number.
 *
 * Deliberately broader than `parseFloat`, because the things that appear in a
 * numeric column of a real document are rarely bare numerals:
 *
 *   1,204   12.5%   $99   -3   (2.1)   1.2e6
 *
 * and deliberately narrower than "starts with a digit", which would swallow
 * "3 vấn đề còn lại" — prose that happens to open with a numeral.
 *
 * The shape accepted is: optional leading sign or opening paren, optional
 * currency symbol, digits with optional thousands separators and decimals, an
 * optional exponent, and an optional trailing unit-ish suffix. Anything with
 * interior letters, or spaces beyond the separator set, fails — which is what
 * keeps prose out.
 *
 * The separators are written as escapes rather than literal characters:
 * U+00A0 (no-break space) and U+202F (narrow no-break space) are both real
 * thousands separators in fr-FR and ru-RU, but they are invisible in source, so
 * a future reader would take them for ordinary spaces or delete one by accident.
 */
const NUMERIC_CELL =
  /^[(\-+−]?\s*[$€£¥₫]?\s*\d[\d\u00a0\u202f,._ ]*(?:[.,]\d+)?\s*(?:[eE][+-]?\d+)?\s*[%‰°]?\s*\)?$/u;

// Cells that carry no value at all. A blank or a dash placeholder must not veto
// a column's numeric-ness — a half-filled numeric column is still numeric, and
// treating "—" as prose would left-align the whole thing.
const BLANK_CELL = /^(?:[-–—]|n\/?a|null|nil)?$/i;

export function isNumericCell(text: string): boolean {
  const t = text.trim();
  if (t === '') return false;
  // A lone "-" is a placeholder, not the number minus-nothing.
  if (BLANK_CELL.test(t)) return false;
  // Must contain at least one digit: the pattern above can otherwise match a
  // bare currency symbol or a stray "%".
  if (!/\d/.test(t)) return false;
  return NUMERIC_CELL.test(t);
}

export function isBlankCell(text: string): boolean {
  return BLANK_CELL.test(text.trim());
}

// A column needs at least this many numbers before its alignment is worth
// changing. In a one-row table there is no column shape to scan, so re-aligning
// only makes it inconsistent with its neighbours.
const MIN_NUMERIC_ROWS = 2;

/**
 * Decides whether a body column is numeric enough to right-align.
 *
 * `cells` is the text of every body cell in one column.
 *
 * A column qualifies only if *every* non-blank cell is numeric. There is no
 * majority threshold on purpose: the failure mode of getting this wrong is a
 * paragraph of prose jammed against the right edge, which is far more jarring
 * than a numeric column left at the default alignment. Requiring unanimity means
 * one prose cell opts the whole column out, which is the safe direction to err.
 */
export function isNumericColumn(cells: readonly string[]): boolean {
  let numeric = 0;
  for (const text of cells) {
    if (isBlankCell(text)) continue;
    if (!isNumericCell(text)) return false;
    numeric += 1;
  }
  return numeric >= MIN_NUMERIC_ROWS;
}
