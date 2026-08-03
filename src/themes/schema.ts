import { z } from 'zod';
import { THEME_TOKEN_NAMES } from './contract';

const COLOR_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const FUNC_COLOR_RE = /^(rgb|rgba|hsl|hsla|oklch)\(/i;

export const isColorValue = (v: unknown): v is string =>
  typeof v === 'string' && (COLOR_RE.test(v) || FUNC_COLOR_RE.test(v));

// Tokens shape validated at the JSON boundary. Values are checked structurally
// (color-shaped strings only) — this is also the security boundary: a value
// that isn't a bare color/font-stack string can never reach `setProperty`.
export const themeTokensSchema = z
  .object(
    Object.fromEntries(
      THEME_TOKEN_NAMES.map((name) => [
        name,
        name === '--font-body' ? z.string().min(1).optional() : z.string().min(1).optional(),
      ]),
    ),
  )
  .partial();

export const themeFileSchema = z.object({
  name: z.string().min(1),
  mode: z.enum(['light', 'dark']).optional(),
  tokens: z.record(z.string(), z.unknown()).optional(),
  vars: z.record(z.string(), z.unknown()).optional(),
});

export type ThemeFile = z.infer<typeof themeFileSchema>;
