import { useQuery } from '@tanstack/react-query';
import { quranApi } from '@/services/quran-api';
import { Surah, Verse, Tafsir } from '@/types/quran';

export function useQuranData(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['quran', 'surah-list'],
    queryFn: () => quranApi.getSurahList(),
    staleTime: Infinity, // Quran data never changes
    gcTime: Infinity,
    enabled: options?.enabled ?? true, // Default to true for backwards compatibility
  });
}

export function useSurah(surahNumber: number) {
  return useQuery({
    queryKey: ['quran', 'surah', surahNumber],
    queryFn: () => quranApi.getSurah(surahNumber),
    enabled: surahNumber >= 1 && surahNumber <= 114,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

export function useSurahWithVerses(surahNumber: number) {
  return useQuery({
    queryKey: ['quran', 'surah-with-verses', surahNumber],
    queryFn: () => quranApi.getSurahWithVerses(surahNumber),
    enabled: surahNumber >= 1 && surahNumber <= 114,
    staleTime: Infinity, // Quran data never changes
    gcTime: Infinity,
  });
}

export function useVerse(surahNumber: number, ayahNumber: number) {
  return useQuery({
    queryKey: ['quran', 'verse', surahNumber, ayahNumber],
    queryFn: () => quranApi.getVerse(surahNumber, ayahNumber),
    enabled: surahNumber >= 1 && surahNumber <= 114 && ayahNumber > 0,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

export function useTafsir(surahNumber: number, ayahNumber: number) {
  const enabled = surahNumber >= 1 && surahNumber <= 114 && ayahNumber > 0;
  console.log('🕌 useTafsir hook:', { surahNumber, ayahNumber, enabled });
  
  return useQuery({
    queryKey: ['quran', 'tafsir', 'v2', surahNumber, ayahNumber], // Added 'v2' to bust cache
    queryFn: () => quranApi.getTafsir(surahNumber, ayahNumber),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: Infinity,
    retry: 1,
    refetchOnMount: true,
  });
}

export function useRandomVerse() {
  return useQuery({
    queryKey: ['quran', 'random-verse', Date.now()],
    queryFn: () => quranApi.getRandomVerse(),
    staleTime: 0, // Always fetch a new random verse
  });
}
