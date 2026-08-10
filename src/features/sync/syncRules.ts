import { MAX_SYNC_FILE_BYTES } from '@/services/gist/types';

// The two questions about a file that have an answer without a provider: how big
// it is for sync purposes, and what its `keep-both` copy would be called.
//
// Split out of SyncContext.tsx because they are read from outside the provider —
// ConflictBanner names the copy before the resolution is chosen, and the tests
// exercise the size rule directly — and neither needs a single thing from the
// context. Nothing here touches React.

const encoder = new TextEncoder();

/** UTF-8 bytes, not `.length` — CJK and emoji undercount by three to four times. */
export function syncableBytes(content: string): number {
  return encoder.encode(content).length;
}

export function canSync(content: string): boolean {
  return syncableBytes(content) <= MAX_SYNC_FILE_BYTES;
}

/**
 * Suffix for the copy kept by `keep-both`, before the extension:
 * `notes.md` → `notes (from GitHub).md`.
 */
const KEEP_BOTH_SUFFIX = ' (from GitHub)';

export function keepBothName(name: string): string {
  const dot = name.lastIndexOf('.');
  // No extension, or a leading dot with nothing before it (`.gitignore`), so
  // there is no stem to suffix — append and leave the name intact.
  if (dot <= 0) return `${name}${KEEP_BOTH_SUFFIX}`;
  return `${name.slice(0, dot)}${KEEP_BOTH_SUFFIX}${name.slice(dot)}`;
}
