import { describe, expect, it } from 'vitest';
import { contentHash } from './hash';

describe('contentHash', () => {
  it('is stable for the same input', () => {
    expect(contentHash('# hello')).toBe(contentHash('# hello'));
  });

  it('changes when the content changes', () => {
    expect(contentHash('# hello')).not.toBe(contentHash('# hello!'));
  });

  it('distinguishes a one-character difference', () => {
    // The realistic case: a document is synced, the user fixes a typo, and the
    // app has to notice. A digest that only reacted to large edits would leave
    // small corrections silently unpushed.
    expect(contentHash('the quick brown fox')).not.toBe(contentHash('the quick brown box'));
  });

  it('distinguishes transposed content of equal length', () => {
    // Guards the ordering half of the mix. A checksum that merely summed bytes
    // would call these identical.
    expect(contentHash('ab')).not.toBe(contentHash('ba'));
  });

  it('always returns 8 hex characters', () => {
    for (const s of ['', 'a', '# hello', 'x'.repeat(10_000), '日本語', '🎉']) {
      expect(contentHash(s)).toMatch(/^[0-9a-f]{8}$/);
    }
  });

  it('hashes the empty string without collapsing to zero', () => {
    // The FNV offset basis, unmixed. Worth pinning: a zero here would mean the
    // basis was dropped, which weakens every other digest too.
    expect(contentHash('')).toBe('811c9dc5');
  });

  it('distinguishes documents that differ only in an emoji', () => {
    // Why TextEncoder rather than charCodeAt. These two differ by one astral
    // character; walking UTF-16 code units hashes each as a surrogate pair and
    // makes near-identical emoji far more likely to collide.
    expect(contentHash('done 🎉')).not.toBe(contentHash('done 🎊'));
  });

  it('distinguishes CJK content of the same length', () => {
    expect(contentHash('日本語')).not.toBe(contentHash('中国語'));
  });

  it('does not collide across a spread of realistic documents', () => {
    // Not a proof of anything — 32 bits collide by birthday at around 77k
    // inputs. It pins that the mix is not degenerate, which is the failure mode
    // that would actually reach production: a hash function that returns the
    // same value for whole classes of input.
    const seen = new Set<string>();
    for (let i = 0; i < 2000; i++) seen.add(contentHash(`# Note ${i}\n\nSome body text.`));
    expect(seen.size).toBe(2000);
  });
});
