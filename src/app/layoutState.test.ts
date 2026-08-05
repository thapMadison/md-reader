import { act, renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { createFakeStorageService } from '@/services/storage/fakeStorage';
import { StorageProvider } from '@/services/storage/StorageContext';
import type { StorageService } from '@/services/storage/types';
import { useLayoutState } from './layoutState';

const wrapperFor = (storage: StorageService) =>
  ({ children }: { children: ReactNode }) =>
    createElement(StorageProvider, { service: storage, children });

// jsdom fires DragEvent as a plain Event, so dataTransfer has to be attached by
// hand. Only `types` matters to the code under test.
const fireDrag = (type: string, types: string[]) => {
  const e = new Event(type, { bubbles: true }) as Event & { dataTransfer?: unknown };
  e.dataTransfer = { types };
  window.dispatchEvent(e);
};

// The window-level drag handlers are what raise the "Drop to open" overlay.
// They cannot simply react to any drag: the sidebar drags its own rows, and an
// overlay covering the whole window would cover the drop target the user is
// aiming at.
describe('useLayoutState drag handling', () => {
  const bind = (onDrop = vi.fn()) => {
    const storage = createFakeStorageService();
    const hook = renderHook(() => useLayoutState(), { wrapper: wrapperFor(storage) });
    act(() => {
      hook.result.current.bindDragAndDrop(onDrop);
    });
    return { hook, onDrop };
  };

  it('raises the overlay for a drag carrying files', () => {
    const { hook } = bind();

    act(() => fireDrag('dragenter', ['Files']));

    expect(hook.result.current.dragging).toBe(true);
  });

  it('ignores an internal row drag, which would otherwise cover the sidebar it came from', () => {
    const { hook } = bind();

    act(() => fireDrag('dragenter', ['application/x-mdreader-file']));

    expect(hook.result.current.dragging).toBe(false);
  });

  it('leaves the next file drag its overlay after an internal drag passes through', () => {
    // The asymmetry bug: if only dragenter were gated, an internal drag's
    // dragleave would decrement a counter it never incremented, and the next
    // genuine file drag would lose its overlay one boundary early.
    const { hook } = bind();

    act(() => {
      fireDrag('dragenter', ['application/x-mdreader-file']);
      fireDrag('dragleave', ['application/x-mdreader-file']);
      fireDrag('dragenter', ['Files']);
      fireDrag('dragenter', ['Files']);
      fireDrag('dragleave', ['Files']);
    });

    // Two enters, one leave — still inside the window, so the overlay stays up.
    expect(hook.result.current.dragging).toBe(true);
  });

  it('opens the files from a drop that carries them', () => {
    const { hook, onDrop } = bind();

    act(() => {
      fireDrag('dragenter', ['Files']);
      fireDrag('drop', ['Files']);
    });

    expect(onDrop).toHaveBeenCalledTimes(1);
    expect(hook.result.current.dragging).toBe(false);
  });

  it('does not treat a dropped row as a file to open', () => {
    const { onDrop } = bind();

    act(() => fireDrag('drop', ['application/x-mdreader-file']));

    expect(onDrop).not.toHaveBeenCalled();
  });
});

describe('useLayoutState collapsed folders', () => {
  it('restores which folders were collapsed', async () => {
    const storage = createFakeStorageService();
    await storage.setPreferences({ collapsedFolders: ['f1'] });
    const { result } = renderHook(() => useLayoutState(), { wrapper: wrapperFor(storage) });

    await waitFor(() => expect(result.current.collapsedFolders).toEqual(['f1']));
  });

  it('does not write collapse state back before preferences have been read', async () => {
    // Same guard as sidebarOpen: writing during the first render would persist
    // the default over whatever the user had, before the read lands.
    const storage = createFakeStorageService();
    await storage.setPreferences({ collapsedFolders: ['f1'] });
    const spy = vi.spyOn(storage, 'setPreferences');
    const { result } = renderHook(() => useLayoutState(), { wrapper: wrapperFor(storage) });

    act(() => result.current.toggleFolderCollapsed('f2'));

    expect(spy).not.toHaveBeenCalled();
  });

  it('persists a folder being collapsed and expanded again', async () => {
    const storage = createFakeStorageService();
    const { result } = renderHook(() => useLayoutState(), { wrapper: wrapperFor(storage) });
    await waitFor(() => expect(result.current.collapsedFolders).toEqual([]));

    act(() => result.current.toggleFolderCollapsed('f1'));
    await waitFor(async () =>
      expect((await storage.getPreferences()).collapsedFolders).toEqual(['f1']),
    );

    act(() => result.current.toggleFolderCollapsed('f1'));
    await waitFor(async () => expect((await storage.getPreferences()).collapsedFolders).toEqual([]));
  });
});
