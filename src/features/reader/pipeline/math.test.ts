import { describe, expect, it } from 'vitest';
import { hasMath } from './math';

describe('hasMath', () => {
  it('detects a display math block', () => {
    expect(hasMath('Before\n\n$$\nE = mc^2\n$$\n\nAfter')).toBe(true);
  });

  it('detects inline $$…$$ on one line', () => {
    expect(hasMath('The identity $$a^2 + b^2 = c^2$$ holds.')).toBe(true);
  });

  it('is false for a document with no math', () => {
    expect(hasMath('# Title\n\nJust prose and a [link](https://x.com).')).toBe(false);
  });

  it('does not fire on prose containing currency', () => {
    // The whole reason single-dollar math is disabled: this must neither parse
    // as math nor pull down 1.2MB of KaTeX fonts.
    expect(hasMath('It costs $5 and the other is $10.')).toBe(false);
  });

  it('ignores $$ inside a fenced code block', () => {
    expect(hasMath('```bash\necho "pid is $$"\n```')).toBe(false);
  });

  it('ignores $$ inside inline code', () => {
    expect(hasMath('The shell variable `$$` holds the PID.')).toBe(false);
  });

  it('ignores an empty $$$$ with nothing between the delimiters', () => {
    expect(hasMath('Nothing here: $$$$')).toBe(false);
  });

  it('still finds math in a document that also has code blocks', () => {
    expect(hasMath('```js\nconst a = 1;\n```\n\n$$\n\\int_0^1 x\\,dx\n$$')).toBe(true);
  });
});
