import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Package, FileText, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { ProcessingResult } from '@/hooks/useStockReceiving';
import { LabelPrintButton } from './LabelPrintButton';

interface ProcessingResultsDisplayProps {
  results: ProcessingResult[];
  items: any[]; // Original items for display
  onViewInventory?: () => void;
  onViewPOs?: () => void;
}

export function ProcessingResultsDisplay({ 
  results,
  items,
  onViewInventory, 
  onViewPOs 
}: ProcessingResultsDisplayProps) {
  const navigate = useNavigate();
  const successCount = results.filter(r => r.success).length;
  const failedCount = results.length - successCount;

  const hasInventoryItems = results.some(r => r.success && r.inventory_id);
  const hasPOAllocations = results.some(r => r.success && r.matched_pos && r.matched_pos.length > 0);

  // Collect items added to inventory for label printing
  const inventoryItems = results
    .filter(r => r.success && r.inventory_id)
    .map(r => {
      const originalItem = items.find(item => 
        (item.asin && item.asin === r.item_id) || 
        (item.sku_code && item.sku_code === r.item_id) ||
        (item.model_number && item.model_number === r.item_id)
      );
      return {
        inventory_id: r.inventory_id!,
        asin: originalItem?.asin,
        sku: originalItem?.sku_code,
        title: originalItem?.title || r.item_id,
        quantity: r.quantity_to_inventory,
        serial_number: originalItem?.serial_number
      };
    });

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-success" />
            Processing Complete
          </span>
          <Badge variant={failedCount > 0 ? "destructive" : "default"}>
            {successCount} Success / {failedCount} Failed
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Actions */}
        {(hasInventoryItems || hasPOAllocations) && (
          <div className="flex gap-2">
            {inventoryItems.length > 0 && (
              <LabelPrintButton 
                receivedItems={inventoryItems}
                variant="default"
                size="sm"
              />
            )}
            {hasInventoryItems && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewInventory ? onViewInventory() : navigate('/inventory')}
              >
                <Package className="w-4 h-4 mr-2" />
                View Inventory
              </Button>
            )}
            {hasPOAllocations && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewPOs ? onViewPOs() : navigate('/po-tracker')}
              >
                <FileText className="w-4 h-4 mr-2" />
                View POs
              </Button>
            )}
          </div>
        )}

        {/* Detailed Results */}
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {results.map((result, index) => {
            const item = items[index];
            const itemId = result.item_id || (item ? (item.asin || item.sku_code || item.model_number || `Item ${index + 1}`) : `Item ${index + 1}`);
            const quantity = item?.quantity || 0;
            const supplier = item?.supplier_name;

            return (
              <div
                key={index}
                className={`border rounded-lg p-4 ${
                  result.success ? 'bg-success/5 border-success/20' : 'bg-destructive/5 border-destructive/20'
                }`}
              >
                <div className="flex items-start gap-3">
                  {result.success ? (
                    <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                  )}
                  
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-medium">{itemId}</div>
                        <div className="text-sm text-muted-foreground">
                          Quantity: {quantity} {supplier && `• ${supplier}`}
                        </div>
                      </div>
                    </div>

                    {result.success ? (
                      <div className="space-y-2">
                        <div className="text-sm">{result.message}</div>
                        
                        {/* PO Allocations */}
                        {result.matched_pos && result.matched_pos.length > 0 && (
                          <div className="space-y-1">
                            <div className="text-xs font-medium text-muted-foreground">Allocated to POs:</div>
                            <div className="flex flex-wrap gap-1">
                              {result.matched_pos.map((po, poIndex) => (
                                <Button
                                  key={poIndex}
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => navigate(`/po-tracker?po=${po.po_number}`)}
                                >
                                  {po.po_number}: {po.quantity_allocated} units
                                  <ExternalLink className="w-3 h-3 ml-1" />
                                </Button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Inventory Link */}
                        {result.inventory_id && (
                          <div className="space-y-1">
                            <div className="text-xs font-medium text-muted-foreground">
                              {result.matched_pos && result.matched_pos.length > 0 
                                ? 'Remaining added to inventory:' 
                                : 'Added to inventory:'}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => navigate(`/inventory?id=${result.inventory_id}`)}
                            >
                              <Package className="w-3 h-3 mr-1" />
                              View Item #{result.inventory_id.substring(0, 8)}
                              <ExternalLink className="w-3 h-3 ml-1" />
                            </Button>
                          </div>
                        )}

                        {/* Allocation Breakdown */}
                        {(result.matched_pos?.length > 0 || result.inventory_id) && (
                          <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-border/50">
                            <div className="text-xs">
                              <div className="text-muted-foreground">Received</div>
                              <div className="font-medium">{quantity}</div>
                            </div>
                            <div className="text-xs">
                              <div className="text-muted-foreground">To POs</div>
                              <div className="font-medium text-success">
                                {result.matched_pos?.reduce((sum, po) => sum + po.quantity_allocated, 0) || 0}
                              </div>
                            </div>
                            <div className="text-xs">
                              <div className="text-muted-foreground">To Inv</div>
                              <div className="font-medium text-primary">
                                {result.quantity_to_inventory || 0}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-destructive">Failed to process</div>
                        <div className="text-xs text-muted-foreground">{result.error || 'Unknown error'}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
