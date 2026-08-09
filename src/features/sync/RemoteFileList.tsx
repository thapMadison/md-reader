import { useOptionalGistAuth } from '@/services/gist/GistContext';
import { useOptionalSync } from './SyncContext';

/**
 * Gists on the account with no local copy — the other device's documents.
 *
 * This is the far end of the path the whole feature exists for: a file pushed
 * from the laptop shows up here on the phone, and its content is downloaded
 * only when one is tapped. Nothing above this point has fetched a byte of it.
 */
export function RemoteFileList() {
  const auth = useOptionalGistAuth();
  const sync = useOptionalSync();
  // Same reasoning as SyncStatusIcon: the sidebar renders in trees assembled without
  // sync, including its own tests.
  if (!auth || !sync) return null;
  // Only this one guard. A signed-out or not-yet-listed check would read as
  // defence but add none: SyncProvider empties `remotes` on any status that is
  // not signed-in, and before the first `listGists` there is nothing in it —
  // so both states already arrive here as an empty list. Deleting the extra
  // condition changed no test, which is what sent us looking. Keeping a line
  // that cannot fail invites the reader to trust it in a case where the real
  // protection has moved.
  if (sync.remoteOnly.length === 0) return null;

  return (
    <div style={{ marginTop: 10 }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: 0.4,
          textTransform: 'uppercase',
          color: 'var(--chrome-muted)',
          padding: '4px 8px',
        }}
      >
        On GitHub
      </div>
      {sync.remoteOnly.map((r) => (
        <div
          key={r.gistId}
          onClick={() => void sync.openRemote(r.gistId)}
          title={`Not downloaded yet — tap to open. ${formatSize(r.size)}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 8px',
            cursor: 'pointer',
            fontSize: 12.5,
            fontFamily: 'var(--font-ui)',
            color: 'var(--chrome-fg)',
            // Dashed, matching how the file list already marks a row whose
            // bytes are not the authoritative copy.
            border: '1px dashed var(--chrome-border)',
            borderRadius: 6,
            marginBottom: 2,
          }}
        >
          <CloudIcon />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {r.fileName}
          </span>
          <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--chrome-muted)', flex: 'none' }}>
            {formatSize(r.size)}
          </span>
        </div>
      ))}
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function CloudIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" style={{ flex: 'none', opacity: 0.7 }}>
      <path d="M4.5 13a3.5 3.5 0 0 1-.6-6.95A4.5 4.5 0 0 1 12.3 6.2 3 3 0 0 1 12 13H4.5Z" />
    </svg>
  );
}
