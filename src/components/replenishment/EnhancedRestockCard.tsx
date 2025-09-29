import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Package, Clock, TrendingUp, ShoppingCart } from 'lucide-react';
import { EnhancedRestockItem } from '@/hooks/useEnhancedRestockManagement';

interface EnhancedRestockCardProps {
  item: EnhancedRestockItem;
  isSelected?: boolean;
  onToggleSelect?: (itemId: string) => void;
  onMarkAsOrdered?: (itemIds: string[]) => void;
  showSelectionCheckbox?: boolean;
}

export const EnhancedRestockCard = ({ 
  item, 
  isSelected = false,
  onToggleSelect,
  onMarkAsOrdered,
  showSelectionCheckbox = true
}: EnhancedRestockCardProps) => {
  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'Critical': return 'border-l-red-500 bg-red-50/50';
      case 'High': return 'border-l-orange-500 bg-orange-50/50';
      case 'Medium': return 'border-l-yellow-500 bg-yellow-50/50';
      case 'Low': return 'border-l-blue-500 bg-blue-50/50';
      default: return 'border-l-gray-500 bg-gray-50/50';
    }
  };

  const getUrgencyBadgeColor = (urgency: string) => {
    switch (urgency) {
      case 'Critical': return 'bg-red-100 text-red-700 border-red-200';
      case 'High': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'Medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'Low': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getReasonIcon = (reason: string) => {
    if (reason === 'Out of Stock') return <AlertTriangle className="h-4 w-4" />;
    if (reason === 'Sold Units - Needs Replenishment') return <TrendingUp className="h-4 w-4" />;
    return <Package className="h-4 w-4" />;
  };

  return (
    <Card className={`border-l-4 ${getUrgencyColor(item.urgency_level)} ${isSelected ? 'ring-2 ring-primary' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {showSelectionCheckbox && onToggleSelect && (
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggleSelect(item.item_id)}
                className="h-4 w-4 rounded border-border"
              />
            )}
            <CardTitle className="flex items-center gap-2 text-lg">
              {getReasonIcon(item.replenishment_reason)}
              {item.replenishment_reason}
            </CardTitle>
          </div>
          <Badge className={getUrgencyBadgeColor(item.urgency_level)}>
            {item.urgency_level.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="font-medium text-sm text-muted-foreground mb-1">Product</div>
          <div className="font-semibold text-sm break-words">{item.identifier}</div>
          <div className="text-xs text-muted-foreground font-mono">SKU: {item.sku}</div>
        </div>

        <div className="grid grid-cols-3 gap-3 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">Current Stock</div>
            <div className={`font-bold ${item.current_quantity === 0 ? 'text-red-600' : 'text-blue-600'}`}>
              {item.current_quantity}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Units Sold</div>
            <div className="font-bold text-orange-600">{item.units_sold_since_restock}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Last Restock Qty</div>
            <div className="font-bold text-gray-600">{item.last_restock_quantity}</div>
          </div>
        </div>

        <div className="bg-blue-50 p-3 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <ShoppingCart className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">Recommended Order</span>
          </div>
          <div className="text-lg font-bold text-blue-900">
            {item.recommended_order_quantity} units
          </div>
          <div className="text-xs text-blue-700 mt-1">
            Formula: 2× last restock quantity
          </div>
        </div>

        {item.days_since_last_restock !== null && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="h-3 w-3" />
            Last restock: {item.days_since_last_restock} days ago
          </div>
        )}

        {onMarkAsOrdered && (
          <div className="pt-2">
            <Button 
              onClick={() => onMarkAsOrdered([item.item_id])}
              className="w-full"
              size="sm"
              variant="outline"
            >
              Mark as Ordered
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};