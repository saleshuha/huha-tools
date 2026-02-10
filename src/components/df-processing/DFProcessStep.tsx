import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import { DFOrderItem } from './types';
import { DFProcessConfirmDialog } from './DFProcessConfirmDialog';
import { useAsinInventory } from '@/hooks/useAsinInventory';
import { useSkuInventory } from '@/hooks/useSkuInventory';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DFProcessStepProps {
  orders: DFOrderItem[];
  onBack: () => void;
  onProcessed: (count: number) => void;
}

export function DFProcessStep({ orders, onBack, onProcessed }: DFProcessStepProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processedIds, setProcessedIds] = useState<Set<string>>(new Set());
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmItems, setConfirmItems] = useState<DFOrderItem[]>([]);
  

  const { updateQuantity: updateAsinQuantity } = useAsinInventory();
  const { updateQuantity: updateSkuQuantity } = useSkuInventory();
  const { toast } = useToast();

  // Only show items with inventory (in-stock or low-stock)
  const processableOrders = orders.filter(
    o => (o.inventoryStatus === 'in-stock' || o.inventoryStatus === 'low-stock') && !processedIds.has(o.orderId)
  );


  const toggleSelect = (orderId: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === processableOrders.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(processableOrders.map(o => o.orderId)));
    }
  };

  const handleProcessSingle = (order: DFOrderItem) => {
    setConfirmItems([order]);
    setShowConfirm(true);
  };

  const handleProcessBulk = () => {
    const items = processableOrders.filter(o => selected.has(o.orderId));
    if (items.length === 0) return;
    setConfirmItems(items);
    setShowConfirm(true);
  };

  const executeProcessing = async () => {
    setShowConfirm(false);
    setProcessing(true);
    setProgress(0);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      for (let i = 0; i < confirmItems.length; i++) {
        const order = confirmItems[i];
        setProgress(Math.floor(((i + 1) / confirmItems.length) * 100));

        const previousQty = order.availableQty || 0;
        const newQty = Math.max(0, previousQty - order.itemQuantity);

        // Deduct stock
        if (order.inventoryType === 'asin' && order.inventoryId) {
          await updateAsinQuantity(order.inventoryId, newQty, `Order deduction: ${order.orderId}`);
        } else if (order.inventoryType === 'sku' && order.inventoryId) {
          await updateSkuQuantity(order.inventoryId, newQty, `Order deduction: ${order.orderId}`);
        }

        // Record in processed_orders
        const { error: insertError } = await supabase.from('processed_orders').insert({
          user_id: user.id,
          order_number: order.orderId,
          asin: order.asin,
          sku: order.sku,
          item_title: order.itemTitle,
          inventory_type: order.inventoryType || 'unknown',
          match_type: order.matchType || 'unknown',
          quantity_processed: order.itemQuantity,
          previous_stock: previousQty,
          new_stock: newQty,
          inventory_id: order.inventoryId,
          source_file: order.sourceFile,
          processed_at: new Date().toISOString(),
        });
        if (insertError) {
          console.error('Failed to record processed order:', insertError);
        }

        // Mark order_imports as processed
        await supabase
          .from('order_imports')
          .update({ is_processed: true, processed_at: new Date().toISOString() })
          .eq('order_id', order.orderId);

        setProcessedIds(prev => new Set([...prev, order.orderId]));
      }

      setSelected(new Set());
      onProcessed(confirmItems.length);

      toast({
        title: 'Processing Complete',
        description: `Deducted stock for ${confirmItems.length} orders.`,
      });
    } catch (error: any) {
      console.error('Processing error:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setProcessing(false);
      setTimeout(() => setProgress(0), 1500);
    }
  };

  return (
    <div className="space-y-4">
      {/* Bulk actions */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Process Orders</CardTitle>
              <CardDescription>
                {processableOrders.length} orders ready for processing
                {processedIds.size > 0 && ` · ${processedIds.size} already processed`}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {selected.size > 0 && (
                <Button onClick={handleProcessBulk} disabled={processing} size="sm" className="gap-2">
                  {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Process Selected ({selected.size})
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        {processing && (
          <CardContent className="pt-0">
            <Progress value={progress} />
          </CardContent>
        )}
      </Card>

      {/* Orders table */}
      {processableOrders.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card z-10">
                  <tr className="border-b bg-muted/50">
                    <th className="p-2 w-10">
                      <Checkbox
                        checked={selected.size === processableOrders.length && processableOrders.length > 0}
                        onCheckedChange={toggleAll}
                      />
                    </th>
                    <th className="text-left p-2 font-medium">Order ID</th>
                    <th className="text-left p-2 font-medium">SKU / ASIN</th>
                    <th className="text-left p-2 font-medium">Title</th>
                    <th className="text-center p-2 font-medium">Qty</th>
                    <th className="text-center p-2 font-medium">Stock</th>
                    <th className="text-center p-2 font-medium">After</th>
                    <th className="text-center p-2 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {processableOrders.map((order, i) => {
                    const afterQty = Math.max(0, (order.availableQty || 0) - order.itemQuantity);
                    return (
                      <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="p-2">
                          <Checkbox
                            checked={selected.has(order.orderId)}
                            onCheckedChange={() => toggleSelect(order.orderId)}
                          />
                        </td>
                        <td className="p-2 font-mono text-xs">{order.orderId}</td>
                        <td className="p-2 font-mono text-xs">
                          {order.sku || order.asin || '—'}
                        </td>
                        <td className="p-2 max-w-[160px] truncate">{order.itemTitle || '—'}</td>
                        <td className="p-2 text-center">{order.itemQuantity}</td>
                        <td className="p-2 text-center font-medium">{order.availableQty}</td>
                        <td className="p-2 text-center">
                          <span className={afterQty === 0 ? 'text-red-600 font-medium' : 'text-muted-foreground'}>
                            {afterQty}
                          </span>
                        </td>
                        <td className="p-2 text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleProcessSingle(order)}
                            disabled={processing}
                            className="h-7 text-xs"
                          >
                            Process
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {processedIds.size > 0
              ? 'All processable orders have been completed!'
              : 'No orders with available inventory to process.'}
          </CardContent>
        </Card>
      )}


      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
      </div>

      <DFProcessConfirmDialog
        open={showConfirm}
        onOpenChange={setShowConfirm}
        items={confirmItems}
        onConfirm={executeProcessing}
      />
    </div>
  );
}
