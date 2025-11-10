import { Surah, Verse, Tafsir } from '@/types/quran';

const BASE_URL = 'https://quranapi.pages.dev/api';

class QuranApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'QuranApiError';
  }
}

async function fetchWithRetry<T>(url: string, retries = 3): Promise<T> {
  console.log('🕌 Fetching:', url);
  
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      
      console.log('🕌 Response status:', response.status, response.statusText);
      
      if (!response.ok) {
        // Try to get error details from response body
        let errorMessage = response.statusText || 'Unknown error';
        try {
          const errorBody = await response.text();
          if (errorBody) {
            errorMessage += `: ${errorBody}`;
          }
        } catch (e) {
          // Ignore if can't read body
        }
        
        throw new QuranApiError(
          `API request failed (${response.status}): ${errorMessage}`,
          response.status
        );
      }
      
      return await response.json();
    } catch (error) {
      console.error('🕌 Fetch attempt', i + 1, 'failed:', error);
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  throw new QuranApiError('Max retries exceeded');
}

export const quranApi = {
  async getSurahList(): Promise<Surah[]> {
    const data = await fetchWithRetry<any[]>(`${BASE_URL}/surah.json`);
    
    // Map array and add surahNumber based on index (1-indexed)
    const surahsWithNumbers = data.map((surah, index) => ({
      ...surah,
      surahNumber: index + 1
    }));
    
    console.log('🕌 Quran API: Fetched surah list with numbers, first item:', surahsWithNumbers[0]);
    console.log('🕌 Quran API: Total surahs:', surahsWithNumbers.length);
    return surahsWithNumbers as Surah[];
  },

  async getSurah(surahNumber: number): Promise<Surah> {
    if (surahNumber < 1 || surahNumber > 114) {
      throw new QuranApiError('Invalid surah number. Must be between 1 and 114.');
    }
    console.log('🕌 Quran API: Fetching surah metadata only:', surahNumber);
    
    // Fetch only surah metadata (no verses)
    const data = await fetchWithRetry<any>(`${BASE_URL}/${surahNumber}.json`);
    
    // Ensure surahNumber exists in response
    const surahWithNumber = {
      ...data,
      surahNumber: data.surahNumber || surahNumber
    };
    
    console.log('🕌 Quran API: Surah metadata loaded:', {
      surahNumber: surahWithNumber.surahNumber,
      surahName: surahWithNumber.surahName,
      totalAyah: surahWithNumber.totalAyah
    });
    
    return surahWithNumber as Surah;
  },

  async getVersesPage(surahNumber: number, page: number, pageSize: number): Promise<{ verses: Verse[]; hasMore: boolean }> {
    if (surahNumber < 1 || surahNumber > 114) {
      throw new QuranApiError('Invalid surah number. Must be between 1 and 114.');
    }

    // Get surah metadata to know total verses
    const surah = await this.getSurah(surahNumber);
    
    const startVerse = (page - 1) * pageSize + 1;
    const endVerse = Math.min(startVerse + pageSize - 1, surah.totalAyah);
    
    console.log('🕌 Quran API: Fetching verses page', page, 'for surah', surahNumber, '- verses', startVerse, 'to', endVerse);
    
    // Fetch only the verses for this page
    const versePromises = Array.from(
      { length: endVerse - startVerse + 1 },
      (_, i) => this.getVerse(surahNumber, startVerse + i)
    );
    const verses = await Promise.all(versePromises);
    
    const hasMore = endVerse < surah.totalAyah;
    
    console.log('🕌 Quran API: Page', page, 'loaded -', verses.length, 'verses, hasMore:', hasMore);
    
    return { verses, hasMore };
  },

  async getVerse(surahNumber: number, ayahNumber: number): Promise<Verse> {
    if (surahNumber < 1 || surahNumber > 114) {
      throw new QuranApiError('Invalid surah number. Must be between 1 and 114.');
    }
    const data = await fetchWithRetry<any>(
      `${BASE_URL}/${surahNumber}/${ayahNumber}.json`
    );
    
    console.log('🕌 Raw verse data from API:', { surahNumber, ayahNumber, hasEnglish: !!data.english, hasUrdu: !!data.urdu });
    
    // Transform API response to match our Verse type structure
    // API returns english/urdu as direct properties, we need them nested in translation
    const verse = {
      surahNumber: data.surahNumber || surahNumber,
      ayahNumber: data.ayahNumber || ayahNumber,
      arabic1: data.arabic1 || '',
      arabic2: data.arabic2 || '',
      translation: {
        english: data.english || 'Translation not available',
        urdu: data.urdu || 'ترجمہ دستیاب نہیں'
      }
    };
    
    console.log('🕌 Transformed verse:', { surahNumber: verse.surahNumber, ayahNumber: verse.ayahNumber, hasTranslation: !!verse.translation });
    
    return verse as Verse;
  },

  async getTafsir(surahNumber: number, ayahNumber: number): Promise<Tafsir[]> {
    if (surahNumber < 1 || surahNumber > 114) {
      throw new QuranApiError('Invalid surah number. Must be between 1 and 114.');
    }
    
    const url = `${BASE_URL}/tafsir/${surahNumber}/${ayahNumber}.json`;
    console.log('🕌 Quran API: Fetching tafsir for:', { surahNumber, ayahNumber, url });
    
    try {
      const data = await fetchWithRetry<any>(url);
      
      // Handle different response structures
      const tafsirs = Array.isArray(data) ? data : (data.tafsir || []);
      
      console.log('🕌 Quran API: Tafsir response:', { 
        surahNumber, 
        ayahNumber, 
        count: tafsirs?.length,
        tafsirs: tafsirs?.map((t: any) => t.tafsirName) 
      });
      
      return tafsirs;
    } catch (error) {
      console.error('🕌 Quran API: Failed to fetch tafsir:', { 
        surahNumber, 
        ayahNumber, 
        error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStatus: error instanceof QuranApiError ? error.status : undefined
      });
      
      // If it's a 404, return empty array instead of throwing
      if (error instanceof QuranApiError && error.status === 404) {
        console.log('🕌 Tafsir not available for this verse (404)');
        return [];
      }
      
      throw error;
    }
  },

  async getRandomVerse(): Promise<Verse> {
    const surahNumber = Math.floor(Math.random() * 114) + 1;
    const surah = await this.getSurah(surahNumber);
    const ayahNumber = Math.floor(Math.random() * surah.totalAyah) + 1;
    return this.getVerse(surahNumber, ayahNumber);
  }
};
