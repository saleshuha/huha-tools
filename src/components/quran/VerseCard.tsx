import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Verse } from '@/types/quran';
import { BookmarkPlus, BookmarkCheck, Copy, Share2, Book } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface VerseCardProps {
  verse: Verse;
  showTashkeel: boolean;
  arabicFontSize: 'small' | 'medium' | 'large';
  translationLanguage: 'english' | 'urdu';
  isBookmarked: boolean;
  onToggleBookmark: () => void;
  onShowTafsir: () => void;
}

const fontSizeClasses = {
  small: 'text-2xl',
  medium: 'text-3xl',
  large: 'text-4xl',
};

export function VerseCard({
  verse,
  showTashkeel,
  arabicFontSize,
  translationLanguage,
  isBookmarked,
  onToggleBookmark,
  onShowTafsir,
}: VerseCardProps) {
  // Defensive null checks
  if (!verse) {
    console.error('❌ VerseCard: verse is null or undefined');
    return null;
  }
  
  if (!verse.translation) {
    console.error('❌ VerseCard: verse.translation is null or undefined', verse);
    return null;
  }
  
  const arabicText = showTashkeel ? verse.arabic1 : verse.arabic2;
  const translation = translationLanguage === 'english' 
    ? verse.translation?.english || 'Translation not available'
    : verse.translation?.urdu || 'ترجمہ دستیاب نہیں';

  const handleCopy = () => {
    const text = `${arabicText}\n\n${translation}\n\n(Quran ${verse.surahNumber}:${verse.ayahNumber})`;
    navigator.clipboard.writeText(text);
    toast.success('Verse copied to clipboard');
  };

  const handleShare = async () => {
    const text = `${arabicText}\n\n${translation}\n\n(Quran ${verse.surahNumber}:${verse.ayahNumber})`;
    
    if (navigator.share) {
      try {
        await navigator.share({ text });
      } catch (err) {
        handleCopy();
      }
    } else {
      handleCopy();
    }
  };

  return (
    <Card className="p-6 space-y-4 bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/20 transition-colors">
      <div className="flex items-start justify-between">
        <Badge variant="secondary" className="font-arabic">
          {verse.surahNumber}:{verse.ayahNumber}
        </Badge>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleBookmark}
            className="h-8 w-8 p-0"
          >
            {isBookmarked ? (
              <BookmarkCheck className="h-4 w-4 text-primary" />
            ) : (
              <BookmarkPlus className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <div className={cn(
        "text-right font-arabic leading-loose",
        fontSizeClasses[arabicFontSize]
      )}>
        {arabicText}
      </div>

      <div className="text-muted-foreground leading-relaxed border-t border-border/50 pt-4">
        {translation}
      </div>

      <div className="flex gap-2 pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onShowTafsir}
          className="flex-1"
        >
          <Book className="h-4 w-4 mr-2" />
          Tafsir
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
        >
          <Copy className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleShare}
        >
          <Share2 className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}
