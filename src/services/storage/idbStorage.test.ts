import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StorageQuotaExceededError } from './types';

// `idb` is mocked rather than exercised against a real IndexedDB: jsdom ships
// none, and the logic worth testing here is not the database itself but the
// error translation around it — the branches that decide whether a caller sees
// a typed StorageQuotaExceededError, a StorageUnavailableError, or a hang.
// Those were the only untested paths in this file, and a hang is precisely what
// a passing test against a healthy database cannot tell you about.
const openDB = vi.hoisted(() => vi.fn());
vi.mock('idb', () => ({ openDB }));

// Imported after the mock is registered.
const { createIdbStorageService, StorageUnavailableError } = await import('./idbStorage');

function fakeDb(overrides: Record<string, unknown> = {}) {
  return {
    put: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue(undefined),
    getAll: vi.fn().mockResolvedValue([]),
    delete: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

const RECORD = { name: 'a.md', content: 'hello', kind: 'snapshot' as const, savedAt: 1 };

// jsdom exposes no indexedDB global, which the service treats — correctly — as
// "storage unavailable" and short-circuits on before it ever calls openDB. A
// stub stands in so the paths past that guard are reachable; the guard itself
// is covered by its own test below, which removes the stub again.
beforeEach(() => {
  openDB.mockReset();
  vi.useRealTimers();
  vi.stubGlobal('indexedDB', {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('idbStorage quota translation', () => {
  it('translates a QuotaExceededError DOMException on saveFile', async () => {
    const quota = new DOMException('full', 'QuotaExceededError');
    openDB.mockResolvedValue(fakeDb({ put: vi.fn().mockRejectedValue(quota) }));

    const service = createIdbStorageService();
    await expect(service.saveFile(RECORD)).rejects.toBeInstanceOf(StorageQuotaExceededError);
  });

  it('translates a QuotaExceededError on setPreferences', async () => {
    const quota = new DOMException('full', 'QuotaExceededError');
    openDB.mockResolvedValue(fakeDb({ put: vi.fn().mockRejectedValue(quota) }));

    const service = createIdbStorageService();
    await expect(service.setPreferences({ themeId: 'x' })).rejects.toBeInstanceOf(
      StorageQuotaExceededError,
    );
  });

  // The reactive translation must not swallow unrelated failures — a corrupt
  // store or a closed connection has to stay distinguishable from a full disk,
  // because the caller treats quota as recoverable and everything else as not.
  it('leaves a non-quota error untranslated', async () => {
    const other = new DOMException('nope', 'InvalidStateError');
    openDB.mockResolvedValue(fakeDb({ put: vi.fn().mockRejectedValue(other) }));

    const service = createIdbStorageService();
    await expect(service.saveFile(RECORD)).rejects.toBe(other);
  });
});

describe('idbStorage availability', () => {
  it('rejects rather than hanging when the database never opens', async () => {
    vi.useFakeTimers();
    // A promise that never settles — the shape of a blocked upgrade or a
    // private-window indexedDB that fires no event at all.
    openDB.mockReturnValue(new Promise(() => {}));

    const service = createIdbStorageService();
    const call = service.listFiles();
    const assertion = expect(call).rejects.toBeInstanceOf(StorageUnavailableError);
    await vi.advanceTimersByTimeAsync(5001);
    await assertion;
  });

  it('wraps an open failure as StorageUnavailableError', async () => {
    openDB.mockRejectedValue(new DOMException('denied', 'SecurityError'));

    const service = createIdbStorageService();
    await expect(service.getPreferences()).rejects.toBeInstanceOf(StorageUnavailableError);
  });

  // Environments with no indexedDB at all (Firefox private windows, some
  // embedded webviews) must fail fast rather than wait out the open timeout.
  it('rejects immediately when indexedDB is absent', async () => {
    vi.stubGlobal('indexedDB', undefined);

    const service = createIdbStorageService();
    await expect(service.listFiles()).rejects.toBeInstanceOf(StorageUnavailableError);
    expect(openDB).not.toHaveBeenCalled();
  });

  it('reads normally when the database opens', async () => {
    openDB.mockResolvedValue(fakeDb({ getAll: vi.fn().mockResolvedValue([RECORD]) }));

    const service = createIdbStorageService();
    await expect(service.listFiles()).resolves.toEqual([RECORD]);
  });

  it('returns an empty object when no preferences are stored', async () => {
    openDB.mockResolvedValue(fakeDb({ get: vi.fn().mockResolvedValue(undefined) }));

    const service = createIdbStorageService();
    await expect(service.getPreferences()).resolves.toEqual({});
  });

  // setPreferences is a read-modify-write, so a patch must not drop the keys it
  // does not mention.
  it('merges a preferences patch over what is already stored', async () => {
    const put = vi.fn().mockResolvedValue(undefined);
    openDB.mockResolvedValue(
      fakeDb({ get: vi.fn().mockResolvedValue({ themeId: 'old', fontSize: 16 }), put }),
    );

    const service = createIdbStorageService();
    await service.setPreferences({ themeId: 'new' });
    expect(put).toHaveBeenCalledWith(
      'preferences',
      { themeId: 'new', fontSize: 16 },
      'preferences',
    );
  });
});
