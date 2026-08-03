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

  useEffect(() => {
    let cancelled = false;
    storage.getPreferences().then((prefs) => {
      if (cancelled) return;
      if (prefs.sidebarOpen !== undefined) setSidebarOpenState(prefs.sidebarOpen);
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
    const onEnter = (e: DragEvent) => {
      stop(e);
      dragDepth.current += 1;
      setDragging(true);
    };
    const onOver = stop;
    const onLeave = (e: DragEvent) => {
      stop(e);
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current === 0) setDragging(false);
    };
    const onDropEvt = (e: DragEvent) => {
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
