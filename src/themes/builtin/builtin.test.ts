import { describe, expect, it } from 'vitest';
import { BUILTIN_THEMES, DEFAULT_THEME_ID } from './index';
import { FONT_STACK_TOKEN_NAMES, THEME_TOKEN_NAMES } from '../contract';
import { isColorValue } from '../schema';

// The contract's ThemeTokens type widens to Record<string, string> (TokenSpec.name
// is typed `string`), so the compiler cannot catch a built-in theme that's missing
// a token or has a typo'd key. These tests are the enforcement.
describe('built-in themes', () => {
  it.each(BUILTIN_THEMES.map((t) => [t.id, t] as const))('%s defines every contract token', (_id, theme) => {
    for (const name of THEME_TOKEN_NAMES) {
      expect(theme.tokens[name], `${theme.id} is missing ${name}`).toBeTruthy();
    }
  });

  it.each(BUILTIN_THEMES.map((t) => [t.id, t] as const))('%s uses valid color values for color tokens', (_id, theme) => {
    for (const name of THEME_TOKEN_NAMES) {
      if (FONT_STACK_TOKEN_NAMES.includes(name)) continue;
      expect(isColorValue(theme.tokens[name]), `${theme.id} ${name} = "${theme.tokens[name]}"`).toBe(true);
    }
  });

  it('has unique ids and keeps the default theme first', () => {
    const ids = BUILTIN_THEMES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids[0]).toBe(DEFAULT_THEME_ID);
  });

  it('keeps night-owl as the first dark theme (merge base contract)', () => {
    expect(BUILTIN_THEMES.find((t) => t.mode === 'dark')!.id).toBe('night-owl');
  });
});
