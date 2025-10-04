import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Package, Edit2, Check, X, RotateCcw, ShoppingCart, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import type { VelocityAnalyticsItem } from '@/hooks/useQuarterlyVelocityAnalytics';

interface VelocityItemsTableProps {
  items: VelocityAnalyticsItem[];
  selectedItems: Set<string>;
  onSelectItem: (id: string, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
  editingId: string | null;
  editValue: string;
  onEditClick: (item: VelocityAnalyticsItem) => void;
  onSaveEdit: (item: VelocityAnalyticsItem) => void;
  onCancelEdit: () => void;
  onEditValueChange: (value: string) => void;
  onClearOverride: (id: string) => void;
  onOrderToSource: (item: VelocityAnalyticsItem) => void;
  getImageByAsin: (asin: string) => { image_url: string } | undefined;
  showActions?: boolean;
  mode?: 'ready' | 'ordered';
}

type SortField = 'asin' | 'sku' | 'title' | 'stock' | 'added' | 'sold' | 'recommended' | 'velocity_ref' | 'ordered_qty';
type SortDirection = 'asc' | 'desc' | null;

export function VelocityItemsTable({
  items,
  selectedItems,
  onSelectItem,
  onSelectAll,
  editingId,
  editValue,
  onEditClick,
  onSaveEdit,
  onCancelEdit,
  onEditValueChange,
  onClearOverride,
  onOrderToSource,
  getImageByAsin,
  showActions = true,
  mode = 'ready'
}: VelocityItemsTableProps) {
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const allSelected = items.length > 0 && items.every(item => selectedItems.has(item.asin_id));

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortField(null);
        setSortDirection(null);
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-30" />;
    if (sortDirection === 'asc') return <ArrowUp className="w-3 h-3 ml-1" />;
    if (sortDirection === 'desc') return <ArrowDown className="w-3 h-3 ml-1" />;
    return <ArrowUpDown className="w-3 h-3 ml-1 opacity-30" />;
  };

