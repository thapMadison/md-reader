import { describe, expect, it } from 'vitest';
import { mergeThemeTokens } from './merge';
import { THEME_TOKEN_NAMES } from './contract';

describe('mergeThemeTokens', () => {
  it('produces a complete token set from a partial theme', () => {
    const merged = mergeThemeTokens('light', { '--link': '#ff0000' });
    for (const name of THEME_TOKEN_NAMES) {
      expect(merged[name]).toBeTruthy();
    }
    expect(merged['--link']).toBe('#ff0000');
  });

  it('falls back to the dark base for dark-mode themes', () => {
    const merged = mergeThemeTokens('dark', {});
    expect(merged['--bg']).toBe('#011627');
  });

  it('resolves the block-accent tokens from the dark base', () => {
    const merged = mergeThemeTokens('dark', {});
    expect(merged['--quote-accent']).toBe('#82aaff');
    expect(merged['--code-header-bg']).toBe('#0b2942');
    expect(merged['--heading-rule']).toBe('#1d3b53');
  });

  it('applies user overrides on top of the theme', () => {
    const merged = mergeThemeTokens('light', { '--link': '#ff0000' }, { '--link': '#00ff00' });
    expect(merged['--link']).toBe('#00ff00');
  });

  it('rejects unknown keys in overrides (allowlist boundary)', () => {
    const merged = mergeThemeTokens(
      'light',
      {},
      { '--not-a-real-token': 'red;} body{display:none}' } as Record<string, string>,
    );
    expect((merged as unknown as Record<string, string>)['--not-a-real-token']).toBeUndefined();
  });

  it('ignores non-string override values', () => {
    const merged = mergeThemeTokens('light', {}, { '--bg': 123 as unknown as string });
    expect(merged['--bg']).toBe('#ffffff');
  });

  // The per-level marker accents were added after --heading-accent. Because
  // every contract token is present after the base spread, a per-level token
  // shadows the shared one — so without explicit inheritance a theme written
  // against the older contract would render the default blue marker instead
  // of its own accent. A CSS var() fallback cannot fix this; it never fires.
  describe('marker accent inheritance', () => {
    // All five marker levels, not just h2/h3: h4-h6 arrived last and are the
    // ones a theme predating them would leave stranded on contract blue.
    const LEVELS = ['--h2', '--h3', '--h4', '--h5', '--h6'] as const;

    it('a theme setting only --heading-accent colors every marker level', () => {
      const merged = mergeThemeTokens('light', {
        '--heading-accent': '#ff0000',
        '--heading-accent-soft': 'rgba(255,0,0,0.3)',
      });
      for (const level of LEVELS) {
        expect(merged[`${level}-accent`], `${level}-accent`).toBe('#ff0000');
        expect(merged[`${level}-accent-soft`], `${level}-accent-soft`).toBe('rgba(255,0,0,0.3)');
      }
    });

    it('an explicit per-level accent wins over the shared one', () => {
      const merged = mergeThemeTokens('light', {
        '--heading-accent': '#ff0000',
        '--h2-accent': '#00ff00',
      });
      expect(merged['--h2-accent']).toBe('#00ff00');
      expect(merged['--h3-accent']).toBe('#ff0000');
      expect(merged['--h6-accent']).toBe('#ff0000');
    });

    it('inherits through the override path too', () => {
      const shared = mergeThemeTokens('light', {}, { '--heading-accent': '#123456' });
      expect(shared['--h2-accent']).toBe('#123456');

      const perLevel = mergeThemeTokens(
        'light',
        {},
        { '--heading-accent': '#123456', '--h3-accent': '#abcdef' },
      );
      expect(perLevel['--h2-accent']).toBe('#123456');
      expect(perLevel['--h3-accent']).toBe('#abcdef');
    });

    it('leaves the contract defaults alone when a theme sets no accent', () => {
      const merged = mergeThemeTokens('light', {});
      for (const level of LEVELS) {
        expect(merged[`${level}-accent`], `${level}-accent`).toBe('#0969da');
      }
    });
  });
});
