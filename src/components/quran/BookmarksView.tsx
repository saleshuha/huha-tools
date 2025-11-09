import { useState } from 'react';
import { useQuranPreferences } from '@/hooks/useQuranPreferences';
import { useVerse } from '@/hooks/useQuranData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BookmarkCheck, BookmarkX, ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface BookmarksViewProps {
  onNavigateToVerse: (surahNumber: number, ayahNumber: number) => void;
}

function BookmarkedVerseCard({ 
  surah, 
  ayah, 
  onRemove, 
  onNavigate 
}: { 
  surah: number; 
  ayah: number; 
  onRemove: () => void;
  onNavigate: () => void;
}) {
  const { data: verse, isLoading } = useVerse(surah, ayah);
  const { preferences } = useQuranPreferences();

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-4">
          <div className="h-20 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  if (!verse) {
    return null;
  }

  const arabicText = preferences.showTashkeel ? verse.arabic1 : verse.arabic2;
  const translation = preferences.translationLanguage === 'english' 
    ? verse.translation?.english 
    : verse.translation?.urdu;

  return (
    <Card className="group hover:shadow-md transition-all border-primary/20 bg-primary/5">
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="font-mono">
              {verse.surahNumber}:{verse.ayahNumber}
            </Badge>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={onNavigate}
                className="h-8 w-8 p-0"
                title="Go to verse"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onRemove}
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                title="Remove bookmark"
              >
                <BookmarkX className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="text-right text-2xl leading-loose font-arabic">
            {arabicText}
          </div>

          {translation && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {translation}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function BookmarksView({ onNavigateToVerse }: BookmarksViewProps) {
  const { preferences, toggleBookmark } = useQuranPreferences();
  const bookmarks = preferences.bookmarkedVerses;

  const handleRemoveBookmark = (surah: number, ayah: number) => {
    toggleBookmark(surah, ayah);
    toast.success('Bookmark removed');
  };

  const handleNavigate = (surah: number, ayah: number) => {
    onNavigateToVerse(surah, ayah);
  };

  if (bookmarks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
        <div className="rounded-full bg-primary/10 p-6">
          <BookmarkCheck className="h-12 w-12 text-primary" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-semibold">No Bookmarks Yet</h3>
          <p className="text-muted-foreground max-w-md">
            Start bookmarking verses to save them for later. Click the bookmark icon on any verse to add it here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Bookmarked Verses</h2>
          <p className="text-muted-foreground">
            {bookmarks.length} verse{bookmarks.length !== 1 ? 's' : ''} saved
          </p>
        </div>
        <Badge variant="secondary" className="text-lg px-4 py-2">
          {bookmarks.length}
        </Badge>
      </div>

      <ScrollArea className="h-[600px] pr-4">
        <div className="space-y-4">
          {bookmarks.map((bookmark) => (
            <BookmarkedVerseCard
              key={`${bookmark.surah}-${bookmark.ayah}`}
              surah={bookmark.surah}
              ayah={bookmark.ayah}
              onRemove={() => handleRemoveBookmark(bookmark.surah, bookmark.ayah)}
              onNavigate={() => handleNavigate(bookmark.surah, bookmark.ayah)}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
