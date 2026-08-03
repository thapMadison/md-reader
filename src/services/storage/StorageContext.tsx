import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { createIdbStorageService } from './idbStorage';
import type { StorageService } from './types';

const StorageContext = createContext<StorageService | null>(null);

export function StorageProvider({
  children,
  service,
}: {
  children: ReactNode;
  service?: StorageService;
}) {
  const value = useMemo(() => service ?? createIdbStorageService(), [service]);
  return <StorageContext.Provider value={value}>{children}</StorageContext.Provider>;
}

export function useStorage(): StorageService {
  const ctx = useContext(StorageContext);
  if (!ctx) throw new Error('useStorage must be used within a StorageProvider');
  return ctx;
}
