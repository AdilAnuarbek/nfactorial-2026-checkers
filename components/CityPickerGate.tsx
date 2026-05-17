'use client';

import { useAuth } from '@/context/AuthProvider';
import CityPickerModal from '@/components/CityPickerModal';

function CityPickerGate() {
  const { needsCityPicker, profile, updateCity } = useAuth();

  if (!needsCityPicker) return null;

  return (
    <CityPickerModal
      displayName={profile?.display_name || 'друг'}
      onSave={updateCity}
    />
  );
}

export default CityPickerGate;