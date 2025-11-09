import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Surah } from '@/types/quran';
import { cn } from '@/lib/utils';

interface SurahGridProps {
  surahs: Surah[];
  onSurahClick: (surahNumber: number) => void;
}

export function SurahGrid({ surahs, onSurahClick }: SurahGridProps) {
  const handleSurahClick = (surahNumber: number) => {
    console.log('🔍 Surah clicked:', surahNumber);
    onSurahClick(surahNumber);
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
      {surahs.map((surah) => (
        <Card
          key={surah.surahNumber}
          className="p-4 cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all group bg-card/50 backdrop-blur-sm"
          onClick={() => handleSurahClick(surah.surahNumber)}
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="font-mono text-xs">
                {surah.surahNumber}
              </Badge>
              <Badge 
                variant="secondary" 
                className={cn(
                  "text-xs",
                  surah.revelationPlace === 'Mecca' ? 'bg-primary/10' : 'bg-secondary/10'
                )}
              >
                {surah.revelationPlace === 'Mecca' ? 'M' : 'Md'}
              </Badge>
            </div>
            
            <div className="text-center space-y-1">
              <div className="text-2xl font-arabic leading-none text-foreground group-hover:text-primary transition-colors">
                {surah.surahNameArabic}
              </div>
              <div className="text-xs font-medium text-muted-foreground">
                {surah.surahName}
              </div>
              <div className="text-xs text-muted-foreground">
                {surah.totalAyah} verses
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
