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
    recommended_reorder_quantity?: number;
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
  const daysInInventory = item.date_added 
    ? Math.floor((Date.now() - new Date(item.date_added).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const daysSinceOrder = item.ordered_at
    ? Math.floor((Date.now() - new Date(item.ordered_at).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const getUrgencyColor = () => {
    if (item.status === 'no-stock') return 'border-l-destructive';
    if (item.status === 'ordered') {
      if (daysSinceOrder && daysSinceOrder > 30) return 'border-l-destructive';
      if (daysSinceOrder && daysSinceOrder > 15) return 'border-l-accent';
      return 'border-l-primary';
    }
    if (item.status === 'sold' && item.days_since_last_restock && item.days_since_last_restock > 30) {
      return 'border-l-accent';
    }
    return 'border-l-primary';
  };

  const getStatusBadge = () => {
    switch (item.status) {
      case 'no-stock':
        return { variant: 'destructive' as const, label: 'Out of Stock', icon: AlertTriangle };
      case 'ordered':
        return { variant: 'default' as const, label: 'Ordered', icon: Truck };
      case 'sold':
        return { variant: 'secondary' as const, label: 'Ready', icon: ShoppingCart };
      case 'available':
        return { variant: 'outline' as const, label: 'Available', icon: Package };
      default:
        return { variant: 'outline' as const, label: item.status, icon: Package };
    }
  };

  const statusBadge = getStatusBadge();
  const StatusIcon = statusBadge.icon;

  return (
    <Card className={`p-3 hover:shadow-sm transition-shadow border-l-4 ${getUrgencyColor()} bg-card/80`}>
      <div className="flex gap-3">
        {showCheckbox && onSelect && (
          <div className="flex items-start pt-0.5">
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
              className="w-14 h-14 object-contain rounded-md border border-border bg-background p-0.5"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="56" height="56" fill="none"%3E%3Crect width="56" height="56" fill="%23f3f4f6"/%3E%3Cpath d="M28 26a3 3 0 100-6 3 3 0 000 6zM20 34l6-6 6 6 9-9v14H20V34z" fill="%239ca3af"/%3E%3C/svg%3E';
              }}
            />
          ) : (
            <div className="w-14 h-14 bg-muted rounded-md flex items-center justify-center border border-border">
              <Package className="w-6 h-6 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              {item.title && (
                <h4 className="font-semibold text-xs mb-0.5 line-clamp-1">{item.title}</h4>
              )}
              <div className="flex flex-wrap gap-1.5 text-[10px] text-muted-foreground font-mono">
                {item.asin && <span>ASIN: {item.asin}</span>}
                {item.sku && <span>SKU: {item.sku}</span>}
                {item.serial_number && <span>SN: {item.serial_number}</span>}
              </div>
            </div>
            <Badge variant={statusBadge.variant} className="flex items-center gap-1 shrink-0 text-[10px] h-5 px-1.5">
              <StatusIcon className="w-3 h-3" />
              {statusBadge.label}
            </Badge>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-2">
            <div className="flex items-center gap-1.5 text-[11px]">
              <TrendingUp className="w-3 h-3 text-primary shrink-0" />
              <span className="text-muted-foreground">Sold:</span>
              <span className="font-semibold">{item.total_sold_units ?? 'N/A'}</span>
            </div>

            <div className="flex items-center gap-1.5 text-[11px]">
              <Clock className="w-3 h-3 text-primary shrink-0" />
              <span className="text-muted-foreground">Days:</span>
              <span className="font-semibold">{daysInInventory ?? 'N/A'}</span>
            </div>

            <div className="flex items-center gap-1.5 text-[11px]">
              <Calendar className="w-3 h-3 text-primary shrink-0" />
              <span className="text-muted-foreground">Last Sold:</span>
              <span className="font-semibold">
                {item.date_sold 
                  ? `${Math.floor((Date.now() - new Date(item.date_sold).getTime()) / (1000 * 60 * 60 * 24))}d`
                  : 'N/A'
                }
              </span>
            </div>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5 text-[11px] cursor-help">
                    <ShoppingCart className="w-3 h-3 text-primary shrink-0" />
                    <span className="text-muted-foreground">Rec:</span>
                    <span className="font-semibold">{item.recommended_reorder_quantity || 0}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-xs">Calculated using replenishment config based on sales velocity, lead times, and safety stock.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Order Information - Only for ordered items */}
            {item.status === 'ordered' && (
              <>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <Calendar className="w-3 h-3 text-primary shrink-0" />
                  <span className="text-muted-foreground">Ordered:</span>
                  <span className="font-semibold">{item.ordered_at ? format(new Date(item.ordered_at), 'MMM dd') : 'N/A'}</span>
                </div>

                <div className="flex items-center gap-1.5 text-[11px]">
                  <Package className="w-3 h-3 text-primary shrink-0" />
                  <span className="text-muted-foreground">Qty:</span>
                  <span className="font-semibold">{item.restock_quantity || item.ordered_quantity || 'N/A'}</span>
                </div>

                <div className="flex items-center gap-1.5 text-[11px]">
                  <Truck className="w-3 h-3 text-primary shrink-0" />
                  <span className="text-muted-foreground">Transit:</span>
                  <span className="font-semibold">{daysSinceOrder !== null ? `${daysSinceOrder}d` : 'N/A'}</span>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {item.notes && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="cursor-help text-[10px] h-5 px-1.5">
                      <Info className="w-2.5 h-2.5 mr-0.5" />
                      Notes
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-xs">{item.notes}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {item.velocity_order_ref && (
              <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                Ref: {item.velocity_order_ref}
              </Badge>
            )}

            {actions && (
              <div className="flex gap-1.5 ml-auto">
                {actions}
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
