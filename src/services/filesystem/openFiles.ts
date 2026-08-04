import { supportsFileSystemAccess, type OpenedFile } from './types';

// One list, used by the picker's filter and by the snapshot path's extension
// check. They disagreed before: the picker offered .md/.markdown while the
// <input> fallback also accepted .txt, so the same file was openable by one
// route and silently dropped by the other.
export const MD_EXTENSIONS = ['.md', '.markdown', '.txt'] as const;

const MD_ACCEPT = { 'text/markdown': [...MD_EXTENSIONS] };

const MD_EXTENSION_RE = new RegExp(`(${MD_EXTENSIONS.map((e) => `\\${e}`).join('|')})$`, 'i');

async function readHandle(handle: FileSystemFileHandle): Promise<string> {
  const file = await handle.getFile();
  return file.text();
}

/**
 * Identity details for a live file, read fresh from disk.
 *
 * The File System Access API deliberately never exposes a filesystem path —
 * `handle.name` is the bare filename, with no directory and no drive. Size and
 * last-modified are the only disk-backed facts available to distinguish two
 * files that share a name, and lastModified doubles as proof the re-read
 * actually picked up an on-disk edit.
 */
export async function statHandle(
  handle: FileSystemFileHandle,
): Promise<{ size: number; lastModified: number }> {
  const file = await handle.getFile();
  return { size: file.size, lastModified: file.lastModified };
}

// FS Access API path: file stays "live", re-readable from disk, with its
// handle persisted (the `handle` field of StoredFileRecord in services/storage)
// so permission can be re-requested on a later visit. Falls back to
// <input type=file> (which can only ever produce an in-memory "snapshot") when
// the API is unavailable.
export async function pickFilesLive(): Promise<OpenedFile[]> {
  if (!supportsFileSystemAccess()) return [];
  let handles: FileSystemFileHandle[];
  try {
    handles = await window.showOpenFilePicker!({
      multiple: true,
      types: [{ description: 'Markdown', accept: MD_ACCEPT }],
      // "All files" stays available on purpose — markdown is often kept with
      // no extension or an unusual one, and the picker is an explicit user
      // choice. No extension check is applied to what comes back for the same
      // reason.
      excludeAcceptAllOption: false,
    });
  } catch (err) {
    // Dismissing the picker rejects with AbortError. That is a normal outcome,
    // not a failure — swallow it and report "nothing opened". Anything else is
    // a real error and stays on the caller's rejection path.
    if (err instanceof DOMException && err.name === 'AbortError') return [];
    throw err;
  }
  const files: OpenedFile[] = [];
  for (const handle of handles) {
    // One getFile() for both content and metadata: two calls could straddle an
    // on-disk write and report a size that does not match the text shown.
    const file = await handle.getFile();
    files.push({
      name: handle.name,
      content: await file.text(),
      kind: 'live',
      perm: 'granted',
      handle,
      size: file.size,
      lastModified: file.lastModified,
    });
  }
  return files;
}

/**
 * Reads every readable file and reports the rest.
 *
 * Deliberately not Promise.all: one unreadable file (deleted between the drop
 * and the read, locked by another process, or a directory entry that slipped
 * past the extension filter) rejected the whole batch, so dropping five files
 * with one bad one opened none of them — and the caller only logs, so the user
 * saw nothing happen at all. Partial success is the honest outcome here; the
 * failures come back alongside so the caller can name the files it skipped
 * rather than leaving them silently missing.
 */
export async function readFileListSettled(
  fileList: FileList | File[],
): Promise<{ files: OpenedFile[]; failed: string[] }> {
  const candidates = Array.from(fileList).filter((f) => MD_EXTENSION_RE.test(f.name));
  const results = await Promise.allSettled(
    candidates.map(
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
  const files: OpenedFile[] = [];
  const failed: string[] = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') files.push(r.value);
    else failed.push(candidates[i].name);
  });
  return { files, failed };
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
