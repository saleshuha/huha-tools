import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { usePurchaseLink } from '@/hooks/usePurchaseLink';
import { PurchaseProgressBar } from '@/components/po/PurchaseProgressBar';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Package, Search, CheckCircle2, Circle, AlertCircle, Image, XCircle, Check, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { format } from 'date-fns';

export default function PurchaseLink() {
  const { token } = useParams<{ token: string }>();
  const { data: hookData, loading, error, savePurchaseUpdate, fetchLinkData } = usePurchaseLink(token);
  const [data, setData] = useState(hookData);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'purchased' | 'partial' | 'pending' | 'not_available'>('pending');
  const [sortBy, setSortBy] = useState<'qty-high-low' | 'qty-low-high' | null>(null);
  const [localUpdates, setLocalUpdates] = useState<Record<string, any>>({});
  const [savingItems, setSavingItems] = useState<Set<string>>(new Set());

  // Sync hook data with local state
  useEffect(() => {
    if (hookData) {
      setData(hookData);
    }
  }, [hookData]);

  const handleSaveItem = async (orderId: string) => {
    const order = data?.poOrders.find(o => o.id === orderId);
    if (!order || !token || !data) return;

    const existingUpdate = data.updates.find(u => u.po_order_id === orderId);
    const localUpdate = localUpdates[orderId];
    
    if (!localUpdate) {
      toast.info('No changes to save');
      return;
    }

    setSavingItems(prev => new Set(prev).add(orderId));

    try {
      const updatedData = {
        poOrderId: orderId,
        poNumber: order.po_number,
        asin: order.asin,
        skuCode: order.sku_code,
        modelNumber: order.model_number,
        title: order.title,
        purchasedQuantity: localUpdate.purchasedQuantity ?? existingUpdate?.purchased_quantity ?? 0,
        ...existingUpdate
      };

      const result = await savePurchaseUpdate(token, updatedData);
      
      // Update local state instead of refetching
      setData(prevData => {
        if (!prevData) return prevData;
        
        const updatedUpdates = [...prevData.updates];
        const existingIndex = updatedUpdates.findIndex(u => u.po_order_id === orderId);
        
        if (existingIndex >= 0) {
          updatedUpdates[existingIndex] = {
            ...updatedUpdates[existingIndex],
            purchased_quantity: localUpdate.purchasedQuantity
          };
        } else {
          updatedUpdates.push({
            po_order_id: orderId,
            purchased_quantity: localUpdate.purchasedQuantity,
            link_id: prevData.link.id,
            metadata: {}
          } as any);
        }
        
        return {
          ...prevData,
          updates: updatedUpdates
        };
      });
      
      setLocalUpdates(prev => {
        const newUpdates = { ...prev };
        delete newUpdates[orderId];
        return newUpdates;
      });
      
      toast.success('Saved successfully', { duration: 1500 });
    } catch (error) {
      toast.error('Failed to save');
      console.error('Save error:', error);
    } finally {
      setSavingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(orderId);
        return newSet;
      });
    }
  };

  const handleUpdateField = (orderId: string, field: string, value: any) => {
    setLocalUpdates(prev => ({
      ...prev,
      [orderId]: {
        ...prev[orderId],
        [field]: value
      }
    }));
  };

  const handleMarkNotAvailable = async (orderId: string) => {
    const order = data?.poOrders.find(o => o.id === orderId);
    if (!order || !token || !data) return;

    const existingUpdate = data.updates.find(u => u.po_order_id === orderId);
    
    setSavingItems(prev => new Set(prev).add(orderId));

    try {
      const updatedData = {
        poOrderId: orderId,
        poNumber: order.po_number,
        asin: order.asin,
        skuCode: order.sku_code,
        modelNumber: order.model_number,
        title: order.title,
        metadata: { not_available: true },
        ...existingUpdate
      };

      await savePurchaseUpdate(token, updatedData);
      
      // Update local state instead of refetching
      setData(prevData => {
        if (!prevData) return prevData;
        
        const updatedUpdates = [...prevData.updates];
        const existingIndex = updatedUpdates.findIndex(u => u.po_order_id === orderId);
        
        if (existingIndex >= 0) {
          updatedUpdates[existingIndex] = {
            ...updatedUpdates[existingIndex],
            metadata: { not_available: true }
          };
        } else {
          updatedUpdates.push({
            po_order_id: orderId,
            link_id: prevData.link.id,
            metadata: { not_available: true }
          } as any);
        }
        
        return {
          ...prevData,
          updates: updatedUpdates
        };
      });
      
      setLocalUpdates(prev => {
        const newUpdates = { ...prev };
        delete newUpdates[orderId];
        return newUpdates;
      });
      
      toast.success('Marked as not available');
    } catch (error) {
      toast.error('Failed to update');
    } finally {
      setSavingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(orderId);
        return newSet;
      });
    }
  };

  // Subscribe to realtime updates
  useEffect(() => {
    if (!token || !data?.link?.id) return;

    const channel = supabase
      .channel('purchase-updates-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'purchase_updates',
          filter: `link_id=eq.${data.link.id}`
        },
        (payload) => {
          console.log('Realtime update received:', payload);
          
          // Update local state instead of full refetch
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const newRecord = payload.new as any;
            
            setData(prevData => {
              if (!prevData) return prevData;
              
              const updatedUpdates = [...prevData.updates];
              const existingIndex = updatedUpdates.findIndex(u => u.po_order_id === newRecord.po_order_id);
              
              if (existingIndex >= 0) {
                updatedUpdates[existingIndex] = newRecord;
              } else {
                updatedUpdates.push(newRecord);
              }
              
              return {
                ...prevData,
                updates: updatedUpdates
              };
            });
            
            toast.info('Item updated', { duration: 1500 });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [token, data?.link?.id]);

  const getItemStatus = (order: any, update: any) => {
    // Check if marked as not available
    if (update?.metadata?.not_available) return 'not_available';
    
    const purchased = update?.purchased_quantity || 0;
    const required = order.quantity;
    
    if (purchased === 0) return 'pending';
    if (purchased >= required) return 'purchased';
    return 'partial';
  };

  // Calculate consolidated quantities for items across multiple POs
  const getConsolidatedQuantity = (order: any) => {
    if (!data?.poOrders) return null;
    
    // Find all orders with the same ASIN or SKU
    const relatedOrders = data.poOrders.filter(o => 
      (order.asin && o.asin === order.asin) || 
      (order.sku_code && o.sku_code === order.sku_code)
    );
    
    // If multiple orders exist, return total quantity
    if (relatedOrders.length > 1) {
      const totalQty = relatedOrders.reduce((sum, o) => sum + o.quantity, 0);
      return {
        total: totalQty,
        count: relatedOrders.length,
        poNumbers: relatedOrders.map(o => o.po_number)
      };
    }
    
    return null; // No consolidation needed
  };

  const filteredOrders = (() => {
    let orders = data?.poOrders.filter(order => {
      const update = data.updates.find(u => u.po_order_id === order.id);
      const status = getItemStatus(order, update);
      
      const matchesSearch = 
        order.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.asin?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.sku_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.po_number?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesFilter = status === filterStatus;
      
      return matchesSearch && matchesFilter;
    }) || [];

    // Apply sorting
    if (sortBy === 'qty-high-low') {
      orders = [...orders].sort((a, b) => b.quantity - a.quantity);
    } else if (sortBy === 'qty-low-high') {
      orders = [...orders].sort((a, b) => a.quantity - b.quantity);
    }

    return orders;
  })();

  const stats = {
    total: data?.poOrders.length || 0,
    purchased: data?.poOrders.filter(o => {
      const u = data?.updates.find(up => up.po_order_id === o.id);
      return !u?.metadata?.not_available && (u?.purchased_quantity || 0) >= o.quantity;
    }).length || 0,
    partial: data?.poOrders.filter(o => {
      const u = data?.updates.find(up => up.po_order_id === o.id);
      const qty = u?.purchased_quantity || 0;
      return !u?.metadata?.not_available && qty > 0 && qty < o.quantity;
    }).length || 0,
    notAvailable: data?.poOrders.filter(o => {
      const u = data?.updates.find(up => up.po_order_id === o.id);
      return u?.metadata?.not_available === true;
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
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={filterStatus === 'pending' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('pending')}
              >
                <Circle className="h-4 w-4 mr-1" />
                Pending ({stats.total - stats.purchased - stats.partial - stats.notAvailable})
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
                variant={filterStatus === 'purchased' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('purchased')}
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Complete ({stats.purchased})
              </Button>
              <Button
                variant={filterStatus === 'not_available' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('not_available')}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Not Available ({stats.notAvailable})
              </Button>
            </div>
          </div>
          
          {/* Sort Options */}
          <div className="flex items-center gap-2 mt-4 pt-4 border-t">
            <span className="text-sm text-muted-foreground">Sort by Qty:</span>
            <div className="flex gap-2">
              <Button
                variant={sortBy === 'qty-high-low' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy(sortBy === 'qty-high-low' ? null : 'qty-high-low')}
              >
                <ArrowDown className="h-4 w-4 mr-1" />
                High to Low
              </Button>
              <Button
                variant={sortBy === 'qty-low-high' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy(sortBy === 'qty-low-high' ? null : 'qty-low-high')}
              >
                <ArrowUp className="h-4 w-4 mr-1" />
                Low to High
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
                <div className="flex flex-col md:flex-row gap-4 md:items-start">
                  {/* Top section on mobile: Image + Info */}
                  <div className="flex gap-4 items-start flex-1">
                    {/* Product Image */}
                    <Dialog>
                      <DialogTrigger asChild>
                        <div className="flex-shrink-0 w-20 h-20 rounded-md overflow-hidden bg-muted flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity">
                          {order.product_image?.image_url ? (
                            <img 
                              src={order.product_image.image_url} 
                              alt={order.title || 'Product'}
                              className="w-full h-full object-contain p-1"
                            />
                          ) : (
                            <Image className="h-8 w-8 text-muted-foreground" />
                          )}
                        </div>
                      </DialogTrigger>
                      {order.product_image?.image_url && (
                        <DialogContent className="max-w-3xl">
                          <img 
                            src={order.product_image.image_url} 
                            alt={order.title || 'Product'}
                            className="w-full h-auto"
                          />
                        </DialogContent>
                      )}
                    </Dialog>

                    {/* Item Info */}
                    <div className="flex-1 space-y-1">
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
                        {status === 'not_available' && (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                      <p className="font-medium text-sm">{order.title}</p>
                      <div className="flex gap-2 text-xs text-muted-foreground">
                        {order.asin && <span>ASIN: {order.asin}</span>}
                        {order.sku_code && <span>SKU: {order.sku_code}</span>}
                      </div>
                      {(() => {
                        const consolidated = getConsolidatedQuantity(order);
                        if (consolidated) {
                          return (
                            <div className="space-y-0.5">
                              <p className="text-sm">
                                Required: <span className="font-semibold">{consolidated.total}</span>
                              </p>
                              <p className="text-xs text-muted-foreground">
                                From POs: {consolidated.poNumbers.join(', ')}
                              </p>
                            </div>
                          );
                        }
                        return (
                          <p className="text-sm">
                            Required: <span className="font-semibold">{order.quantity}</span>
                          </p>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Purchase Actions - improved mobile layout */}
                  <div className="flex gap-2 w-full md:w-auto md:items-end">
                    <div className="space-y-1 flex-1 md:flex-initial md:w-32">
                      <Label className="text-xs">Purchased Qty</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={localUpdate?.purchasedQuantity ?? update?.purchased_quantity ?? ''}
                        onChange={(e) => handleUpdateField(order.id, 'purchasedQuantity', parseInt(e.target.value) || 0)}
                        className="h-9"
                        disabled={status === 'not_available' || savingItems.has(order.id)}
                      />
                    </div>
                    
                    {/* Save tick button - icon only, fixed width */}
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleSaveItem(order.id)}
                      disabled={!localUpdate?.purchasedQuantity || savingItems.has(order.id)}
                      className="h-9 w-9 p-0 self-end"
                      title="Save"
                    >
                      {savingItems.has(order.id) ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                    </Button>
                    
                    {/* Not Available button */}
                    <Button
                      variant={status === 'not_available' ? 'destructive' : 'outline'}
                      size="sm"
                      onClick={() => handleMarkNotAvailable(order.id)}
                      disabled={savingItems.has(order.id)}
                      className="h-9 px-3 self-end"
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      <span className="hidden sm:inline">Not Available</span>
                    </Button>
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
