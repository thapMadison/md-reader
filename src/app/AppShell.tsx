import { useCallback, useEffect, useRef, useState } from 'react';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useLayoutState } from './layoutState';
import { useSaveFile } from '@/features/sync/useSaveFile';
import { useOptionalSync } from '@/features/sync/SyncContext';
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
  const library = useLibrary();
  // Declared before useLayoutState, which takes `save` for its Ctrl/Cmd+S
  // binding. The same hook backs the toolbar button, so the keyboard and the
  // click cannot drift apart.
  const { save } = useSaveFile();
  const layout = useLayoutState(save);
  const theme = useTheme();
  // Optional, like the sidebar's own sync lookups: a tree assembled without the
  // gist providers must still open and read files. Absent means nothing is on
  // GitHub, so every close is the plain local one.
  const sync = useOptionalSync();

  const contentRef = useRef<HTMLElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // The element the theme popover hangs from. Held here because the popover and
  // the control that opened it live in different subtrees. State rather than a
  // ref: the popover's position is derived from this node, so it has to be read
  // during render, and a ref read that way is a render-time side effect.
  const [themeAnchor, setThemeAnchor] = useState<HTMLElement | null>(null);
  const openThemes = useCallback(
    (anchor: HTMLElement) => {
      setThemeAnchor(anchor);
      layout.setPopoverOpen(true);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [layout.setPopoverOpen],
  );

  const { active, activeName } = library;
  const source = active?.editedContent ?? '';

  const contentReady = useDeferredRender(activeName, source);
  const scrollSpy = useScrollSpy(contentRef, source, contentReady);
  const { recordScroll } = useScrollRestoration(contentRef, activeName);

  /**
   * Removes files locally *and* deletes their GitHub copies, which is what the
   * confirmations promise.
   *
   * The remote delete goes first, deliberately. The gist id lives on the local
   * record, so removing the file first would throw away the only pointer to the
   * thing being deleted — the copy would survive on the account with nothing
   * left to reach it by. Doing it in this order costs a moment of delay before
   * the row disappears and makes the failure case recoverable instead.
   *
   * A failure leaves the local file alone. The user asked for one action, not
   * two, and half-completing it silently is worse than not starting: the row is
   * still there, still says what it is, and the delete can be tried again.
   */
  const closeAndDeleteRemotes = useCallback(
    async (names: string[], removeLocally: () => void | Promise<void>) => {
      const failed = sync ? await sync.deleteRemotes(names) : [];
      if (failed.length > 0) {
        // Kept local so the files are still visible and still deletable. This
        // reports rather than resolves: there is no per-file error surface in
        // the sidebar for a file that no longer exists, and inventing one for
        // an offline delete is more machinery than the case earns.
        console.error('Kept locally — could not delete from GitHub:', failed.join(', '));
        return;
      }
      await removeLocally();
    },
    [sync],
  );

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

  /**
   * A new document opens straight into the editor.
   *
   * It has no content yet, so the reader has nothing to show and every route to
   * giving it some runs through the editor — leaving the user on an empty
   * preview would make the file they just asked for look like it failed to
   * open. The panes are switched before the await so the editor is already
   * there when the file lands, rather than appearing a beat later.
   *
   * `setMobileTab` is what makes this work on a phone, where the editor and the
   * reader are tabs of the same space rather than two panes side by side.
   */
  const createFile = useCallback(
    (name: string) => {
      layout.setEditing(true);
      layout.setMobileTab('source');
      layout.setDrawerOpen(false);
      library.createFile(name).catch((err: unknown) => {
        console.error('Failed to create file', err);
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [library.createFile, layout.setEditing, layout.setMobileTab, layout.setDrawerOpen],
  );

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
  // The same four-swatch shorthand the theme picker uses for every entry, so
  // the ⋯ panel's theme row and the list it opens describe a theme the same way.
  const t = theme.activeTheme.tokens;
  const themeDots = [t['--bg'], t['--fg'], t['--link'], t['--code-bg']];

  const isMobile = mode === 'mobile';
  const hasFile = !!active;

  // A reopened-while-dirty file takes the banner over the permission prompt:
  // it reports something that already happened to the user's own edits, which
  // is more urgent than an access request they can retry at any time.
  const showCollisionBanner = !!active && library.collisions.includes(active.name);
  // Unreadable files are not tied to the active document — the batch they came
  // from may have opened nothing at all — so this one shows whenever the list
  // is non-empty, and outranks the others: it is the only notice reporting
  // files the user asked for that are not on screen anywhere.
  const showUnreadableBanner = library.unreadable.length > 0;
  const showPermBanner =
    !showCollisionBanner &&
    !showUnreadableBanner &&
    !!active &&
    !library.dismissedBanners[active.name] &&
    (active.perm === 'denied' || active.perm === 'prompt');
  const bannerDenied = active?.perm === 'denied';
  const bannerText = showUnreadableBanner
    ? `Could not read ${library.unreadable.length === 1 ? '' : `${library.unreadable.length} files: `}${library.unreadable.join(', ')}. Any other files you opened are available.`
    : showCollisionBanner
      ? 'This file was reopened while it had unsaved edits. Your edits were kept — use Revert to load the version now on disk.'
      : bannerDenied
        ? 'Access denied — showing the last cached copy of this file. Changes on disk will not appear until you grant access again.'
        : 'MDReader needs permission to re-read this file from disk.';
  const bannerShowGrantButton =
    !showCollisionBanner && !showUnreadableBanner && active?.perm === 'prompt';

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
        onOpenThemes={openThemes}
        dirty={dirty}
        showSnapshotPill={showSnapshotPill}
        snapshotLabel={snapshotLabel}
        snapshotDenied={!!snapshotDenied}
        editing={layout.editing}
        themeName={theme.activeTheme.name}
        themeDots={themeDots}
        sidebarOpen={layout.sidebarOpen}
        onToggleDrawer={layout.toggleDrawer}
        onToggleEdit={layout.toggleEdit}
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
          onGitHub={sync ? sync.leavesRemoteBehind : () => false}
          onCloseFile={(name) => {
            void closeAndDeleteRemotes([name], () => library.closeFile(name));
          }}
          onGrantAccess={(name) => {
            library.grantAccess(name).catch((err: unknown) => {
              console.error('Failed to grant access', err);
            });
          }}
          onOpenFileClick={openFileInput}
          onNewFile={createFile}
          storageUsedBytes={library.storageUsedBytes}
          storageQuotaBytes={library.storageQuotaBytes}
          onClearAll={() => {
            closeAndDeleteRemotes(
              library.files.map((f) => f.name),
              () => library.clearAll(),
            ).catch((err: unknown) => {
              console.error('Failed to clear library', err);
            });
          }}
          folders={library.folders}
          selectedFolderId={library.selectedFolderId}
          collapsedFolders={layout.collapsedFolders}
          onSelectFolder={library.setSelectedFolderId}
          onToggleFolderCollapsed={layout.toggleFolderCollapsed}
          onCreateFolder={library.createFolder}
          onRenameFolder={library.renameFolder}
          onUngroupFolder={library.ungroupFolder}
          // Async like clearAll above, so it takes the same terminal catch. The
          // member names are read here, before anything is removed — inside
          // `deleteFolderAndFiles` the folder is already gone.
          onDeleteFolderAndFiles={(id) => {
            closeAndDeleteRemotes(
              library.files.filter((f) => f.folderId === id).map((f) => f.name),
              () => library.deleteFolderAndFiles(id),
            ).catch((err: unknown) => {
              console.error('Failed to delete folder', err);
            });
          }}
          onMoveFileToFolder={library.moveFileToFolder}
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
          showPermBanner={showPermBanner || showCollisionBanner || showUnreadableBanner}
          bannerText={bannerText}
          bannerDenied={!!bannerDenied}
          bannerShowGrantButton={!!bannerShowGrantButton}
          onGrantActive={() => {
            if (!active) return;
            library.grantAccess(active.name).catch((err: unknown) => {
              console.error('Failed to grant access', err);
            });
          }}
          onDismissBanner={() => {
            if (!active) return;
            if (showCollisionBanner) library.dismissCollisions();
            else library.dismissBanner(active.name);
          }}
          onOpenFileClick={openFileInput}
        />
        {mode === 'desktop' && hasFile && !layout.editing && (
          <TocRail toc={scrollSpy.toc} activeId={scrollSpy.activeId} onSelect={scrollSpy.goTo} />
        )}
        {layout.popoverOpen && (
          <ThemePopover
            // ⌘K opens without going through `openThemes`, so there may be no
            // stored anchor. The ⋯ button is where the theme control now lives,
            // so the popover lands under it either way.
            anchor={themeAnchor ?? document.querySelector<HTMLElement>('[data-theme-anchor]')}
            onClose={layout.closePopover}
          />
        )}
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
