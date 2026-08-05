import type { FilePermission } from '@/services/filesystem';

// Folders are storage-layer data, so they are declared alongside the record that
// carries the membership and re-exported here for consumers of this module.
export type { Folder } from '@/services/storage/types';

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
  /** Id of the virtual folder this file belongs to, or undefined when ungrouped. */
  folderId?: string;
}
