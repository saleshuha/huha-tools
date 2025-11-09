import { useState, useEffect } from 'react';
import { useQuranData, useRandomVerse } from '@/hooks/useQuranData';
import { useQuranPreferences } from '@/hooks/useQuranPreferences';
import { SurahGrid } from './SurahGrid';
import { SurahDetailView } from './SurahDetailView';
import { QuranSearch } from './QuranSearch';
import { VerseCard } from './VerseCard';
import { TafsirDrawer } from './TafsirDrawer';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, Shuffle, FileText, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function QuranHomepage() {
  const navigate = useNavigate();
  const { data: surahs, isLoading } = useQuranData();
  const { data: randomVerse, refetch: getNewRandomVerse } = useRandomVerse();
  const { preferences, toggleBookmark, isBookmarked } = useQuranPreferences();
  
  const [selectedSurah, setSelectedSurah] = useState<number | null>(null);
  const [tafsirDrawer, setTafsirDrawer] = useState<{ open: boolean; surah: number; ayah: number }>({
    open: false,
    surah: 0,
    ayah: 0,
  });

  // Check for hash navigation
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#surah-')) {
      const surahNum = parseInt(hash.replace('#surah-', ''));
      if (surahNum >= 1 && surahNum <= 114) {
        setSelectedSurah(surahNum);
      }
    }
  }, []);

  if (selectedSurah) {
    return (
      <SurahDetailView
        surahNumber={selectedSurah}
        onBack={() => {
          setSelectedSurah(null);
          window.history.pushState('', document.title, window.location.pathname);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Decorative Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-5">
        <div className="absolute top-0 left-0 w-96 h-96 bg-primary rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 py-8 relative">
        {/* Hero Header */}
        <div className="text-center space-y-6 mb-12">
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
            <BookOpen className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">The Noble Quran</span>
          </div>
          
          <div>
            <h1 className="text-5xl md:text-6xl font-bold mb-3 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              القرآن الكريم
            </h1>
            <p className="text-xl text-muted-foreground">
              Read, Reflect, and Connect with the Divine Words
            </p>
          </div>

          {/* Search & Quick Actions */}
          <div className="max-w-2xl mx-auto space-y-3">
            {isLoading ? (
              <Skeleton className="h-12 w-full" />
            ) : (
              <QuranSearch
                surahs={surahs || []}
                onSurahSelect={setSelectedSurah}
              />
            )}
            
            <div className="flex flex-wrap gap-2 justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => getNewRandomVerse()}
                className="gap-2"
              >
                <Shuffle className="h-4 w-4" />
                Random Verse
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/quran-api-docs')}
                className="gap-2"
              >
                <FileText className="h-4 w-4" />
                API Documentation
              </Button>
            </div>
          </div>
        </div>

        {/* Featured Verse */}
        {randomVerse && (
          <div className="mb-12 max-w-3xl mx-auto">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-bold">Verse of the Moment</h2>
            </div>
            <VerseCard
              verse={randomVerse}
              showTashkeel={preferences.showTashkeel}
              arabicFontSize={preferences.arabicFontSize}
              translationLanguage={preferences.translationLanguage}
              isBookmarked={isBookmarked(randomVerse.surahNumber, randomVerse.ayahNumber)}
              onToggleBookmark={() => toggleBookmark(randomVerse.surahNumber, randomVerse.ayahNumber)}
              onShowTafsir={() => setTafsirDrawer({
                open: true,
                surah: randomVerse.surahNumber,
                ayah: randomVerse.ayahNumber
              })}
            />
          </div>
        )}

        {/* Surahs Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-bold">Browse All Surahs</h2>
            <div className="text-sm text-muted-foreground">114 Chapters</div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {Array.from({ length: 12 }).map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : surahs ? (
            <SurahGrid
              surahs={surahs}
              onSurahClick={setSelectedSurah}
            />
          ) : (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground">Failed to load Quran data. Please try again.</p>
            </Card>
          )}
        </div>
      </div>

      {/* Tafsir Drawer */}
      <TafsirDrawer
        open={tafsirDrawer.open}
        onOpenChange={(open) => setTafsirDrawer({ ...tafsirDrawer, open })}
        surahNumber={tafsirDrawer.surah}
        ayahNumber={tafsirDrawer.ayah}
      />
    </div>
  );
}
