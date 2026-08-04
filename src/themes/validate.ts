import { THEME_TOKEN_NAMES, FONT_STACK_TOKEN_NAMES } from './contract';
import { isColorValue, isFontStackValue } from './schema';

function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [
    i,
    ...Array(b.length).fill(0),
  ]);
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

// Suggests the nearest known token, so renamed/typo'd keys (e.g.
// "--code-background" -> "--code-bg") still get a useful hint. Prefix/stem
// containment is checked first (catches renames like the example above),
// falling back to edit distance for near-miss typos (e.g. "--fgg" -> "--fg").
function closestToken(key: string): string | undefined {
  const stem = key.split('-').filter(Boolean)[0] ?? key;
  const prefixMatch = THEME_TOKEN_NAMES.find(
    (n) => n.startsWith(`--${stem}-`) || key.startsWith(`${n}-`) || key.startsWith(n),
  );
  if (prefixMatch) return prefixMatch;

  let best: string | undefined;
  let bestDist = Infinity;
  for (const name of THEME_TOKEN_NAMES) {
    const dist = levenshtein(key, name);
    if (dist < bestDist) {
      bestDist = dist;
      best = name;
    }
  }
  return bestDist <= 3 ? best : undefined;
}

export interface ThemeValidationResult {
  errors: string[];
  name?: string;
  mode?: 'light' | 'dark';
  tokens: Record<string, string>;
}

// Mirrors the design's exact error wording (design.html ~974-992):
// "--color-accent: expected a color, got \"bluee\"" and
// "unknown token \"--code-background\" (did you mean --code-bg?)".
export function validateThemeFile(raw: unknown): ThemeValidationResult {
  if (!raw || typeof raw !== 'object') {
    return { errors: ['file is not a JSON object'], tokens: {} };
  }
  const obj = raw as Record<string, unknown>;
  const errors: string[] = [];
  if (!obj.name) errors.push('name: required, got nothing');

  const rawTokens = (obj.tokens ?? obj.vars ?? {}) as Record<string, unknown>;
  const tokens: Record<string, string> = {};

  for (const [k, v] of Object.entries(rawTokens)) {
    const key = k.startsWith('--') ? k : `--${k}`;
    if (!THEME_TOKEN_NAMES.includes(key as (typeof THEME_TOKEN_NAMES)[number])) {
      const near = closestToken(key);
      errors.push(`unknown token "${key}"${near ? ` (did you mean ${near}?)` : ''}`);
      continue;
    }
    // Font tokens used to skip validation entirely and be cast with `v as
    // string`, so a number, an object, or a CSS fragment all reached
    // setProperty untouched. Written as two branches rather than a ternary so
    // each type guard actually narrows `v` for the assignment below.
    const isFontToken = FONT_STACK_TOKEN_NAMES.includes(key);
    const describe = () => (typeof v === 'string' ? `"${v}"` : String(v));
    if (isFontToken) {
      if (!isFontStackValue(v)) {
        errors.push(`${key}: expected a font stack, got ${describe()}`);
        continue;
      }
      tokens[key] = v;
    } else {
      if (!isColorValue(v)) {
        errors.push(`${key}: expected a color, got ${describe()}`);
        continue;
      }
      tokens[key] = v;
    }
  }

  if (Object.keys(rawTokens).length === 0) {
    errors.push('tokens: expected at least --bg and --fg, got none');
  }

  return {
    errors,
    name: typeof obj.name === 'string' ? obj.name : undefined,
    mode: obj.mode === 'dark' ? 'dark' : 'light',
    tokens,
  };
}
