import { THEME_TOKEN_NAMES, type ThemeTokens } from './contract';
import { BUILTIN_THEMES, DEFAULT_THEME_ID, DEFAULT_DARK_THEME_ID } from './builtin';

const BASE_LIGHT = BUILTIN_THEMES.find((t) => t.id === DEFAULT_THEME_ID)!.tokens;
const BASE_DARK = BUILTIN_THEMES.find((t) => t.id === DEFAULT_DARK_THEME_ID)!.tokens;

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
  applyAccentInheritance(merged, themeTokens, overrides);
  return merged;
}

// The per-level chevron accents post-date --heading-accent, so a theme written
// against the older contract sets only the shared pair. Without this, such a
// theme would silently get the *contract default* chevron rather than its own
// accent: the per-level token is always present after the base spread, so it
// wins over the shared one and a CSS fallback never gets the chance to fire.
// Only levels the theme left unset inherit — an explicit per-level value wins.
function applyAccentInheritance(
  merged: ThemeTokens,
  themeTokens: Partial<ThemeTokens>,
  overrides: Partial<Record<string, unknown>>,
): void {
  const m = merged as Record<string, string>;
  for (const suffix of ['-accent', '-accent-soft'] as const) {
    const shared = `--heading${suffix}`;
    if (!(shared in themeTokens) && typeof overrides[shared] !== 'string') continue;
    for (const level of ['--h2', '--h3'] as const) {
      const perLevel = `${level}${suffix}`;
      const setByTheme = perLevel in themeTokens;
      const setByOverride = typeof overrides[perLevel] === 'string';
      if (!setByTheme && !setByOverride) m[perLevel] = m[shared];
    }
  }
}
