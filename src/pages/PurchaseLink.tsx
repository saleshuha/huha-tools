import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { usePurchaseLink } from '@/hooks/usePurchaseLink';
import { usePurchaseAutoSave } from '@/hooks/usePurchaseAutoSave';
import { PurchaseProgressBar } from '@/components/po/PurchaseProgressBar';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Package, Search, Download, CheckCircle2, Circle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function PurchaseLink() {
  const { token } = useParams<{ token: string }>();
  const { data, loading, error, savePurchaseUpdate } = usePurchaseLink(token);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'purchased' | 'partial' | 'pending'>('all');
  const [localUpdates, setLocalUpdates] = useState<Record<string, any>>({});

  const { scheduleAutoSave } = usePurchaseAutoSave({
    onSave: async (update) => {
      if (!token) return;
      try {
        await savePurchaseUpdate(token, update);
        toast.success('Saved', { duration: 1000 });
      } catch (error) {
        toast.error('Failed to save');
      }
    }
  });

  const handleUpdateField = (orderId: string, field: string, value: any) => {
    const order = data?.poOrders.find(o => o.id === orderId);
    if (!order) return;

    const existingUpdate = data?.updates.find(u => u.po_order_id === orderId);
    
    const updatedData = {
      ...localUpdates[orderId],
      poOrderId: orderId,
      poNumber: order.po_number,
      asin: order.asin,
      skuCode: order.sku_code,
      modelNumber: order.model_number,
      title: order.title,
      [field]: value,
      ...existingUpdate
    };

    setLocalUpdates(prev => ({
      ...prev,
      [orderId]: updatedData
    }));

    scheduleAutoSave(updatedData);
  };

  const getItemStatus = (order: any, update: any) => {
    const purchased = update?.purchased_quantity || 0;
    const required = order.quantity;
    
    if (purchased === 0) return 'pending';
    if (purchased >= required) return 'purchased';
    return 'partial';
  };

  const filteredOrders = data?.poOrders.filter(order => {
    const update = data.updates.find(u => u.po_order_id === order.id);
    const status = getItemStatus(order, update);
    
    const matchesSearch = 
      order.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.asin?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.sku_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.po_number?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || status === filterStatus;
    
    return matchesSearch && matchesFilter;
  }) || [];

  const stats = {
    total: data?.poOrders.length || 0,
    purchased: data?.poOrders.filter(o => {
      const u = data?.updates.find(up => up.po_order_id === o.id);
      return (u?.purchased_quantity || 0) >= o.quantity;
    }).length || 0,
    partial: data?.poOrders.filter(o => {
      const u = data?.updates.find(up => up.po_order_id === o.id);
      const qty = u?.purchased_quantity || 0;
      return qty > 0 && qty < o.quantity;
    }).length || 0
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-surface">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-surface p-4">
        <Card className="p-8 max-w-md text-center">
          <Package className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <h2 className="text-xl font-semibold mb-2">Link Not Found</h2>
          <p className="text-muted-foreground">
            {error || 'This purchase link is invalid or has expired.'}
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-surface">
      <div className="container max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <Card className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold mb-2">
                {data.link.title || 'Purchase Tracking'}
              </h1>
              {data.link.description && (
                <p className="text-muted-foreground">{data.link.description}</p>
              )}
            </div>
            {data.link.expires_at && (
              <Badge variant="outline">
                Expires {format(new Date(data.link.expires_at), 'MMM d, yyyy')}
              </Badge>
            )}
          </div>
          
          <PurchaseProgressBar
            totalItems={stats.total}
            purchasedItems={stats.purchased}
            partialItems={stats.partial}
          />
        </Card>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title, ASIN, SKU, or PO..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterStatus === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('all')}
              >
                All ({stats.total})
              </Button>
              <Button
                variant={filterStatus === 'purchased' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('purchased')}
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Complete ({stats.purchased})
              </Button>
              <Button
                variant={filterStatus === 'partial' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('partial')}
              >
                <AlertCircle className="h-4 w-4 mr-1" />
                Partial ({stats.partial})
              </Button>
              <Button
                variant={filterStatus === 'pending' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('pending')}
              >
                <Circle className="h-4 w-4 mr-1" />
                Pending ({stats.total - stats.purchased - stats.partial})
              </Button>
            </div>
          </div>
        </Card>

        {/* Items List */}
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const update = data.updates.find(u => u.po_order_id === order.id);
            const localUpdate = localUpdates[order.id];
            const status = getItemStatus(order, update);
            
            return (
              <Card key={order.id} className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  {/* Item Info */}
                  <div className="md:col-span-4 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {order.po_number}
                      </Badge>
                      {status === 'purchased' && (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      )}
                      {status === 'partial' && (
                        <AlertCircle className="h-4 w-4 text-yellow-500" />
                      )}
                    </div>
                    <p className="font-medium text-sm">{order.title}</p>
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      {order.asin && <span>ASIN: {order.asin}</span>}
                      {order.sku_code && <span>SKU: {order.sku_code}</span>}
                    </div>
                    <p className="text-sm">
                      Required: <span className="font-semibold">{order.quantity}</span>
                    </p>
                  </div>

                  {/* Purchase Inputs */}
                  <div className="md:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Purchased Qty</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={localUpdate?.purchasedQuantity ?? update?.purchased_quantity ?? ''}
                        onChange={(e) => handleUpdateField(order.id, 'purchasedQuantity', parseInt(e.target.value) || 0)}
                        className="h-9"
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <Label className="text-xs">Supplier Name</Label>
                      <Input
                        placeholder="Supplier..."
                        value={localUpdate?.supplierName ?? update?.supplier_name ?? ''}
                        onChange={(e) => handleUpdateField(order.id, 'supplierName', e.target.value)}
                        className="h-9"
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <Label className="text-xs">Supplier Order #</Label>
                      <Input
                        placeholder="Order number..."
                        value={localUpdate?.supplierOrderNumber ?? update?.supplier_order_number ?? ''}
                        onChange={(e) => handleUpdateField(order.id, 'supplierOrderNumber', e.target.value)}
                        className="h-9"
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <Label className="text-xs">Unit Cost</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={localUpdate?.unitCost ?? update?.unit_cost ?? ''}
                        onChange={(e) => handleUpdateField(order.id, 'unitCost', parseFloat(e.target.value) || 0)}
                        className="h-9"
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <Label className="text-xs">Est. Delivery</Label>
                      <Input
                        type="date"
                        value={localUpdate?.estimatedDelivery ?? update?.estimated_delivery ?? ''}
                        onChange={(e) => handleUpdateField(order.id, 'estimatedDelivery', e.target.value)}
                        className="h-9"
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <Label className="text-xs">Notes</Label>
                      <Input
                        placeholder="Add notes..."
                        value={localUpdate?.notes ?? update?.notes ?? ''}
                        onChange={(e) => handleUpdateField(order.id, 'notes', e.target.value)}
                        className="h-9"
                      />
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {filteredOrders.length === 0 && (
          <Card className="p-12 text-center">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No items match your filters</p>
          </Card>
        )}
      </div>
    </div>
  );
}
