import { describe, expect, it } from 'vitest';
import { isBlankCell, isNumericCell, isNumericColumn } from './tableAlign';

describe('isNumericCell', () => {
  it('accepts the shapes numbers actually take in documents', () => {
    for (const v of ['1', '42', '-3', '+7', '3.14', '0.5', '1,204', '1 204', '12.5%', '$99', '€1.250,00', '₫50000', '1.2e6', '(2.1)', '−5', '90°', '12‰']) {
      expect(isNumericCell(v), v).toBe(true);
    }
  });

  it('rejects prose that merely starts with a digit', () => {
    // The reason a bare startsWith(/\d/) check is not enough: this is a sentence,
    // and right-aligning a column of these would be the bug B5 is meant to avoid.
    for (const v of ['3 vấn đề còn lại', '2024 in review', '5 minutes', '1st place', '3x faster', '10 GB of logs']) {
      expect(isNumericCell(v), v).toBe(false);
    }
  });

  it('rejects text with no digits at all', () => {
    for (const v of ['', 'Tiếng Việt', '%', '$', 'abc', '-']) {
      expect(isNumericCell(v), v).toBe(false);
    }
  });

  it('trims surrounding whitespace before deciding', () => {
    expect(isNumericCell('  12.5%  ')).toBe(true);
  });
});

describe('isBlankCell', () => {
  it('treats empty and placeholder cells as carrying no value', () => {
    for (const v of ['', '   ', '-', '–', '—', 'n/a', 'N/A', 'na', 'null', 'nil']) {
      expect(isBlankCell(v), v).toBe(true);
    }
  });

  it('does not treat a real value as blank', () => {
    expect(isBlankCell('0')).toBe(false);
    expect(isBlankCell('none of the above')).toBe(false);
  });
});

describe('isNumericColumn', () => {
  it('right-aligns a column that is entirely numeric', () => {
    expect(isNumericColumn(['1,204', '87', '9'])).toBe(true);
  });

  it('lets a single prose cell veto the whole column', () => {
    // Unanimity, not majority: a paragraph shoved against the right edge is a
    // worse outcome than a numeric column left at the default alignment.
    expect(isNumericColumn(['1,204', '87', 'chưa có số liệu'])).toBe(false);
  });

  it('ignores blank and placeholder cells rather than letting them veto', () => {
    expect(isNumericColumn(['12', '—', '34', ''])).toBe(true);
  });

  it('needs at least two numbers before changing alignment', () => {
    // One number is not a column shape to scan, so re-aligning it only makes it
    // inconsistent with its neighbours.
    expect(isNumericColumn(['42'])).toBe(false);
    expect(isNumericColumn(['42', '—', ''])).toBe(false);
    expect(isNumericColumn(['42', '7'])).toBe(true);
  });

  it('does not right-align a column with no values at all', () => {
    expect(isNumericColumn([])).toBe(false);
    expect(isNumericColumn(['', '—'])).toBe(false);
  });
});
