import { useOptionalGistAuth } from '@/services/gist/GistContext';

/**
 * Sign-in control for GitHub sync.
 *
 * Reads its own context rather than taking props. Toolbar is threaded flat
 * props from AppShell, and adding five more for auth would push sync state
 * through a component that has no other reason to know about it.
 */
interface AccountButtonProps {
  compact?: boolean;
  /**
   * Render as the account card at the top of the toolbar's ⋯ menu rather than a
   * toolbar button. Presentation only — every state and action below is the
   * same either way, which is the point of the flag: the menu gets this
   * component, not a second copy of its logic.
   */
  menuItem?: boolean;
  /** Lets the menu close itself once the user has acted. */
  onAfterAction?: () => void;
}

export function AccountButton({ compact = false, menuItem = false, onAfterAction }: AccountButtonProps) {
  // Optional rather than throwing: Toolbar is otherwise presentational, and a
  // tree assembled without the sync providers should still render its chrome.
  const auth = useOptionalGistAuth();
  if (!auth) return null;
  const { status, user, error, configured, signIn, signOut } = auth;

  // A build with no client id cannot sign anyone in. Showing a button that
  // always fails is worse than showing none: the user cannot tell a missed
  // deployment step from a broken account.
  if (!configured) return null;

  // In the menu the account is a card rather than a row. It is the first thing
  // the panel shows and the only part of it that identifies *you*, so it gets
  // the avatar at a size worth recognising, the login as a heading, and a line
  // saying what the account is actually for — the question a menu of two
  // unadorned rows never answered.
  if (menuItem) {
    if (status === 'loading' || status === 'signing-in') {
      return (
        <div style={CARD} aria-busy="true">
          <span style={{ ...AVATAR, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
            <GitHubIcon />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={CARD_TITLE}>{status === 'loading' ? 'Checking account…' : 'Signing in…'}</div>
            <div style={CARD_SUB}>Talking to GitHub</div>
          </div>
        </div>
      );
    }

    if (status === 'signed-in') {
      return (
        <div style={CARD}>
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt="" width={30} height={30} style={AVATAR} />
          ) : (
            <span style={{ ...AVATAR, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
              <GitHubIcon />
            </span>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={CARD_TITLE}>{user?.login ?? 'Signed in'}</div>
            {/* What the connection does, not that it exists — a green "Connected"
                pill would say the same thing the avatar already says. */}
            <div style={CARD_SUB}>Files sync to secret gists</div>
          </div>
          <button
            data-menu-row=""
            onClick={() => {
              void signOut();
              onAfterAction?.();
            }}
            title={`Signed in as ${user?.login ?? 'GitHub'} — click to sign out`}
            style={{
              flex: 'none',
              height: 26,
              padding: '0 9px',
              border: '1px solid var(--border)',
              borderRadius: 7,
              background: 'transparent',
              color: 'var(--muted)',
              fontSize: 12,
              fontWeight: 600,
              fontFamily: 'var(--font-ui)',
              cursor: 'pointer',
            }}
          >
            Sign out
          </button>
        </div>
      );
    }

    // The panel's one filled control. Signed out, connecting an account is the
    // only thing in here that unlocks a capability rather than adjusting one,
    // and it was previously a grey row indistinguishable from "Theme".
    return (
      <button
        onClick={() => {
          signIn();
          onAfterAction?.();
        }}
        title={error ?? 'Sign in with GitHub to sync files across devices'}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          width: '100%',
          padding: '10px 11px',
          borderRadius: 9,
          border: error ? '1px solid var(--danger)' : '1px solid transparent',
          background: error ? 'var(--danger-bg)' : 'var(--link)',
          color: error ? 'var(--danger)' : '#fff',
          fontFamily: 'var(--font-ui)',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <GitHubIcon />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 13, fontWeight: 600 }}>
            {error ? 'Sign-in failed — try again' : 'Sign in with GitHub'}
          </span>
          <span style={{ display: 'block', fontSize: 11.5, fontWeight: 500, opacity: error ? 1 : 0.8, marginTop: 1 }}>
            {error ?? 'Sync this library to your other devices'}
          </span>
        </span>
      </button>
    );
  }

  // Inside the menu the label always shows; `compact` is the toolbar's
  // narrow-screen rule.
  const showLabel = !compact;

  const base = {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    height: 30,
    padding: compact ? '0 8px' : '0 10px',
    border: '1px solid var(--chrome-border)',
    borderRadius: 7,
    background: 'transparent',
    color: 'var(--chrome-fg)',
    fontSize: 12.5,
    fontWeight: 600,
    fontFamily: 'var(--font-ui)',
    cursor: 'pointer',
  } as const;

  if (status === 'loading') {
    return (
      <span style={{ ...base, cursor: 'default', color: 'var(--chrome-muted)' }} aria-busy="true">
        <GitHubIcon />
      </span>
    );
  }

  if (status === 'signing-in') {
    return (
      <span style={{ ...base, cursor: 'default', color: 'var(--chrome-muted)' }} aria-busy="true">
        <GitHubIcon />
        {showLabel && <span>Signing in…</span>}
      </span>
    );
  }

  if (status === 'signed-in') {
    return (
      <button
        onClick={() => {
          void signOut();
          onAfterAction?.();
        }}
        title={`Signed in as ${user?.login ?? 'GitHub'} — click to sign out`}
        style={base}
      >
        {user?.avatarUrl ? (
          <img src={user.avatarUrl} alt="" width={16} height={16} style={{ borderRadius: '50%', flex: 'none' }} />
        ) : (
          <GitHubIcon />
        )}
        {showLabel && <span>{user?.login ?? 'Signed in'}</span>}
      </button>
    );
  }

  return (
    <button
      onClick={() => {
        signIn();
        onAfterAction?.();
      }}
      title={error ?? 'Sign in with GitHub to sync files across devices'}
      style={{ ...base, ...(error ? { borderColor: 'var(--danger)', color: 'var(--danger)' } : null) }}
    >
      <GitHubIcon />
      {showLabel && <span>{error ? 'Sign-in failed' : 'Sign in'}</span>}
    </button>
  );
}

/** The menu card's frame — a tinted block, so the account reads as a header
 *  rather than as the first of a list of settings. */
const CARD = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  width: '100%',
  padding: '9px 10px',
  borderRadius: 9,
  background: 'var(--hl)',
} as const;

const AVATAR = {
  flex: 'none',
  width: 30,
  height: 30,
  borderRadius: '50%',
  border: '1px solid var(--border)',
  background: 'var(--bg)',
} as const;

const CARD_TITLE = {
  fontSize: 13.5,
  fontWeight: 700,
  color: 'var(--fg)',
  fontFamily: 'var(--font-ui)',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
} as const;

const CARD_SUB = {
  fontSize: 11.5,
  fontWeight: 500,
  color: 'var(--muted)',
  fontFamily: 'var(--font-ui)',
  marginTop: 1,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
} as const;

export function GitHubIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" style={{ flex: 'none' }}>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.4 7.4 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}
