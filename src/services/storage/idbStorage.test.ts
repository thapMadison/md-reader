import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MAX_STORAGE_BYTES, StorageQuotaExceededError } from './types';

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

// saveFile runs its usage check and its write inside one readwrite
// transaction, so the double has to model `db.transaction(...)` as well as the
// direct helpers. The object store delegates to the same put/get/getAll mocks
// the db exposes, which keeps every assertion written against them working
// whichever path reaches the store.
function fakeDb(overrides: Record<string, unknown> = {}) {
  const db = {
    put: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue(undefined),
    getAll: vi.fn().mockResolvedValue([]),
    delete: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  const abort = vi.fn();
  // Counts reads that went through a transaction's store rather than straight
  // off the db handle. The two are indistinguishable in their results — same
  // data, same shape — and differ only in whether a concurrent writer can
  // interleave between the read and the write, so nothing but the route itself
  // can be asserted on.
  const storeGet = vi.fn((key: string) => db.get(key));
  return {
    ...db,
    abort,
    storeGet,
    transaction: vi.fn(() => ({
      // The store's put takes no store-name argument, unlike db.put; dropping it
      // here keeps the underlying mock's call record uniform. The out-of-line
      // key is kept, since a keyed store is the only way preferences are written
      // and a double that swallowed it could not tell a right key from a wrong one.
      objectStore: () => ({
        get: storeGet,
        getAll: () => db.getAll(),
        put: (record: unknown, key?: IDBValidKey) =>
          key === undefined ? db.put(record) : db.put(record, key),
      }),
      done: Promise.resolve(),
      abort,
    })),
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

describe('idbStorage 100MB cap', () => {
  const filler = (name: string, bytes: number) => ({
    name,
    content: 'x'.repeat(bytes),
    kind: 'snapshot' as const,
    savedAt: 1,
  });

  it('rejects a single file larger than the whole budget without touching the db', async () => {
    const put = vi.fn().mockResolvedValue(undefined);
    openDB.mockResolvedValue(fakeDb({ put }));

    const service = createIdbStorageService();
    await expect(service.saveFile(filler('huge.md', MAX_STORAGE_BYTES + 1))).rejects.toBeInstanceOf(
      StorageQuotaExceededError,
    );
    expect(put).not.toHaveBeenCalled();
  });

  it('rejects a write that would push the total past the cap', async () => {
    const stored = filler('big.md', MAX_STORAGE_BYTES - 100);
    const put = vi.fn().mockResolvedValue(undefined);
    openDB.mockResolvedValue(fakeDb({ getAll: vi.fn().mockResolvedValue([stored]), put }));

    const service = createIdbStorageService();
    await expect(service.saveFile(filler('next.md', 101))).rejects.toBeInstanceOf(
      StorageQuotaExceededError,
    );
    expect(put).not.toHaveBeenCalled();
  });

  it('accepts a write that exactly fills the remaining headroom', async () => {
    const stored = filler('big.md', MAX_STORAGE_BYTES - 100);
    const put = vi.fn().mockResolvedValue(undefined);
    openDB.mockResolvedValue(fakeDb({ getAll: vi.fn().mockResolvedValue([stored]), put }));

    const service = createIdbStorageService();
    await service.saveFile(filler('next.md', 100));
    expect(put).toHaveBeenCalledTimes(1);
  });

  // Overwriting a name replaces its bytes. Counting the incoming record against
  // a total that still includes the old copy would reject a save that shrinks
  // the library — the case where the user edits a near-cap file down.
  it('counts an overwrite as a delta, not an addition', async () => {
    const stored = filler('a.md', MAX_STORAGE_BYTES - 10);
    const put = vi.fn().mockResolvedValue(undefined);
    openDB.mockResolvedValue(
      fakeDb({
        get: vi.fn().mockResolvedValue(stored),
        getAll: vi.fn().mockResolvedValue([stored]),
        put,
      }),
    );

    const service = createIdbStorageService();
    await service.saveFile(filler('a.md', MAX_STORAGE_BYTES));
    expect(put).toHaveBeenCalledTimes(1);
  });

  // content.length would read this as 2 bytes and let it through; the UTF-8
  // encoding it is actually stored as is 8.
  it('measures multi-byte content by its UTF-8 size', async () => {
    const put = vi.fn().mockResolvedValue(undefined);
    openDB.mockResolvedValue(fakeDb({ put }));

    const service = createIdbStorageService();
    const record = { name: 'e.md', content: '𝄞😀', kind: 'snapshot' as const, savedAt: 1 };
    await expect(service.saveFile(record)).resolves.toBeUndefined();

    const est = await (async () => {
      openDB.mockResolvedValue(fakeDb({ getAll: vi.fn().mockResolvedValue([record]) }));
      return createIdbStorageService().estimate();
    })();
    expect(est.usedBytes).toBe(8);
  });

  it('reports usage against the app cap rather than the browser quota', async () => {
    openDB.mockResolvedValue(
      fakeDb({ getAll: vi.fn().mockResolvedValue([filler('a.md', 2048)]) }),
    );

    const service = createIdbStorageService();
    await expect(service.estimate()).resolves.toEqual({
      usedBytes: 2048,
      quotaBytes: MAX_STORAGE_BYTES,
    });
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
    expect(put).toHaveBeenCalledWith({ themeId: 'new', fontSize: 16 }, 'preferences');
  });

  // Preferences are one record shared by unrelated writers — theme, scroll
  // positions, folders — so every write is a patch over whatever else is in
  // there. Reading outside the transaction lets two concurrent patches both
  // start from the same snapshot, and the later write puts back a copy that
  // never saw the earlier one. With folder sync that is a folder created by one
  // pull vanishing when a second pull writes back a `folders` array it read
  // before that folder existed.
  //
  // The mocked `idb` cannot prove atomicity — only a real IndexedDB could. What
  // it can prove is the property atomicity is bought with: that the read goes
  // through the same transaction as the write, not through a bare `db.get`.
  it('reads preferences inside the transaction it writes in', async () => {
    const db = fakeDb({ get: vi.fn().mockResolvedValue({ fontSize: 16 }) });
    openDB.mockResolvedValue(db);

    const service = createIdbStorageService();
    await service.setPreferences({ themeId: 'new' });

    expect(db.transaction).toHaveBeenCalledWith('preferences', 'readwrite');
    // One transaction, not one to read and another to write — two would reopen
    // the same race the transaction is there to close.
    expect(db.transaction).toHaveBeenCalledTimes(1);
    // The read itself came off the transaction's store. Opening a transaction
    // and then reading around it through the db handle would leave the gap
    // exactly where it was, while looking correct from the outside.
    expect(db.storeGet).toHaveBeenCalledWith('preferences');
  });
});
