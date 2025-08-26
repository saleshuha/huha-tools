import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, Clock, CheckCircle, Truck, ShoppingCart, ExternalLink } from 'lucide-react';
import { UnifiedProcurementItem } from '@/hooks/useProcurementUnified';
import { useProcurementUnified } from '@/hooks/useProcurementUnified';

interface POItemCardProps {
  item: UnifiedProcurementItem;
}

const statusColors = {
  'pending': 'bg-orange-100 text-orange-700 border-orange-200',
  'ordered': 'bg-blue-100 text-blue-700 border-blue-200',
  'shipped': 'bg-purple-100 text-purple-700 border-purple-200',
  'delivered': 'bg-green-100 text-green-700 border-green-200',
  'cancelled': 'bg-red-100 text-red-700 border-red-200'
};

const statusIcons = {
  'pending': Clock,
  'ordered': ShoppingCart,
  'shipped': Truck,
  'delivered': CheckCircle,
  'cancelled': Package
};

export const POItemCard = ({ item }: POItemCardProps) => {
  const { updatePOStatus } = useProcurementUnified();

  const handleStatusChange = (newStatus: string) => {
    if (item.po_id) {
      updatePOStatus(item.po_id, newStatus);
    }
  };

  const StatusIcon = statusIcons[item.status as keyof typeof statusIcons] || Package;

  return (
    <Card className="border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-50/50 to-background">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Package className="h-5 w-5 text-blue-500" />
            PO Order
          </CardTitle>
          <Badge className={statusColors[item.status as keyof typeof statusColors] || statusColors.pending}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {item.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="font-medium text-sm text-muted-foreground mb-1">Product</div>
          <div className="font-semibold">{item.title}</div>
          <div className="text-sm text-muted-foreground font-mono">
            {item.model_number || item.sku}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-muted-foreground">PO Number</div>
            <Badge variant="outline" className="font-mono">
              {item.po_number}
            </Badge>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Quantity</div>
            <div className="font-bold">{item.quantity}</div>
          </div>
        </div>

        {item.supplier_order_number && (
          <div>
            <div className="text-sm text-muted-foreground">Supplier Order</div>
            <Badge variant="outline" className="font-mono">
              {item.supplier_order_number}
            </Badge>
          </div>
        )}

        {item.tracking_number && (
          <div>
            <div className="text-sm text-muted-foreground">Tracking</div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono">
                {item.tracking_number}
              </Badge>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}

        <div className="pt-2 flex gap-2">
          {item.status === 'pending' && (
            <Button 
              onClick={() => handleStatusChange('ordered')}
              size="sm"
              className="flex-1"
            >
              Mark Ordered
            </Button>
          )}
          {item.status === 'ordered' && (
            <Button 
              onClick={() => handleStatusChange('shipped')}
              size="sm"
              variant="outline"
              className="flex-1"
            >
              Mark Shipped
            </Button>
          )}
          {item.status === 'shipped' && (
            <Button 
              onClick={() => handleStatusChange('delivered')}
              size="sm"
              variant="outline"
              className="flex-1"
            >
              Mark Delivered
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};