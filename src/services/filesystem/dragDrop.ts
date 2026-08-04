import { readFileListSettled } from './openFiles';
import type { OpenedFile } from './types';

// Dropped files always become snapshots — a plain DataTransfer never carries
// a FileSystemFileHandle, so there's no live re-read path available.
export async function readDroppedFiles(
  dataTransfer: DataTransfer,
): Promise<{ files: OpenedFile[]; failed: string[] }> {
  return readFileListSettled(dataTransfer.files);
}
