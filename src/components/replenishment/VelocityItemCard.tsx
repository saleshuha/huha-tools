import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Package, Edit2, Check, X, RotateCcw, ShoppingCart, TrendingUp, TrendingDown } from 'lucide-react';
import type { VelocityAnalyticsItem } from '@/hooks/useQuarterlyVelocityAnalytics';
import { useState } from 'react';

interface VelocityItemCardProps {
  item: VelocityAnalyticsItem;
  imageUrl?: string;
  selected?: boolean;
  onSelect?: (id: string, checked: boolean) => void;
  isEditing?: boolean;
  editValue?: string;
  onEditClick?: () => void;
  onSaveEdit?: () => void;
  onCancelEdit?: () => void;
  onEditValueChange?: (value: string) => void;
  onClearOverride?: () => void;
  onOrderToSource?: () => void;
  showCheckbox?: boolean;
  showActions?: boolean;
}

export function VelocityItemCard({ 
  item, 
  imageUrl, 
  selected = false, 
  onSelect,
  isEditing = false,
  editValue = "",
  onEditClick,
  onSaveEdit,
  onCancelEdit,
  onEditValueChange,
  onClearOverride,
  onOrderToSource,
  showCheckbox = true,
  showActions = true
}: VelocityItemCardProps) {
  const [imageLoading, setImageLoading] = useState(true);
  const displayQty = item.manual_override ?? item.recommended_quantity;
  const hasOverride = item.manual_override !== undefined && item.manual_override !== null;
  const isOutOfStock = item.current_quantity === 0;

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex gap-4">
        {showCheckbox && onSelect && (
          <div className="flex items-start pt-1">
            <Checkbox
              checked={selected}
              onCheckedChange={(checked) => onSelect(item.asin_id, checked as boolean)}
            />
          </div>
        )}
        
        {/* Image with Loading State */}
        <div className="flex-shrink-0 relative">
          {imageUrl ? (
            <>
              {imageLoading && (
                <Skeleton className="w-20 h-20 rounded-md border absolute" />
              )}
              <img 
                src={imageUrl} 
                alt={item.asin}
                className={`w-20 h-20 object-contain rounded-md border border-border bg-white p-1 transition-opacity ${
                  imageLoading ? 'opacity-0' : 'opacity-100'
                }`}
                onLoad={() => setImageLoading(false)}
                onError={(e) => {
                  setImageLoading(false);
                  (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80" fill="none"%3E%3Crect width="80" height="80" fill="%23f3f4f6"/%3E%3Cpath d="M40 38a4 4 0 100-8 4 4 0 000 8zM28 48l8-8 8 8 12-12v20H28V48z" fill="%239ca3af"/%3E%3C/svg%3E';
                }}
              />
            </>
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
              <h4 className="font-medium text-sm font-mono mb-1">{item.asin}</h4>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mb-1">
                {item.sku && <span className="font-mono">SKU: {item.sku}</span>}
              </div>
              {item.title && (
                <p className="text-xs text-muted-foreground line-clamp-2" title={item.title}>
                  {item.title}
                </p>
              )}
            </div>
            <Badge variant={isOutOfStock ? 'destructive' : 'default'}>
              Stock: {item.current_quantity}
            </Badge>
          </div>

          {/* Metrics with Enhanced Colors */}
          <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
            <div className="flex items-center gap-1 text-muted-foreground">
              <TrendingUp className="w-3 h-3 text-green-600 dark:text-green-400" />
              <span>Added: <strong className="text-foreground">{item.total_added}</strong></span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <TrendingDown className="w-3 h-3 text-red-600 dark:text-red-400" />
              <span>Sold: <strong className="text-foreground">{item.total_sold}</strong></span>
            </div>
          </div>

          {/* Quantity Editor & Actions */}
          {showActions && (
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-1">
                <span className="text-xs text-muted-foreground whitespace-nowrap">Recommend:</span>
                {isEditing ? (
                  <div className="flex items-center gap-1">
                    <Input 
                      type="number" 
                      value={editValue} 
                      onChange={e => onEditValueChange?.(e.target.value)} 
                      className="w-20 h-7 text-xs text-center" 
                      min="0" 
                      autoFocus 
                    />
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-7 w-7 p-0" 
                      onClick={onSaveEdit}
                    >
                      <Check className="w-3 h-3 text-green-600" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-7 w-7 p-0" 
                      onClick={onCancelEdit}
                    >
                      <X className="w-3 h-3 text-red-600" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <Badge variant={hasOverride ? "secondary" : "outline"} className="text-xs">
                      {displayQty}
                    </Badge>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-7 w-7 p-0" 
                      onClick={onEditClick}
                      title="Edit quantity"
                    >
                      <Edit2 className="w-3 h-3" />
                    </Button>
                    {hasOverride && (
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-7 w-7 p-0" 
                        onClick={onClearOverride} 
                        title={`Reset to system recommendation (${item.recommended_quantity})`}
                      >
                        <RotateCcw className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
              
              {hasOverride && !isEditing && (
                <span className="text-xs text-muted-foreground">
                  System: {item.recommended_quantity}
                </span>
              )}

              <Button
                size="sm"
                onClick={onOrderToSource}
                className="gap-1 h-7 text-xs ml-auto"
              >
                <ShoppingCart className="w-3 h-3" />
                Order
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
