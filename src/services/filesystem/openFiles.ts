import { supportsFileSystemAccess, type OpenedFile } from './types';

const MD_ACCEPT = { 'text/markdown': ['.md', '.markdown'] };

async function readHandle(handle: FileSystemFileHandle): Promise<string> {
  const file = await handle.getFile();
  return file.text();
}

// FS Access API path: file stays "live", re-readable from disk, with its
// handle persisted (via idb, see filesystem/handleStore) so permission can
// be re-requested on a later visit. Falls back to <input type=file> (which
// can only ever produce an in-memory "snapshot") when the API is unavailable.
export async function pickFilesLive(): Promise<OpenedFile[]> {
  if (!supportsFileSystemAccess()) return [];
  const handles = await window.showOpenFilePicker!({
    multiple: true,
    types: [{ description: 'Markdown', accept: MD_ACCEPT }],
    excludeAcceptAllOption: false,
  });
  const files: OpenedFile[] = [];
  for (const handle of handles) {
    const content = await readHandle(handle);
    files.push({ name: handle.name, content, kind: 'live', perm: 'granted', handle });
  }
  return files;
}

export function readFileListAsSnapshots(fileList: FileList | File[]): Promise<OpenedFile[]> {
  const files = Array.from(fileList).filter((f) => /\.(md|markdown|txt)$/i.test(f.name));
  return Promise.all(
    files.map(
      (f) =>
        new Promise<OpenedFile>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () =>
            resolve({ name: f.name, content: String(reader.result ?? ''), kind: 'snapshot', perm: 'na' });
          reader.onerror = () => reject(reader.error);
          reader.readAsText(f);
        }),
    ),
  );
}

export async function queryHandlePermission(handle: FileSystemFileHandle): Promise<'granted' | 'prompt' | 'denied'> {
  const state = await handle.queryPermission({ mode: 'read' });
  return state;
}

export async function requestHandlePermission(handle: FileSystemFileHandle): Promise<'granted' | 'prompt' | 'denied'> {
  const state = await handle.requestPermission({ mode: 'read' });
  return state;
}

export async function rereadHandle(handle: FileSystemFileHandle): Promise<string> {
  return readHandle(handle);
}
