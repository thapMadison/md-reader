export type {
  StorageEstimate,
  StorageService,
  StoredFileRecord,
  StoredPreferences,
} from './types';
export { StorageQuotaExceededError } from './types';
export { createIdbStorageService } from './idbStorage';
export { createFakeStorageService } from './fakeStorage';
