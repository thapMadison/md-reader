import { useRef, useState } from 'react';
import { act, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useScrollSpy } from './useScrollSpy';

// Mirrors how AppShell composes ContentArea: the article markup only appears
// once `contentReady` flips, exactly as useDeferredRender does for files over
// 1 MB. The derived TOC is rendered into the tree so the assertion reads the
// same output the rail would.
function Harness({ source }: { source: string }) {
  const ref = useRef<HTMLElement | null>(null);
  const [ready, setReady] = useState(false);
  const { toc } = useScrollSpy(ref, source, ready);

  return (
    <>
      <button onClick={() => setReady(true)}>ready</button>
      <ul data-testid="toc">
        {toc.map((t) => (
          <li key={t.id}>{`${t.id}:${t.label}`}</li>
        ))}
      </ul>
      <main ref={ref as React.RefObject<HTMLElement>}>
        {ready && (
          <>
            <h1 data-toc="top">Top</h1>
            <h2 data-toc="middle">Middle</h2>
          </>
        )}
      </main>
    </>
  );
}

const tocItems = () => [...screen.getByTestId('toc').querySelectorAll('li')].map((li) => li.textContent);

describe('useScrollSpy deferred content', () => {
  // The TOC used to be built once per `source` change. For a large document
  // that ran while the container still held the loading skeleton, found zero
  // headings, and was never re-run — so the rail read "No headings" for the
  // whole session.
  it('builds the TOC once deferred content has actually rendered', () => {
    render(<Harness source="# Top" />);

    expect(tocItems()).toEqual([]);

    act(() => {
      screen.getByText('ready').click();
    });

    expect(tocItems()).toEqual(['top:Top', 'middle:Middle']);
  });
});
