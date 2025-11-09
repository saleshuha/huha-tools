import { useState, useEffect } from 'react';

export interface QuranPreferences {
  translationLanguage: 'english' | 'urdu';
  arabicFontSize: 'small' | 'medium' | 'large';
  showTashkeel: boolean;
  bookmarkedVerses: Array<{ surah: number; ayah: number }>;
  lastReadPosition: { surah: number; ayah: number } | null;
}

const DEFAULT_PREFERENCES: QuranPreferences = {
  translationLanguage: 'english',
  arabicFontSize: 'medium',
  showTashkeel: true,
  bookmarkedVerses: [],
  lastReadPosition: null,
};

const STORAGE_KEY = 'quran-preferences';

export function useQuranPreferences() {
  const [preferences, setPreferences] = useState<QuranPreferences>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : DEFAULT_PREFERENCES;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  }, [preferences]);

  const updatePreference = <K extends keyof QuranPreferences>(
    key: K,
    value: QuranPreferences[K]
  ) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  const toggleBookmark = (surah: number, ayah: number) => {
    setPreferences(prev => {
      const isBookmarked = prev.bookmarkedVerses.some(
        v => v.surah === surah && v.ayah === ayah
      );
      
      if (isBookmarked) {
        return {
          ...prev,
          bookmarkedVerses: prev.bookmarkedVerses.filter(
            v => !(v.surah === surah && v.ayah === ayah)
          ),
        };
      } else {
        return {
          ...prev,
          bookmarkedVerses: [...prev.bookmarkedVerses, { surah, ayah }],
        };
      }
    });
  };

  const isBookmarked = (surah: number, ayah: number) => {
    return preferences.bookmarkedVerses.some(
      v => v.surah === surah && v.ayah === ayah
    );
  };

  const setLastReadPosition = (surah: number, ayah: number) => {
    updatePreference('lastReadPosition', { surah, ayah });
  };

  return {
    preferences,
    updatePreference,
    toggleBookmark,
    isBookmarked,
    setLastReadPosition,
  };
}
