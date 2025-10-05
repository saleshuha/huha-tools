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
        <div className="space-y-3">
          {/* Step 1: Selection Status */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                  1
                </div>
                <h3 className="font-semibold text-xs">Selection</h3>
              </div>
              {selectedCount > 0 && (
                <Badge variant="secondary" className="bg-primary/10 text-primary text-xs">
                  {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
                </Badge>
              )}
            </div>
            {selectedCount === 0 && (
              <p className="text-xs text-muted-foreground ml-10">
                Select items from the table below to perform bulk actions
              </p>
            )}
            {selectedCount > 0 && (
              <div className="ml-10 text-xs">
                {selectionType === 'instock' && (
                  <div className="text-green-700 dark:text-green-400">
                    📦 In-stock items selected - ready for fulfillment
                  </div>
                )}
                {selectionType === 'outstock' && (
                  <div className="text-orange-700 dark:text-orange-400">
                    🔄 Out-of-stock items selected - requires ordering
                  </div>
                )}
                {!selectionType && (
                  <div className="text-blue-700 dark:text-blue-400">
                    📋 Mixed selection (in-stock and out-of-stock)
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Step 2: Actions */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                2
              </div>
              <h3 className="font-semibold text-xs">Choose Action</h3>
            </div>

            <div className="ml-9 space-y-2">
              {/* Primary Actions */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Primary Actions</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    onClick={onBulkFromStock}
                    disabled={isUpdating || selectedCount === 0 || selectionType !== 'instock'}
                    className="w-full bg-green-600 hover:bg-green-700 text-white disabled:bg-muted disabled:text-muted-foreground transition-all"
                  >
                    <PackageCheck className="h-4 w-4 mr-2" />
                    Fulfill From Stock ({selectedCount})
                  </Button>

                  <Button
                    size="sm"
                    onClick={onBulkMarkFromSupplier}
                    disabled={isUpdating || selectedCount === 0}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white disabled:bg-muted disabled:text-muted-foreground transition-all"
                  >
                    <Truck className="h-4 w-4 mr-2" />
                    Mark From Supplier ({selectedCount})
                  </Button>
                </div>
              </div>

              {/* Secondary Actions */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Secondary Actions</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onOrderAtSunsky}
                    disabled={!hasSunskyCredentials || isUpdating || selectedCount === 0}
                    className="w-full border-orange-500/30 hover:bg-orange-500/10 hover:border-orange-500 transition-all"
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Order at Sunsky ({selectedCount})
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onBulkTrackingUpdate}
                    disabled={isUpdating || selectedCount === 0}
                    className="w-full transition-all"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Update Selected ({selectedCount})
                  </Button>
                </div>
              </div>

              {/* Batch Actions */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Batch Actions</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onBulkUpdateAll}
                  disabled={isUpdating}
                  className="w-full transition-all"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Update All Items
                </Button>
              </div>
            </div>
          </div>

          {/* Step 3: Clear Selection */}
          {selectedCount > 0 && (
            <div className="space-y-1.5 pt-3 border-t border-border/40">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                  3
                </div>
                <h3 className="font-semibold text-xs">Reset</h3>
              </div>
              <div className="ml-9">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClearSelection}
                  className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear Selection
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
