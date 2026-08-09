import { StorageProvider } from '@/services/storage/StorageContext';
import { ThemeProvider } from '@/features/theming/ThemeContext';
import { LibraryProvider } from '@/features/library/LibraryContext';
import { GistAuthProvider } from '@/services/gist/GistContext';
import { SyncProvider } from '@/features/sync/SyncContext';
import { AppShell } from './AppShell';

export function App() {
  return (
    <StorageProvider>
      <ThemeProvider>
        <LibraryProvider>
          {/*
            Sync sits inside Library because it reads useLibrary(); Library never
            imports Sync, which keeps the dependency arrow pointing one way. It is
            a separate provider rather than more state on LibraryContext because
            the two change on different rhythms — Library on every keystroke, Sync
            on network events — and merging them would re-render the editor every
            time a gist call returned.
          */}
          <GistAuthProvider>
            <SyncProvider>
              <AppShell />
            </SyncProvider>
          </GistAuthProvider>
        </LibraryProvider>
      </ThemeProvider>
    </StorageProvider>
  );
}
