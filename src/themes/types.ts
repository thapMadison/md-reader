import type { ThemeTokens } from './contract';

export type ThemeMode = 'light' | 'dark';

export interface ThemeManifest {
  id: string;
  name: string;
  mode: ThemeMode;
  badge: string;
}

export interface Theme extends ThemeManifest {
  tokens: ThemeTokens;
  custom?: boolean;
}
