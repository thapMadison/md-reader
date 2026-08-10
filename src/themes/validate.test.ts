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

  it('accepts a listed enum value', () => {
    const result = validateThemeFile({
      name: 'Enum',
      tokens: { '--table-style': 'horizontal', '--heading-marker-style': 'off' },
    });
    expect(result.errors).toEqual([]);
    expect(result.tokens['--table-style']).toBe('horizontal');
  });

  it('rejects an unlisted enum value and names the accepted ones', () => {
    const result = validateThemeFile({ name: 'Bad', tokens: { '--table-style': 'zebra' } });
    expect(result.errors).toContain('--table-style: expected one of grid, horizontal, minimal, got "zebra"');
  });

  // An enum token must not fall through to the color branch, which is the
  // unconditional fallback — a CSS-injection payload in an enum slot has to be
  // rejected on membership, not merely on failing to parse as a color.
  it('rejects arbitrary CSS in an enum token', () => {
    const result = validateThemeFile({
      name: 'Hostile',
      tokens: { '--table-style': 'grid; background: url(https://tracker.example/p)' },
    });
    expect(result.errors[0]).toMatch(/^--table-style: expected one of /);
    expect(result.tokens['--table-style']).toBeUndefined();
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

  // A truthiness check alone passed all of these, while the string test on the
  // way out still returned `undefined` — so the import site, which reads an
  // empty `errors` as a promise that `name` is present, built a theme with no
  // name and persisted it under a blank label.
  it.each([42, true, { a: 1 }, ['x']])('rejects a truthy non-string name: %s', (name) => {
    const result = validateThemeFile({ name, tokens: { '--bg': '#fff' } });
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.name).toBeUndefined();
  });

  it('rejects a whitespace-only name', () => {
    const result = validateThemeFile({ name: '   ', tokens: { '--bg': '#fff' } });
    expect(result.errors.length).toBeGreaterThan(0);
  });

  // The invariant the import site actually depends on, stated once: no errors
  // means `name` is a usable string.
  it('never reports zero errors without a usable name', () => {
    for (const name of [undefined, null, '', '  ', 0, 42, true, {}, []] as unknown[]) {
      const result = validateThemeFile({ name, tokens: { '--bg': '#fff' } });
      expect(result.errors.length === 0 && result.name === undefined).toBe(false);
    }
  });

  it('reports an unrecognised mode rather than silently reading it as light', () => {
    const result = validateThemeFile({ name: 'Typo', mode: 'drak', tokens: { '--bg': '#fff' } });
    expect(result.errors).toContain('mode: expected one of light, dark, got "drak"');
  });

  it('accepts an absent mode, defaulting to light', () => {
    const result = validateThemeFile({ name: 'No mode', tokens: { '--bg': '#fff' } });
    expect(result.errors).toEqual([]);
    expect(result.mode).toBe('light');
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
