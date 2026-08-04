import { describe, expect, it } from 'vitest';
import { BUILTIN_THEMES, DEFAULT_THEME_ID } from './index';
import { TOKEN_CONTRACT, THEME_TOKEN_NAMES } from '../contract';
import { isColorValue, isFontStackValue, isLengthValue } from '../schema';

// The contract's ThemeTokens type widens to Record<string, string> (TokenSpec.name
// is typed `string`), so the compiler cannot catch a built-in theme that's missing
// a token or has a typo'd key. These tests are the enforcement.
describe('built-in themes', () => {
  it.each(BUILTIN_THEMES.map((t) => [t.id, t] as const))('%s defines every contract token', (_id, theme) => {
    for (const name of THEME_TOKEN_NAMES) {
      expect(theme.tokens[name], `${theme.id} is missing ${name}`).toBeTruthy();
    }
  });

  // Driven off each token's declared type rather than "font tokens, everything
  // else is a color", so adding a third type to the contract makes this test
  // check it instead of silently validating it as a color.
  const PREDICATES = {
    color: isColorValue,
    'font-stack': isFontStackValue,
    length: isLengthValue,
  } as const;

  it.each(BUILTIN_THEMES.map((t) => [t.id, t] as const))('%s uses valid values for every token type', (_id, theme) => {
    for (const spec of TOKEN_CONTRACT) {
      const value = theme.tokens[spec.name];
      expect(
        PREDICATES[spec.type](value),
        `${theme.id} ${spec.name} = "${value}" (expected a ${spec.type})`,
      ).toBe(true);
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
