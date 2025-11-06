import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { Package, User, Calendar } from 'lucide-react';

interface PurchaseUpdate {
  id: string;
  po_number: string;
  title: string;
  purchased_quantity: number;
  supplier_name?: string;
  updated_by_name?: string;
  updated_by_email?: string;
  updated_at: string;
  notes?: string;
}

export const PurchaseUpdatesPanel = ({ poNumbers }: { poNumbers?: string[] }) => {
  const [updates, setUpdates] = useState<PurchaseUpdate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUpdates();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel('purchase-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'purchase_updates',
          filter: poNumbers ? `po_number=in.(${poNumbers.join(',')})` : undefined
        },
        () => {
          fetchUpdates();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [poNumbers]);

  const fetchUpdates = async () => {
    try {
      let query = supabase
        .from('purchase_updates')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(50);

      if (poNumbers && poNumbers.length > 0) {
        query = query.in('po_number', poNumbers);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      setUpdates(data || []);
    } catch (error) {
      console.error('Error fetching purchase updates:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-4 text-sm text-muted-foreground">Loading updates...</div>;
  }

  if (updates.length === 0) {
    return (
      <Card className="p-6 text-center">
        <Package className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No purchase updates yet</p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Package className="h-4 w-4" />
        Recent Purchase Updates
        <Badge variant="secondary" className="ml-auto">{updates.length}</Badge>
      </h3>
      
      <ScrollArea className="h-[400px]">
        <div className="space-y-3">
          {updates.map((update) => (
            <div key={update.id} className="p-3 border rounded-lg space-y-2">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-medium text-sm">{update.title || 'Untitled Item'}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    <Badge variant="outline" className="text-xs">{update.po_number}</Badge>
                    <span>Qty: {update.purchased_quantity}</span>
                    {update.supplier_name && <span>• {update.supplier_name}</span>}
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {formatDistanceToNow(new Date(update.updated_at), { addSuffix: true })}
                </Badge>
              </div>
              
              {(update.updated_by_name || update.updated_by_email) && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <User className="h-3 w-3" />
                  <span>{update.updated_by_name || update.updated_by_email}</span>
                </div>
              )}
              
              {update.notes && (
                <p className="text-xs text-muted-foreground italic">{update.notes}</p>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
};
