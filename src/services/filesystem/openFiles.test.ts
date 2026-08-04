import { afterEach, describe, expect, it, vi } from 'vitest';
import { pickFilesLive, readFileListSettled } from './openFiles';

const setPicker = (impl: () => Promise<unknown>) => {
  (window as unknown as Record<string, unknown>).showOpenFilePicker = vi.fn(impl);
};

afterEach(() => {
  delete (window as unknown as Record<string, unknown>).showOpenFilePicker;
});

describe('pickFilesLive', () => {
  // Dismissing the picker rejects with AbortError. Letting that escape made
  // every cancelled "Open file" click an unhandled promise rejection.
  it('treats a dismissed picker as "nothing opened", not an error', async () => {
    setPicker(() => Promise.reject(new DOMException('The user aborted a request.', 'AbortError')));

    await expect(pickFilesLive()).resolves.toEqual([]);
  });

  it('still propagates a genuine picker failure', async () => {
    setPicker(() => Promise.reject(new DOMException('Denied', 'SecurityError')));

    await expect(pickFilesLive()).rejects.toThrow('Denied');
  });

  it('returns live handles when the user picks files', async () => {
    const handle = {
      name: 'notes.md',
      getFile: () => Promise.resolve({ text: () => Promise.resolve('# hi') }),
    };
    setPicker(() => Promise.resolve([handle]));

    const opened = await pickFilesLive();

    expect(opened).toHaveLength(1);
    expect(opened[0]).toMatchObject({ name: 'notes.md', content: '# hi', kind: 'live', perm: 'granted' });
  });
});

describe('readFileListSettled', () => {
  const asFile = (name: string, body = 'x') => new File([body], name, { type: 'text/plain' });
  const read = async (files: File[]) => (await readFileListSettled(files)).files;

  // The picker's accept list and this filter disagreed: .txt was openable via
  // <input> but not offered by the picker.
  it.each(['a.md', 'b.markdown', 'c.txt', 'D.MD'])('accepts %s', async (name) => {
    const opened = await read([asFile(name)]);
    expect(opened.map((o) => o.name)).toEqual([name]);
  });

  it('drops files with an unrelated extension', async () => {
    const opened = await read([asFile('photo.png'), asFile('keep.md')]);
    expect(opened.map((o) => o.name)).toEqual(['keep.md']);
  });

  // An extension-filtered file is not a failure — the user gets no notice for
  // a .png they dropped alongside their markdown, only for markdown that would
  // not read.
  it('does not report filtered-out files as failures', async () => {
    const { failed } = await readFileListSettled([asFile('photo.png'), asFile('keep.md')]);
    expect(failed).toEqual([]);
  });

  it('labels input-picked files as snapshots, never live', async () => {
    const opened = await read([asFile('note.md')]);
    // A snapshot has no FileSystemFileHandle, so it can never be re-read from
    // disk or have permission re-granted — mislabelling it 'live' put a dead
    // "Grant access" action in the sidebar.
    expect(opened[0].kind).toBe('snapshot');
    expect(opened[0].perm).toBe('na');
    expect(opened[0].handle).toBeUndefined();
  });
});
