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
import { BUILTIN_THEMES, DEFAULT_THEME_ID } from '@/themes/builtin';
import { THEME_TOKEN_NAMES, METRIC_CONTRACT, type ThemeTokens } from '@/themes/contract';
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
  fontSize: number;
  contentWidth: number;
  setThemeId: (id: string) => void;
  setFontSize: (px: number) => void;
  setContentWidth: (px: number) => void;
  importErrors: string[];
  importTheme: (raw: unknown) => void;
  reportImportError: (message: string) => void;
  clearImportErrors: () => void;
  removeCustomTheme: (id: string) => void;
  exportTheme: (theme: Theme) => { name: string; mode: string; tokens: ThemeTokens };
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const FONT_SPEC = METRIC_CONTRACT.find((m) => m.name === '--fs')!;
const WIDTH_SPEC = METRIC_CONTRACT.find((m) => m.name === '--cw')!;

export function ThemeProvider({ children }: { children: ReactNode }) {
  const storage = useStorage();
  const [customThemes, setCustomThemes] = useState<CustomTheme[]>([]);
  const [activeThemeId, setActiveThemeId] = useState<string>(DEFAULT_THEME_ID);
  const [fontSize, setFontSizeState] = useState<number>(FONT_SPEC.default);
  const [contentWidth, setContentWidthState] = useState<number>(WIDTH_SPEC.default);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const hydrated = useRef(false);

  useEffect(() => {
    let cancelled = false;
    storage.getPreferences().then((prefs) => {
      if (cancelled) return;
      if (prefs.customThemes) {
        setCustomThemes(prefs.customThemes.map((t) => ({ ...t, custom: true, badge: t.mode === 'dark' ? 'Dark' : 'Light' })));
      }
      if (prefs.themeId) setActiveThemeId(prefs.themeId);
      if (prefs.fontSize) setFontSizeState(prefs.fontSize);
      if (prefs.contentWidth) setContentWidthState(prefs.contentWidth);
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
    root.style.setProperty('--fs', `${fontSize}px`);
    root.style.setProperty('--cw', `${contentWidth}px`);
  }, [resolvedTokens, fontSize, contentWidth]);

  useEffect(() => {
    if (!hydrated.current) return;
    storage.setPreferences({ themeId: activeThemeId }).catch(() => {});
  }, [activeThemeId, storage]);

  useEffect(() => {
    if (!hydrated.current) return;
    storage.setPreferences({ fontSize, contentWidth }).catch(() => {});
  }, [fontSize, contentWidth, storage]);

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
    setFontSizeState(Math.min(FONT_SPEC.max, Math.max(FONT_SPEC.min, px)));
  }, []);

  const setContentWidth = useCallback((px: number) => {
    setContentWidthState(Math.min(WIDTH_SPEC.max, Math.max(WIDTH_SPEC.min, px)));
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
      const base = mode === 'dark' ? themes.find((t) => t.mode === 'dark')! : themes[0];
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
    fontSize,
    contentWidth,
    setThemeId,
    setFontSize,
    setContentWidth,
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
