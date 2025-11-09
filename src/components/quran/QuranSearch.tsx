import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { Surah } from '@/types/quran';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface QuranSearchProps {
  surahs: Surah[];
  onSurahSelect: (surahNumber: number) => void;
}

export function QuranSearch({ surahs, onSurahSelect }: QuranSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSurahs = useMemo(() => {
    if (!searchQuery.trim()) return [];

    const query = searchQuery.toLowerCase();
    
    return surahs.filter(surah => {
      // Search by number
      if (surah.surahNumber.toString() === query) return true;
      
      // Search by English name
      if (surah.surahName.toLowerCase().includes(query)) return true;
      
      // Search by Arabic name
      if (surah.surahNameArabic.includes(query)) return true;
      
      // Search by translation
      if (surah.surahNameTranslation.toLowerCase().includes(query)) return true;
      
      return false;
    }).slice(0, 10); // Limit to 10 results
  }, [searchQuery, surahs]);

  return (
    <div className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search by Surah name, number, or keyword..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 bg-background/50 backdrop-blur-sm"
        />
      </div>

      {searchQuery && filteredSurahs.length > 0 && (
        <Card className="absolute top-full mt-2 w-full z-50 p-2 max-h-96 overflow-auto">
          <div className="space-y-1">
            {filteredSurahs.map((surah) => (
              <div
                key={surah.surahNumber}
                onClick={() => {
                  onSurahSelect(surah.surahNumber);
                  setSearchQuery('');
                }}
                className="flex items-center justify-between p-3 rounded-md hover:bg-accent cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="font-mono">
                    {surah.surahNumber}
                  </Badge>
                  <div>
                    <div className="font-medium text-sm">{surah.surahName}</div>
                    <div className="text-xs text-muted-foreground">
                      {surah.surahNameTranslation}
                    </div>
                  </div>
                </div>
                <div className="text-xl font-arabic">{surah.surahNameArabic}</div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
