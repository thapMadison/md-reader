import { useCallback, useEffect, useRef, useState } from 'react';
import { useStorage } from '@/services/storage/StorageContext';

export interface DragState {
  dragging: boolean;
  onDrop: (dataTransfer: DataTransfer) => void;
}

export function useLayoutState() {
  const storage = useStorage();
  const [sidebarOpen, setSidebarOpenState] = useState(true);
  const sidebarLoaded = useRef(false);

  const [collapsedFolders, setCollapsedFoldersState] = useState<string[]>([]);

  // One read for every preference this hook owns. `sidebarLoaded` guards them
  // all — it means "preferences have been read", so a second ref for the folder
  // state would only be able to say the same thing.
  useEffect(() => {
    let cancelled = false;
    storage.getPreferences().then((prefs) => {
      if (cancelled) return;
      if (prefs.sidebarOpen !== undefined) setSidebarOpenState(prefs.sidebarOpen);
      if (prefs.collapsedFolders !== undefined) setCollapsedFoldersState(prefs.collapsedFolders);
      sidebarLoaded.current = true;
    });
    return () => {
      cancelled = true;
    };
  }, [storage]);

  const setSidebarOpen = useCallback(
    (updater: boolean | ((v: boolean) => boolean)) => {
      setSidebarOpenState((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        if (sidebarLoaded.current) storage.setPreferences({ sidebarOpen: next }).catch(() => {});
        return next;
      });
    },
    [storage],
  );
  // Which folders are collapsed is view state, like sidebarOpen — it says how
  // the sidebar is drawn, not which files exist or where they belong. Membership
  // is file data and lives in LibraryContext.
  const toggleFolderCollapsed = useCallback(
    (id: string) => {
      setCollapsedFoldersState((prev) => {
        const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
        if (sidebarLoaded.current) storage.setPreferences({ collapsedFolders: next }).catch(() => {});
        return next;
      });
    },
    [storage],
  );

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editorWidth, setEditorWidth] = useState(460);
  const [resizing, setResizing] = useState(false);
  const [mobileTab, setMobileTab] = useState<'source' | 'preview'>('source');
  const [tocSheetOpen, setTocSheetOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);

  const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), [setSidebarOpen]);
  const toggleDrawer = useCallback(() => setDrawerOpen((v) => !v), []);
  const togglePopover = useCallback(() => setPopoverOpen((v) => !v), []);
  const closePopover = useCallback(() => setPopoverOpen(false), []);
  const toggleEdit = useCallback(() => {
    setEditing((v) => !v);
    setMobileTab('source');
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if ((e.metaKey || e.ctrlKey) && k === 'e') {
        e.preventDefault();
        toggleEdit();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault();
        toggleSidebar();
      }
      if ((e.metaKey || e.ctrlKey) && k === 'k') {
        e.preventDefault();
        togglePopover();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleEdit, toggleSidebar, togglePopover]);

  const bindDragAndDrop = useCallback((onDrop: (dt: DataTransfer) => void) => {
    const stop = (e: DragEvent) => e.preventDefault();
    // Only a drag carrying real files means "open these". Every handler below is
    // gated on it, not just the one that raises the overlay.
    //
    // These listeners are on `window`, so without the gate an internal sidebar
    // row drag raised the full-window "Drop to open" overlay over the very
    // sidebar being dragged in — the drop target vanished mid-drag. Gating enter
    // alone is not enough either: dragleave would then decrement a counter it
    // never incremented, and the *next* genuine file drag would lose its overlay
    // one boundary early.
    const isFileDrag = (e: DragEvent) => !!e.dataTransfer?.types.includes('Files');
    const onEnter = (e: DragEvent) => {
      if (!isFileDrag(e)) return;
      stop(e);
      dragDepth.current += 1;
      setDragging(true);
    };
    // Calling preventDefault on dragover is what marks an element as a valid drop
    // target, so gating this is what stops the whole window from accepting
    // internal row drags. They then drop only where a handler opts in — a folder
    // header or the file list — and read as "no drop" everywhere else.
    const onOver = (e: DragEvent) => {
      if (isFileDrag(e)) stop(e);
    };
    const onLeave = (e: DragEvent) => {
      if (!isFileDrag(e)) return;
      stop(e);
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current === 0) setDragging(false);
    };
    const onDropEvt = (e: DragEvent) => {
      if (!isFileDrag(e)) return;
      stop(e);
      dragDepth.current = 0;
      setDragging(false);
      if (e.dataTransfer) onDrop(e.dataTransfer);
    };
    window.addEventListener('dragenter', onEnter);
    window.addEventListener('dragover', onOver);
    window.addEventListener('dragleave', onLeave);
    window.addEventListener('drop', onDropEvt);
    return () => {
      window.removeEventListener('dragenter', onEnter);
      window.removeEventListener('dragover', onOver);
      window.removeEventListener('dragleave', onLeave);
      window.removeEventListener('drop', onDropEvt);
    };
  }, []);

  return {
    sidebarOpen,
    drawerOpen,
    popoverOpen,
    editing,
    editorWidth,
    resizing,
    mobileTab,
    tocSheetOpen,
    dragging,
    collapsedFolders,
    toggleFolderCollapsed,
    setSidebarOpen,
    setDrawerOpen,
    setPopoverOpen,
    setEditing,
    setEditorWidth,
    setResizing,
    setMobileTab,
    setTocSheetOpen,
    toggleSidebar,
    toggleDrawer,
    togglePopover,
    closePopover,
    toggleEdit,
    bindDragAndDrop,
  };
}

export type LayoutState = ReturnType<typeof useLayoutState>;
