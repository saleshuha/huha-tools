import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertCircle, Package, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { POAllocation } from '@/hooks/useStockReceiving';

interface POMatchingDisplayProps {
  matchedPOs: POAllocation[];
  quantityReceived: number;
  quantityToInventory: number;
}

export function POMatchingDisplay({ 
  matchedPOs, 
  quantityReceived, 
  quantityToInventory 
}: POMatchingDisplayProps) {
  const navigate = useNavigate();
  const totalAllocated = matchedPOs.reduce((sum, po) => sum + po.quantity_allocated, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5" />
          PO Matching Results
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {matchedPOs.length > 0 ? (
          <>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              Found {matchedPOs.length} Pending Purchase Order{matchedPOs.length !== 1 ? 's' : ''}
            </div>

            <div className="space-y-3">
              {matchedPOs.map((po) => (
                <div
                  key={po.po_id}
                  className="border rounded-lg p-4 bg-muted/30 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{po.po_number}</span>
                        <Badge variant={po.status === 'fulfilled' ? 'default' : 'secondary'}>
                          {po.status === 'fulfilled' ? 'Fully Fulfilled' : 'Partially Fulfilled'}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/po-tracker?po=${po.po_number}`)}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Needed:</span>{' '}
                      <span className="font-medium">{po.quantity_needed} units</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Allocating:</span>{' '}
                      <span className="font-medium text-success">{po.quantity_allocated} units</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              No matching POs found
            </div>
            <div className="text-xs text-muted-foreground pl-6">
              Possible reasons:
              <ul className="list-disc list-inside mt-1 space-y-0.5">
                <li>No open purchase orders for this item</li>
                <li>All matching POs are already fulfilled or cancelled</li>
                <li>Item identifier doesn't match any PO records</li>
              </ul>
            </div>
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 mt-2">
              <div className="flex items-center gap-2 text-sm">
                <Package className="w-4 h-4 text-primary" />
                <span className="font-medium">All {quantityReceived} units will be added to inventory</span>
              </div>
            </div>
          </div>
        )}

        <div className="border-t pt-4 space-y-2">
          <div className="text-sm font-medium">Allocation Summary</div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="bg-blue-500/10 rounded-lg p-3 border border-blue-500/20">
              <div className="text-muted-foreground text-xs">Received</div>
              <div className="font-bold text-lg">{quantityReceived}</div>
            </div>
            <div className="bg-green-500/10 rounded-lg p-3 border border-green-500/20">
              <div className="text-muted-foreground text-xs">To POs</div>
              <div className="font-bold text-lg">{totalAllocated}</div>
            </div>
            <div className="bg-purple-500/10 rounded-lg p-3 border border-purple-500/20">
              <div className="text-muted-foreground text-xs">To Inventory</div>
              <div className="font-bold text-lg">{quantityToInventory}</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
