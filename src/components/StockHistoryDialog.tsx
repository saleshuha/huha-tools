import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { Separator } from './ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { History, Calendar, TrendingUp, TrendingDown, Package, BarChart3, ArrowUpDown, Filter, AlertCircle } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface StockChange {
  id: string;
  created_at: string;
  previous_quantity: number;
  new_quantity: number;
  change_amount: number;
  change_reason: string;
  asin?: string;
  sku_number?: string;
  serial_number?: string;
}

interface StockHistoryDialogProps {
  inventoryId: string;
  itemIdentifier: string;
  inventoryType: 'asin' | 'sku';
}

export function StockHistoryDialog({ inventoryId, itemIdentifier, inventoryType }: StockHistoryDialogProps) {
  const [stockChanges, setStockChanges] = useState<StockChange[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [itemDetails, setItemDetails] = useState<{ dateAdded: string; quantity: number } | null>(null);

  const loadStockHistory = async () => {
    if (!open) return;
    
    setLoading(true);
    setError(null);
    try {
      // Load stock changes
      const { data, error } = await supabase
        .from('stock_changes')
        .select('*')
        .eq('inventory_id' as any, inventoryId as any)
        .eq('inventory_type' as any, inventoryType as any)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStockChanges((data as any) || []);

      // Load original item details
      const tableName = inventoryType === 'asin' ? 'asin_inventory' : 'sku_inventory';
      const { data: itemData, error: itemError } = await supabase
        .from(tableName as any)
        .select('date_added, quantity')
        .eq('id' as any, inventoryId as any)
        .single();

      if (itemError) throw itemError;
      setItemDetails({
        dateAdded: (itemData as any).date_added,
        quantity: (itemData as any).quantity
      });
    } catch (error) {
      console.error('Error loading stock history:', error);
      setError(error instanceof Error ? error.message : 'Failed to load stock history');
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    if (!stockChanges.length) return null;
    
    const totalChanges = stockChanges.length;
    const increases = stockChanges.filter(c => c.change_amount > 0);
    const decreases = stockChanges.filter(c => c.change_amount < 0);
    const totalIncrease = increases.reduce((sum, c) => sum + c.change_amount, 0);
    const totalDecrease = Math.abs(decreases.reduce((sum, c) => sum + c.change_amount, 0));
    const netChange = stockChanges.length > 1 ? 
      stockChanges[stockChanges.length - 1].new_quantity - stockChanges[0].previous_quantity : 0;
    
    const reasonCounts = stockChanges.reduce((acc, change) => {
      const reason = change.change_reason || 'Unknown';
      acc[reason] = (acc[reason] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mostCommonReason = Object.entries(reasonCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'None';

    return {
      totalChanges,
      increases: increases.length,
      decreases: decreases.length,
      totalIncrease,
      totalDecrease,
      netChange,
      mostCommonReason,
      reasonCounts
    };
  }, [stockChanges]);

  const getChangeIcon = (change: StockChange) => {
    if (change.change_amount > 0) return <TrendingUp className="w-4 h-4 text-emerald-600" />;
    if (change.change_amount < 0) return <TrendingDown className="w-4 h-4 text-rose-600" />;
    return <ArrowUpDown className="w-4 h-4 text-muted-foreground" />;
  };

  const getChangeBadgeVariant = (change: StockChange) => {
    if (change.change_amount > 0) return "default";
    if (change.change_amount < 0) return "destructive";
    return "secondary";
  };

  const getReasonColor = (reason: string) => {
    const colors = {
      'Manual adjustment': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      'Sale': 'bg-rose-100 text-rose-800 dark:bg-rose-900/20 dark:text-rose-400',
      'Restock': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400',
      'Return': 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
      'Damage': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
      'Unknown': 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
    };
    return colors[reason as keyof typeof colors] || colors.Unknown;
  };

  useEffect(() => {
    if (open) {
      loadStockHistory();
    }
  }, [open, inventoryId]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-8 h-8 p-0" title="View stock history">
          <History className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="space-y-2">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Package className="w-5 h-5 text-primary" />
            Stock History
          </DialogTitle>
          <div className="text-sm text-muted-foreground">
            {itemIdentifier}
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2 text-muted-foreground">Loading history...</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive opacity-50" />
                <p className="text-destructive font-medium">Error loading stock history</p>
                <p className="text-sm text-muted-foreground mt-1">{error}</p>
                <Button variant="outline" size="sm" onClick={loadStockHistory} className="mt-3">
                  Try Again
                </Button>
              </div>
            </div>
          ) : stockChanges.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 mx-auto mb-4 opacity-30 text-amber-500" />
              <p className="text-muted-foreground font-medium text-lg">No Stock History</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                This item was added to inventory but no stock has been added yet
              </p>
              {itemDetails && (
                <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-950/20 border-2 border-amber-200 dark:border-amber-800 rounded-lg max-w-sm mx-auto">
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-500" />
                    <div className="text-sm font-semibold text-amber-900 dark:text-amber-400">Item Status: No Stock</div>
                  </div>
                  <div className="space-y-2 text-left">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Date Added:</span>
                      <span className="text-sm font-medium">
                        {format(new Date(itemDetails.dateAdded), 'MMM dd, yyyy')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Current Quantity:</span>
                      <Badge variant="secondary" className="text-sm">
                        {itemDetails.quantity} {itemDetails.quantity === 0 && '(No Stock)'}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground/70 mt-2 text-center">
                      Added {formatDistanceToNow(new Date(itemDetails.dateAdded), { addSuffix: true })}
                    </div>
                    <div className="mt-3 pt-3 border-t border-amber-200 dark:border-amber-800">
                      <p className="text-xs text-muted-foreground text-center">
                        Stock changes will appear here once inventory quantities are updated
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Statistics Summary */}
              {stats && (
                <Card className="bg-gradient-to-r from-background to-muted/20">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <BarChart3 className="w-4 h-4 text-primary" />
                      <h3 className="font-semibold text-sm">Statistics Overview</h3>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="text-center">
                        <div className="text-lg font-bold text-primary">{stats.totalChanges}</div>
                        <div className="text-muted-foreground">Total Changes</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-emerald-600">+{stats.totalIncrease}</div>
                        <div className="text-muted-foreground">Total Added</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-rose-600">-{stats.totalDecrease}</div>
                        <div className="text-muted-foreground">Total Removed</div>
                      </div>
                      <div className="text-center">
                        <div className={`text-lg font-bold ${stats.netChange >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {stats.netChange >= 0 ? '+' : ''}{stats.netChange}
                        </div>
                        <div className="text-muted-foreground">Net Change</div>
                      </div>
                    </div>
                    {stats.mostCommonReason !== 'None' && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="text-xs text-muted-foreground">
                          Most common reason: <span className="font-medium">{stats.mostCommonReason}</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Stock Changes List */}
              <div className="flex-1 overflow-y-auto">
                <div className="space-y-3 pr-2">
                  {stockChanges.map((change, index) => (
                    <Card key={change.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            {getChangeIcon(change)}
                            <div>
                              <div className="flex items-center gap-2">
                                <Calendar className="w-3 h-3 text-muted-foreground" />
                                <span className="text-sm font-medium">
                                  {format(new Date(change.created_at), 'MMM dd, yyyy - HH:mm')}
                                </span>
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {formatDistanceToNow(new Date(change.created_at), { addSuffix: true })}
                              </div>
                            </div>
                          </div>
                          <Badge variant={getChangeBadgeVariant(change)} className="flex items-center gap-1">
                            {change.change_amount > 0 ? '+' : ''}{change.change_amount}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground text-xs">Previous Qty</span>
                            <div className="font-medium">{change.previous_quantity}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground text-xs">New Qty</span>
                            <div className="font-medium">{change.new_quantity}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground text-xs">Reason</span>
                            <div>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getReasonColor(change.change_reason || 'Unknown')}`}>
                                {change.change_reason || 'Unknown'}
                              </span>
                            </div>
                          </div>
                          <div>
                            <span className="text-muted-foreground text-xs">Net Impact</span>
                            <div className={`font-medium ${change.change_amount >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {change.change_amount >= 0 ? '+' : ''}{change.change_amount}
                            </div>
                          </div>
                        </div>

                        {/* Additional item info if available */}
                        {(change.asin || change.sku_number || change.serial_number) && (
                          <div className="mt-3 pt-3 border-t">
                            <div className="flex flex-wrap gap-2 text-xs">
                              {change.asin && (
                                <span className="bg-muted px-2 py-1 rounded">ASIN: {change.asin}</span>
                              )}
                              {change.sku_number && (
                                <span className="bg-muted px-2 py-1 rounded">SKU: {change.sku_number}</span>
                              )}
                              {change.serial_number && (
                                <span className="bg-muted px-2 py-1 rounded">Serial: {change.serial_number}</span>
                              )}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}