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
  // because --heading-marker has to be read back in JS, not just consumed as a
  // CSS variable: it decides whether the chevron element is rendered at all.
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

export const HEADING_MARKER_DEFAULT = TOKEN_CONTRACT.find((t) => t.name === '--heading-marker')!.default;

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
      if (result.errors.length > 0) {
        setImportErrors(result.errors.slice(0, 6));
        return;
      }
      const mode = result.mode ?? 'light';
      const baseId = mode === 'dark' ? DEFAULT_DARK_THEME_ID : DEFAULT_THEME_ID;
      const base = themes.find((t) => t.id === baseId)!;
      const tokens = mergeThemeTokens(mode, base.tokens, result.tokens);
      const theme: CustomTheme = {
        id: `imported-${Date.now()}`,
        name: result.name!,
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
// than in CSS: the chevron's width, which decides whether the glyph is drawn at
// all. Article is mounted without a ThemeProvider in tests and would have no
// reason to require one otherwise, so a missing provider yields the contract
// default instead of an error.
export function useHeadingMarker(): string {
  const ctx = useContext(ThemeContext);
  return ctx?.resolvedTokens['--heading-marker'] ?? HEADING_MARKER_DEFAULT;
}
