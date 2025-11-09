import { useState, useRef, useEffect } from 'react';
import { useSurah } from '@/hooks/useQuranData';
import { useVersesPaginated } from '@/hooks/useVersesPaginated';
import { useQuranPreferences } from '@/hooks/useQuranPreferences';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { VerseCard } from './VerseCard';
import { TafsirDrawer } from './TafsirDrawer';
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2, Settings2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface SurahDetailViewProps {
  surahNumber: number;
  onBack: () => void;
}

export function SurahDetailView({ surahNumber, onBack }: SurahDetailViewProps) {
  const { data: surah, isLoading } = useSurah(surahNumber);
  const { 
    data: versesData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingVerses
  } = useVersesPaginated(surahNumber, 20);
  const { preferences, updatePreference, toggleBookmark, isBookmarked } = useQuranPreferences();
  
  const [tafsirDrawer, setTafsirDrawer] = useState<{ open: boolean; surah: number; ayah: number }>({
    open: false,
    surah: 0,
    ayah: 0,
  });

  const observerTarget = useRef<HTMLDivElement>(null);

  // Flatten all pages into a single array of verses
  const verses = versesData?.pages.flatMap(page => page.verses) ?? [];

  // Set up intersection observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          console.log('🕌 Loading next page of verses...');
          fetchNextPage();
        }
      },
      { threshold: 0.5, rootMargin: '100px' }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handlePrevious = () => {
    if (surahNumber > 1) {
      onBack();
      setTimeout(() => window.location.hash = `#surah-${surahNumber - 1}`, 0);
    }
  };

  const handleNext = () => {
    if (surahNumber < 114) {
      onBack();
      setTimeout(() => window.location.hash = `#surah-${surahNumber + 1}`, 0);
    }
  };

  if (isLoading || isLoadingVerses) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!surah) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Surah not found</p>
          <Button onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to List
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Header */}
        <div className="mb-6 space-y-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Surahs
          </Button>

          <Card className="p-6 bg-card/50 backdrop-blur-sm border-primary/20">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="font-mono">
                      Surah {surah.surahNumber}
                    </Badge>
                    <Badge variant={surah.revelationPlace === 'Mecca' ? 'default' : 'secondary'}>
                      {surah.revelationPlace}
                    </Badge>
                  </div>
                  <h1 className="text-3xl font-bold mt-2">{surah.surahName}</h1>
                  <p className="text-muted-foreground">{surah.surahNameTranslation}</p>
                </div>
                <div className="text-5xl font-arabic">{surah.surahNameArabic}</div>
              </div>

              <Separator />

              <div className="text-sm text-muted-foreground">
                {surah.totalAyah} verses
              </div>
            </div>
          </Card>

          {/* Settings Panel */}
          <Card className="p-4 bg-card/30 backdrop-blur-sm">
            <div className="flex flex-wrap gap-6 items-center">
              <div className="flex items-center space-x-2">
                <Settings2 className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="tashkeel">Tashkeel</Label>
                <Switch
                  id="tashkeel"
                  checked={preferences.showTashkeel}
                  onCheckedChange={(checked) => updatePreference('showTashkeel', checked)}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Label htmlFor="font-size">Font Size</Label>
                <Select
                  value={preferences.arabicFontSize}
                  onValueChange={(value: any) => updatePreference('arabicFontSize', value)}
                >
                  <SelectTrigger id="font-size" className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Small</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="large">Large</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Label htmlFor="translation">Translation</Label>
                <Select
                  value={preferences.translationLanguage}
                  onValueChange={(value: any) => updatePreference('translationLanguage', value)}
                >
                  <SelectTrigger id="translation" className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="english">English</SelectItem>
                    <SelectItem value="urdu">Urdu</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>
        </div>

        {/* Verses */}
        <div className="space-y-4 mb-6">
          {verses.map((verse) => (
            <VerseCard
              key={`${verse.surahNumber}-${verse.ayahNumber}`}
              verse={verse}
              showTashkeel={preferences.showTashkeel}
              arabicFontSize={preferences.arabicFontSize}
              translationLanguage={preferences.translationLanguage}
              isBookmarked={isBookmarked(verse.surahNumber, verse.ayahNumber)}
              onToggleBookmark={() => toggleBookmark(verse.surahNumber, verse.ayahNumber)}
              onShowTafsir={() => setTafsirDrawer({ open: true, surah: verse.surahNumber, ayah: verse.ayahNumber })}
            />
          ))}

          {/* Loading indicator for next page */}
          {isFetchingNextPage && (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="p-6">
                  <Skeleton className="h-20 w-full mb-4" />
                  <Skeleton className="h-16 w-full" />
                </Card>
              ))}
            </div>
          )}

          {/* Intersection observer target */}
          <div ref={observerTarget} className="h-4" />

          {/* End of verses indicator */}
          {!hasNextPage && verses.length > 0 && (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">
                End of Surah - {verses.length} verses
              </p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center mb-6">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={surahNumber === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous Surah
          </Button>
          <Button
            variant="outline"
            onClick={handleNext}
            disabled={surahNumber === 114}
          >
            Next Surah
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
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
