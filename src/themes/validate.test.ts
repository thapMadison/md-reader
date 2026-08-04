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

  it('accepts the block-accent and status tokens', () => {
    const result = validateThemeFile({
      name: 'Accents',
      tokens: {
        '--quote-accent': '#29a3e0',
        '--heading-accent-soft': 'rgba(41,163,224,0.32)',
        '--code-header-bg': '#e4ecf4',
        '--warn': '#c9860d',
        '--ok': '#2f8f63',
      },
    });
    expect(result.errors).toEqual([]);
    expect(result.tokens['--quote-accent']).toBe('#29a3e0');
    expect(result.tokens['--heading-accent-soft']).toBe('rgba(41,163,224,0.32)');
  });

  it('rejects a hostile CSS-injection value on a block-accent token', () => {
    const result = validateThemeFile({
      name: 'Hostile',
      tokens: { '--quote-accent': 'red;} body{display:none}' },
    });
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.tokens['--quote-accent']).toBeUndefined();
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

  // The color check was once an unanchored prefix test, so anything that merely
  // began with "rgb(" was accepted — including a trailing url() that turns a
  // theme import into an outbound request when the token is applied.
  it('rejects a color function with a url() smuggled in after it', () => {
    const result = validateThemeFile({
      name: 'Tracker',
      tokens: { '--bg': 'rgb(0,0,0) url(https://tracker.example/pixel.png)' },
    });
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.tokens['--bg']).toBeUndefined();
  });

  it('rejects a color function that is not closed', () => {
    const result = validateThemeFile({ name: 'Bad', tokens: { '--bg': 'rgb(0,0,0' } });
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.tokens['--bg']).toBeUndefined();
  });

  it('still accepts ordinary color functions', () => {
    const result = validateThemeFile({
      name: 'Fine',
      tokens: { '--bg': 'rgba(9, 105, 218, 0.05)', '--fg': 'oklch(62% 0.19 259)' },
    });
    expect(result.errors).toEqual([]);
  });

  // Font tokens previously skipped validation entirely and were cast with
  // `v as string`, so these reached setProperty untouched.
  it('rejects a non-string font stack', () => {
    const result = validateThemeFile({ name: 'Bad', tokens: { '--font-body': 42 } });
    expect(result.errors).toContain('--font-body: expected a font stack, got 42');
    expect(result.tokens['--font-body']).toBeUndefined();
  });

  it('rejects a font stack carrying a CSS injection', () => {
    const result = validateThemeFile({
      name: 'Hostile',
      tokens: { '--font-body': 'Georgia; background: url(https://tracker.example/p)' },
    });
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.tokens['--font-body']).toBeUndefined();
  });

  it('accepts the quoted, hyphenated stacks the builtin themes ship', () => {
    const result = validateThemeFile({
      name: 'Stacks',
      tokens: { '--font-ui': "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,sans-serif" },
    });
    expect(result.errors).toEqual([]);
  });
});
