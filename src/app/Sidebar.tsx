import { useState } from 'react';
import { DropHintIcon, FileIcon, PlusIcon } from '@/components/ui/icons';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import type { LayoutMode } from '@/hooks/useBreakpoint';
import type { LibraryFile } from '@/features/library/types';

interface SidebarProps {
  mode: LayoutMode;
  sidebarOpen: boolean;
  drawerOpen: boolean;
  onToggleDrawer: () => void;
  files: LibraryFile[];
  activeName: string | null;
  isDirty: (name: string) => boolean;
  isUnpersisted: (name: string) => boolean;
  onPickFile: (name: string) => void;
  onCloseFile: (name: string) => void;
  onGrantAccess: (name: string) => void;
  onOpenFileClick: () => void;
  storageUsedBytes: number;
  storageQuotaBytes: number;
  onClearAll: () => void;
}

function formatMb(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1);
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${formatMb(bytes)} MB`;
}

// Recent edits are the interesting case — "2 min ago" answers "did my save land?"
// far better than a timestamp the user has to diff against the clock themselves.
function formatWhen(ms: number): string {
  const diff = Date.now() - ms;
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} h ago`;
  const d = new Date(ms);
  const now = new Date();
  return d.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    ...(d.getFullYear() === now.getFullYear() ? {} : { year: 'numeric' }),
  });
}

// Names the specific stakes rather than a generic "are you sure". The two that
// matter are unsaved edits (gone for good — edits live only in memory and are
// never written back to disk) and snapshots (no handle to reopen from, unlike
// live files, which can be reopened from disk afterwards).
function buildClearAllMessage(files: LibraryFile[], isDirty: (name: string) => boolean): string {
  const count = files.length;
  const plural = count === 1 ? 'file' : 'files';
  const snapshots = files.filter((f) => f.kind === 'snapshot').length;
  const dirty = files.filter((f) => isDirty(f.name)).length;

  const parts = [`Removes all ${count} ${plural} from the library and frees the stored space.`];
  if (dirty > 0) {
    parts.push(`${dirty} ${dirty === 1 ? 'file has' : 'files have'} unsaved edits that will be lost.`);
  }
  if (snapshots > 0) {
    parts.push(
      `${snapshots} ${snapshots === 1 ? 'is a snapshot' : 'are snapshots'} that cannot be reopened from disk.`,
    );
  }
  parts.push('This cannot be undone.');
  return parts.join(' ');
}

