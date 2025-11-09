export interface Surah {
  surahNumber: number;
  surahName: string;
  surahNameArabic: string;
  surahNameArabicLong: string;
  surahNameTranslation: string;
  totalVerses: number;
  revelationType: 'Meccan' | 'Medinan';
  verses?: Verse[];
}

export interface Verse {
  surahNumber: number;
  ayahNumber: number;
  arabic1: string; // with Tashkeel
  arabic2: string; // without Tashkeel
  translation: {
    english?: string;
    urdu?: string;
  };
}

export interface Tafsir {
  surahNumber: number;
  ayahNumber: number;
  tafsirName: 'Ibn Kathir' | 'Maarif Ul Quran' | 'Tazkirul Quran';
  text: string;
}

export interface QuranApiResponse<T> {
  data: T;
  status: number;
}

export interface SurahListResponse {
  surahs: Surah[];
}

export interface SurahResponse {
  surah: Surah;
}

export interface VerseResponse {
  verse: Verse;
}

export interface TafsirResponse {
  tafsir: Tafsir[];
}
