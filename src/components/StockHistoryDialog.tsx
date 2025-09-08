import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { History, Calendar, TrendingUp, TrendingDown, Package } from 'lucide-react';
import { format } from 'date-fns';

interface StockChange {
  id: string;
  created_at: string;
  previous_quantity: number;
  new_quantity: number;
  change_amount: number;
  change_reason: string;
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

  const loadStockHistory = async () => {
    if (!open) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('stock_changes')
        .select('*')
        .eq('inventory_id', inventoryId)
        .eq('inventory_type', inventoryType)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStockChanges(data || []);
    } catch (error) {
      console.error('Error loading stock history:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadStockHistory();
    }
  }, [open, inventoryId]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-8 h-8 p-0">
          <History className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Stock History - {itemIdentifier}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2">Loading history...</span>
            </div>
          ) : stockChanges.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No stock changes recorded yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {stockChanges.map((change) => (
                <div key={change.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {format(new Date(change.created_at), 'MMM dd, yyyy - HH:mm')}
                      </span>
                    </div>
                    <Badge 
                      variant={change.change_amount > 0 ? "default" : "secondary"}
                      className="flex items-center gap-1"
                    >
                      {change.change_amount > 0 ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      {change.change_amount > 0 ? '+' : ''}{change.change_amount}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Previous:</span>
                      <div className="font-medium">{change.previous_quantity}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">New:</span>
                      <div className="font-medium">{change.new_quantity}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Reason:</span>
                      <div className="font-medium">{change.change_reason}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}