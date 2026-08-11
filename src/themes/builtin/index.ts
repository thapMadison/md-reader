import type { Theme } from '../types';
import { manifest as githubLightManifest } from './github-light/manifest';
import { tokens as githubLightTokens } from './github-light/tokens';
import { manifest as nightOwlManifest } from './night-owl/manifest';
import { tokens as nightOwlTokens } from './night-owl/tokens';
import { manifest as sepiaBookManifest } from './sepia-book/manifest';
import { tokens as sepiaBookTokens } from './sepia-book/tokens';
import { manifest as azureCorporateManifest } from './azure-corporate/manifest';
import { tokens as azureCorporateTokens } from './azure-corporate/tokens';
import { manifest as midnightCobaltManifest } from './midnight-cobalt/manifest';
import { tokens as midnightCobaltTokens } from './midnight-cobalt/tokens';
import { manifest as roseQuartzManifest } from './rose-quartz/manifest';
import { tokens as roseQuartzTokens } from './rose-quartz/tokens';
import { manifest as konayukiLightManifest } from './konayuki-light/manifest';
import { tokens as konayukiLightTokens } from './konayuki-light/tokens';
import { manifest as konayukiDarkManifest } from './konayuki-dark/manifest';
import { tokens as konayukiDarkTokens } from './konayuki-dark/tokens';
import { manifest as phycatVampireManifest } from './phycat-vampire/manifest';
import { tokens as phycatVampireTokens } from './phycat-vampire/tokens';
import { manifest as phycatRadiationManifest } from './phycat-radiation/manifest';
import { tokens as phycatRadiationTokens } from './phycat-radiation/tokens';
import { manifest as phycatAbyssManifest } from './phycat-abyss/manifest';
import { tokens as phycatAbyssTokens } from './phycat-abyss/tokens';
import { manifest as phycatCaramelManifest } from './phycat-caramel/manifest';
import { tokens as phycatCaramelTokens } from './phycat-caramel/tokens';
import { manifest as phycatMauveManifest } from './phycat-mauve/manifest';
import { tokens as phycatMauveTokens } from './phycat-mauve/tokens';
import { manifest as punchCardManifest } from './punch-card/manifest';
import { tokens as punchCardTokens } from './punch-card/tokens';
import { manifest as blueprintManifest } from './blueprint/manifest';
import { tokens as blueprintTokens } from './blueprint/tokens';
import { manifest as swissPosterManifest } from './swiss-poster/manifest';
import { tokens as swissPosterTokens } from './swiss-poster/tokens';
import { manifest as signalLossManifest } from './signal-loss/manifest';
import { tokens as signalLossTokens } from './signal-loss/tokens';

// Registry of built-in themes. To add one: create a folder with tokens.ts +
// manifest.ts, then add one line here.
export const BUILTIN_THEMES: readonly Theme[] = [
  { ...githubLightManifest, tokens: githubLightTokens },
  { ...nightOwlManifest, tokens: nightOwlTokens },
  { ...sepiaBookManifest, tokens: sepiaBookTokens },
  { ...azureCorporateManifest, tokens: azureCorporateTokens },
  { ...midnightCobaltManifest, tokens: midnightCobaltTokens },
  { ...roseQuartzManifest, tokens: roseQuartzTokens },
  // The two halves of Konayuki, kept adjacent and in light/dark order because
  // they are one theme with two palettes rather than two designs — see the
  // header comment in either tokens.ts.
  { ...konayukiLightManifest, tokens: konayukiLightTokens },
  { ...konayukiDarkManifest, tokens: konayukiDarkTokens },
  // Phycat, which upstream is a family rather than a theme: one dark base
  // stylesheet and one light base, each with a set of variant files that
  // override nothing but the palette. The three neon variants come first in
  // their own upstream order, then the two light ones — same grouping logic as
  // Konayuki above, applied to five siblings instead of two.
  { ...phycatVampireManifest, tokens: phycatVampireTokens },
  { ...phycatRadiationManifest, tokens: phycatRadiationTokens },
  { ...phycatAbyssManifest, tokens: phycatAbyssTokens },
  { ...phycatCaramelManifest, tokens: phycatCaramelTokens },
  { ...phycatMauveManifest, tokens: phycatMauveTokens },
  // The four motif-first themes, kept together at the end because that is what
  // they have in common: every theme above ports an existing editor theme and
  // picks the chrome pattern that reproduces its source's own decoration, while
  // each of these starts from one of --chrome-pattern's structural values and
  // asks what object that geometry belongs to. Notched is a tab-cut filing card,
  // unprinted a drafting sheet, figureground a Swiss poster, databend a tape
  // read back through a failing head.
  //
  // Grouped rather than interleaved by mode for the same reason Konayuki and
  // Phycat are: the grouping is the design statement, and splitting them into
  // the light and dark runs above would hide it.
  { ...punchCardManifest, tokens: punchCardTokens },
  { ...blueprintManifest, tokens: blueprintTokens },
  { ...swissPosterManifest, tokens: swissPosterTokens },
  { ...signalLossManifest, tokens: signalLossTokens },
];

export const DEFAULT_THEME_ID = githubLightManifest.id;

// The dark counterpart to DEFAULT_THEME_ID, used as the fallback base whenever
// a dark theme needs one. Named explicitly rather than found by scanning for
// the first `mode === 'dark'` entry, which silently changed meaning as soon as
// a second dark theme was added above night-owl in this array.
export const DEFAULT_DARK_THEME_ID = nightOwlManifest.id;
