import { THEME_TOKEN_NAMES, type ThemeTokens } from './contract';
import { isValidTokenValue } from './schema';
import { BUILTIN_THEMES, DEFAULT_THEME_ID, DEFAULT_DARK_THEME_ID } from './builtin';

const BASE_LIGHT = BUILTIN_THEMES.find((t) => t.id === DEFAULT_THEME_ID)!.tokens;
const BASE_DARK = BUILTIN_THEMES.find((t) => t.id === DEFAULT_DARK_THEME_ID)!.tokens;

// Resolution order: base-mode defaults -> active theme's own tokens -> user overrides.
// Unknown keys are silently dropped — the allowlist boundary that keeps arbitrary
// CSS from ever reaching setProperty.
//
// BOTH token sources are filtered, not just `overrides`. `themeTokens` used to be
// spread raw on the assumption it had already passed validateThemeFile at import
// time. That assumption does not survive a round-trip: a custom theme's tokens are
// persisted to IndexedDB as a bare Record<string, string> and re-enter here on the
// next app load, so anything that edits the stored record (devtools, a corrupt
// profile, a future migration, or a theme saved by an older build with looser
// rules) reached setProperty with no check at all. Validation is cheap and this is
// the only place all token sources converge — so it happens here, every time.
export function mergeThemeTokens(
  mode: 'light' | 'dark',
  themeTokens: Partial<ThemeTokens>,
  overrides: Partial<Record<string, unknown>> = {},
): ThemeTokens {
  const base = mode === 'dark' ? BASE_DARK : BASE_LIGHT;
  const merged = { ...base } as ThemeTokens;
  // Names that survived validation from either source. Accent inheritance keys
  // off this rather than off `name in themeTokens`, so a token the theme *tried*
  // to set but that failed validation correctly counts as unset and inherits,
  // instead of being treated as an explicit value that was never applied.
  const applied = new Set<string>();
  for (const source of [themeTokens, overrides]) {
    for (const name of THEME_TOKEN_NAMES) {
      const v = (source as Record<string, unknown>)[name];
      if (typeof v === 'string' && v.length > 0 && isValidTokenValue(name, v)) {
        (merged as Record<string, string>)[name] = v;
        applied.add(name);
      }
    }
  }
  applyAccentInheritance(merged, applied);
  return merged;
}

// The per-level marker accents post-date --heading-accent, so a theme written
// against the older contract sets only the shared pair. Without this, such a
// theme would silently get the *contract default* marker rather than its own
// accent: the per-level token is always present after the base spread, so it
// wins over the shared one and a CSS fallback never gets the chance to fire.
// Only levels the theme left unset inherit — an explicit per-level value wins.
//
// Covers h2 through h6: every level that draws a marker needs the same
// fallback, or a theme setting only --heading-accent would tint its h2/h3 and
// leave h4-h6 on the contract blue.
const MARKER_LEVELS = ['--h2', '--h3', '--h4', '--h5', '--h6'] as const;

function applyAccentInheritance(merged: ThemeTokens, applied: Set<string>): void {
  const m = merged as Record<string, string>;
  for (const suffix of ['-accent', '-accent-soft'] as const) {
    const shared = `--heading${suffix}`;
    if (!applied.has(shared)) continue;
    for (const level of MARKER_LEVELS) {
      const perLevel = `${level}${suffix}`;
      if (!applied.has(perLevel)) m[perLevel] = m[shared];
    }
  }
}

