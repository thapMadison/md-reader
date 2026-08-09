import { CloudIcon } from '@/components/ui/icons';
import { useOptionalGistAuth } from '@/services/gist/GistContext';
import { useOptionalSync } from './SyncContext';
import type { FileSyncState } from './SyncContext';

/**
 * What one sync state looks like in the row, and what it offers in the menu.
 *
 * The two used to be the same thing — a word-pill that was also the button —
 * which is why a synced file could stack four lines of controls under its name.
 * Splitting them is the whole point of this module: `mark`/`tone`/`title`
 * describe the glyph the list shows, `action` is what the ⋯ menu offers, and a
 * state may have one without the other.
 */
interface SyncDisplay {
  mark: 'check' | 'up' | 'down' | 'alert';
  /** Which CSS variable colors the glyph. Never the only channel — see CloudIcon. */
  tone: 'muted' | 'link' | 'danger';
  title: string;
  /** Menu entry, or null when the state offers nothing to do from here. */
  action: { label: string; kind: SyncActionKind } | null;
}

export type SyncActionKind = 'push' | 'pull' | 'enable' | 'disable' | 'delete-remote';

/**
 * The state table, in one place so the icon and the menu cannot drift apart.
 * `hasOrphan` only matters when sync is off, where it separates "never synced"
 * from "synced once, then switched off" — the second leaves a copy on the
 * account that nothing else will remove.
 */
function displayFor(state: FileSyncState, hasOrphan: boolean, error: string | null): SyncDisplay | null {
  switch (state) {
    case 'too-large':
      return {
        mark: 'alert',
        tone: 'muted',
        title: 'Over the 1MB sync limit. The file still opens and reads normally — it just cannot be synced.',
        action: null,
      };
    case 'pushing':
      return { mark: 'up', tone: 'muted', title: 'Sending to GitHub…', action: null };
    case 'pulling':
      return { mark: 'down', tone: 'muted', title: 'Downloading from GitHub…', action: null };
    case 'error':
      return {
        mark: 'alert',
        tone: 'danger',
        title: `${error ?? 'Sync failed.'} Open the row menu to retry.`,
        action: { label: 'Retry sync', kind: 'push' },
      };
    // The copy on GitHub was deleted — from another device, or by hand. Worth its
    // own state rather than falling through to `synced`, which is what the state
    // machine would otherwise say: every comparison behind it is between fields
    // the record holds about itself, so with nothing on the other end they all
    // agree and the app would vouch for a backup that is gone.
    case 'gone':
      return {
        mark: 'alert',
        tone: 'danger',
        // Leads with the reassuring half, because that is the half in doubt:
        // seeing "deleted" next to a filename reads as "your file is deleted".
        title: 'Your file is safe here, but its copy on GitHub was deleted from another device.',
        action: { label: 'Upload to GitHub again', kind: 'enable' },
      };
    // Both sides moved. No menu action on purpose: the choice needs room to say
    // what each option costs, and that belongs in the banner over the document.
    case 'conflict':
      return {
        mark: 'alert',
        tone: 'danger',
        title: 'This file changed here and on GitHub. Open it to choose which copy to keep.',
        action: null,
      };
    case 'remote-ahead':
      return {
        mark: 'down',
        tone: 'link',
        title: 'A newer copy is on GitHub. Pulling it loses nothing — you have no unsaved changes here.',
        action: { label: 'Pull newer copy from GitHub', kind: 'pull' },
      };
    case 'local-ahead':
      return {
        mark: 'up',
        tone: 'link',
        title: 'Edited since the last sync. Sync now, or press ⌘S.',
        action: { label: 'Sync now', kind: 'push' },
      };
    case 'idle':
      return {
        mark: 'check',
        tone: 'link',
        title: 'This file matches the copy on GitHub.',
        action: { label: 'Stop syncing this file', kind: 'disable' },
      };
    case 'off':
      // Not syncing draws no glyph at all. Most files in a signed-in library are
      // in this state, and a badge on every one of them would be noise that
      // makes the handful of real ones harder to spot.
      return hasOrphan
        ? {
            mark: 'alert',
            tone: 'muted',
            title: 'Not syncing, but a copy is still on GitHub from before.',
            action: { label: 'Resume syncing', kind: 'enable' },
          }
        : null;
  }
}

