import { useState, useMemo } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Database, Loader2, AlertTriangle } from 'lucide-react';
import { Progress } from './ui/progress';
import { Card, CardContent } from './ui/card';

interface FetchTitlesPreviewDialogProps {
  inventory: any[];
  onFetchTitles: (items: any[], onUpdate: (updates: any[]) => void) => Promise<string>;
  onTitleUpdate: (updates: { asin: string; title: string }[]) => Promise<void>;
}

export function FetchTitlesPreviewDialog({ 
  inventory, 
  onFetchTitles, 
  onTitleUpdate 
}: FetchTitlesPreviewDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);
  const { toast } = useToast();

  // Filter items from FULL inventory that need titles
  const itemsNeedingTitles = useMemo(() => {
    return inventory.filter(item => item.sku && item.sku.trim() && !item.title);
  }, [inventory]);

  const handleFetchTitles = async () => {
    if (itemsNeedingTitles.length === 0) return;

    setIsFetching(true);
    setProgress(0);
    setProcessedCount(0);
    
    try {
      // Start background task for title fetching
      await onFetchTitles(itemsNeedingTitles, async titleUpdates => {
        // Update progress
        setProcessedCount(prev => prev + titleUpdates.length);
        setProgress((prev) => Math.min(100, ((prev + titleUpdates.length) / itemsNeedingTitles.length) * 100));
        
        // When updates are ready, save them to the database
        if (titleUpdates.length > 0) {
          await onTitleUpdate(titleUpdates);
        }
      });

      toast({
        title: "Title Fetch Completed",
        description: `Successfully fetched titles for ${itemsNeedingTitles.length} items`
      });
      
      setIsOpen(false);
    } catch (error) {
      console.error('Error fetching titles:', error);
      toast({
        title: "Error",
        description: "Failed to fetch titles",
        variant: "destructive"
      });
    } finally {
      setIsFetching(false);
      setProgress(0);
      setProcessedCount(0);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Database className="w-4 h-4 mr-2" />
          Fetch Titles from Source
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Fetch Titles from Source</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {itemsNeedingTitles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertTriangle className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No Items Need Titles</p>
              <p className="text-sm text-muted-foreground mt-2">
                All items either have titles or are missing SKU numbers
              </p>
            </div>
          ) : (
            <>
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Database className="w-5 h-5 text-primary" />
                      <p className="text-sm font-medium">
                        Found <span className="text-primary font-bold">{itemsNeedingTitles.length}</span> items needing titles
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Titles will be fetched from Sunsky API using SKU
                    </p>
                  </div>
                </CardContent>
              </Card>

              {isFetching && (
                <div className="space-y-2">
                  <Progress value={progress} className="h-2" />
                  <p className="text-xs text-center text-muted-foreground">
                    Processing... {processedCount} / {itemsNeedingTitles.length} ({Math.round(progress)}%)
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => setIsOpen(false)}
            disabled={isFetching}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleFetchTitles}
            disabled={isFetching || itemsNeedingTitles.length === 0}
          >
            {isFetching ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Database className="w-4 h-4 mr-2" />
                Fetch {itemsNeedingTitles.length} Titles
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
