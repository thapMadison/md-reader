import type { LayoutMode } from '@/hooks/useBreakpoint';
import { Article } from '@/features/reader/Article';
import { LoadingSkeleton } from '@/features/reader/LoadingSkeleton';
import { useChromePattern } from '@/features/theming/ThemeContext';
import { NOTCH_CONTENT_INSET, effectivePattern } from './chromePattern';
import type { LibraryFile } from '@/features/library/types';

interface ContentAreaProps {
  mode: LayoutMode;
  hidden: boolean;
  contentRef: React.RefObject<HTMLElement | null>;
  onScroll: React.UIEventHandler<HTMLElement>;
  activeFile: LibraryFile | null;
  contentReady: boolean;
  showPermBanner: boolean;
  bannerText: string;
  bannerDenied: boolean;
  bannerShowGrantButton: boolean;
  onGrantActive: () => void;
  onDismissBanner: () => void;
  onOpenFileClick: () => void;
}

function articlePadding(mode: LayoutMode): string {
  if (mode === 'mobile') return '24px 18px 72px';
  if (mode === 'tablet') return '44px 36px 96px';
  return '56px 48px 120px';
}

function bannerMargin(mode: LayoutMode): string {
  if (mode === 'mobile') return '16px 18px 0';
  if (mode === 'tablet') return '24px 36px 0';
  return '28px 48px 0';
}

export function ContentArea({
  mode,
  hidden,
  contentRef,
  onScroll,
  activeFile,
  contentReady,
  showPermBanner,
  bannerText,
  bannerDenied,
  bannerShowGrantButton,
  onGrantActive,
  onDismissBanner,
  onOpenFileClick,
}: ContentAreaProps) {
  const chromePattern = useChromePattern();
  const hasFile = !!activeFile;
  const source = activeFile?.editedContent ?? '';
  const isEmptyFile = hasFile && source.trim() === '';
  const showLoading = hasFile && !isEmptyFile && !contentReady;
  const showArticle = hasFile && !isEmptyFile && contentReady;
  const pad = articlePadding(mode);
  // The notched sidebar's bites cut 20px into its own width, so the deepest
  // point of each notch sits that much closer to the reading column than a
  // straight edge would. Text set against it reads as touching the cut, so the
  // whole pane shifts clear — applied here rather than on the flex row in
  // AppShell, where it would have moved the sidebar along with the content.
  const notched = effectivePattern(chromePattern.pattern, mode) === 'notched';

  return (
    <main
      ref={contentRef as React.RefObject<HTMLElement>}
      onScroll={onScroll}
      style={{
        position: 'relative',
        flex: 1,
        minWidth: 0,
        display: hidden ? 'none' : 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        background: 'var(--bg)',
        transition: 'background .25s',
        ...(notched ? { paddingLeft: NOTCH_CONTENT_INSET } : null),
      }}
    >
      {showPermBanner && (
        <div
          style={{
            flex: 'none',
            margin: bannerMargin(mode),
            padding: '10px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            border: `1px solid ${bannerDenied ? 'var(--danger)' : 'var(--border)'}`,
            background: bannerDenied ? 'var(--danger-bg)' : 'var(--hl)',
            borderRadius: 8,
          }}
        >
          <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, lineHeight: 1.5, color: bannerDenied ? 'var(--danger)' : 'var(--fg)' }}>
            {bannerText}
          </span>
          {bannerShowGrantButton && (
            <button
              onClick={onGrantActive}
              style={{
                flex: 'none',
                height: 26,
                padding: '0 11px',
                border: '1px solid var(--link)',
                borderRadius: 7,
                background: 'var(--link)',
                color: '#fff',
                fontSize: 11.5,
                fontWeight: 600,
                fontFamily: 'var(--font-ui)',
                cursor: 'pointer',
              }}
            >
              Grant access
            </button>
          )}
          <span
            onClick={onDismissBanner}
            style={{
              flex: 'none',
              width: 20,
              height: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 5,
              color: 'var(--muted)',
              cursor: 'pointer',
              fontSize: 14,
              lineHeight: 1,
            }}
          >
            ×
          </span>
        </div>
      )}

      {showLoading && <LoadingSkeleton label={`${activeFile?.name} — ${(source.length / (1024 * 1024)).toFixed(1)} MB`} />}

      {showArticle && <Article source={source} padding={pad} />}

      {isEmptyFile && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, animation: 'fadeIn .2s' }}>
          <svg width="34" height="40" viewBox="0 0 12 14" style={{ color: 'var(--border)' }}>
            <path d="M1.5 1h6L11 4.5V13H1.5V1z" stroke="currentColor" fill="none" strokeLinejoin="round" />
            <path d="M7.5 1v3.5H11" stroke="currentColor" fill="none" strokeLinejoin="round" />
          </svg>
          <div style={{ textAlign: 'center', padding: '0 24px' }}>
            <div style={{ fontSize: 15, fontWeight: 650, marginBottom: 4 }}>{activeFile?.name} is empty</div>
            <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>0 bytes of markdown — open the editor (⌘E) to start writing.</div>
          </div>
        </div>
      )}

      {!hasFile && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, animation: 'fadeIn .2s' }}>
          <div style={{ position: 'relative', width: 96, height: 112 }}>
            <div
              style={{
                position: 'absolute',
                inset: '8px -10px auto auto',
                width: 78,
                height: 96,
                border: '1.5px solid var(--border)',
                borderRadius: 8,
                background: 'var(--hl)',
                transform: 'rotate(6deg)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: '0 auto auto 0',
                width: 78,
                height: 96,
                border: '1.5px solid var(--border)',
                borderRadius: 8,
                background: 'var(--bg)',
                transform: 'rotate(-3deg)',
                display: 'flex',
                flexDirection: 'column',
                gap: 7,
                padding: '14px 12px',
              }}
            >
              <div style={{ height: 8, width: '60%', borderRadius: 3, background: 'var(--fg)', opacity: 0.75 }} />
              <div style={{ height: 5, width: '100%', borderRadius: 3, background: 'var(--border)' }} />
              <div style={{ height: 5, width: '88%', borderRadius: 3, background: 'var(--border)' }} />
              <div style={{ height: 5, width: '94%', borderRadius: 3, background: 'var(--border)' }} />
              <div style={{ height: 5, width: '55%', borderRadius: 3, background: 'var(--border)' }} />
            </div>
          </div>
          <div style={{ textAlign: 'center', padding: '0 24px' }}>
            <div style={{ fontSize: 16, fontWeight: 650, marginBottom: 5 }}>No file open</div>
            <div style={{ fontSize: 13.5, color: 'var(--muted)' }}>Drop a .md file anywhere, or click Open</div>
          </div>
          <button
            onClick={onOpenFileClick}
            style={{
              height: 34,
              padding: '0 18px',
              border: '1px solid var(--border)',
              borderRadius: 8,
              background: 'transparent',
              color: 'var(--fg)',
              fontSize: 13,
              fontWeight: 600,
              fontFamily: 'var(--font-ui)',
              cursor: 'pointer',
            }}
          >
            Open file…
          </button>
        </div>
      )}
    </main>
  );
}
