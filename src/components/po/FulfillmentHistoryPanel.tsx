import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Package, Calendar, Hash, FileText, MapPin } from 'lucide-react';
import { format } from 'date-fns';

interface FulfillmentRecord {
  id: string;
  po_number: string;
  fulfilled_quantity: number;
  original_quantity: number;
  fulfillment_source: string;
  inventory_id?: string;
  asin?: string;
  sku_code?: string;
  model_number?: string;
  notes?: string;
  created_at: string;
}

interface FulfillmentHistoryPanelProps {
  poNumber: string;
  userId: string;
}

export function FulfillmentHistoryPanel({ poNumber, userId }: FulfillmentHistoryPanelProps) {
  const [fulfillments, setFulfillments] = useState<FulfillmentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchFulfillmentHistory();
  }, [poNumber, userId]);

  const fetchFulfillmentHistory = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('fulfillment_history')
        .select('*')
        .eq('po_number', poNumber)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFulfillments(data || []);
    } catch (error) {
      console.error('Error fetching fulfillment history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getFulfillmentSourceBadge = (source: string) => {
    const sourceMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
      stock: { label: 'From Stock', variant: 'default' },
      supplier: { label: 'Supplier Order', variant: 'secondary' },
      transfer: { label: 'Transfer', variant: 'outline' }
    };

    const config = sourceMap[source] || { label: source, variant: 'outline' };
    return (
      <Badge variant={config.variant} className="text-xs">
        {config.label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Fulfillment History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading fulfillment history...</p>
        </CardContent>
      </Card>
    );
  }

  if (fulfillments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Fulfillment History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No fulfillment records found for this PO.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Package className="h-5 w-5" />
          Fulfillment History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {fulfillments.map((fulfillment, index) => (
            <div key={fulfillment.id}>
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {format(new Date(fulfillment.created_at), 'MMM dd, yyyy HH:mm')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getFulfillmentSourceBadge(fulfillment.fulfillment_source)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary">
                      {fulfillment.fulfilled_quantity}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      of {fulfillment.original_quantity} units
                    </div>
                  </div>
                </div>

                {(fulfillment.asin || fulfillment.sku_code || fulfillment.model_number) && (
                  <div className="grid gap-2 text-sm">
                    {fulfillment.asin && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Hash className="h-3 w-3" />
                        <span className="font-mono text-xs">ASIN: {fulfillment.asin}</span>
                      </div>
                    )}
                    {fulfillment.sku_code && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Hash className="h-3 w-3" />
                        <span className="font-mono text-xs">SKU: {fulfillment.sku_code}</span>
                      </div>
                    )}
                    {fulfillment.model_number && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Hash className="h-3 w-3" />
                        <span className="font-mono text-xs">Model: {fulfillment.model_number}</span>
                      </div>
                    )}
                  </div>
                )}

                {fulfillment.inventory_id && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span className="font-mono">Inventory ID: {fulfillment.inventory_id.slice(0, 8)}...</span>
                  </div>
                )}

                {fulfillment.notes && (
                  <div className="bg-muted/30 rounded-lg p-3 border">
                    <div className="flex items-start gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{fulfillment.notes}</p>
                    </div>
                  </div>
                )}
              </div>

              {index < fulfillments.length - 1 && <Separator className="my-4" />}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