export function Sidebar({
  mode,
  sidebarOpen,
  drawerOpen,
  onToggleDrawer,
  files,
  activeName,
  isDirty,
  isUnpersisted,
  onPickFile,
  onCloseFile,
  onGrantAccess,
  onOpenFileClick,
  storageUsedBytes,
  storageQuotaBytes,
  onClearAll,
}: SidebarProps) {
  const [confirmClear, setConfirmClear] = useState(false);
  const isMobile = mode === 'mobile';
  const pct = storageQuotaBytes > 0 ? Math.min(100, Math.round((storageUsedBytes / storageQuotaBytes) * 100)) : 0;
  const over = storageUsedBytes > storageQuotaBytes;
  const warn = !over && pct > 80;
  const usedMb = formatMb(storageUsedBytes);
  const quotaMb = formatMb(storageQuotaBytes);

  return (
    <>
      {isMobile && drawerOpen && (
        <div
          onClick={onToggleDrawer}
          style={{ position: 'absolute', inset: 0, zIndex: 44, background: 'rgba(31,35,40,0.35)', animation: 'fadeIn .15s' }}
        />
      )}
      <nav
        style={{
          flex: '0 0 240px',
          width: 240,
          position: isMobile ? 'absolute' : 'relative',
          top: 0,
          bottom: 0,
          left: 0,
          zIndex: 45,
          transform: isMobile ? (drawerOpen ? 'translateX(0)' : 'translateX(-101%)') : 'none',
          marginLeft: isMobile ? 0 : sidebarOpen ? 0 : -241,
          boxShadow: isMobile && drawerOpen ? '0 0 32px rgba(31,35,40,0.20)' : 'none',
          transition: 'margin-left .22s ease, transform .22s ease, background .25s',
          background: 'var(--chrome)',
          color: 'var(--chrome-fg)',
          borderRight: '1px solid var(--chrome-border)',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
        }}
      >
        <div style={{ padding: '12px 12px 8px' }}>
          <button
            onClick={onOpenFileClick}
            style={{
              width: '100%',
              height: 32,
              border: '1px solid var(--chrome-border)',
              borderRadius: 7,
              background: 'transparent',
              color: 'var(--chrome-fg)',
              fontSize: 12.5,
              fontWeight: 600,
              fontFamily: 'var(--font-ui)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7,
            }}
          >
            <PlusIcon />
            Open file
          </button>
        </div>
        <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--chrome-muted)', textTransform: 'uppercase', letterSpacing: '.07em', padding: '8px 16px 4px' }}>
          Files
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '2px 8px' }}>
          {files.map((f) => {
            const active = f.name === activeName;
            const denied = f.perm === 'denied';
            const prompt = f.perm === 'prompt';
            const snapshot = f.kind === 'snapshot';
            const unsaved = isUnpersisted(f.name);
            const showBadge = snapshot || denied;
            const dashed = snapshot || denied;
            return (
              <div
                key={f.name}
                onClick={() => onPickFile(f.name)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 3,
                  padding: '6px 8px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  background: active ? 'var(--chrome-hl)' : 'transparent',
                  marginBottom: 1,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: dashed ? 'var(--chrome-muted)' : 'var(--link)', display: 'flex' }} title={
                    snapshot ? 'Snapshot — not tracked on disk' : denied ? 'Access denied — cached copy' : 'Live — re-read from disk'
                  }>
                    <FileIcon dashed={dashed} />
                  </span>
                  <span
                    title={f.name}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontSize: 12.5,
                      fontWeight: active ? 600 : 400,
                      color: active ? 'var(--chrome-fg)' : 'var(--chrome-muted)',
                    }}
                  >
                    {f.name}
                  </span>
                  <span style={{ flex: 'none', width: 6, height: 6, borderRadius: '50%', background: 'var(--link)', opacity: isDirty(f.name) ? 1 : 0 }} />
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      onCloseFile(f.name);
                    }}
                    title="Close"
                    style={{
                      flex: 'none',
                      width: 16,
                      height: 16,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 4,
                      color: 'var(--chrome-muted)',
                      opacity: 0.4,
                      fontSize: 13,
                      lineHeight: 1,
                    }}
                  >
                    ×
                  </span>
                </div>
                {/* Live files only: the FS Access API never exposes a real path,
                    so size + mtime are the only disk-backed facts that tell two
                    same-named files apart and confirm a re-read saw the edit. */}
                {f.kind === 'live' && f.size !== undefined && (
                  <div
                    style={{
                      paddingLeft: 20,
                      fontSize: 10,
                      color: 'var(--chrome-muted)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={
                      f.lastModified !== undefined
                        ? `${formatSize(f.size)} — modified ${new Date(f.lastModified).toLocaleString()}`
                        : formatSize(f.size)
                    }
                  >
                    {formatSize(f.size)}
                    {f.lastModified !== undefined && ` · ${formatWhen(f.lastModified)}`}
                  </div>
                )}
                {(showBadge || prompt || unsaved) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 20 }}>
                    {unsaved && (
                      <span
                        title="Storage is full — this file is open now but will not be here after a reload."
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: 'var(--danger)',
                          border: '1px solid var(--danger)',
                          background: 'var(--danger-bg)',
                          borderRadius: 99,
                          padding: '1px 6px',
                        }}
                      >
                        not saved
                      </span>
                    )}
                    {showBadge && (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: denied ? 'var(--danger)' : 'var(--chrome-muted)',
                          border: `1px solid ${denied ? 'var(--danger)' : 'var(--chrome-border)'}`,
                          background: denied ? 'var(--danger-bg)' : 'transparent',
                          borderRadius: 99,
                          padding: '1px 6px',
                        }}
                      >
                        {denied ? 'cached copy' : 'offline copy'}
                      </span>
                    )}
                    {prompt && (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          onGrantAccess(f.name);
                        }}
                        style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--chrome-fg)', cursor: 'pointer' }}
                      >
                        Grant access
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div style={{ borderTop: '1px solid var(--chrome-border)', padding: '10px 16px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontSize: 11, color: over || warn ? 'var(--danger)' : 'var(--chrome-muted)', fontWeight: over || warn ? 600 : 400 }}>
                {over ? `${usedMb} MB of ${quotaMb} MB — over quota` : `${usedMb} MB of ${quotaMb} MB used`}
              </span>
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                disabled={files.length === 0}
                style={{
                  fontSize: 10.5,
                  fontWeight: 600,
                  fontFamily: 'inherit',
                  color: 'var(--chrome-muted)',
                  background: 'transparent',
                  border: 'none',
                  cursor: files.length === 0 ? 'default' : 'pointer',
                  opacity: files.length === 0 ? 0.45 : 1,
                  borderRadius: 5,
                  padding: '1px 5px',
                }}
              >
                Clear all
              </button>
            </div>
            <div style={{ height: 3, borderRadius: 2, background: 'var(--chrome-border)', overflow: 'hidden' }}>
              <div
                style={{
                  height: 3,
                  borderRadius: 2,
                  width: `${pct}%`,
                  background: over || warn ? 'var(--danger)' : 'var(--link)',
                  transition: 'width .2s',
                }}
              />
            </div>
            {(over || warn) && (
              <div
                style={{
                  fontSize: 10.5,
                  lineHeight: 1.45,
                  color: 'var(--danger)',
                  background: 'var(--danger-bg)',
                  border: '1px solid var(--danger)',
                  borderRadius: 6,
                  padding: '5px 7px',
                }}
              >
                {over
                  ? 'Quota exceeded — new files still open, but cannot be saved for next time until you clear space.'
                  : 'Storage almost full — close a few snapshots.'}
              </div>
            )}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--chrome-muted)', display: 'flex', alignItems: 'center', gap: 7 }}>
            <DropHintIcon />
            Drop .md files anywhere
          </div>
        </div>
      </nav>
      {confirmClear && (
        <ConfirmDialog
          title="Clear all files?"
          message={buildClearAllMessage(files, isDirty)}
          confirmLabel="Clear all"
          danger
          onConfirm={() => {
            setConfirmClear(false);
            onClearAll();
          }}
          onCancel={() => setConfirmClear(false)}
        />
      )}
    </>
  );
}
