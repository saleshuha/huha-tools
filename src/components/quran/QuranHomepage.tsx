import { useState, useEffect } from 'react';
import { useQuranData } from '@/hooks/useQuranData';
import { useQuranPreferences } from '@/hooks/useQuranPreferences';
import { quranApi } from '@/services/quran-api';
import { Verse } from '@/types/quran';
import { SurahGrid } from './SurahGrid';
import { SurahDetailView } from './SurahDetailView';
import { QuranSearch } from './QuranSearch';
import { VerseCard } from './VerseCard';
import { TafsirDrawer } from './TafsirDrawer';
import { BookmarksView } from './BookmarksView';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Shuffle, FileText, Sparkles, BookmarkCheck, LayoutDashboard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MetricsDashboard } from '@/components/dashboard/MetricsDashboard';

export function QuranHomepage() {
  const navigate = useNavigate();
  
  // Enable/disable toggle with localStorage persistence
  const [isQuranEnabled, setIsQuranEnabled] = useState<boolean>(() => {
    const stored = localStorage.getItem('quran-enabled');
    return stored ? JSON.parse(stored) : false; // Default OFF
  });

  useEffect(() => {
    localStorage.setItem('quran-enabled', JSON.stringify(isQuranEnabled));
  }, [isQuranEnabled]);

  const { data: surahs, isLoading } = useQuranData({ enabled: isQuranEnabled });
  const { preferences, toggleBookmark, isBookmarked } = useQuranPreferences();
  
  const [selectedSurah, setSelectedSurah] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<string>('surahs');
  const [showRandomVerse, setShowRandomVerse] = useState(false);
  const [randomVerse, setRandomVerse] = useState<Verse | null>(null);
  const [isRandomVerseLoading, setIsRandomVerseLoading] = useState(false);
  const [tafsirDrawer, setTafsirDrawer] = useState<{ open: boolean; surah: number; ayah: number }>({
    open: false,
    surah: 0,
    ayah: 0,
  });

  // Manual fetch for random verse - only when user clicks button
  const fetchRandomVerse = async () => {
    setIsRandomVerseLoading(true);
    setShowRandomVerse(true);
    try {
      const verse = await quranApi.getRandomVerse();
      setRandomVerse(verse);
    } catch (error) {
      console.error('Failed to fetch random verse:', error);
    } finally {
      setIsRandomVerseLoading(false);
    }
  };

  const handleSurahSelect = (surahNumber: number) => {
    console.log('📖 QuranHomepage: Surah selected:', surahNumber);
    setSelectedSurah(surahNumber);
    console.log('📖 QuranHomepage: State updated to:', surahNumber);
  };
  
  const handleNavigateToVerse = (surahNumber: number, ayahNumber: number) => {
    setSelectedSurah(surahNumber);
    // After navigation, scroll to verse would be implemented in SurahDetailView
  };

  // Check for hash navigation
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#surah-')) {
      const surahNum = parseInt(hash.replace('#surah-', ''));
      if (surahNum >= 1 && surahNum <= 114) {
        console.log('📖 Hash navigation to Surah:', surahNum);
        setSelectedSurah(surahNum);
      }
    }
  }, []);

  useEffect(() => {
    console.log('📖 selectedSurah changed to:', selectedSurah);
  }, [selectedSurah]);

  // Show disabled state if Quran features are not enabled
  if (!isQuranEnabled) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        {/* Decorative background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-5">
          <div className="absolute top-0 left-0 w-96 h-96 bg-primary rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4 py-8 relative">
          <div className="max-w-2xl mx-auto text-center space-y-8 mt-32">
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
              <BookOpen className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">The Noble Quran</span>
            </div>

            <h1 className="text-5xl md:text-6xl font-bold mb-3 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              القرآن الكريم
            </h1>

            <Card className="p-12 space-y-6">
              <div className="space-y-3">
                <p className="text-xl font-semibold">Quran Features are Currently Disabled</p>
                <p className="text-muted-foreground">
                  Enable the Quran features to access surahs, verses, bookmarks, and more.
                  <br />
                  This prevents unnecessary API calls when you're not using this section.
                </p>
              </div>

              <Button
                size="lg"
                onClick={() => setIsQuranEnabled(true)}
                className="gap-2"
              >
                <BookOpen className="h-5 w-5" />
                Enable Quran Features
              </Button>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (selectedSurah) {
    console.log('📖 Rendering SurahDetailView for:', selectedSurah);
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
          <div className="flex items-center justify-center gap-4">
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
              <BookOpen className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">The Noble Quran</span>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (confirm('Disable Quran features? This will stop all API calls and data loading.')) {
                  setIsQuranEnabled(false);
                  setSelectedSurah(null);
                  setShowRandomVerse(false);
                  setRandomVerse(null);
                }
              }}
              className="text-xs"
            >
              Disable
            </Button>
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
                onSurahSelect={handleSurahSelect}
              />
            )}
            
            <div className="flex flex-wrap gap-2 justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchRandomVerse}
                className="gap-2"
                disabled={isRandomVerseLoading}
              >
                <Shuffle className="h-4 w-4" />
                Random Verse
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab('bookmarks')}
                className="gap-2"
              >
                <BookmarkCheck className="h-4 w-4" />
                My Bookmarks
                {preferences.bookmarkedVerses.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                    {preferences.bookmarkedVerses.length}
                  </Badge>
                )}
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

        {/* Featured Verse - Only show when user requests it */}
        {showRandomVerse && (
          <div className="mb-12 max-w-3xl mx-auto">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-bold">Verse of the Moment</h2>
            </div>
            {isRandomVerseLoading ? (
              <Card className="p-6">
                <Skeleton className="h-24 w-full mb-4" />
                <Skeleton className="h-16 w-full" />
              </Card>
            ) : randomVerse ? (
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
            ) : null}
          </div>
        )}

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
            <TabsTrigger value="surahs" className="gap-2">
              <BookOpen className="h-4 w-4" />
              Surahs
            </TabsTrigger>
            <TabsTrigger value="bookmarks" className="gap-2">
              <BookmarkCheck className="h-4 w-4" />
              Bookmarks
              {preferences.bookmarkedVerses.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {preferences.bookmarkedVerses.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="surahs" className="space-y-4">
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
                onSurahClick={handleSurahSelect}
              />
            ) : (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">Failed to load Quran data. Please try again.</p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="bookmarks">
            {activeTab === 'bookmarks' ? (
              <BookmarksView onNavigateToVerse={handleNavigateToVerse} />
            ) : null}
          </TabsContent>
        </Tabs>
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
