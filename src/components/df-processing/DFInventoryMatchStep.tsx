import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowRight, ArrowLeft, Package } from 'lucide-react';
import { DFOrderItem } from './types';
import { useAsinInventory, AsinInventoryItem } from '@/hooks/useAsinInventory';
import { useSkuInventory, SkuInventoryItem } from '@/hooks/useSkuInventory';

interface DFInventoryMatchStepProps {
  orders: DFOrderItem[];
  onComplete: (orders: DFOrderItem[]) => void;
  onBack: () => void;
}

type FilterTab = 'all' | 'in-stock' | 'low-stock' | 'out-of-stock' | 'not-tracked';

export function DFInventoryMatchStep({ orders, onComplete, onBack }: DFInventoryMatchStepProps) {
  const [matchedOrders, setMatchedOrders] = useState<DFOrderItem[]>([]);
  const [matching, setMatching] = useState(false);
  const [done, setDone] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');

  const { inventory: asinInventory, loading: asinLoading } = useAsinInventory();
  const { inventory: skuInventory, loading: skuLoading } = useSkuInventory();

  useEffect(() => {
    if (!asinLoading && !skuLoading && !done) {
      runInventoryMatch();
    }
  }, [asinLoading, skuLoading]);

  const runInventoryMatch = () => {
    setMatching(true);

    const updated = orders.map(order => {
      let inventoryMatch: AsinInventoryItem | SkuInventoryItem | undefined;
      let inventoryType: 'asin' | 'sku' | undefined;
      let matchType: 'asin' | 'sku' | undefined;

      // Try ASIN match first
      if (order.asin?.trim()) {
        const match = asinInventory.find(item => item.asin.toLowerCase() === order.asin.toLowerCase().trim());
        if (match) { inventoryMatch = match; inventoryType = 'asin'; matchType = 'asin'; }
      }

      // Try SKU match in ASIN inventory
      if (!inventoryMatch && order.sku?.trim()) {
        const match = asinInventory.find(item => item.sku?.toLowerCase() === order.sku.toLowerCase().trim());
        if (match) { inventoryMatch = match; inventoryType = 'asin'; matchType = 'sku'; }
      }

      // Try SKU inventory
      if (!inventoryMatch && order.sku?.trim()) {
        const match = skuInventory.find(item => item.skuNumber.toLowerCase() === order.sku.toLowerCase().trim());
        if (match) { inventoryMatch = match; inventoryType = 'sku'; matchType = 'sku'; }
      }

      let inventoryStatus: DFOrderItem['inventoryStatus'] = 'not-tracked';
      let availableQty = 0;
      let serialNumber = '';

      if (inventoryMatch) {
        availableQty = inventoryMatch.quantity;
        serialNumber = inventoryType === 'asin'
          ? (inventoryMatch as AsinInventoryItem).serialNumber
          : (inventoryMatch as SkuInventoryItem).binSerialNumber;

        if (availableQty <= 0) {
          inventoryStatus = 'out-of-stock';
        } else if (availableQty < order.itemQuantity) {
          inventoryStatus = 'low-stock';
        } else {
          inventoryStatus = 'in-stock';
        }
      }

      return {
        ...order,
        inventoryStatus,
        availableQty,
        inventoryId: inventoryMatch?.id,
        inventoryType,
        matchType,
        serialNumber,
      };
    });

    setMatchedOrders(updated);
    setDone(true);
    setMatching(false);
  };

  const counts = {
    'all': matchedOrders.length,
    'in-stock': matchedOrders.filter(o => o.inventoryStatus === 'in-stock').length,
    'low-stock': matchedOrders.filter(o => o.inventoryStatus === 'low-stock').length,
    'out-of-stock': matchedOrders.filter(o => o.inventoryStatus === 'out-of-stock').length,
    'not-tracked': matchedOrders.filter(o => o.inventoryStatus === 'not-tracked').length,
  };

  const filtered = activeFilter === 'all' ? matchedOrders : matchedOrders.filter(o => o.inventoryStatus === activeFilter);

  const statusBadge = (status: DFOrderItem['inventoryStatus']) => {
    switch (status) {
      case 'in-stock': return <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 text-xs">In Stock</Badge>;
      case 'low-stock': return <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/20 text-xs">Low Stock</Badge>;
      case 'out-of-stock': return <Badge className="bg-red-500/10 text-red-700 border-red-500/20 text-xs">Out of Stock</Badge>;
      default: return <Badge variant="secondary" className="text-xs">Not Tracked</Badge>;
    }
  };

  if (asinLoading || skuLoading || matching) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex flex-col items-center gap-4">
            <Package className="w-8 h-8 text-primary animate-pulse" />
            <p className="text-sm text-muted-foreground">Matching against inventory...</p>
            <Progress value={matching ? 60 : 30} className="w-full max-w-xs" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Inventory Match Results</CardTitle>
          <CardDescription>
            {counts['in-stock'] + counts['low-stock']} of {matchedOrders.length} items found in inventory
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Filter Tabs */}
      <Tabs value={activeFilter} onValueChange={(v) => setActiveFilter(v as FilterTab)}>
        <TabsList>
          <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
          <TabsTrigger value="in-stock">In Stock ({counts['in-stock']})</TabsTrigger>
          <TabsTrigger value="low-stock">Low ({counts['low-stock']})</TabsTrigger>
          <TabsTrigger value="out-of-stock">Out ({counts['out-of-stock']})</TabsTrigger>
          <TabsTrigger value="not-tracked">Not Tracked ({counts['not-tracked']})</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card z-10">
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-2 font-medium">Order ID</th>
                  <th className="text-left p-2 font-medium">SKU</th>
                  <th className="text-left p-2 font-medium">ASIN</th>
                  <th className="text-left p-2 font-medium">Title</th>
                  <th className="text-center p-2 font-medium">Source</th>
                  <th className="text-center p-2 font-medium">Required</th>
                  <th className="text-center p-2 font-medium">Available</th>
                  <th className="text-center p-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((order, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-2 font-mono text-xs">{order.orderId}</td>
                    <td className="p-2 font-mono text-xs">{order.sku || '—'}</td>
                    <td className="p-2 font-mono text-xs">{order.asin || '—'}</td>
                    <td className="p-2 max-w-[160px] truncate">{order.itemTitle || '—'}</td>
                    <td className="p-2 text-center">
                      {order.sourceStatus === 'sunsky' ? (
                        <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 text-xs">Sunsky</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Other</Badge>
                      )}
                    </td>
                    <td className="p-2 text-center font-medium">{order.itemQuantity}</td>
                    <td className="p-2 text-center font-medium">{order.availableQty ?? '—'}</td>
                    <td className="p-2 text-center">{statusBadge(order.inventoryStatus)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <Button onClick={() => onComplete(matchedOrders)} className="gap-2">
          Continue to Processing <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
