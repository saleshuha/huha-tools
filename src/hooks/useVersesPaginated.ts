import { useInfiniteQuery } from '@tanstack/react-query';
import { quranApi } from '@/services/quran-api';
import { Verse } from '@/types/quran';

interface VersesPageData {
  verses: Verse[];
  hasMore: boolean;
  page: number;
}

export function useVersesPaginated(surahNumber: number, pageSize: number = 20) {
  return useInfiniteQuery({
    queryKey: ['quran', 'verses-paginated', surahNumber, pageSize],
    queryFn: async ({ pageParam = 1 }): Promise<VersesPageData> => {
      const { verses, hasMore } = await quranApi.getVersesPage(surahNumber, pageParam, pageSize);
      return {
        verses,
        hasMore,
        page: pageParam
      };
    },
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.page + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: surahNumber >= 1 && surahNumber <= 114,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
