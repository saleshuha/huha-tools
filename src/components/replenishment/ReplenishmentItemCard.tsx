import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Package, Calendar, Clock, AlertTriangle, TrendingUp, Truck, ShoppingCart, Info } from 'lucide-react';
import { format } from 'date-fns';

interface ReplenishmentItemCardProps {
  item: {
    id: string;
    identifier: string;
    asin?: string;
    sku?: string;
    serial_number?: string;
    title?: string | null;
    current_quantity: number;
    ordered_quantity?: number;
    restock_quantity?: number | null;
    status: string;
    date_sold?: string | null;
    last_restock_date?: string | null;
    days_since_last_restock?: number | null;
    date_added?: string | null;
    total_sold_units?: number;
    ordered_at?: string | null;
    sunsky_order_number?: string | null;
    notes?: string | null;
    velocity_order_ref?: string | null;
  };
  imageUrl?: string;
  selected?: boolean;
  onSelect?: (id: string, checked: boolean) => void;
  actions?: React.ReactNode;
  showCheckbox?: boolean;
}

export function ReplenishmentItemCard({ 
  item, 
  imageUrl, 
  selected = false, 
  onSelect,
  actions,
  showCheckbox = false
}: ReplenishmentItemCardProps) {
  // Calculate computed metrics
  const daysInInventory = item.date_added 
    ? Math.floor((Date.now() - new Date(item.date_added).getTime()) / (1000 * 60 * 60 * 24))
    : null;
  
  const averageDailySales = daysInInventory && item.total_sold_units 
    ? (item.total_sold_units / daysInInventory).toFixed(2)
    : null;

  const daysSinceOrder = item.ordered_at
    ? Math.floor((Date.now() - new Date(item.ordered_at).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  // Determine urgency color based on status and days
  const getUrgencyColor = () => {
    if (item.status === 'no-stock') return 'border-l-destructive';
    if (item.status === 'ordered') {
      if (daysSinceOrder && daysSinceOrder > 30) return 'border-l-destructive';
      if (daysSinceOrder && daysSinceOrder > 15) return 'border-l-orange-500';
      if (daysSinceOrder && daysSinceOrder > 7) return 'border-l-yellow-500';
      return 'border-l-green-500';
    }
    if (item.status === 'sold' && item.days_since_last_restock && item.days_since_last_restock > 30) {
      return 'border-l-orange-500';
    }
    return 'border-l-primary';
  };

  // Get status badge variant and label
  const getStatusBadge = () => {
    switch (item.status) {
      case 'no-stock':
        return { variant: 'destructive' as const, label: '🔴 Out of Stock', icon: AlertTriangle };
      case 'ordered':
        return { variant: 'default' as const, label: '🟢 Ordered', icon: Truck };
      case 'sold':
        return { variant: 'secondary' as const, label: '🟡 Ready to Order', icon: ShoppingCart };
      case 'available':
        return { variant: 'outline' as const, label: '🔵 Available', icon: Package };
      default:
        return { variant: 'outline' as const, label: item.status, icon: Package };
    }
  };

  const statusBadge = getStatusBadge();
  const StatusIcon = statusBadge.icon;

  return (
    <Card className={`p-4 hover:shadow-md transition-shadow border-l-4 ${getUrgencyColor()}`}>
      <div className="flex gap-4">
        {showCheckbox && onSelect && (
          <div className="flex items-start pt-1">
            <Checkbox
              checked={selected}
              onCheckedChange={(checked) => onSelect(item.id, checked as boolean)}
            />
          </div>
        )}
        
        {/* Image */}
        <div className="flex-shrink-0">
          {imageUrl ? (
            <img 
              src={imageUrl} 
              alt={item.title || item.identifier}
              className="w-20 h-20 object-contain rounded-md border border-border bg-white p-1"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80" fill="none"%3E%3Crect width="80" height="80" fill="%23f3f4f6"/%3E%3Cpath d="M40 38a4 4 0 100-8 4 4 0 000 8zM28 48l8-8 8 8 12-12v20H28V48z" fill="%239ca3af"/%3E%3C/svg%3E';
              }}
            />
          ) : (
            <div className="w-20 h-20 bg-muted rounded-md flex items-center justify-center border border-border">
              <Package className="w-8 h-8 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header Section */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex-1 min-w-0">
              {item.title && (
                <h4 className="font-semibold text-sm mb-1 line-clamp-2">{item.title}</h4>
              )}
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                {item.asin && <span className="font-mono">ASIN: {item.asin}</span>}
                {item.sku && <span className="font-mono">SKU: {item.sku}</span>}
                {item.serial_number && <span className="font-mono">SN: {item.serial_number}</span>}
              </div>
            </div>
            <Badge variant={statusBadge.variant} className="flex items-center gap-1 shrink-0">
              <StatusIcon className="w-3 h-3" />
              {statusBadge.label}
            </Badge>
          </div>

          {/* Metrics Section - Grid Layout */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-3 text-xs">
            {/* Total Sold Units */}
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-primary" />
              <div>
                <div className="text-muted-foreground">Total Sold</div>
                <div className="font-semibold">
                  {item.total_sold_units !== undefined ? `${item.total_sold_units} units` : 'N/A'}
                </div>
              </div>
            </div>

            {/* Total Days in Inventory */}
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-primary" />
              <div>
                <div className="text-muted-foreground">Days in Inventory</div>
                <div className="font-semibold">
                  {daysInInventory !== null ? `${daysInInventory} days` : 'N/A'}
                </div>
              </div>
            </div>

            {/* Last Item Sold Days */}
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              <div>
                <div className="text-muted-foreground">Last Sold</div>
                <div className="font-semibold">
                  {item.date_sold 
                    ? `${Math.floor((Date.now() - new Date(item.date_sold).getTime()) / (1000 * 60 * 60 * 24))} days ago`
                    : 'N/A'
                  }
                </div>
              </div>
            </div>

            {/* Order Information - Only for ordered items */}
            {item.status === 'ordered' && (
              <>
                {/* Order Date */}
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-green-600" />
                  <div>
                    <div className="text-muted-foreground">Order Date</div>
                    <div className="font-semibold">
                      {item.ordered_at ? format(new Date(item.ordered_at), 'MMM dd, yyyy') : 'N/A'}
                    </div>
                  </div>
                </div>

                {/* Order Qty */}
                <div className="flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-green-600" />
                  <div>
                    <div className="text-muted-foreground">Order Qty</div>
                    <div className="font-semibold">
                      {item.restock_quantity || item.ordered_quantity || 'N/A'} {(item.restock_quantity || item.ordered_quantity) ? 'units' : ''}
                    </div>
                  </div>
                </div>

                {/* Days in Transit */}
                <div className="flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-green-600" />
                  <div>
                    <div className="text-muted-foreground">Days in Transit</div>
                    <div className="font-semibold">
                      {daysSinceOrder !== null ? `${daysSinceOrder} days` : 'N/A'}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer Section */}
          <div className="flex items-center gap-2 flex-wrap">
            {item.notes && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="cursor-help">
                      <Info className="w-3 h-3 mr-1" />
                      Notes
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>{item.notes}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {item.velocity_order_ref && (
              <Badge variant="outline" className="text-xs">
                Ref: {item.velocity_order_ref}
              </Badge>
            )}

            {actions && (
              <div className="flex gap-2 ml-auto">
                {actions}
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
