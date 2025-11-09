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
    const data = await fetchWithRetry<Surah[]>(`${BASE_URL}/surah.json`);
    return data;
  },

  async getSurah(surahNumber: number): Promise<Surah> {
    if (surahNumber < 1 || surahNumber > 114) {
      throw new QuranApiError('Invalid surah number. Must be between 1 and 114.');
    }
    const data = await fetchWithRetry<Surah>(`${BASE_URL}/${surahNumber}.json`);
    return data;
  },

  async getVerse(surahNumber: number, ayahNumber: number): Promise<Verse> {
    if (surahNumber < 1 || surahNumber > 114) {
      throw new QuranApiError('Invalid surah number. Must be between 1 and 114.');
    }
    const data = await fetchWithRetry<Verse>(
      `${BASE_URL}/${surahNumber}/${ayahNumber}.json`
    );
    return data;
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
    const ayahNumber = Math.floor(Math.random() * surah.totalVerses) + 1;
    return this.getVerse(surahNumber, ayahNumber);
  }
};
