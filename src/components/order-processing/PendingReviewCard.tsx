import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Zap, 
  ChevronDown, 
  ChevronUp, 
  CheckSquare, 
  Square, 
  Trash2,
  ArrowRight,
  AlertTriangle,
  Package
} from 'lucide-react';

interface PendingItem {
  orderId: string;
  asin?: string;
  sku?: string;
  itemTitle?: string;
  itemQuantity: number;
  currentStock: number;
  afterDeduction: number;
  matchType?: string;
  inventoryType?: string;
  serialNumber?: string;
}

interface PendingReviewCardProps {
  items: PendingItem[];
  selectedItems: Set<string>;
  onSelectItem: (orderId: string) => void;
  onSelectAll: () => void;
  onProcess: () => Promise<void>;
  onClear: () => void;
  isProcessing?: boolean;
  progress?: number;
}

export function PendingReviewCard({
  items,
  selectedItems,
  onSelectItem,
  onSelectAll,
  onProcess,
  onClear,
  isProcessing = false,
  progress = 0
}: PendingReviewCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  
  const allSelected = items.length > 0 && selectedItems.size === items.length;
  const someSelected = selectedItems.size > 0 && selectedItems.size < items.length;
  const lowStockItems = items.filter(item => item.afterDeduction === 0).length;

  if (items.length === 0) {
    return (
      <Card className="p-8 text-center bg-gradient-to-br from-muted/30 via-card to-muted/30 border-dashed">
        <Zap className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
        <h4 className="text-lg font-semibold text-muted-foreground mb-2">No Pending Orders</h4>
        <p className="text-sm text-muted-foreground/70">
          Upload orders to see them here for batch processing
        </p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-warning/30 bg-gradient-to-br from-warning/5 via-card to-warning/5">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        {/* Header */}
        <div className="p-4 border-b border-border/50">
          <div className="flex items-center justify-between">
            <CollapsibleTrigger asChild>
              <button className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-warning to-amber-600 text-white shadow-lg">
                  <Zap className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    Pending Review
                    <Badge variant="secondary" className="bg-warning/20 text-warning border-warning/30">
                      {items.length} orders
                    </Badge>
                    {lowStockItems > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        {lowStockItems} low stock
                      </Badge>
                    )}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedItems.size} of {items.length} selected
                  </p>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-muted-foreground ml-2" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-muted-foreground ml-2" />
                )}
              </button>
            </CollapsibleTrigger>
            
            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onSelectAll}
                className="gap-1.5 text-xs"
              >
                {allSelected ? (
                  <>
                    <Square className="w-3.5 h-3.5" />
                    Deselect All
                  </>
                ) : (
                  <>
                    <CheckSquare className="w-3.5 h-3.5" />
                    Select All
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClear}
                className="gap-1.5 text-xs text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear
              </Button>
              <Button
                onClick={onProcess}
                disabled={selectedItems.size === 0 || isProcessing}
                className="gap-2 bg-gradient-to-r from-warning to-amber-600 hover:from-warning/90 hover:to-amber-600/90 text-white shadow-lg"
              >
                <Zap className="w-4 h-4" />
                Process ({selectedItems.size})
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          {/* Progress Bar */}
          {isProcessing && (
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Processing orders...</span>
                <span className="font-mono text-warning">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}
        </div>

        <CollapsibleContent>
          {/* Compact Item List */}
          <div className="max-h-[400px] overflow-y-auto">
            <div className="divide-y divide-border/30">
              {items.map((item, index) => {
                const isSelected = selectedItems.has(item.orderId);
                const isLowStock = item.afterDeduction === 0;
                
                return (
                  <div
                    key={item.orderId}
                    onClick={() => onSelectItem(item.orderId)}
                    className={`
                      p-3 flex items-center gap-4 cursor-pointer transition-all duration-150
                      ${isSelected ? 'bg-warning/10' : index % 2 === 0 ? 'bg-background' : 'bg-muted/10'}
                      ${isLowStock ? 'border-l-4 border-l-destructive' : isSelected ? 'border-l-4 border-l-warning' : ''}
                      hover:bg-warning/5
                    `}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => onSelectItem(item.orderId)}
                      onClick={(e) => e.stopPropagation()}
                      className="border-2"
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs text-muted-foreground">
                          {item.orderId}
                        </span>
                        {item.matchType && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {item.matchType.toUpperCase()}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm font-medium truncate text-foreground">
                        {item.itemTitle || 'Untitled Product'}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {item.asin && (
                          <span className="text-xs text-sky-600 dark:text-sky-400">
                            ASIN: {item.asin}
                          </span>
                        )}
                        {item.sku && (
                          <span className="text-xs text-emerald-600 dark:text-emerald-400">
                            SKU: {item.sku}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-right">
                      <div>
                        <p className="text-xs text-muted-foreground">Qty</p>
                        <p className="font-semibold">{item.itemQuantity}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Stock</p>
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-sm">{item.currentStock}</span>
                          <ArrowRight className="w-3 h-3 text-muted-foreground" />
                          <span className={`font-mono text-sm font-bold ${isLowStock ? 'text-destructive' : 'text-emerald-600'}`}>
                            {item.afterDeduction}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
