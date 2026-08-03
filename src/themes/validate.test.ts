import { describe, expect, it } from 'vitest';
import { validateThemeFile } from './validate';

describe('validateThemeFile', () => {
  it('accepts a valid theme', () => {
    const result = validateThemeFile({
      name: 'My Theme',
      mode: 'light',
      tokens: { '--bg': '#ffffff', '--fg': '#000000' },
    });
    expect(result.errors).toEqual([]);
    expect(result.name).toBe('My Theme');
    expect(result.tokens['--bg']).toBe('#ffffff');
  });

  it('rejects a non-color value with the exact design wording', () => {
    const result = validateThemeFile({
      name: 'Bad',
      tokens: { '--link': 'bluee' },
    });
    expect(result.errors).toContain('--link: expected a color, got "bluee"');
  });

  it('rejects a numeric color value', () => {
    const result = validateThemeFile({ name: 'Bad', tokens: { '--bg': 0 } });
    expect(result.errors).toContain('--bg: expected a color, got 0');
  });

  it('flags unknown tokens with a did-you-mean suggestion', () => {
    const result = validateThemeFile({
      name: 'Bad',
      tokens: { '--code-background': '#fff' },
    });
    expect(result.errors[0]).toMatch(/unknown token "--code-background"/);
    expect(result.errors[0]).toMatch(/did you mean --code-bg\?/);
  });

  it('rejects malformed non-object JSON', () => {
    const result = validateThemeFile(null);
    expect(result.errors).toEqual(['file is not a JSON object']);
  });

  it('rejects a hostile CSS-injection value as not a color', () => {
    const result = validateThemeFile({
      name: 'Hostile',
      tokens: { '--bg': 'red;} body{display:none}' },
    });
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.tokens['--bg']).toBeUndefined();
  });

  it('reports missing name', () => {
    const result = validateThemeFile({ tokens: { '--bg': '#fff' } });
    expect(result.errors).toContain('name: required, got nothing');
  });

  it('reports empty tokens', () => {
    const result = validateThemeFile({ name: 'Empty', tokens: {} });
    expect(result.errors).toContain('tokens: expected at least --bg and --fg, got none');
  });

  it('accepts a partial theme (only some tokens set)', () => {
    const result = validateThemeFile({ name: 'Partial', tokens: { '--link': '#123456' } });
    expect(result.errors).toEqual([]);
    expect(Object.keys(result.tokens)).toEqual(['--link']);
  });

  it('accepts --font-body without requiring color format', () => {
    const result = validateThemeFile({
      name: 'Fonty',
      tokens: { '--bg': '#fff', '--font-body': 'Georgia, serif' },
    });
    expect(result.errors).toEqual([]);
    expect(result.tokens['--font-body']).toBe('Georgia, serif');
  });
});
