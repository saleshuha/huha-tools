import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { usePurchaseLink } from '@/hooks/usePurchaseLink';
import { toast } from 'sonner';
import { Copy, ExternalLink, Loader2, Filter, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface FilteredOrderInfo {
  id: string;
  asin?: string;
  title?: string;
  sku_code?: string;
  po_number: string;
  quantity: number;
}

interface GeneratePurchaseLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  poNumbers: string[];
  filteredOrders?: FilteredOrderInfo[];
  totalOrderCount?: number;
}

export const GeneratePurchaseLinkDialog = ({
  open,
  onOpenChange,
  poNumbers,
  filteredOrders = [],
  totalOrderCount = 0
}: GeneratePurchaseLinkDialogProps) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [expiresInDays, setExpiresInDays] = useState<string>('30');
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [useFilteredItems, setUseFilteredItems] = useState(false);
  
  const { generateLink, loading } = usePurchaseLink();

  const hasFilteredSubset = filteredOrders.length > 0 && filteredOrders.length < totalOrderCount;

  const handleGenerate = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in to generate links');
        return;
      }

      const request: any = {
        poNumbers,
        title: title || `Purchase Link for ${useFilteredItems && hasFilteredSubset ? `${filteredOrders.length} items` : `${poNumbers.length} PO(s)`}`,
        description,
        expiresInDays: expiresInDays === 'never' ? undefined : parseInt(expiresInDays),
        userId: user.id
      };

      // Include specific item IDs when using filtered mode
      if (useFilteredItems && hasFilteredSubset) {
        request.poOrderIds = filteredOrders.map(o => o.id);
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
    setUseFilteredItems(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Generate Purchase Link</DialogTitle>
          <DialogDescription>
            Create a shareable link for your purchasing team to track and update quantities
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!generatedLink ? (
            <>
              {/* Filtered vs All Items Toggle */}
              {hasFilteredSubset && (
                <div className="bg-muted/50 p-4 rounded-lg border border-border/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-primary" />
                      <Label htmlFor="use-filtered" className="font-medium cursor-pointer">
                        Only include filtered items
                      </Label>
                    </div>
                    <Switch
                      id="use-filtered"
                      checked={useFilteredItems}
                      onCheckedChange={setUseFilteredItems}
                    />
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm">
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                      !useFilteredItems ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground'
                    }`}>
                      <Package className="h-3.5 w-3.5" />
                      <span>All items: {totalOrderCount}</span>
                    </div>
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                      useFilteredItems ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground'
                    }`}>
                      <Filter className="h-3.5 w-3.5" />
                      <span>Filtered items: {filteredOrders.length}</span>
                    </div>
                  </div>

                  {useFilteredItems && (
                    <div className="max-h-32 overflow-y-auto border border-border/20 rounded-md bg-background/50">
                      <div className="divide-y divide-border/10">
                        {filteredOrders.slice(0, 20).map((order) => (
                          <div key={order.id} className="flex items-center justify-between px-3 py-1.5 text-xs">
                            <div className="flex items-center gap-2 truncate flex-1">
                              <span className="text-muted-foreground">{order.po_number}</span>
                              <span className="font-mono">{order.asin || order.sku_code || '—'}</span>
                              <span className="truncate text-muted-foreground">{order.title?.substring(0, 40)}</span>
                            </div>
                            <span className="text-muted-foreground ml-2">×{order.quantity}</span>
                          </div>
                        ))}
                        {filteredOrders.length > 20 && (
                          <div className="px-3 py-1.5 text-xs text-muted-foreground text-center">
                            ... and {filteredOrders.length - 20} more items
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="title">Link Title</Label>
                <Input
                  id="title"
                  placeholder="e.g., October Supplier A Orders"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Add any notes or instructions for your purchasing team..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiry">Link Expiration</Label>
                <Select value={expiresInDays} onValueChange={setExpiresInDays}>
                  <SelectTrigger>
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

              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <p className="text-sm font-medium">
                  {useFilteredItems && hasFilteredSubset 
                    ? `${filteredOrders.length} specific items from ${poNumbers.length} PO(s):`
                    : `All items from ${poNumbers.length} PO(s):`
                  }
                </p>
                <div className="flex flex-wrap gap-2">
                  {poNumbers.map((po) => (
                    <span key={po} className="text-xs bg-background px-2 py-1 rounded">
                      {po}
                    </span>
                  ))}
                </div>
              </div>

              <Button 
                onClick={handleGenerate} 
                disabled={loading}
                className="w-full"
              >
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Generate Link {useFilteredItems && hasFilteredSubset ? `(${filteredOrders.length} items)` : ''}
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
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyLink}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleOpenLink}
                  >
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

              <Button onClick={handleClose} className="w-full">
                Done
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
