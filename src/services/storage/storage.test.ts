import { describe, expect, it } from 'vitest';
import { createFakeStorageService } from './fakeStorage';
import { MAX_STORAGE_BYTES, StorageQuotaExceededError } from './types';

describe('StorageService (fake adapter)', () => {
  it('round-trips a saved file', async () => {
    const storage = createFakeStorageService();
    await storage.saveFile({ name: 'a.md', content: '# hi', kind: 'snapshot', savedAt: 1 });
    const file = await storage.getFile('a.md');
    expect(file?.content).toBe('# hi');
    expect(await storage.listFiles()).toHaveLength(1);
  });

  it('removes a file', async () => {
    const storage = createFakeStorageService();
    await storage.saveFile({ name: 'a.md', content: '# hi', kind: 'snapshot', savedAt: 1 });
    await storage.removeFile('a.md');
    expect(await storage.getFile('a.md')).toBeUndefined();
    expect(await storage.listFiles()).toHaveLength(0);
  });

  it('clears all files and preferences', async () => {
    const storage = createFakeStorageService();
    await storage.saveFile({ name: 'a.md', content: '# hi', kind: 'snapshot', savedAt: 1 });
    await storage.setPreferences({ themeId: 'night-owl' });
    await storage.clearAll();
    expect(await storage.listFiles()).toHaveLength(0);
    expect(await storage.getPreferences()).toEqual({});
  });

  it('throws StorageQuotaExceededError when over quota', async () => {
    const storage = createFakeStorageService({ quotaBytes: 10 });
    await expect(
      storage.saveFile({ name: 'big.md', content: 'x'.repeat(20), kind: 'snapshot', savedAt: 1 }),
    ).rejects.toThrow(StorageQuotaExceededError);
  });

  it('allows overwriting an existing file within quota', async () => {
    const storage = createFakeStorageService({ quotaBytes: 10 });
    await storage.saveFile({ name: 'a.md', content: 'x'.repeat(8), kind: 'snapshot', savedAt: 1 });
    await storage.saveFile({ name: 'a.md', content: 'y'.repeat(9), kind: 'snapshot', savedAt: 2 });
    expect((await storage.getFile('a.md'))?.content).toBe('y'.repeat(9));
  });

  it('defaults to the 100MB app cap when no quota is given', async () => {
    const storage = createFakeStorageService();
    expect((await storage.estimate()).quotaBytes).toBe(MAX_STORAGE_BYTES);
    await expect(
      storage.saveFile({
        name: 'huge.md',
        content: 'x'.repeat(MAX_STORAGE_BYTES + 1),
        kind: 'snapshot',
        savedAt: 1,
      }),
    ).rejects.toThrow(StorageQuotaExceededError);
  });

  it('persists preferences independently of files', async () => {
    const storage = createFakeStorageService();
    await storage.setPreferences({ themeId: 'sepia-book', sidebarOpen: false });
    await storage.setPreferences({ fontSize: 19 });
    expect(await storage.getPreferences()).toEqual({
      themeId: 'sepia-book',
      sidebarOpen: false,
      fontSize: 19,
    });
  });
});
