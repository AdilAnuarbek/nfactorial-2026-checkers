'use client';

import { AppProviders } from '@/context/AppProviders';
import { AuthProvider } from '@/context/AuthProvider';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AppProviders>
      <AuthProvider>{children}</AuthProvider>
    </AppProviders>
  );
}
