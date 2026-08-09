import { describe, expect, it } from 'vitest';
import { createFakeGistService } from './fakeGist';
import { FileTooLargeToSyncError, GistApiError, GistTruncatedError, MAX_SYNC_FILE_BYTES } from './types';

// The fake stands in for GitHub in every SyncContext test, so where it diverges
// from the real adapter those tests stop meaning anything. These assertions pin
// the behaviours that would be easiest to get subtly wrong and hardest to
// notice: metadata-only listing, the size cap, and id-keyed writes.
describe('fakeGistService', () => {
  it('starts empty and creates gists with distinct ids', async () => {
    const gist = createFakeGistService();
    expect(await gist.listGists()).toEqual([]);

    const a = await gist.createGist({ fileName: 'a.md', content: '# a' });
    const b = await gist.createGist({ fileName: 'b.md', content: '# b' });
    expect(a.id).not.toBe(b.id);
    expect(await gist.listGists()).toHaveLength(2);
  });

  it('lists metadata without content, like the real API', async () => {
    // If the fake leaked content here, a lazy-loading regression — fetching
    // every document up front on a phone — would pass its tests.
    const gist = createFakeGistService({ seed: [{ id: 'g1', fileName: 'a.md', content: 'secret body' }] });
    expect(JSON.stringify(await gist.listGists())).not.toContain('secret body');
  });

  it('round-trips content through getGist', async () => {
    const gist = createFakeGistService({ seed: [{ id: 'g1', fileName: 'a.md', content: '# hi' }] });
    expect((await gist.getGist('g1')).content).toBe('# hi');
  });

  it('creates gists secret by default', async () => {
    const gist = createFakeGistService();
    expect((await gist.createGist({ fileName: 'a.md', content: 'x' })).public).toBe(false);
  });

  it('updates by id, leaving other gists untouched', async () => {
    const gist = createFakeGistService({
      seed: [
        { id: 'g1', fileName: 'a.md', content: 'one' },
        { id: 'g2', fileName: 'a.md', content: 'two' },
      ],
    });
    // Same file name in both: binding by name instead of id would overwrite the
    // wrong document, which is the collision risk the design calls out.
    await gist.updateGist('g1', { fileName: 'a.md', content: 'changed' });
    expect((await gist.getGist('g1')).content).toBe('changed');
    expect((await gist.getGist('g2')).content).toBe('two');
  });

  it('advances updatedAt on every write', async () => {
    // Two writes in the same millisecond must not compare equal, or the remote
    // watermark cannot order them.
    const gist = createFakeGistService({ seed: [{ id: 'g1', fileName: 'a.md', content: 'one' }] });
    const before = (await gist.listGists())[0].updatedAt;
    const after = await gist.updateGist('g1', { fileName: 'a.md', content: 'two' });
    expect(after.updatedAt).toBeGreaterThan(before);
  });

  it('reports size in UTF-8 bytes', async () => {
    const gist = createFakeGistService();
    expect((await gist.createGist({ fileName: 'a.md', content: '日本' })).size).toBe(6);
  });

  it('enforces the same size cap as the real adapter', async () => {
    const gist = createFakeGistService();
    const tooBig = 'x'.repeat(MAX_SYNC_FILE_BYTES + 1);
    await expect(gist.createGist({ fileName: 'a.md', content: tooBig })).rejects.toThrow(
      FileTooLargeToSyncError,
    );
  });

  it('deletes, then reports the gist as gone', async () => {
    const gist = createFakeGistService({ seed: [{ id: 'g1', fileName: 'a.md', content: 'x' }] });
    await gist.deleteGist('g1');
    await expect(gist.getGist('g1')).rejects.toThrow(GistApiError);
    expect(await gist.listGists()).toEqual([]);
  });

  it('404s on a missing gist rather than returning undefined', async () => {
    await expect(createFakeGistService().getGist('nope')).rejects.toThrow(GistApiError);
  });

  it('records calls in order, for asserting a push happened exactly once', async () => {
    const gist = createFakeGistService({ seed: [{ id: 'g1', fileName: 'a.md', content: 'x' }] });
    await gist.listGists();
    await gist.getGist('g1');
    await gist.updateGist('g1', { fileName: 'a.md', content: 'y' });
    expect(gist.__calls).toEqual(['listGists', 'getGist', 'updateGist']);
  });

  it('__mutateRemote simulates an edit made elsewhere', async () => {
    // Nothing the app does moves the remote copy on its own, so without this
    // the conflict path is unreachable in tests.
    const gist = createFakeGistService({ seed: [{ id: 'g1', fileName: 'a.md', content: 'x' }] });
    const before = (await gist.listGists())[0].updatedAt;
    gist.__mutateRemote('g1', 'edited on github.com');

    expect((await gist.getGist('g1')).content).toBe('edited on github.com');
    expect((await gist.listGists())[0].updatedAt).toBeGreaterThan(before);
    // Not recorded as a call: it stands for something happening outside the app.
    expect(gist.__calls).not.toContain('__mutateRemote');
  });

  it('__truncate reproduces the clipped-content failure', async () => {
    const gist = createFakeGistService({ seed: [{ id: 'g1', fileName: 'a.md', content: 'x' }] });
    gist.__truncate('g1');
    await expect(gist.getGist('g1')).rejects.toThrow(GistTruncatedError);
  });

  it('__failNext fails one call and then recovers', async () => {
    const gist = createFakeGistService({ seed: [{ id: 'g1', fileName: 'a.md', content: 'x' }] });
    gist.__failNext('getGist', new GistApiError(500, 'boom'));
    await expect(gist.getGist('g1')).rejects.toThrow('boom');
    await expect(gist.getGist('g1')).resolves.toMatchObject({ content: 'x' });
  });
});
