import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Article } from './Article';

// Must resolve a real promise: CodeBlock chains `.catch()` onto the result, so
// a bare vi.fn() returning undefined throws inside the click handler.
const writeText = vi.fn<(text: string) => Promise<void>>(() => Promise.resolve());

beforeEach(() => {
  writeText.mockClear();
  // jsdom has no clipboard; define it rather than spying so userEvent's own
  // clipboard stub doesn't get in the way.
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText },
    configurable: true,
    writable: true,
  });
});

const renderMd = (source: string) => render(<Article source={source} padding="0" />);

describe('CodeBlock with syntax highlighting', () => {
  it('emits hljs token classes for a tagged fence', () => {
    const { container } = renderMd('```js\nconst x = 1;\n```');

    expect(container.querySelector('.hljs-keyword')?.textContent).toBe('const');
    expect(container.querySelector('.hljs-number')?.textContent).toBe('1');
  });

  it('still routes a tagged fence to CodeBlock despite the injected hljs class', () => {
    // rehype-highlight rewrites className to "hljs language-js"; a startsWith
    // check would drop the block into the inline-<code> branch and lose the
    // header strip and Copy button entirely.
    const { container } = renderMd('```js\nconst x = 1;\n```');

    expect(container.querySelector('[data-codeblock]')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
  });

  it('copies the original source, not the highlight markup', () => {
    // fireEvent rather than userEvent: userEvent.setup() installs its own
    // clipboard stub over navigator.clipboard, displacing the mock above.
    renderMd('```js\nconst greet = "hi";\n```');

    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));

    expect(writeText).toHaveBeenCalledOnce();
    const copied = writeText.mock.calls[0][0];
    expect(copied).toContain('const greet = "hi";');
    expect(copied).not.toContain('hljs');
    expect(copied).not.toContain('<span');
  });

  it('labels the block with its language', () => {
    renderMd('```python\nx = 1\n```');
    expect(screen.getByText('python')).toBeInTheDocument();
  });

  it('leaves an untagged fence unhighlighted', () => {
    // detect: false — highlight.js would otherwise guess a language and paint
    // plain text in scattered keyword colors.
    const { container } = renderMd('```\njust some text\n```');
    expect(container.querySelector('[class^="hljs-"]')).toBeNull();
  });

  it('does not throw on an unknown language tag', () => {
    const { container } = renderMd('```notalanguage\nsome code\n```');
    expect(container.textContent).toContain('some code');
  });

  it('leaves inline code as a plain <code>, not a code block', () => {
    const { container } = renderMd('Some `inline` code.');
    expect(container.querySelector('[data-codeblock]')).toBeNull();
    expect(screen.getByText('inline').tagName).toBe('CODE');
  });
});
