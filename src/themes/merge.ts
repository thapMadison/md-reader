import { THEME_TOKEN_NAMES, type ThemeTokens } from './contract';
import { BUILTIN_THEMES, DEFAULT_THEME_ID } from './builtin';

const BASE_LIGHT = BUILTIN_THEMES.find((t) => t.id === DEFAULT_THEME_ID)!.tokens;
const BASE_DARK = BUILTIN_THEMES.find((t) => t.mode === 'dark')!.tokens;

// Resolution order: base-mode defaults -> active theme's own tokens -> user overrides.
// Unknown keys in `overrides` are silently dropped — the allowlist boundary that
// keeps arbitrary CSS from ever reaching setProperty.
export function mergeThemeTokens(
  mode: 'light' | 'dark',
  themeTokens: Partial<ThemeTokens>,
  overrides: Partial<Record<string, unknown>> = {},
): ThemeTokens {
  const base = mode === 'dark' ? BASE_DARK : BASE_LIGHT;
  const merged = { ...base, ...themeTokens } as ThemeTokens;
  for (const name of THEME_TOKEN_NAMES) {
    const v = overrides[name];
    if (typeof v === 'string' && v.length > 0) {
      (merged as Record<string, string>)[name] = v;
    }
  }
  return merged;
}
