import { THEME_TOKEN_NAMES, FONT_STACK_TOKEN_NAMES, LENGTH_TOKEN_NAMES, ENUM_TOKEN_VALUES } from './contract';
import { isValidTokenValue } from './schema';

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

// How a rejected value is echoed back in an error message: quoted when it is a
// string, so `got ""` reads as an empty string rather than as nothing at all,
// and stringified otherwise. One helper for every field this file reports on —
// the token loop had its own copy, and two spellings of the same message is how
// the wording drifts apart.
const show = (v: unknown): string => (typeof v === 'string' ? `"${v}"` : String(v));

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
  // Type, not just presence. A truthiness test alone passes `"name": 42` — and
  // every other truthy non-string — while the string check at the bottom of this
  // function still returns `undefined` for it. The import site reads a result
  // with no errors as a promise that `name` is there, so the gap arrived as a
  // theme with no name: created, activated, and persisted under a blank label.
  if (typeof obj.name !== 'string' || obj.name.trim() === '') {
    // The missing case keeps its original wording; a wrong-typed name is a
    // different mistake and says so, because "got nothing" sends an author
    // looking for an absent field they can plainly see is present.
    errors.push(
      obj.name === undefined || obj.name === null || obj.name === ''
        ? 'name: required, got nothing'
        : `name: expected a string, got ${show(obj.name)}`,
    );
  }

  // An unrecognised mode is reported rather than silently read as light. The
  // field is optional — absent means light — but a misspelled "drak" is an
  // author stating an intention the app would otherwise drop on the floor,
  // which is the failure mode that makes a theme look broken with no message.
  if (obj.mode !== undefined && obj.mode !== 'light' && obj.mode !== 'dark') {
    errors.push(`mode: expected one of light, dark, got ${show(obj.mode)}`);
  }

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
    // setProperty untouched. Written as separate branches rather than a ternary
    // so each type guard actually narrows `v` for the assignment below.
    //
    // The color branch is last and unconditional rather than keyed off the
    // contract type, so a token added to the contract without a matching branch
    // here still gets validated as *something* rather than falling through
    // unchecked to setProperty.
    // The accept/reject decision itself lives in schema.ts (isValidTokenValue),
    // shared with merge.ts so import-time and merge-time validation cannot drift.
    // What stays here is the *reporting*: which expectation to name in the error,
    // which only the import path needs. Enum is described first because its
    // accepted values are a closed set, so listing them beats any generic
    // "expected a ..." message.
    if (!isValidTokenValue(key, v)) {
      const enumValues = ENUM_TOKEN_VALUES[key];
      const expected = enumValues
        ? `one of ${enumValues.join(', ')}`
        : FONT_STACK_TOKEN_NAMES.includes(key)
          ? 'a font stack'
          : LENGTH_TOKEN_NAMES.includes(key)
            ? 'a length'
            : 'a color';
      errors.push(`${key}: expected ${expected}, got ${show(v)}`);
      continue;
    }
    // Enum and length values are stored trimmed; their predicates accept
    // surrounding whitespace, and the raw form would otherwise be what a
    // consumer reads back out of resolvedTokens.
    tokens[key] = ENUM_TOKEN_VALUES[key] || LENGTH_TOKEN_NAMES.includes(key) ? v.trim() : v;
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
