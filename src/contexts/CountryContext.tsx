import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useUserProfile } from '@/hooks/useUserProfile';

type Country = 'UAE' | 'KSA';

interface CountryContextType {
  selectedCountry: Country;
  setSelectedCountry: (country: Country) => void;
  pinnedCountry: Country | null;
  pinCountry: (country: Country) => void;
  unpinCountry: () => void;
  isPinned: boolean;
}

const CountryContext = createContext<CountryContextType | undefined>(undefined);

const PINNED_COUNTRY_KEY = 'pinnedCountry';

export function CountryProvider({ children }: { children: ReactNode }) {
  const { profile, loading } = useUserProfile();
  const [selectedCountry, setSelectedCountry] = useState<Country>('UAE');
  const [pinnedCountry, setPinnedCountry] = useState<Country | null>(null);

  // Initialize country selection on mount and when profile loads
  useEffect(() => {
    const storedPinnedCountry = localStorage.getItem(PINNED_COUNTRY_KEY) as Country | null;
    
    if (storedPinnedCountry && (storedPinnedCountry === 'UAE' || storedPinnedCountry === 'KSA')) {
      // Use pinned country
      setPinnedCountry(storedPinnedCountry);
      setSelectedCountry(storedPinnedCountry);
    } else if (!loading && profile?.country) {
      // Use user's profile country if no pinned country
      setSelectedCountry(profile.country);
    }
  }, [profile, loading]);

  const pinCountry = (country: Country) => {
    localStorage.setItem(PINNED_COUNTRY_KEY, country);
    setPinnedCountry(country);
    setSelectedCountry(country);
  };

  const unpinCountry = () => {
    localStorage.removeItem(PINNED_COUNTRY_KEY);
    setPinnedCountry(null);
    // Fall back to user's profile country
    if (profile?.country) {
      setSelectedCountry(profile.country);
    }
  };

  const handleSetSelectedCountry = (country: Country) => {
    setSelectedCountry(country);
    // If there's a pinned country, update it
    if (pinnedCountry) {
      pinCountry(country);
    }
  };

  return (
    <CountryContext.Provider value={{ 
      selectedCountry, 
      setSelectedCountry: handleSetSelectedCountry,
      pinnedCountry,
      pinCountry,
      unpinCountry,
      isPinned: pinnedCountry !== null
    }}>
      {children}
    </CountryContext.Provider>
  );
}

export function useCountry() {
  const context = useContext(CountryContext);
  if (context === undefined) {
    throw new Error('useCountry must be used within a CountryProvider');
  }
  return context;
}