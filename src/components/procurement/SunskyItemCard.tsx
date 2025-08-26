import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, Clock, CheckCircle, Truck, ShoppingCart, ExternalLink, Calendar } from 'lucide-react';
import { UnifiedProcurementItem } from '@/hooks/useProcurementUnified';

interface SunskyItemCardProps {
  item: UnifiedProcurementItem;
}

const statusColors = {
  'pending': 'bg-orange-100 text-orange-700 border-orange-200',
  'processing': 'bg-blue-100 text-blue-700 border-blue-200',
  'shipped': 'bg-purple-100 text-purple-700 border-purple-200',
  'delivered': 'bg-green-100 text-green-700 border-green-200',
  'cancelled': 'bg-red-100 text-red-700 border-red-200'
};

const statusIcons = {
  'pending': Clock,
  'processing': ShoppingCart,
  'shipped': Truck,
  'delivered': CheckCircle,
  'cancelled': Package
};

export const SunskyItemCard = ({ item }: SunskyItemCardProps) => {
  const StatusIcon = statusIcons[item.status as keyof typeof statusIcons] || Package;

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Card className="border-l-4 border-l-green-500 bg-gradient-to-br from-green-50/50 to-background">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Package className="h-5 w-5 text-green-500" />
            Sunsky Order
          </CardTitle>
          <div className="flex flex-col gap-1">
            <Badge className={statusColors[item.status as keyof typeof statusColors] || statusColors.pending}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {item.status}
            </Badge>
            {item.sunsky_item_status && item.sunsky_item_status !== item.status && (
              <Badge variant="outline" className="text-xs">
                Item: {item.sunsky_item_status}
              </Badge>
            )}
          </div>
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
            <div className="text-sm text-muted-foreground">Order Number</div>
            <Badge variant="outline" className="font-mono">
              {item.sunsky_order_number}
            </Badge>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Quantity</div>
            <div className="font-bold">{item.quantity}</div>
          </div>
        </div>

        {item.po_number && (
          <div>
            <div className="text-sm text-muted-foreground">Linked PO</div>
            <Badge variant="outline" className="font-mono">
              {item.po_number}
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

        {item.expected_ship_date && (
          <div>
            <div className="text-sm text-muted-foreground">Expected Ship Date</div>
            <div className="flex items-center gap-1 text-sm">
              <Calendar className="h-3 w-3" />
              {formatDate(item.expected_ship_date)}
            </div>
          </div>
        )}

        <div className="text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Created: {formatDate(item.created_at)}
          </div>
          {item.status_last_updated_at && (
            <div className="flex items-center gap-1 mt-1">
              <Clock className="h-3 w-3" />
              Updated: {formatDate(item.status_last_updated_at)}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};