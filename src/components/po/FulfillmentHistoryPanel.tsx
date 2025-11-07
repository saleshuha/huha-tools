import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Package, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

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
  const [showAll, setShowAll] = useState(false);

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

  const getSourceBadgeVariant = (source: string): 'default' | 'secondary' | 'outline' => {
    const variantMap: Record<string, 'default' | 'secondary' | 'outline'> = {
      stock: 'default',
      supplier: 'secondary',
      transfer: 'outline'
    };
    return variantMap[source] || 'outline';
  };

  const getSourceLabel = (source: string) => {
    const labelMap: Record<string, string> = {
      stock: 'Stock',
      supplier: 'Supplier',
      transfer: 'Transfer'
    };
    return labelMap[source] || source;
  };

  const getPrimaryIdentifier = (fulfillment: FulfillmentRecord) => {
    return fulfillment.asin || fulfillment.sku_code || fulfillment.model_number || 'N/A';
  };

  const displayedFulfillments = showAll ? fulfillments : fulfillments.slice(0, 5);
  const hasMore = fulfillments.length > 5;

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
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Package className="h-4 w-4" />
          Fulfillment History
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <TooltipProvider>
          {displayedFulfillments.map((fulfillment) => (
            <div
              key={fulfillment.id}
              className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Badge variant={getSourceBadgeVariant(fulfillment.fulfillment_source)} className="text-xs shrink-0">
                  {getSourceLabel(fulfillment.fulfillment_source)}
                </Badge>
                <span className="font-semibold text-sm shrink-0">
                  {fulfillment.fulfilled_quantity} units
                </span>
                <span className="text-muted-foreground text-xs">•</span>
                <span className="text-xs font-mono text-muted-foreground truncate">
                  {getPrimaryIdentifier(fulfillment)}
                </span>
                <span className="text-muted-foreground text-xs">•</span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {formatDistanceToNow(new Date(fulfillment.created_at), { addSuffix: true })}
                </span>
                {fulfillment.notes && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground cursor-help shrink-0" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-xs whitespace-pre-wrap">{fulfillment.notes}</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>
          ))}
        </TooltipProvider>

        {hasMore && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAll(!showAll)}
            className="w-full mt-2 text-xs"
          >
            {showAll ? (
              <>
                <ChevronUp className="h-3 w-3 mr-1" />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3 mr-1" />
                Show {fulfillments.length - 5} More
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
