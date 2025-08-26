import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Package, Clock } from 'lucide-react';
import { UnifiedProcurementItem } from '@/hooks/useProcurementUnified';
import { useProcurementUnified } from '@/hooks/useProcurementUnified';

interface RestockItemCardProps {
  item: UnifiedProcurementItem;
}

export const RestockItemCard = ({ item }: RestockItemCardProps) => {
  const { updateRestockStatus } = useProcurementUnified();

  const handleMarkAsOrdered = () => {
    if (item.item_id) {
      // Determine if it's ASIN or SKU inventory based on the title/sku format
      const inventoryType = item.title.includes('ASIN') || item.sku.startsWith('B0') ? 'asin' : 'sku';
      updateRestockStatus(item.item_id, inventoryType, 'ordered');
    }
  };

  return (
    <Card className="border-l-4 border-l-red-500 bg-gradient-to-br from-red-50/50 to-background">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Restock Required
          </CardTitle>
          <Badge className="bg-red-100 text-red-700 border-red-200">
            OUT OF STOCK
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="font-medium text-sm text-muted-foreground mb-1">Product</div>
          <div className="font-semibold">{item.title}</div>
          <div className="text-sm text-muted-foreground font-mono">{item.sku}</div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-muted-foreground">Current Stock</div>
            <div className="font-bold text-red-600">{item.quantity}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Status</div>
            <Badge variant="outline" className="flex items-center gap-1">
              <Package className="h-3 w-3" />
              {item.status}
            </Badge>
          </div>
        </div>

        {item.status_last_updated_at && (
          <div>
            <div className="text-sm text-muted-foreground">Last Updated</div>
            <div className="text-sm flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {new Date(item.status_last_updated_at).toLocaleDateString()}
            </div>
          </div>
        )}

        <div className="pt-2">
          <Button 
            onClick={handleMarkAsOrdered}
            className="w-full bg-blue-600 hover:bg-blue-700"
            size="sm"
          >
            Mark as Ordered
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};