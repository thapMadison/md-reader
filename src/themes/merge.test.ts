import { describe, expect, it } from 'vitest';
import { mergeThemeTokens } from './merge';
import { THEME_TOKEN_NAMES } from './contract';

describe('mergeThemeTokens', () => {
  it('produces a complete token set from a partial theme', () => {
    const merged = mergeThemeTokens('light', { '--link': '#ff0000' });
    for (const name of THEME_TOKEN_NAMES) {
      expect(merged[name]).toBeTruthy();
    }
    expect(merged['--link']).toBe('#ff0000');
  });

  it('falls back to the dark base for dark-mode themes', () => {
    const merged = mergeThemeTokens('dark', {});
    expect(merged['--bg']).toBe('#011627');
  });

  it('resolves the block-accent tokens from the dark base', () => {
    const merged = mergeThemeTokens('dark', {});
    expect(merged['--quote-accent']).toBe('#82aaff');
    expect(merged['--code-header-bg']).toBe('#0b2942');
    expect(merged['--heading-rule']).toBe('#1d3b53');
  });

  it('applies user overrides on top of the theme', () => {
    const merged = mergeThemeTokens('light', { '--link': '#ff0000' }, { '--link': '#00ff00' });
    expect(merged['--link']).toBe('#00ff00');
  });

  it('rejects unknown keys in overrides (allowlist boundary)', () => {
    const merged = mergeThemeTokens(
      'light',
      {},
      { '--not-a-real-token': 'red;} body{display:none}' } as Record<string, string>,
    );
    expect((merged as unknown as Record<string, string>)['--not-a-real-token']).toBeUndefined();
  });

  it('ignores non-string override values', () => {
    const merged = mergeThemeTokens('light', {}, { '--bg': 123 as unknown as string });
    expect(merged['--bg']).toBe('#ffffff');
  });
});