  const sortedItems = [...items].sort((a, b) => {
    if (!sortField || !sortDirection) return 0;
    
    const multiplier = sortDirection === 'asc' ? 1 : -1;
    
    switch (sortField) {
      case 'asin': {
        const aVal = (a.asin || '').toLowerCase();
        const bVal = (b.asin || '').toLowerCase();
        return multiplier * aVal.localeCompare(bVal);
      }
      case 'sku': {
        const aVal = (a.sku || '').toLowerCase();
        const bVal = (b.sku || '').toLowerCase();
        return multiplier * aVal.localeCompare(bVal);
      }
      case 'title': {
        const aVal = (a.title || '').toLowerCase();
        const bVal = (b.title || '').toLowerCase();
        return multiplier * aVal.localeCompare(bVal);
      }
      case 'stock': {
        const aVal = a.current_quantity ?? 0;
        const bVal = b.current_quantity ?? 0;
        return multiplier * (aVal - bVal);
      }
      case 'added': {
        const aVal = a.total_added ?? 0;
        const bVal = b.total_added ?? 0;
        return multiplier * (aVal - bVal);
      }
      case 'sold': {
        const aVal = a.total_sold ?? 0;
        const bVal = b.total_sold ?? 0;
        return multiplier * (aVal - bVal);
      }
      case 'recommended': {
        const aVal = (a.manual_override ?? a.recommended_quantity) ?? 0;
        const bVal = (b.manual_override ?? b.recommended_quantity) ?? 0;
        return multiplier * (aVal - bVal);
      }
      case 'velocity_ref': {
        const aVal = (a.velocity_order_ref || '').toLowerCase();
        const bVal = (b.velocity_order_ref || '').toLowerCase();
        return multiplier * aVal.localeCompare(bVal);
      }
      case 'ordered_qty': {
        const aVal = a.ordered_quantity ?? 0;
        const bVal = b.ordered_quantity ?? 0;
        return multiplier * (aVal - bVal);
      }
      default:
        return 0;
    }
  });

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <TableHead 
      className="cursor-pointer hover:bg-muted/50 select-none"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center">
        {children}
        {getSortIcon(field)}
      </div>
    </TableHead>
  );

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={allSelected}
                onCheckedChange={onSelectAll}
              />
            </TableHead>
            <TableHead className="w-20">Image</TableHead>
            <SortableHeader field="asin">ASIN</SortableHeader>
            <SortableHeader field="sku">SKU</SortableHeader>
            <SortableHeader field="title">Title</SortableHeader>
            <SortableHeader field="stock">Stock</SortableHeader>
            <SortableHeader field="added">Added</SortableHeader>
            <SortableHeader field="sold">Sold</SortableHeader>
            {mode === 'ready' ? (
              <>
                <SortableHeader field="recommended">Recommend</SortableHeader>
                {showActions && <TableHead className="text-right">Actions</TableHead>}
              </>
            ) : (
              <>
                <SortableHeader field="velocity_ref">Velocity Ref</SortableHeader>
                <TableHead>Sunsky Order</TableHead>
                <SortableHeader field="ordered_qty">Ordered Qty</SortableHeader>
                <TableHead>Ordered At</TableHead>
                {showActions && <TableHead className="text-right">Actions</TableHead>}
              </>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedItems.length === 0 ? (
            <TableRow>
              <TableCell colSpan={mode === 'ready' ? 10 : 13} className="h-32 text-center">
                <div className="flex flex-col items-center justify-center text-muted-foreground">
                  <Package className="w-12 h-12 mb-2 opacity-50" />
                  <p className="text-sm">No items found</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            sortedItems.map(item => {
              const displayQty = item.manual_override ?? item.recommended_quantity;
              const hasOverride = item.manual_override !== undefined && item.manual_override !== null;
              const isOutOfStock = item.current_quantity === 0;
              const isEditing = editingId === item.asin_id;
              const imageUrl = getImageByAsin(item.asin)?.image_url;

              return (
                <TableRow key={item.asin_id} className="hover:bg-muted/50">
                  <TableCell>
                    <Checkbox
                      checked={selectedItems.has(item.asin_id)}
                      onCheckedChange={(checked) => onSelectItem(item.asin_id, checked as boolean)}
                    />
                  </TableCell>
                  <TableCell>
                    {imageUrl ? (
                      <img 
                        src={imageUrl} 
                        alt={item.asin}
                        className="w-12 h-12 object-contain rounded border border-border bg-white p-1"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none"%3E%3Crect width="48" height="48" fill="%23f3f4f6"/%3E%3Cpath d="M24 22a2 2 0 100-4 2 2 0 000 4zM16 28l5-5 5 5 7-7v12H16V28z" fill="%239ca3af"/%3E%3C/svg%3E';
                        }}
                      />
                    ) : (
                      <div className="w-12 h-12 bg-muted rounded flex items-center justify-center border border-border">
                        <Package className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{item.asin}</TableCell>
                  <TableCell className="font-mono text-xs">{item.sku || '-'}</TableCell>
                  <TableCell className="max-w-xs truncate text-xs" title={item.title}>
                    {item.title || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={isOutOfStock ? 'destructive' : 'default'} className="text-xs">
                      {item.current_quantity}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">{item.total_added || 0}</TableCell>
                  <TableCell className="text-xs">{item.total_sold || 0}</TableCell>
                  
                  {mode === 'ready' ? (
                    <>
                      <TableCell>
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <Input 
                              type="number" 
                              value={editValue} 
                              onChange={e => onEditValueChange(e.target.value)} 
                              className="w-16 h-7 text-xs text-center" 
                              min="0" 
                              autoFocus 
                            />
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-7 w-7 p-0" 
                              onClick={() => onSaveEdit(item)}
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
                              onClick={() => onEditClick(item)}
                              title="Edit quantity"
                            >
                              <Edit2 className="w-3 h-3" />
                            </Button>
                            {hasOverride && (
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-7 w-7 p-0" 
                                onClick={() => onClearOverride(item.asin_id)} 
                                title={`Reset to system recommendation (${item.recommended_quantity})`}
                              >
                                <RotateCcw className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        )}
                      </TableCell>
                      {showActions && (
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            onClick={() => onOrderToSource(item)}
                            className="gap-1 h-7 text-xs"
                          >
                            <ShoppingCart className="w-3 h-3" />
                            Order
                          </Button>
                        </TableCell>
                      )}
                    </>
                  ) : (
                    <>
                      <TableCell className="font-mono text-xs">{item.velocity_order_ref || '-'}</TableCell>
                      <TableCell className="font-mono text-xs">{item.sunsky_order_number || '-'}</TableCell>
                      <TableCell>
                        <Badge className="text-xs">{item.ordered_quantity || 0}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {item.ordered_at ? new Date(item.ordered_at).toLocaleDateString() : '-'}
                      </TableCell>
                      {showActions && (
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onClearOverride(item.asin_id)}
                            className="gap-1 h-7 text-xs"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Restore
                          </Button>
                        </TableCell>
                      )}
                    </>
                  )}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
