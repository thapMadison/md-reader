export type FilePermission = 'granted' | 'prompt' | 'denied' | 'na';

export interface OpenedFile {
  name: string;
  content: string;
  kind: 'live' | 'snapshot';
  perm: FilePermission;
  handle?: FileSystemFileHandle;
  /** Byte size on disk at read time. */
  size?: number;
  /** Disk mtime at read time — the signal that a re-read saw a newer edit. */
  lastModified?: number;
}

export function supportsFileSystemAccess(): boolean {
  return typeof window !== 'undefined' && 'showOpenFilePicker' in window;
}
