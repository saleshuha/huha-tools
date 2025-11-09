import { Surah, Verse, Tafsir } from '@/types/quran';

const BASE_URL = 'https://quranapi.pages.dev/api';

class QuranApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'QuranApiError';
  }
}

async function fetchWithRetry<T>(url: string, retries = 3): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new QuranApiError(
          `API request failed: ${response.statusText}`,
          response.status
        );
      }
      
      return await response.json();
    } catch (error) {
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
    console.log('🕌 Quran API: Fetching surah:', surahNumber);
    
    // Fetch surah metadata
    const data = await fetchWithRetry<any>(`${BASE_URL}/${surahNumber}.json`);
    
    // Ensure surahNumber exists in response
    const surahWithNumber = {
      ...data,
      surahNumber: data.surahNumber || surahNumber
    };
    
    // Fetch all verses concurrently
    console.log('🕌 Quran API: Fetching', surahWithNumber.totalAyah, 'verses for surah', surahNumber);
    const versePromises = Array.from(
      { length: surahWithNumber.totalAyah },
      (_, i) => this.getVerse(surahNumber, i + 1)
    );
    const verses = await Promise.all(versePromises);
    
    console.log('🕌 Quran API: Surah data complete:', {
      surahNumber: surahWithNumber.surahNumber,
      surahName: surahWithNumber.surahName,
      totalAyah: surahWithNumber.totalAyah,
      versesCount: verses.length
    });
    
    return {
      ...surahWithNumber,
      verses
    } as Surah;
  },

  async getVerse(surahNumber: number, ayahNumber: number): Promise<Verse> {
    if (surahNumber < 1 || surahNumber > 114) {
      throw new QuranApiError('Invalid surah number. Must be between 1 and 114.');
    }
    const data = await fetchWithRetry<any>(
      `${BASE_URL}/${surahNumber}/${ayahNumber}.json`
    );
    
    // Transform API response to match our Verse type structure
    // API returns english/urdu as direct properties, we need them nested in translation
    return {
      surahNumber: data.surahNumber || surahNumber,
      ayahNumber: data.ayahNumber || ayahNumber,
      arabic1: data.arabic1,
      arabic2: data.arabic2,
      translation: {
        english: data.english,
        urdu: data.urdu
      }
    } as Verse;
  },

  async getTafsir(surahNumber: number, ayahNumber: number): Promise<Tafsir[]> {
    if (surahNumber < 1 || surahNumber > 114) {
      throw new QuranApiError('Invalid surah number. Must be between 1 and 114.');
    }
    const data = await fetchWithRetry<Tafsir[]>(
      `${BASE_URL}/tafsir/${surahNumber}/${ayahNumber}.json`
    );
    return data;
  },

  async getRandomVerse(): Promise<Verse> {
    const surahNumber = Math.floor(Math.random() * 114) + 1;
    const surah = await this.getSurah(surahNumber);
    const ayahNumber = Math.floor(Math.random() * surah.totalAyah) + 1;
    return this.getVerse(surahNumber, ayahNumber);
  }
};