const TONE_VAR = {
  muted: 'var(--chrome-muted)',
  link: 'var(--link)',
  danger: 'var(--danger)',
} as const;

/**
 * Sync state for one file, as a single glyph on the row's title line.
 *
 * Reads its own contexts rather than taking props: FileRow is threaded a long
 * prop list from Sidebar already, and sync state would add several more to a
 * component that has no other reason to know about GitHub. Renders nothing when
 * the providers are absent, when signed out, or when the file simply is not
 * syncing.
 */
export function SyncStatusIcon({ name }: { name: string }) {
  // Optional lookups rather than the throwing hooks. Sync is a capability the
  // app can be assembled without, and Sidebar is otherwise presentational — a
  // tree that leaves the providers out should render the file list, not crash.
  const auth = useOptionalGistAuth();
  const sync = useOptionalSync();
  if (!auth || !sync) return null;
  // Sync is invisible until there is an account behind it. Showing state for a
  // feature the user has not connected is noise about nothing.
  if (auth.status !== 'signed-in') return null;

  const state = sync.stateOf(name);
  const display = displayFor(state, sync.hasOrphanedGist(name), sync.errorOf(name));
  if (!display) return null;

  return (
    <span
      title={display.title}
      // The glyph is a status, not a control — every action moved into the row
      // menu. `img` with a label rather than a bare decorative span, so a screen
      // reader gets the same fact sighted users get from the shape.
      role="img"
      aria-label={display.title}
      style={{ flex: 'none', display: 'flex', color: TONE_VAR[display.tone], opacity: state === 'pushing' || state === 'pulling' ? 0.6 : 1 }}
    >
      <CloudIcon mark={display.mark} />
    </span>
  );
}

/**
 * The sync entries for one file's ⋯ menu, or an empty list when there are none.
 *
 * A plain function rather than a component so Sidebar can fold these into the
 * single menu it already renders — one menu per row, with sync and move-to-folder
 * in it, instead of two menus competing for the same corner.
 */
export function useSyncMenuActions(name: string): {
  items: { label: string; kind: SyncActionKind; danger?: boolean }[];
  run: (kind: SyncActionKind) => void;
} {
  const auth = useOptionalGistAuth();
  const sync = useOptionalSync();

  if (!auth || !sync || auth.status !== 'signed-in') {
    return { items: [], run: () => {} };
  }

  const state = sync.stateOf(name);
  const orphaned = sync.hasOrphanedGist(name);
  const display = displayFor(state, orphaned, sync.errorOf(name));
  const items: { label: string; kind: SyncActionKind; danger?: boolean }[] = [];

  if (display?.action) items.push(display.action);
  // `off` with no gist behind it draws no glyph, so displayFor returns null and
  // the offer has to be added here — it is the entry point to the whole feature.
  else if (state === 'off' && !orphaned) items.push({ label: 'Sync to GitHub', kind: 'enable' });

  // Two situations wear the `off` state: never synced, and synced once then
  // switched off. Only the second leaves a copy nothing else will ever remove,
  // so only it gets the delete — and this is the app's one place to offer it.
  if (state === 'off' && orphaned) {
    items.push({ label: 'Delete copy from GitHub', kind: 'delete-remote', danger: true });
  }

  const run = (kind: SyncActionKind) => {
    switch (kind) {
      case 'push':
        void sync.push(name);
        break;
      case 'pull':
        void sync.pull(name);
        break;
      case 'enable':
        void sync.enableSync(name);
        break;
      case 'disable':
        void sync.disableSync(name);
        break;
      case 'delete-remote':
        void sync.deleteRemote(name);
        break;
    }
  };

  return { items, run };
}

/**
 * The pre-upload warning, shown as the menu item's tooltip.
 *
 * "Secret gist" is GitHub's own term and the one thing here worth naming
 * exactly, because it is what the user will see if they go looking on
 * github.com — and because it reads as "private" when it means unlisted: anyone
 * with the link can read it, one person's access cannot be revoked, and
 * deleting is the only remedy. Said before the first upload, not after.
 */
export const FIRST_SYNC_WARNING =
  'Upload this file to GitHub so your other devices can read it. It goes to a secret gist: unlisted, not private — anyone with the link can read it.';
