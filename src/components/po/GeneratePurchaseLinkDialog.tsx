import { useState, useMemo, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { usePurchaseLink } from '@/hooks/usePurchaseLink';
import { toast } from 'sonner';
import { Copy, ExternalLink, Loader2, Search, Package, CheckSquare, Square, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface OrderItem {
  id: string;
  asin?: string;
  title?: string;
  sku_code?: string;
  model_number?: string;
  po_number: string;
  quantity: number;
}

interface GeneratePurchaseLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  poNumbers: string[];
  allOrders?: OrderItem[];
}

export const GeneratePurchaseLinkDialog = ({
  open,
  onOpenChange,
  poNumbers,
  allOrders = []
}: GeneratePurchaseLinkDialogProps) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [expiresInDays, setExpiresInDays] = useState<string>('30');
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [dialogSearch, setDialogSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  const { generateLink, loading } = usePurchaseLink();

  // Initialize all items as selected when dialog opens or orders change
  useEffect(() => {
    if (open && allOrders.length > 0) {
      setSelectedIds(new Set(allOrders.map(o => o.id)));
    }
  }, [open, allOrders]);

  // Filter items by search query
  const filteredItems = useMemo(() => {
    if (!dialogSearch.trim()) return allOrders;
    const q = dialogSearch.toLowerCase();
    return allOrders.filter(o =>
      (o.asin && o.asin.toLowerCase().includes(q)) ||
      (o.sku_code && o.sku_code.toLowerCase().includes(q)) ||
      (o.title && o.title.toLowerCase().includes(q)) ||
      (o.model_number && o.model_number.toLowerCase().includes(q)) ||
      o.po_number.toLowerCase().includes(q)
    );
  }, [allOrders, dialogSearch]);

  const selectedCount = selectedIds.size;
  const totalCount = allOrders.length;
  const allVisibleSelected = filteredItems.length > 0 && filteredItems.every(o => selectedIds.has(o.id));

  const toggleItem = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAllVisible = useCallback(() => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      filteredItems.forEach(o => next.add(o.id));
      return next;
    });
  }, [filteredItems]);

  const deselectAllVisible = useCallback(() => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      filteredItems.forEach(o => next.delete(o.id));
      return next;
    });
  }, [filteredItems]);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleGenerate = async () => {
    if (selectedCount === 0) {
      toast.error('Please select at least one item');
      return;
    }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in to generate links');
        return;
      }

      const isAllSelected = selectedCount === totalCount;

      const request: any = {
        poNumbers,
        title: title || `Purchase Link for ${isAllSelected ? `${poNumbers.length} PO(s)` : `${selectedCount} items`}`,
        description,
        expiresInDays: expiresInDays === 'never' ? undefined : parseInt(expiresInDays),
        userId: user.id
      };

      // Always send specific IDs unless all items are selected
      if (!isAllSelected) {
        request.poOrderIds = Array.from(selectedIds);
      }

      const result = await generateLink(request);
      if (result) {
        const fullLink = `${window.location.origin}/purchase/${result.link_token}`;
        setGeneratedLink(fullLink);
        toast.success('Purchase link generated successfully!');
      }
    } catch (error) {
      console.error('Error generating link:', error);
      toast.error('Failed to generate link');
    }
  };

  const handleCopyLink = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      toast.success('Link copied to clipboard!');
    }
  };

  const handleOpenLink = () => {
    if (generatedLink) {
      window.open(generatedLink, '_blank');
    }
  };

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setExpiresInDays('30');
    setGeneratedLink(null);
    setDialogSearch('');
    setSelectedIds(new Set());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Generate Purchase Link</DialogTitle>
          <DialogDescription>
            Select items to include in the shareable purchase link
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4 py-2">
          {!generatedLink ? (
            <>
              {/* Search & Selection Controls */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search ASIN, SKU, title, PO number..."
                      value={dialogSearch}
                      onChange={(e) => setDialogSearch(e.target.value)}
                      className="pl-8 h-8 text-sm"
                    />
                    {dialogSearch && (
                      <button onClick={() => setDialogSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                        <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                      </button>
                    )}
                  </div>
                  <Badge variant="outline" className="whitespace-nowrap text-xs h-8 px-3 flex items-center">
                    {selectedCount} / {totalCount}
                  </Badge>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={selectAllVisible}>
                    <CheckSquare className="h-3 w-3 mr-1" />
                    Select{dialogSearch ? ' Visible' : ' All'}
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={dialogSearch ? deselectAllVisible : deselectAll}>
                    <Square className="h-3 w-3 mr-1" />
                    Deselect{dialogSearch ? ' Visible' : ' All'}
                  </Button>
                  {dialogSearch && filteredItems.length !== totalCount && (
                    <span className="text-xs text-muted-foreground ml-auto">
                      Showing {filteredItems.length} of {totalCount}
                    </span>
                  )}
                </div>
              </div>

              {/* Item List */}
              <ScrollArea className="flex-1 min-h-0 max-h-[280px] border border-border/30 rounded-lg">
                <div className="divide-y divide-border/20">
                  {filteredItems.length === 0 ? (
                    <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                      {dialogSearch ? 'No items match your search' : 'No items available'}
                    </div>
                  ) : (
                    filteredItems.map((item) => {
                      const isSelected = selectedIds.has(item.id);
                      return (
                        <label
                          key={item.id}
                          className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors hover:bg-muted/50 ${
                            isSelected ? 'bg-primary/5' : ''
                          }`}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleItem(item.id)}
                            className="shrink-0"
                          />
                          <div className="flex items-center gap-2 flex-1 min-w-0 text-xs">
                            <Badge variant="secondary" className="shrink-0 font-mono text-[10px] px-1.5 py-0">
                              {item.asin || item.sku_code || '—'}
                            </Badge>
                            <span className="truncate text-muted-foreground flex-1">
                              {item.title?.substring(0, 50) || 'Untitled'}
                            </span>
                            <span className="shrink-0 text-muted-foreground/70">
                              {item.po_number}
                            </span>
                            <Badge variant="outline" className="shrink-0 text-[10px] px-1.5 py-0">
                              ×{item.quantity}
                            </Badge>
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
              </ScrollArea>

              {/* Link Settings */}
              <div className="space-y-3 border-t border-border/20 pt-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="title" className="text-xs">Link Title</Label>
                    <Input
                      id="title"
                      placeholder="e.g., October Supplier A"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="expiry" className="text-xs">Expiration</Label>
                    <Select value={expiresInDays} onValueChange={setExpiresInDays}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">7 days</SelectItem>
                        <SelectItem value="30">30 days</SelectItem>
                        <SelectItem value="90">90 days</SelectItem>
                        <SelectItem value="never">Never</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="description" className="text-xs">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Notes for purchasing team..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    className="text-sm resize-none"
                  />
                </div>
              </div>

              {/* PO Summary */}
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-xs text-muted-foreground mr-1">POs:</span>
                {poNumbers.map((po) => (
                  <Badge key={po} variant="secondary" className="text-[10px] px-1.5 py-0">
                    {po}
                  </Badge>
                ))}
              </div>

              <Button 
                onClick={handleGenerate} 
                disabled={loading || selectedCount === 0}
                className="w-full"
              >
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Generate Link ({selectedCount} item{selectedCount !== 1 ? 's' : ''})
              </Button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 p-6 rounded-lg border border-green-500/20">
                <p className="text-sm font-medium mb-3">Your purchase link is ready!</p>
                <div className="flex items-center gap-2 bg-background p-3 rounded">
                  <Input 
                    value={generatedLink} 
                    readOnly 
                    className="font-mono text-sm"
                  />
                  <Button variant="outline" size="icon" onClick={handleCopyLink}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={handleOpenLink}>
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="text-sm space-y-2 text-muted-foreground">
                <p>✓ Share this link with your purchasing team</p>
                <p>✓ They can update quantities without logging in</p>
                <p>✓ All changes are tracked automatically</p>
                <p>✓ You'll see updates in real-time</p>
              </div>

              <Button onClick={handleClose} className="w-full">Done</Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
