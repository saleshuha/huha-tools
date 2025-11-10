import { useInfiniteQuery } from '@tanstack/react-query';
import { useSurahWithVerses } from './useQuranData';
import { Verse } from '@/types/quran';

interface VersesPageData {
  verses: Verse[];
  hasMore: boolean;
  page: number;
}

export function useVersesPaginated(surahNumber: number, pageSize: number = 20) {
  // Fetch entire surah once (cached forever)
  const { data: surahData, isLoading: isSurahLoading } = useSurahWithVerses(surahNumber);
  
  return useInfiniteQuery({
    queryKey: ['quran', 'verses-paginated', surahNumber, pageSize],
    queryFn: async ({ pageParam = 1 }): Promise<VersesPageData> => {
      if (!surahData) {
        return { verses: [], hasMore: false, page: pageParam };
      }
      
      // Slice verses locally (no API calls after initial load)
      const startIndex = (pageParam - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const verses = surahData.verses.slice(startIndex, endIndex);
      const hasMore = endIndex < surahData.verses.length;
      
      console.log('🕌 Local pagination:', {
        page: pageParam,
        startIndex,
        endIndex,
        totalVerses: surahData.verses.length,
        returnedVerses: verses.length,
        hasMore
      });
      
      return { verses, hasMore, page: pageParam };
    },
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.page + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: surahNumber >= 1 && surahNumber <= 114 && !!surahData,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
