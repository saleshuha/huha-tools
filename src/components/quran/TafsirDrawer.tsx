import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTafsir } from '@/hooks/useQuranData';
import { Copy, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TafsirDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  surahNumber: number;
  ayahNumber: number;
}

export function TafsirDrawer({
  open,
  onOpenChange,
  surahNumber,
  ayahNumber,
}: TafsirDrawerProps) {
  const { data: tafsirs, isLoading, error } = useTafsir(surahNumber, ayahNumber);
  
  console.log('🕌 TafsirDrawer state:', { 
    surahNumber, 
    ayahNumber, 
    isLoading, 
    hasData: !!tafsirs,
    dataLength: tafsirs?.length,
    error: error?.message,
    errorDetails: error
  });

  const handleCopy = (text: string, name: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${name} copied to clipboard`);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <span>Tafsir</span>
            <Badge variant="secondary">
              {surahNumber}:{ayahNumber}
            </Badge>
          </SheetTitle>
        </SheetHeader>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <div className="text-center space-y-2">
              <p className="font-semibold text-destructive">Error loading tafsir</p>
              <p className="text-sm text-muted-foreground">{error.message}</p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </div>
        ) : tafsirs && tafsirs.length > 0 ? (
          <Tabs defaultValue={tafsirs[0].tafsirName} className="mt-6">
            <TabsList className="grid w-full grid-cols-3">
              {tafsirs.map((tafsir) => (
                <TabsTrigger key={tafsir.tafsirName} value={tafsir.tafsirName}>
                  {tafsir.tafsirName.split(' ')[0]}
                </TabsTrigger>
              ))}
            </TabsList>

            {tafsirs.map((tafsir) => (
              <TabsContent key={tafsir.tafsirName} value={tafsir.tafsirName} className="mt-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">{tafsir.tafsirName}</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(tafsir.text, tafsir.tafsirName)}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </Button>
                  </div>
                  
                  <ScrollArea className="h-[calc(100vh-16rem)]">
                    <div className="pr-4 text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {tafsir.text}
                    </div>
                  </ScrollArea>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 space-y-4 text-center">
            <div className="space-y-2">
              <p className="text-muted-foreground">
                Tafsir is not available for this verse yet.
              </p>
              <p className="text-sm text-muted-foreground">
                Tafsir coverage is being expanded continuously.
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
