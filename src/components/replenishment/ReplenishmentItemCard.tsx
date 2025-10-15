import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Package, Calendar, Clock, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

interface ReplenishmentItemCardProps {
  item: {
    id: string;
    identifier: string;
    asin?: string;
    sku?: string;
    serial_number?: string;
    current_quantity: number;
    ordered_quantity?: number;
    status: string;
    date_sold?: string | null;
    last_restock_date?: string | null;
    days_since_last_restock?: number | null;
    date_added?: string | null;
    total_sold_units?: number;
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
  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
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
              alt={item.identifier}
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
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm truncate mb-1">{item.identifier}</h4>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                {item.asin && <span className="font-mono">ASIN: {item.asin}</span>}
                {item.sku && <span className="font-mono">SKU: {item.sku}</span>}
                {item.serial_number && <span className="font-mono">SN: {item.serial_number}</span>}
              </div>
            </div>
            <Badge variant={item.status === 'ordered' ? 'secondary' : 'default'}>
              {item.status}
            </Badge>
          </div>

          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mb-3">
            {item.total_sold_units !== undefined && (
              <div className="flex items-center gap-1">
                <Package className="w-3 h-3" />
                <span className="font-medium">Sold: {item.total_sold_units} units</span>
              </div>
            )}
            {item.date_added && (
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{Math.floor((Date.now() - new Date(item.date_added).getTime()) / (1000 * 60 * 60 * 24))} days total</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Package className="w-3 h-3" />
              <span className="font-medium">Ordered: {item.ordered_quantity || item.current_quantity} units</span>
            </div>
            {item.last_restock_date && (
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>Ordered on: {format(new Date(item.last_restock_date), 'MMM dd, yyyy')}</span>
              </div>
            )}
            {item.last_restock_date && (
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>Restocked: {format(new Date(item.last_restock_date), 'MMM dd, yyyy')}</span>
              </div>
            )}
            {item.days_since_last_restock !== null && (
              <div className="flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                <span>{item.days_since_last_restock} days since restock</span>
              </div>
            )}
          </div>

          {actions && (
            <div className="flex gap-2">
              {actions}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
