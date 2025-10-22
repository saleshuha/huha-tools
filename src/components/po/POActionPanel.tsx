import { PackageCheck, Truck, ShoppingCart, Edit, Trash2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

interface POActionPanelProps {
  selectedCount: number;
  selectionType: 'instock' | 'outstock' | null;
  isUpdating: boolean;
  onBulkFromStock: () => void;
  onBulkMarkFromSupplier: () => void;
  onOrderAtSunsky: () => void;
  onBulkTrackingUpdate: () => void;
  onBulkUpdateAll: () => void;
  onClearSelection: () => void;
  hasSunskyCredentials: boolean;
}

export function POActionPanel({
  selectedCount,
  selectionType,
  isUpdating,
  onBulkFromStock,
  onBulkMarkFromSupplier,
  onOrderAtSunsky,
  onBulkTrackingUpdate,
  onBulkUpdateAll,
  onClearSelection,
  hasSunskyCredentials,
}: POActionPanelProps) {
  return (
    <Card className="border-border/40 bg-card">
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Selection Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {selectedCount > 0 && (
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
                </Badge>
              )}
              {selectedCount > 0 && selectionType === 'instock' && (
                <span className="text-xs text-green-600 dark:text-green-400">📦 In-stock</span>
              )}
              {selectedCount > 0 && selectionType === 'outstock' && (
                <span className="text-xs text-orange-600 dark:text-orange-400">🔄 Out-of-stock</span>
              )}
              {selectedCount > 0 && !selectionType && (
                <span className="text-xs text-blue-600 dark:text-blue-400">📋 Mixed</span>
              )}
            </div>
            {selectedCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearSelection}
                className="text-muted-foreground hover:text-destructive h-8"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Clear
              </Button>
            )}
          </div>

          {/* Action Buttons - Always Visible */}
          <div className="space-y-2">
            {selectedCount === 0 && (
              <p className="text-xs text-muted-foreground text-center">
                Select items to enable actions
              </p>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              <Button
                size="sm"
                onClick={onBulkFromStock}
                disabled={isUpdating || selectedCount === 0 || selectionType !== 'instock'}
                className="w-full bg-green-600 hover:bg-green-700 text-white disabled:bg-muted disabled:text-muted-foreground"
                title={selectedCount === 0 ? 'Select items first' : selectionType !== 'instock' ? 'Only for in-stock items' : undefined}
              >
                <PackageCheck className="h-4 w-4 mr-1.5" />
                <span className="hidden sm:inline">From Stock</span>
                <span className="sm:hidden">Stock</span>
              </Button>

              <Button
                size="sm"
                onClick={onBulkMarkFromSupplier}
                disabled={isUpdating || selectedCount === 0}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white disabled:bg-muted disabled:text-muted-foreground"
                title={selectedCount === 0 ? 'Select items first' : undefined}
              >
                <Truck className="h-4 w-4 mr-1.5" />
                <span className="hidden sm:inline">From Supplier</span>
                <span className="sm:hidden">Supplier</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={onOrderAtSunsky}
                disabled={!hasSunskyCredentials || isUpdating || selectedCount === 0}
                className="w-full border-orange-500/30 hover:bg-orange-500/10 hover:border-orange-500 disabled:opacity-50"
                title={selectedCount === 0 ? 'Select items first' : !hasSunskyCredentials ? 'Sunsky credentials not configured' : undefined}
              >
                <ShoppingCart className="h-4 w-4 mr-1.5" />
                <span className="hidden sm:inline">Order Sunsky</span>
                <span className="sm:hidden">Sunsky</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={onBulkTrackingUpdate}
                disabled={isUpdating || selectedCount === 0}
                className="w-full"
                title={selectedCount === 0 ? 'Select items first' : undefined}
              >
                <Edit className="h-4 w-4 mr-1.5" />
                <span className="hidden sm:inline">Update</span>
                <span className="sm:hidden">Edit</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={onBulkUpdateAll}
                disabled={isUpdating}
                className="w-full col-span-2 sm:col-span-1"
              >
                <CheckCircle className="h-4 w-4 mr-1.5" />
                <span className="hidden sm:inline">Update All</span>
                <span className="sm:hidden">All</span>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
