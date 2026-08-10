import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { BUILTIN_THEMES, DEFAULT_THEME_ID, DEFAULT_DARK_THEME_ID } from '@/themes/builtin';
import { THEME_TOKEN_NAMES, METRIC_CONTRACT, TOKEN_CONTRACT, type ThemeTokens } from '@/themes/contract';
import type { Theme } from '@/themes/types';
import { mergeThemeTokens } from '@/themes/merge';
import { validateThemeFile } from '@/themes/validate';
import { useStorage } from '@/services/storage/StorageContext';

export interface CustomTheme extends Theme {
  custom: true;
}

interface ThemeContextValue {
  themes: Theme[];
  customThemes: CustomTheme[];
  activeThemeId: string;
  activeTheme: Theme;
  // Post-merge tokens — the same values written to the document root. Exposed
  // because --heading-marker-style has to be read back in JS, not just consumed
  // as a CSS variable: it decides whether the chevron element is rendered at all.
  resolvedTokens: ThemeTokens;
  fontSize: number;
  contentWidth: number;
  lineHeight: number;
  setThemeId: (id: string) => void;
  setFontSize: (px: number) => void;
  setContentWidth: (px: number) => void;
  setLineHeight: (ratio: number) => void;
  importErrors: string[];
  importTheme: (raw: unknown) => void;
  reportImportError: (message: string) => void;
  clearImportErrors: () => void;
  removeCustomTheme: (id: string) => void;
  exportTheme: (theme: Theme) => { name: string; mode: string; tokens: ThemeTokens };
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

// The contract's own defaults, looked up rather than restated. Every one of
// these backs a non-throwing hook below, which is the only thing that reads them
// — they are deliberately not exported: a consumer wanting a token's default
// should call the hook, so the fallback stays in one place instead of being
// re-implemented at each call site.
const HEADING_MARKER_STYLE_DEFAULT = TOKEN_CONTRACT.find(
  (t) => t.name === '--heading-marker-style',
)!.default;

const FONT_SPEC = METRIC_CONTRACT.find((m) => m.name === '--fs')!;
const WIDTH_SPEC = METRIC_CONTRACT.find((m) => m.name === '--cw')!;
const LINE_HEIGHT_SPEC = METRIC_CONTRACT.find((m) => m.name === '--lh')!;

const clampTo = (spec: typeof FONT_SPEC, value: number) => Math.min(spec.max, Math.max(spec.min, value));

export function ThemeProvider({ children }: { children: ReactNode }) {
  const storage = useStorage();
  const [customThemes, setCustomThemes] = useState<CustomTheme[]>([]);
  const [activeThemeId, setActiveThemeId] = useState<string>(DEFAULT_THEME_ID);
  const [fontSize, setFontSizeState] = useState<number>(FONT_SPEC.default);
  const [contentWidth, setContentWidthState] = useState<number>(WIDTH_SPEC.default);
  const [lineHeight, setLineHeightState] = useState<number>(LINE_HEIGHT_SPEC.default);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const hydrated = useRef(false);

  useEffect(() => {
    let cancelled = false;
    storage
      .getPreferences()
      .then((prefs) => {
        if (cancelled) return;
        if (prefs.customThemes) {
          setCustomThemes(prefs.customThemes.map((t) => ({ ...t, custom: true, badge: t.mode === 'dark' ? 'Dark' : 'Light' })));
        }
        if (prefs.themeId) setActiveThemeId(prefs.themeId);
        // Clamped on the way in, not just on the way out. Stored preferences
        // are as untrusted as any other persisted input: a value written by an
        // older build with different contract bounds, or edited by hand in
        // devtools, otherwise bypasses the range the setters enforce.
        if (prefs.fontSize) setFontSizeState(clampTo(FONT_SPEC, prefs.fontSize));
        if (prefs.contentWidth) setContentWidthState(clampTo(WIDTH_SPEC, prefs.contentWidth));
        if (prefs.lineHeight) setLineHeightState(clampTo(LINE_HEIGHT_SPEC, prefs.lineHeight));
        hydrated.current = true;
      })
      .catch((err: unknown) => {
        console.error('Failed to restore theme preferences', err);
        hydrated.current = true;
      });
    return () => {
      cancelled = true;
    };
  }, [storage]);

  const themes = useMemo<Theme[]>(() => [...BUILTIN_THEMES], []);
  const allThemes = useMemo<Theme[]>(() => [...themes, ...customThemes], [themes, customThemes]);
  const activeTheme = useMemo(
    () => allThemes.find((t) => t.id === activeThemeId) ?? themes[0],
    [allThemes, activeThemeId, themes],
  );

  const resolvedTokens = useMemo<ThemeTokens>(
    () => mergeThemeTokens(activeTheme.mode, activeTheme.tokens),
    [activeTheme],
  );

  useEffect(() => {
    const root = document.documentElement;
    for (const name of THEME_TOKEN_NAMES) {
      root.style.setProperty(name, resolvedTokens[name]);
    }
    // Suffix comes from each metric's own spec rather than a hardcoded 'px' —
    // --lh is unitless, and emitting "1.7px" would be an invalid line-height
    // that silently falls back to the browser default.
    root.style.setProperty('--fs', `${fontSize}${FONT_SPEC.unit}`);
    root.style.setProperty('--cw', `${contentWidth}${WIDTH_SPEC.unit}`);
    root.style.setProperty('--lh', `${lineHeight}${LINE_HEIGHT_SPEC.unit}`);
  }, [resolvedTokens, fontSize, contentWidth, lineHeight]);

  useEffect(() => {
    if (!hydrated.current) return;
    storage.setPreferences({ themeId: activeThemeId }).catch(() => {});
  }, [activeThemeId, storage]);

  useEffect(() => {
    if (!hydrated.current) return;
    storage.setPreferences({ fontSize, contentWidth, lineHeight }).catch(() => {});
  }, [fontSize, contentWidth, lineHeight, storage]);

  const persistCustomThemes = useCallback(
    (next: CustomTheme[]) => {
      storage
        .setPreferences({
          customThemes: next.map(({ id, name, mode, tokens }) => ({ id, name, mode, tokens })),
        })
        .catch(() => {});
    },
    [storage],
  );

  const setThemeId = useCallback((id: string) => {
    setActiveThemeId(id);
    setImportErrors([]);
  }, []);

  const setFontSize = useCallback((px: number) => {
    setFontSizeState(clampTo(FONT_SPEC, px));
  }, []);

  const setContentWidth = useCallback((px: number) => {
    setContentWidthState(clampTo(WIDTH_SPEC, px));
  }, []);

  const setLineHeight = useCallback((ratio: number) => {
    setLineHeightState(clampTo(LINE_HEIGHT_SPEC, ratio));
  }, []);

  const clearImportErrors = useCallback(() => setImportErrors([]), []);

  const reportImportError = useCallback((message: string) => {
    setImportErrors([message]);
  }, []);

  const importTheme = useCallback(
    (raw: unknown) => {
      const result = validateThemeFile(raw);
      // `!result.name` is not redundant with the error check, and it is not
      // defensive padding either: it is what narrows `name` to a string for the
      // theme below. It used to be a `!` assertion resting on the validator
      // rejecting every nameless file, and that assumption was wrong — a truthy
      // non-string name passed validation and arrived here as `undefined`,
      // producing a theme persisted under a blank label. The validator has been
      // fixed, so this branch should now be unreachable; testing it here is what
      // keeps a future change over there from silently reopening the hole.
      if (result.errors.length > 0 || !result.name) {
        setImportErrors(
          result.errors.length > 0 ? result.errors.slice(0, 6) : ['name: required, got nothing'],
        );
        return;
      }
      const mode = result.mode ?? 'light';
      const baseId = mode === 'dark' ? DEFAULT_DARK_THEME_ID : DEFAULT_THEME_ID;
      const base = themes.find((t) => t.id === baseId)!;
      const tokens = mergeThemeTokens(mode, base.tokens, result.tokens);
      const theme: CustomTheme = {
        id: `imported-${Date.now()}`,
        name: result.name,
        mode,
        badge: mode === 'dark' ? 'Dark' : 'Light',
        tokens,
        custom: true,
      };
      setCustomThemes((prev) => {
        const next = [...prev, theme];
        persistCustomThemes(next);
        return next;
      });
      setActiveThemeId(theme.id);
      setImportErrors([]);
    },
    [themes, persistCustomThemes],
  );

  const removeCustomTheme = useCallback(
    (id: string) => {
      setCustomThemes((prev) => {
        const next = prev.filter((t) => t.id !== id);
        persistCustomThemes(next);
        return next;
      });
      setActiveThemeId((prev) => (prev === id ? DEFAULT_THEME_ID : prev));
    },
    [persistCustomThemes],
  );

  const exportTheme = useCallback(
    (theme: Theme) => ({ name: theme.name, mode: theme.mode, tokens: theme.tokens }),
    [],
  );

  const value: ThemeContextValue = {
    themes,
    customThemes,
    activeThemeId,
    activeTheme,
    resolvedTokens,
    fontSize,
    contentWidth,
    lineHeight,
    setThemeId,
    setFontSize,
    setContentWidth,
    setLineHeight,
    importErrors,
    importTheme,
    reportImportError,
    clearImportErrors,
    removeCustomTheme,
    exportTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}

// Non-throwing counterpart for the one value the renderer needs in JS rather
// than in CSS: whether the chevron is drawn at all. The glyph's *width* is not
// here — it stays a pure CSS variable, because nothing in JS has to branch on
// it. Article is mounted without a ThemeProvider in tests and would have no
// reason to require one otherwise, so a missing provider yields the contract
// default instead of an error.
export function useHeadingMarkerStyle(): string {
  const ctx = useContext(ThemeContext);
  return ctx?.resolvedTokens['--heading-marker-style'] ?? HEADING_MARKER_STYLE_DEFAULT;
}

const TABLE_STYLE_DEFAULT = TOKEN_CONTRACT.find((t) => t.name === '--table-style')!.default;

// Read in JS for a different reason than the marker above: not to decide what to
// render, but because a CSS selector cannot branch on a custom property's value.
// Article mirrors this onto a data-attribute the stylesheet can actually match.
export function useTableStyle(): string {
  const ctx = useContext(ThemeContext);
  return ctx?.resolvedTokens['--table-style'] ?? TABLE_STYLE_DEFAULT;
}

const CHROME_ACCENT_SHAPE_DEFAULT = TOKEN_CONTRACT.find((t) => t.name === '--chrome-accent-shape')!.default;

// Read in JS for the same reason as useTableStyle: the two shapes differ in
// their per-corner radii, not only in one property, so the choice cannot be
// expressed by handing a single `var()` to the style object. The Sidebar picks
// a whole declaration block on this value.
//
// Non-throwing like its neighbours above — the Sidebar renders in tests without
// a ThemeProvider, and a missing provider should yield the contract default
// rather than an error.
export function useChromeAccentShape(): string {
  const ctx = useContext(ThemeContext);
  return ctx?.resolvedTokens['--chrome-accent-shape'] ?? CHROME_ACCENT_SHAPE_DEFAULT;
}

const CHROME_PATTERN_DEFAULT = TOKEN_CONTRACT.find((t) => t.name === '--chrome-pattern')!.default;
const CHROME_PATTERN_INK_DEFAULT = TOKEN_CONTRACT.find((t) => t.name === '--chrome-pattern-ink')!.default;
const CHROME_PATTERN_OPACITY_DEFAULT = TOKEN_CONTRACT.find(
  (t) => t.name === '--chrome-pattern-opacity',
)!.default;

// The density every pattern's geometry is drawn at. A theme's own opacity is
// expressed as a multiple of this rather than as an absolute alpha, so one token
// scales motifs whose layers carry a dozen different alphas between them.
const PATTERN_REFERENCE_OPACITY = Number(CHROME_PATTERN_OPACITY_DEFAULT);

// The ceiling, and it is a legibility rule rather than a syntax one — which is
// why it is enforced here and not in the length predicate. Past this the densest
// motifs start cutting through --chrome-muted; the spec's own wording is that no
// theme may make a pattern cross its text.
const PATTERN_OPACITY_MAX = 0.15;

export interface ChromePattern {
  pattern: string;
  ink: 'light' | 'dark';
  // Multiplier applied to each layer's own alpha, 0..3. Already clamped.
  opacityScale: number;
}

// The three pattern tokens, resolved together because no consumer wants one
// without the others — and clamped and parsed here so the arithmetic lives in
// one place rather than in each of the two panels that render a pattern.
//
// Non-throwing like the hooks above: Sidebar and Toolbar both render in tests
// without a ThemeProvider, where the contract defaults are the right answer.
export function useChromePattern(): ChromePattern {
  const ctx = useContext(ThemeContext);
  const tokens = ctx?.resolvedTokens;
  const raw = Number(tokens?.['--chrome-pattern-opacity'] ?? CHROME_PATTERN_OPACITY_DEFAULT);
  // NaN survives every comparison, so it has to be excluded before the clamp
  // rather than by it — an unparseable value falls back to the reference density
  // instead of silently zeroing the pattern.
  const opacity = Number.isFinite(raw)
    ? Math.min(PATTERN_OPACITY_MAX, Math.max(0, raw))
    : PATTERN_REFERENCE_OPACITY;

  return {
    pattern: tokens?.['--chrome-pattern'] ?? CHROME_PATTERN_DEFAULT,
    // Through the contract default rather than straight to `'light'`. The two
    // agree today, and that agreement was the problem: the literal was the same
    // decision written a second time, so flipping the contract's default would
    // have changed every themed panel and quietly left the no-provider path on
    // the old value. The `=== 'dark'` narrowing stays — it is what turns an
    // arbitrary token string into the union, and the default is a string too.
    ink: (tokens?.['--chrome-pattern-ink'] ?? CHROME_PATTERN_INK_DEFAULT) === 'dark' ? 'dark' : 'light',
    opacityScale: opacity / PATTERN_REFERENCE_OPACITY,
  };
}
