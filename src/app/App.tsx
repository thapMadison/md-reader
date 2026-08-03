import { StorageProvider } from '@/services/storage/StorageContext';
import { ThemeProvider } from '@/features/theming/ThemeContext';
import { LibraryProvider } from '@/features/library/LibraryContext';
import { AppShell } from './AppShell';

export function App() {
  return (
    <StorageProvider>
      <ThemeProvider>
        <LibraryProvider>
          <AppShell />
        </LibraryProvider>
      </ThemeProvider>
    </StorageProvider>
  );
}
