export type {
  StorageEstimate,
  StorageService,
  StoredFileRecord,
  StoredPreferences,
} from './types';
export { MAX_STORAGE_BYTES, StorageQuotaExceededError } from './types';
export { createIdbStorageService } from './idbStorage';
export { createFakeStorageService } from './fakeStorage';
