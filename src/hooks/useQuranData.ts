import { useQuery } from '@tanstack/react-query';
import { quranApi } from '@/services/quran-api';
import { Surah, Verse, Tafsir } from '@/types/quran';

export function useQuranData() {
  return useQuery({
    queryKey: ['quran', 'surah-list'],
    queryFn: () => quranApi.getSurahList(),
    staleTime: Infinity, // Quran data never changes
    gcTime: Infinity,
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
  return useQuery({
    queryKey: ['quran', 'tafsir', surahNumber, ayahNumber],
    queryFn: () => quranApi.getTafsir(surahNumber, ayahNumber),
    enabled: surahNumber >= 1 && surahNumber <= 114 && ayahNumber > 0,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

export function useRandomVerse() {
  return useQuery({
    queryKey: ['quran', 'random-verse', Date.now()],
    queryFn: () => quranApi.getRandomVerse(),
    staleTime: 0, // Always fetch a new random verse
  });
}
