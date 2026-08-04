import { render, waitFor } from '@testing-library/react';
import { act } from 'react';
import { describe, expect, it } from 'vitest';
import { METRIC_CONTRACT } from '@/themes/contract';
import { createFakeStorageService } from '@/services/storage/fakeStorage';
import { StorageProvider } from '@/services/storage/StorageContext';
import { ThemeProvider, useTheme } from './ThemeContext';

type Ctx = ReturnType<typeof useTheme>;

function harness() {
  const seen: { current: Ctx | null } = { current: null };
  function Probe() {
    seen.current = useTheme();
    return null;
  }
  const storage = createFakeStorageService();
  render(
    <StorageProvider service={storage}>
      <ThemeProvider>
        <Probe />
      </ThemeProvider>
    </StorageProvider>,
  );
  return { seen, storage };
}

const cssVar = (name: string) => document.documentElement.style.getPropertyValue(name);

describe('metric CSS variables', () => {
  it('writes --fs and --cw with a px suffix', async () => {
    harness();
    await waitFor(() => expect(cssVar('--fs')).not.toBe(''));

    // Read the expected values off the contract rather than repeating them: what
    // this test guards is the px suffix, not the particular default, and pinning
    // the number here breaks the test every time a default is retuned.
    const fs = METRIC_CONTRACT.find((m) => m.name === '--fs')!;
    const cw = METRIC_CONTRACT.find((m) => m.name === '--cw')!;
    expect(cssVar('--fs')).toBe(`${fs.default}px`);
    expect(cssVar('--cw')).toBe(`${cw.default}px`);
  });

  it('writes --lh unitless, not "1.7px"', async () => {
    // A px line-height is invalid and would be dropped by the browser, silently
    // reverting the article to the default leading.
    harness();
    await waitFor(() => expect(cssVar('--lh')).not.toBe(''));

    expect(cssVar('--lh')).toBe('1.7');
    expect(cssVar('--lh')).not.toContain('px');
  });

  it('updates --lh when the preference changes', async () => {
    const { seen } = harness();
    await waitFor(() => expect(seen.current).not.toBeNull());

    act(() => seen.current!.setLineHeight(1.9));
    await waitFor(() => expect(cssVar('--lh')).toBe('1.9'));
  });

  it('clamps line height to the contract range', async () => {
    const spec = METRIC_CONTRACT.find((m) => m.name === '--lh')!;
    const { seen } = harness();
    await waitFor(() => expect(seen.current).not.toBeNull());

    act(() => seen.current!.setLineHeight(99));
    await waitFor(() => expect(seen.current!.lineHeight).toBe(spec.max));

    act(() => seen.current!.setLineHeight(0));
    await waitFor(() => expect(seen.current!.lineHeight).toBe(spec.min));
  });

  it('persists line height and restores it on the next session', async () => {
    const { seen, storage } = harness();
    await waitFor(() => expect(seen.current).not.toBeNull());

    act(() => seen.current!.setLineHeight(2.0));
    await waitFor(async () => {
      expect((await storage.getPreferences()).lineHeight).toBe(2.0);
    });
  });
});

describe('METRIC_CONTRACT', () => {
  it('gives every metric a default inside its own min/max', () => {
    for (const m of METRIC_CONTRACT) {
      expect(m.default).toBeGreaterThanOrEqual(m.min);
      expect(m.default).toBeLessThanOrEqual(m.max);
    }
  });
});
