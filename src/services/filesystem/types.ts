export type FilePermission = 'granted' | 'prompt' | 'denied' | 'na';

export interface OpenedFile {
  name: string;
  content: string;
  kind: 'live' | 'snapshot';
  perm: FilePermission;
  handle?: FileSystemFileHandle;
}

export function supportsFileSystemAccess(): boolean {
  return typeof window !== 'undefined' && 'showOpenFilePicker' in window;
}
