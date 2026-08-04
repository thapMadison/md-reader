import type { Theme } from '../types';
import { manifest as githubLightManifest } from './github-light/manifest';
import { tokens as githubLightTokens } from './github-light/tokens';
import { manifest as nightOwlManifest } from './night-owl/manifest';
import { tokens as nightOwlTokens } from './night-owl/tokens';
import { manifest as sepiaBookManifest } from './sepia-book/manifest';
import { tokens as sepiaBookTokens } from './sepia-book/tokens';
import { manifest as azureCorporateManifest } from './azure-corporate/manifest';
import { tokens as azureCorporateTokens } from './azure-corporate/tokens';

// Registry of built-in themes. To add one: create a folder with tokens.ts +
// manifest.ts, then add one line here.
export const BUILTIN_THEMES: readonly Theme[] = [
  { ...githubLightManifest, tokens: githubLightTokens },
  { ...nightOwlManifest, tokens: nightOwlTokens },
  { ...sepiaBookManifest, tokens: sepiaBookTokens },
  { ...azureCorporateManifest, tokens: azureCorporateTokens },
];

export const DEFAULT_THEME_ID = githubLightManifest.id;

// The dark counterpart to DEFAULT_THEME_ID, used as the fallback base whenever
// a dark theme needs one. Named explicitly rather than found by scanning for
// the first `mode === 'dark'` entry, which silently changed meaning as soon as
// a second dark theme was added above night-owl in this array.
export const DEFAULT_DARK_THEME_ID = nightOwlManifest.id;
