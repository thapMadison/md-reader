import { useCallback, useEffect, useRef } from 'react';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useLayoutState } from './layoutState';
import { useLibrary } from '@/features/library';
import { useTheme } from '@/features/theming/ThemeContext';
import { useScrollSpy } from '@/features/toc/useScrollSpy';
import { useScrollRestoration } from '@/features/toc/useScrollRestoration';
import { useDeferredRender } from '@/features/reader/useDeferredRender';
import { Toolbar } from './Toolbar';
import { ProgressBar } from './ProgressBar';
import { SubBar } from './SubBar';
import { Sidebar } from './Sidebar';
import { EditorPane } from './EditorPane';
import { ContentArea } from './ContentArea';
import { TocRail } from '@/features/toc/TocRail';
import { ThemePopover } from '@/features/theming/ThemePopover';
import { DragOverlay } from './DragOverlay';

export function AppShell() {
  const mode = useBreakpoint();
  const layout = useLayoutState();
  const library = useLibrary();
  const theme = useTheme();

  const contentRef = useRef<HTMLElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { active, activeName } = library;
  const source = active?.editedContent ?? '';

  const contentReady = useDeferredRender(activeName, source);
  const scrollSpy = useScrollSpy(contentRef, source, contentReady);
  const { recordScroll } = useScrollRestoration(contentRef, activeName);

  const onScroll: React.UIEventHandler<HTMLElement> = useCallback(
    (e) => {
      scrollSpy.onScroll(e);
      recordScroll(e);
    },
    [scrollSpy, recordScroll],
  );

  useEffect(() => {
    return layout.bindDragAndDrop((dt) => {
      library.openViaDrop(dt).catch((err: unknown) => {
        console.error('Failed to open dropped files', err);
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout.bindDragAndDrop]);

  const resizeStartX = useRef(0);
  const resizeStartWidth = useRef(0);

  useEffect(() => {
    if (!layout.resizing) return;
    const onMove = (e: MouseEvent) => {
      const delta = e.clientX - resizeStartX.current;
      layout.setEditorWidth(Math.min(760, Math.max(220, resizeStartWidth.current + delta)));
    };
    const onUp = () => layout.setResizing(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout.resizing]);

  const handleStartResize = useCallback(
    (startX: number, startWidth: number) => {
      resizeStartX.current = startX;
      resizeStartWidth.current = startWidth;
      layout.setResizing(true);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // These three entry points are fire-and-forget from an event handler, so each
  // needs its own terminal catch — an un-awaited rejection here surfaces only as
  // an "unhandled promise rejection" in the console.
  const openFileInput = useCallback(() => {
    if (library.fsAccessSupported) {
      library.openViaPicker().catch((err: unknown) => {
        console.error('Failed to open file', err);
      });
    } else {
      fileInputRef.current?.click();
    }
  }, [library]);

  const handleFileInputChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      library.openViaInput(e.target.files).catch((err: unknown) => {
        console.error('Failed to open file', err);
      });
    }
    e.target.value = '';
  };

  const dirty = activeName ? library.isDirty(activeName) : false;
  const showSnapshotPill = !!active && (active.kind === 'snapshot' || active.perm === 'denied');
  const snapshotDenied = active?.perm === 'denied';
  const snapshotLabel = snapshotDenied ? 'access denied' : 'snapshot';
  const themeDot = theme.activeTheme.tokens['--bg'];

  const isMobile = mode === 'mobile';
  const hasFile = !!active;

  const showPermBanner =
    !!active &&
    !library.dismissedBanners[active.name] &&
    (active.perm === 'denied' || active.perm === 'prompt');
  const bannerDenied = active?.perm === 'denied';
  const bannerText = bannerDenied
    ? 'Access denied — showing the last cached copy of this file. Changes on disk will not appear until you grant access again.'
    : 'MDReader needs permission to re-read this file from disk.';
  const bannerShowGrantButton = active?.perm === 'prompt';

  const activeTocEntry = scrollSpy.toc.find((t) => t.id === scrollSpy.activeId);
  const readerHiddenOnMobile = isMobile && layout.editing && layout.mobileTab === 'source';
  const editorHiddenOnMobile = isMobile && (!layout.editing || layout.mobileTab !== 'source');

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg)',
        color: 'var(--fg)',
        fontFamily: 'var(--font-ui)',
        overflow: 'hidden',
      }}
    >
      <Toolbar
        mode={mode}
        activeFileName={active?.name ?? null}
        dirty={dirty}
        showSnapshotPill={showSnapshotPill}
        snapshotLabel={snapshotLabel}
        snapshotDenied={!!snapshotDenied}
        editing={layout.editing}
        themeName={theme.activeTheme.name}
        themeDot={themeDot}
        sidebarOpen={layout.sidebarOpen}
        onToggleDrawer={layout.toggleDrawer}
        onToggleEdit={layout.toggleEdit}
        onTogglePopover={layout.togglePopover}
        onToggleSidebar={layout.toggleSidebar}
      />
      <ProgressBar progress={scrollSpy.progress} loading={hasFile && !contentReady} />
      {isMobile && hasFile && (
        <SubBar
          editing={layout.editing}
          mobileTab={layout.mobileTab}
          onShowSourceTab={() => layout.setMobileTab('source')}
          onShowPreviewTab={() => layout.setMobileTab('preview')}
          showTocDropdown={!layout.editing}
          activeTocLabel={activeTocEntry?.label ?? ''}
          tocSheetOpen={layout.tocSheetOpen}
          onToggleTocSheet={() => layout.setTocSheetOpen((v) => !v)}
          toc={scrollSpy.toc}
          activeTocId={scrollSpy.activeId}
          onTocSelect={(id) => {
            scrollSpy.goTo(id);
            layout.setTocSheetOpen(false);
          }}
        />
      )}
      <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex' }}>
        <Sidebar
          mode={mode}
          sidebarOpen={layout.sidebarOpen}
          drawerOpen={layout.drawerOpen}
          onToggleDrawer={layout.toggleDrawer}
          files={library.files}
          activeName={library.activeName}
          isDirty={library.isDirty}
          isUnpersisted={library.isUnpersisted}
          onPickFile={(name) => {
            library.setActiveName(name);
            layout.setDrawerOpen(false);
          }}
          onCloseFile={library.closeFile}
          onGrantAccess={(name) => {
            library.grantAccess(name).catch((err: unknown) => {
              console.error('Failed to grant access', err);
            });
          }}
          onOpenFileClick={openFileInput}
          storageUsedBytes={library.storageUsedBytes}
          storageQuotaBytes={library.storageQuotaBytes}
          onClearAll={() => {
            library.clearAll().catch((err: unknown) => {
              console.error('Failed to clear library', err);
            });
          }}
        />
        {layout.editing && !editorHiddenOnMobile && (
          <EditorPane
            mode={mode}
            source={source}
            editorWidth={layout.editorWidth}
            resizing={layout.resizing}
            onChange={(value) => activeName && library.editContent(activeName, value)}
            onRevert={() => activeName && library.revertContent(activeName)}
            onStartResize={handleStartResize}
          />
        )}
        <ContentArea
          mode={mode}
          hidden={readerHiddenOnMobile}
          contentRef={contentRef}
          onScroll={onScroll}
          activeFile={active}
          contentReady={contentReady}
          showPermBanner={showPermBanner}
          bannerText={bannerText}
          bannerDenied={!!bannerDenied}
          bannerShowGrantButton={!!bannerShowGrantButton}
          onGrantActive={() => {
            if (!active) return;
            library.grantAccess(active.name).catch((err: unknown) => {
              console.error('Failed to grant access', err);
            });
          }}
          onDismissBanner={() => active && library.dismissBanner(active.name)}
          onOpenFileClick={openFileInput}
        />
        {mode === 'desktop' && hasFile && !layout.editing && (
          <TocRail toc={scrollSpy.toc} activeId={scrollSpy.activeId} onSelect={scrollSpy.goTo} />
        )}
        {layout.popoverOpen && <ThemePopover mode={mode} onClose={layout.closePopover} />}
        {layout.dragging && <DragOverlay />}
      </div>
      <input
        type="file"
        accept=".md,.markdown,.txt"
        multiple
        ref={fileInputRef}
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
      />
    </div>
  );
}
