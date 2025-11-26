import { useState, useMemo } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { Badge } from './ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Database, Loader2, AlertTriangle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { ScrollArea } from './ui/scroll-area';

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
  const { toast } = useToast();

  // Filter items from FULL inventory that need titles
  const itemsNeedingTitles = useMemo(() => {
    return inventory.filter(item => item.sku && item.sku.trim() && !item.title);
  }, [inventory]);

  const handleFetchTitles = async () => {
    if (itemsNeedingTitles.length === 0) return;

    setIsFetching(true);
    try {
      // Start background task for title fetching
      await onFetchTitles(itemsNeedingTitles, async titleUpdates => {
        // When updates are ready, save them to the database
        if (titleUpdates.length > 0) {
          await onTitleUpdate(titleUpdates);
        }
      });

      toast({
        title: "Title Fetch Started",
        description: `Fetching titles for ${itemsNeedingTitles.length} items in the background`
      });
      
      setIsOpen(false);
    } catch (error) {
      console.error('Error fetching titles:', error);
      toast({
        title: "Error",
        description: "Failed to start title fetch process",
        variant: "destructive"
      });
    } finally {
      setIsFetching(false);
    }
  };

  // Generate Amazon image URL based on ASIN
  const getAmazonImageUrl = (asin: string) => {
    return `https://images-na.ssl-images-amazon.com/images/I/${asin}.jpg`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Database className="w-4 h-4 mr-2" />
          Fetch Titles from Source
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Fetch Titles from Source</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {itemsNeedingTitles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertTriangle className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No Items Need Titles</p>
              <p className="text-sm text-muted-foreground mt-2">
                All items either have titles or are missing SKU numbers
              </p>
            </div>
          ) : (
            <>
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm font-medium">
                  Found <span className="text-primary font-bold">{itemsNeedingTitles.length}</span> items with SKU but missing titles
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Titles will be fetched from Sunsky API using SKU
                </p>
              </div>

              <ScrollArea className="flex-1 border rounded-lg">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="w-[80px]">Image</TableHead>
                      <TableHead>ASIN</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Title Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itemsNeedingTitles.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <img
                            src={getAmazonImageUrl(item.asin)}
                            alt={item.asin}
                            className="w-[60px] h-[60px] object-contain rounded border bg-white"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/placeholder.svg';
                            }}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-sm">{item.asin}</TableCell>
                        <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Missing
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
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
