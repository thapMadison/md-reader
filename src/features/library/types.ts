import type { FilePermission } from '@/services/filesystem';

export interface LibraryFile {
  name: string;
  kind: 'live' | 'snapshot';
  perm: FilePermission;
  originalContent: string;
  editedContent: string;
  handle?: FileSystemFileHandle;
}
