import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Search, Package, TrendingUp, AlertTriangle, CheckCircle2, 
  XCircle, Download, RefreshCw, Loader2, Image as ImageIcon,
  Copy, ClipboardList, Filter
} from 'lucide-react';
import { usePOQuantityMatching, MatchedItem } from '@/hooks/usePOQuantityMatching';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface POQuantityMatchingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preSelectedPOs?: string[];
}

export const POQuantityMatchingDialog: React.FC<POQuantityMatchingDialogProps> = ({
  open,
  onOpenChange,
  preSelectedPOs = [],
}) => {
  const { toast } = useToast();
  const [selectedPOs, setSelectedPOs] = useState<string[]>(preSelectedPOs);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'partial' | 'fulfilled' | 'not_ordered'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showPOSelector, setShowPOSelector] = useState(false);

  const { matchedItems, summary, availablePOs, isLoading, refetch } = usePOQuantityMatching({
    selectedPOs,
    statusFilter,
    searchQuery,
  });

  // Export to CSV
  const handleExport = () => {
    const headers = ['SKU Code', 'Model Number', 'ASIN', 'Title', 'PO Numbers', 'Requested Qty', 'Ordered Qty', 'Pending Qty', 'Status'];
    const rows = matchedItems.map(item => [
      item.sku_code || '',
      item.model_number || '',
      item.asin || '',
      item.title || '',
      item.po_numbers.join(', '),
      item.requested_qty.toString(),
      item.ordered_qty.toString(),
      item.pending_qty.toString(),
      item.status,
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `po-quantity-matching-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    toast({ title: 'Exported', description: 'Report exported to CSV' });
  };

  // Copy pending items for supplier order
  const handleCopyPending = () => {
    const pendingItems = matchedItems.filter(i => i.pending_qty > 0);
    const text = pendingItems.map(i => `${i.sku_code || i.model_number || 'N/A'}\t${i.pending_qty}`).join('\n');
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied', description: `${pendingItems.length} pending items copied to clipboard` });
  };

  const getStatusBadge = (status: MatchedItem['status']) => {
    switch (status) {
      case 'fulfilled':
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20"><CheckCircle2 className="h-3 w-3 mr-1" />Fulfilled</Badge>;
      case 'partial':
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20"><AlertTriangle className="h-3 w-3 mr-1" />Partial</Badge>;
      case 'not_ordered':
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20"><XCircle className="h-3 w-3 mr-1" />Not Ordered</Badge>;
    }
  };

  const ItemImage = ({ item }: { item: MatchedItem }) => {
    const [error, setError] = useState(false);
    const imageUrl = item.image_url || item.sunsky_thumbnail;

    if (!imageUrl || error) {
      return (
        <div className="w-12 h-12 rounded-lg border border-dashed border-border/30 flex items-center justify-center bg-muted/20">
          <ImageIcon className="h-4 w-4 text-muted-foreground/50" />
        </div>
      );
    }

    return (
      <Popover>
        <PopoverTrigger asChild>
          <div className="w-12 h-12 rounded-lg border border-border/30 overflow-hidden cursor-pointer hover:border-primary/50 transition-all bg-background">
            <img 
              src={imageUrl} 
              alt={item.title || 'Product'} 
              className="w-full h-full object-contain"
              onError={() => setError(true)}
            />
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2">
          <img 
            src={imageUrl} 
            alt={item.title || 'Product'} 
            className="w-full h-auto object-contain rounded-lg"
          />
        </PopoverContent>
      </Popover>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <ClipboardList className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold">Quantity Matching Report</DialogTitle>
                <p className="text-sm text-muted-foreground">Compare requested vs ordered quantities</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
          </div>
        </DialogHeader>

        {/* PO Selection */}
        <div className="flex-shrink-0 flex items-center gap-3 py-3 border-b border-border/20">
          <span className="text-sm font-medium text-muted-foreground">POs:</span>
          <Popover open={showPOSelector} onOpenChange={setShowPOSelector}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="min-w-[200px] justify-between">
                {selectedPOs.length === 0 ? 'All POs' : `${selectedPOs.length} PO${selectedPOs.length > 1 ? 's' : ''} selected`}
                <Filter className="h-3 w-3 ml-2" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2" align="start">
              <ScrollArea className="h-64">
                <div className="space-y-1">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full justify-start text-xs"
                    onClick={() => setSelectedPOs([])}
                  >
                    Select All
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full justify-start text-xs"
                    onClick={() => setSelectedPOs([])}
                  >
                    Clear Selection
                  </Button>
                  <div className="border-t border-border/20 my-2" />
                  {availablePOs.map(po => (
                    <div key={po} className="flex items-center gap-2 px-2 py-1 hover:bg-muted/50 rounded">
                      <Checkbox
                        checked={selectedPOs.includes(po)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedPOs(prev => [...prev, po]);
                          } else {
                            setSelectedPOs(prev => prev.filter(p => p !== po));
                          }
                        }}
                      />
                      <span className="text-xs font-mono">{po}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </PopoverContent>
          </Popover>
          
          {selectedPOs.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setSelectedPOs([])}>
              Clear
            </Button>
          )}
        </div>

        {/* Summary Cards */}
        <div className="flex-shrink-0 grid grid-cols-4 gap-3 py-3">
          <Card className="bg-muted/20 border-border/20">
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-foreground">{summary.total_requested.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Requested</div>
            </CardContent>
          </Card>
          <Card className="bg-emerald-500/10 border-emerald-500/20">
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-emerald-600">{summary.total_ordered.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Ordered</div>
            </CardContent>
          </Card>
          <Card className="bg-amber-500/10 border-amber-500/20">
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-amber-600">{summary.total_pending.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Pending</div>
            </CardContent>
          </Card>
          <Card className="bg-primary/10 border-primary/20">
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-primary">{summary.match_rate}%</div>
              <div className="text-xs text-muted-foreground">Match Rate</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters & Actions */}
        <div className="flex-shrink-0 flex items-center justify-between py-3 border-b border-border/20">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search SKU, Model, ASIN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 w-64"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Items</SelectItem>
                <SelectItem value="pending">Pending Only</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="fulfilled">Fulfilled</SelectItem>
                <SelectItem value="not_ordered">Not Ordered</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleCopyPending}>
              <Copy className="h-4 w-4 mr-2" />
              Copy Pending
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : matchedItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <Package className="h-12 w-12 mb-3 opacity-50" />
                <p>No items found</p>
                <p className="text-sm">Try adjusting your filters</p>
              </div>
            ) : (
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="w-16">Image</TableHead>
                    <TableHead>SKU / Model</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>PO(s)</TableHead>
                    <TableHead className="text-right">Requested</TableHead>
                    <TableHead className="text-right">Ordered</TableHead>
                    <TableHead className="text-right">Pending</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {matchedItems.map((item) => (
                    <TableRow key={item.id} className="group hover:bg-muted/30">
                      <TableCell>
                        <ItemImage item={item} />
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {item.sku_code && (
                            <div className="font-mono text-xs bg-muted/50 px-2 py-0.5 rounded inline-block">
                              {item.sku_code}
                            </div>
                          )}
                          {item.model_number && (
                            <div className="text-xs text-muted-foreground font-mono">
                              {item.model_number}
                            </div>
                          )}
                          {item.asin && (
                            <div className="text-xs text-primary/70 font-mono">
                              {item.asin}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm line-clamp-2">{item.title || '-'}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {item.po_numbers.slice(0, 3).map(po => (
                            <Badge key={po} variant="outline" className="text-xs font-mono">
                              {po}
                            </Badge>
                          ))}
                          {item.po_numbers.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{item.po_numbers.length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {item.requested_qty}
                      </TableCell>
                      <TableCell className="text-right font-medium text-emerald-600">
                        {item.ordered_qty}
                      </TableCell>
                      <TableCell className={cn(
                        "text-right font-bold",
                        item.pending_qty > 0 ? "text-amber-600" : "text-muted-foreground"
                      )}>
                        {item.pending_qty}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(item.status)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 flex items-center justify-between pt-3 border-t border-border/20">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>{matchedItems.length} items</span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
              {summary.fulfilled_count} fulfilled
            </span>
            <span className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-amber-600" />
              {summary.partial_count} partial
            </span>
            <span className="flex items-center gap-1">
              <XCircle className="h-3 w-3 text-red-600" />
              {summary.not_ordered_count} not ordered
            </span>
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
