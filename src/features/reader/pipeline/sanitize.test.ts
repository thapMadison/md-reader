import rehypeParse from 'rehype-parse';
import rehypeSanitize from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import { unified } from 'unified';
import { describe, expect, it } from 'vitest';
import { sanitizeSchema } from './sanitize';

const clean = (html: string): string =>
  String(
    unified()
      .use(rehypeParse, { fragment: true })
      .use(rehypeSanitize, sanitizeSchema)
      .use(rehypeStringify)
      .processSync(html),
  );

describe('sanitizeSchema — blocks dangerous input', () => {
  it('drops <script> entirely, body included', () => {
    const out = clean('<p>ok</p><script>alert(1)</script>');
    expect(out).not.toContain('script');
    expect(out).not.toContain('alert');
    expect(out).toContain('ok');
  });

  it('drops on* event handlers', () => {
    const out = clean('<p onclick="alert(1)" onmouseover="x()">text</p>');
    expect(out).not.toContain('onclick');
    expect(out).not.toContain('onmouseover');
    expect(out).toContain('text');
  });

  it('drops the style attribute, keeping theme tokens the only CSS path', () => {
    const out = clean('<p style="color:red;position:fixed">text</p>');
    expect(out).not.toContain('style');
    expect(out).not.toContain('red');
  });

  it('drops <style> elements along with their contents', () => {
    // Without `strip`, a disallowed element is unwrapped rather than removed,
    // leaving its CSS text visible as literal prose in the article.
    const out = clean('<style>body{display:none}</style><p>ok</p>');
    expect(out).not.toContain('display:none');
    expect(out).toContain('ok');
  });

  it('drops iframe, object and embed', () => {
    const out = clean('<iframe src="https://e.com"></iframe><object></object><embed>');
    expect(out).not.toContain('iframe');
    expect(out).not.toContain('object');
    expect(out).not.toContain('embed');
  });

  it('drops javascript: URLs', () => {
    const out = clean('<a href="javascript:alert(1)">click</a>');
    expect(out).not.toContain('javascript:');
  });

  it('drops arbitrary author class names', () => {
    // Only the highlight/math prefixes are allowed through; a document cannot
    // opt itself into app styling by guessing class names.
    const out = clean('<span class="totally-made-up">x</span>');
    expect(out).not.toContain('totally-made-up');
  });
});

describe('sanitizeSchema — preserves what the reader needs', () => {
  it('keeps hljs token classes on span', () => {
    // Regression guard: defaultSchema allows no className on <span>, so an
    // un-widened schema silently strips every syntax color.
    const out = clean('<span class="hljs-keyword">const</span>');
    expect(out).toContain('hljs-keyword');
  });

  it('keeps hljs and language-* on code', () => {
    const out = clean('<code class="hljs language-js">x</code>');
    expect(out).toContain('hljs');
    expect(out).toContain('language-js');
  });

  it('keeps the bare function_ modifier paired with hljs-title', () => {
    const out = clean('<span class="hljs-title function_">go</span>');
    expect(out).toContain('function_');
  });

  it('keeps katex classes', () => {
    const out = clean('<span class="katex-display">f</span>');
    expect(out).toContain('katex-display');
  });

  it('keeps alt on blockquote for callouts', () => {
    const out = clean('<blockquote alt="info"><p>hi</p></blockquote>');
    expect(out).toContain('alt="info"');
  });

  it('keeps kbd, mark, details and summary', () => {
    const out = clean('<kbd>Ctrl</kbd><mark>hi</mark><details open><summary>More</summary><p>body</p></details>');
    expect(out).toContain('<kbd>');
    expect(out).toContain('<mark>');
    expect(out).toContain('<details');
    expect(out).toContain('<summary>');
    expect(out).toContain('open');
  });

  it('keeps safe links', () => {
    const out = clean('<a href="https://example.com" title="t">link</a>');
    expect(out).toContain('https://example.com');
    expect(out).toContain('title="t"');
  });
});
