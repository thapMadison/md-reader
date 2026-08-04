import { useCallback, useEffect, useRef, useState } from 'react';
import type { TocEntry } from './types';

interface ScrollSpyResult {
  activeId: string | null;
  progress: number;
  onScroll: React.UIEventHandler<HTMLElement>;
  goTo: (id: string) => void;
}

// Reads headings straight from the rendered DOM (elements carry data-toc,
// written by Article's heading renderer) rather than re-deriving them from
// the mdast, so scrollspy always matches what's actually on screen.
export function useScrollSpy(
  containerRef: React.RefObject<HTMLElement | null>,
  source: string,
  contentReady = true,
): ScrollSpyResult & { toc: TocEntry[] } {
  const [toc, setToc] = useState<TocEntry[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const lastActive = useRef<string | null>(null);
  const lastProgress = useRef(0);

  const refreshToc = useCallback(() => {
    const el = containerRef.current;
    if (!el) {
      setToc([]);
      return;
    }
    const headingEls = Array.from(el.querySelectorAll<HTMLElement>('[data-toc]'));
    const entries: TocEntry[] = headingEls
      .map((h) => ({
        id: h.getAttribute('data-toc') ?? '',
        label: h.textContent ?? '',
        level: Number(h.tagName.slice(1)) as 1 | 2 | 3,
      }))
      .filter((t) => t.level <= 3);
    setToc(entries);
    if (entries.length > 0 && !entries.some((e) => e.id === lastActive.current)) {
      setActiveId(entries[0].id);
      lastActive.current = entries[0].id;
    }
  }, [containerRef]);

  // `contentReady` is load-bearing, not cosmetic: large documents render behind
  // useDeferredRender, so when `source` alone changes the container still holds
  // the loading skeleton and querySelectorAll finds zero headings. Re-running
  // once the real article commits is what makes the TOC appear for those files.
  useEffect(() => {
    refreshToc();
    lastProgress.current = 0;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting progress when the document (source) changes
    setProgress(0);
  }, [source, contentReady, refreshToc]);

  const onScroll: React.UIEventHandler<HTMLElement> = useCallback((e) => {
    const el = e.currentTarget;
    const max = el.scrollHeight - el.clientHeight;
    const nextProgress = max > 0 ? el.scrollTop / max : 0;

    let nextActive = lastActive.current;
    const headingEls = el.querySelectorAll<HTMLElement>('[data-toc]');
    if (headingEls.length > 0) {
      nextActive = headingEls[0].getAttribute('data-toc');
      headingEls.forEach((h) => {
        if (h.offsetTop <= el.scrollTop + 110) {
          nextActive = h.getAttribute('data-toc');
        }
      });
    }

    if (Math.abs(nextProgress - lastProgress.current) > 0.004) {
      lastProgress.current = nextProgress;
      setProgress(nextProgress);
    }
    if (nextActive !== lastActive.current) {
      lastActive.current = nextActive;
      setActiveId(nextActive);
    }
  }, []);

  const goTo = useCallback(
    (id: string) => {
      const el = containerRef.current;
      if (!el) return;
      const heading = el.querySelector<HTMLElement>(`[data-toc="${id}"]`);
      if (heading) {
        el.scrollTo({ top: id === 'top' ? 0 : heading.offsetTop - 70, behavior: 'smooth' });
      }
      setActiveId(id);
      lastActive.current = id;
    },
    [containerRef],
  );

  return { toc, activeId, progress, onScroll, goTo };
}
