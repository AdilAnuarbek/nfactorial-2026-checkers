'use client';

import { AppProviders } from '@/context/AppProviders';
import { AuthProvider } from '@/context/AuthProvider';
import CityPickerGate from '@/components/CityPickerGate';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AppProviders>
      <AuthProvider>
        <CityPickerGate />
        {children}
        </AuthProvider>
    </AppProviders>
  );
}
