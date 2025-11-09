import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';
import type { ReceivingItem, ProcessingResult } from '@/hooks/useStockReceiving';
import { ProcessingResultsDisplay } from './ProcessingResultsDisplay';

interface AllocationPanelProps {
  items: ReceivingItem[];
  results: ProcessingResult[];
  onProcess: () => void;
  onClear: () => void;
  onClearResults?: () => void;
  isProcessing: boolean;
}

export function AllocationPanel({ 
  items, 
  results, 
  onProcess, 
  onClear,
  onClearResults,
  isProcessing 
}: AllocationPanelProps) {
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const processedCount = results.length;
  const successCount = results.filter(r => r.success).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Processing Queue ({items.length} items)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total Items:</span>
              <Badge variant="outline">{items.length}</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total Quantity:</span>
              <Badge variant="outline">{totalQuantity} units</Badge>
            </div>
          </div>
        )}

        {items.length > 0 && (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {items.map((item, index) => {
              const result = results[index];
              const itemId = item.asin || item.sku_code || item.model_number || `Item ${index + 1}`;
              
              return (
                <div
                  key={index}
                  className="border rounded-lg p-3 bg-muted/20 flex items-center justify-between"
                >
                  <div className="flex-1">
                    <div className="font-medium text-sm">{itemId}</div>
                    <div className="text-xs text-muted-foreground">
                      Qty: {item.quantity}
                      {item.supplier_name && ` • ${item.supplier_name}`}
                    </div>
                  </div>
                  
                  {result && (
                    <div>
                      {result.success ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                  )}
                  
                  {!result && isProcessing && (
                    <Clock className="w-5 h-5 text-amber-600 animate-pulse" />
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="flex gap-2 pt-4">
          <Button
            onClick={onProcess}
            disabled={items.length === 0 || isProcessing}
            className="flex-1"
          >
            {isProcessing ? 'Processing...' : `Process ${items.length} Item${items.length !== 1 ? 's' : ''}`}
          </Button>
          
          {items.length > 0 && !isProcessing && (
            <Button variant="outline" onClick={onClear}>
              Clear Queue
            </Button>
          )}
        </div>

        {/* Show Detailed Results */}
        {results.length > 0 && processedCount === items.length && (
          <div className="pt-4 border-t space-y-3">
            <ProcessingResultsDisplay results={results} items={items} />
            {onClearResults && (
              <Button
                variant="outline"
                onClick={onClearResults}
                className="w-full"
              >
                Clear Results & Start New
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
