import type { FilePermission } from '@/services/filesystem';

export interface LibraryFile {
  name: string;
  kind: 'live' | 'snapshot';
  perm: FilePermission;
  originalContent: string;
  editedContent: string;
  handle?: FileSystemFileHandle;
  /** Byte size on disk as of the last read. Live files only. */
  size?: number;
  /** Disk mtime as of the last read. Live files only. */
  lastModified?: number;
}
