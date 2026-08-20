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
import { manifest as garnetVeilManifest } from './garnet-veil/manifest';
import { tokens as garnetVeilTokens } from './garnet-veil/tokens';
import { manifest as verdantPulseManifest } from './verdant-pulse/manifest';
import { tokens as verdantPulseTokens } from './verdant-pulse/tokens';
import { manifest as indigoTrenchManifest } from './indigo-trench/manifest';
import { tokens as indigoTrenchTokens } from './indigo-trench/tokens';
import { manifest as amberParchmentManifest } from './amber-parchment/manifest';
import { tokens as amberParchmentTokens } from './amber-parchment/tokens';
import { manifest as orchidVellumManifest } from './orchid-vellum/manifest';
import { tokens as orchidVellumTokens } from './orchid-vellum/tokens';
import { manifest as punchCardManifest } from './punch-card/manifest';
import { tokens as punchCardTokens } from './punch-card/tokens';
import { manifest as blueprintManifest } from './blueprint/manifest';
import { tokens as blueprintTokens } from './blueprint/tokens';
import { manifest as swissPosterManifest } from './swiss-poster/manifest';
import { tokens as swissPosterTokens } from './swiss-poster/tokens';
import { manifest as signalLossManifest } from './signal-loss/manifest';
import { tokens as signalLossTokens } from './signal-loss/tokens';
import { manifest as terracottaFolioManifest } from './terracotta-folio/manifest';
import { tokens as terracottaFolioTokens } from './terracotta-folio/tokens';
import { manifest as emeraldTerminalManifest } from './emerald-terminal/manifest';
import { tokens as emeraldTerminalTokens } from './emerald-terminal/tokens';
import { manifest as ceruleanAscentManifest } from './cerulean-ascent/manifest';
import { tokens as ceruleanAscentTokens } from './cerulean-ascent/tokens';
import { manifest as violetHalftoneManifest } from './violet-halftone/manifest';
import { tokens as violetHalftoneTokens } from './violet-halftone/tokens';
import { manifest as feintRuleManifest } from './feint-rule/manifest';
import { tokens as feintRuleTokens } from './feint-rule/tokens';
import { manifest as magentaFacetManifest } from './magenta-facet/manifest';
import { tokens as magentaFacetTokens } from './magenta-facet/tokens';
import { manifest as jadeScriptManifest } from './jade-script/manifest';
import { tokens as jadeScriptTokens } from './jade-script/tokens';

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
  // Five themes adapted from Phycat, which upstream is a family rather than a
  // theme: one dark base stylesheet and one light base, each with a set of
  // variant files that override nothing but the palette. They carry their own
  // names now rather than Phycat's — see each tokens.ts header for the
  // specific Phycat variant it maps to, kept as a lineage note. The three dark
  // ports come first in Phycat's own upstream order, then the two light ones —
  // same grouping logic as Konayuki above, applied to five siblings instead of
  // two.
  { ...garnetVeilManifest, tokens: garnetVeilTokens },
  { ...verdantPulseManifest, tokens: verdantPulseTokens },
  { ...indigoTrenchManifest, tokens: indigoTrenchTokens },
  { ...amberParchmentManifest, tokens: amberParchmentTokens },
  { ...orchidVellumManifest, tokens: orchidVellumTokens },
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
  // Seven themes originally adapted from VLOOK™ (a Typora/Markdown LESS theme
  // pack), one per upstream theme family, kept in VLOOK's own family order.
  // Each started as a port of that family's @theme1/@theme2 accent pair,
  // radius style, and table style into this contract; where a family had no
  // equivalent of a token this contract needs (chrome pattern, heading
  // marker), the choice was an aesthetic match to that family's mood rather
  // than a literal source value. They carry their own names and identities
  // now rather than VLOOK's — see each tokens.ts header for the specific
  // VLOOK mapping, kept as a lineage note, and any deliberate deviation from
  // the source LESS.
  { ...terracottaFolioManifest, tokens: terracottaFolioTokens },
  { ...emeraldTerminalManifest, tokens: emeraldTerminalTokens },
  { ...ceruleanAscentManifest, tokens: ceruleanAscentTokens },
  { ...violetHalftoneManifest, tokens: violetHalftoneTokens },
  { ...feintRuleManifest, tokens: feintRuleTokens },
  { ...magentaFacetManifest, tokens: magentaFacetTokens },
  { ...jadeScriptManifest, tokens: jadeScriptTokens },
];

export const DEFAULT_THEME_ID = githubLightManifest.id;

// The dark counterpart to DEFAULT_THEME_ID, used as the fallback base whenever
// a dark theme needs one. Named explicitly rather than found by scanning for
// the first `mode === 'dark'` entry, which silently changed meaning as soon as
// a second dark theme was added above night-owl in this array.
export const DEFAULT_DARK_THEME_ID = nightOwlManifest.id;
