import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { usePurchaseLink } from '@/hooks/usePurchaseLink';
import { useProductBarcodes } from '@/hooks/useProductBarcodes';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Loader2, Package, Search, CheckCircle2, Circle, AlertCircle, Image, XCircle, Check, ArrowUp, ArrowDown, ScanLine, RotateCcw } from 'lucide-react';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { BarcodeScannerDialog } from '@/components/barcode/BarcodeScannerDialog';
import { LinkedBarcodesBadge } from '@/components/barcode/LinkedBarcodesBadge';
import { VendorInfoForm, getStoredVendorInfo } from '@/components/purchase-link/VendorInfoForm';
import { SupplierDetailsForm, SupplierDetails } from '@/components/purchase-link/SupplierDetailsForm';
import { BulkActionsBar } from '@/components/purchase-link/BulkActionsBar';
import { ExportButton } from '@/components/purchase-link/ExportButton';
import { PurchaseSummaryHeader } from '@/components/purchase-link/PurchaseSummaryHeader';

export default function PurchaseLink() {
  const { token } = useParams<{ token: string }>();
  const { data: hookData, loading, error, savePurchaseUpdate, fetchLinkData } = usePurchaseLink(token);
  const { linkBarcode, loading: barcodeLoading } = useProductBarcodes();
  const [data, setData] = useState(hookData);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'purchased' | 'partial' | 'pending' | 'not_available'>('pending');
  const [sortBy, setSortBy] = useState<'qty-high-low' | 'qty-low-high' | null>(null);
  const [localUpdates, setLocalUpdates] = useState<Record<string, any>>({});
  const [supplierDetails, setSupplierDetails] = useState<Record<string, SupplierDetails>>({});
  const [savingItems, setSavingItems] = useState<Set<string>>(new Set());
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const cardRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  
  // Barcode scanning state
  const [scanDialogOpen, setScanDialogOpen] = useState(false);
  const [scanningOrderId, setScanningOrderId] = useState<string | null>(null);

  // Sync hook data with local state
  useEffect(() => {
    if (hookData) {
      setData(hookData);
    }
  }, [hookData]);

  const getVendorInfo = () => {
    if (!token) return null;
    return getStoredVendorInfo(token);
  };

  const handleSaveItem = async (orderId: string) => {
    const order = data?.poOrders.find(o => o.id === orderId);
    if (!order || !token || !data) return;

    const existingUpdate = data.updates.find(u => u.po_order_id === orderId);
    const localUpdate = localUpdates[orderId];
    const itemSupplierDetails = supplierDetails[orderId];
    const vendorInfo = getVendorInfo();
    
    if (!localUpdate && !itemSupplierDetails) {
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
        purchasedQuantity: localUpdate?.purchasedQuantity ?? existingUpdate?.purchased_quantity ?? 0,
        vendorName: vendorInfo?.name,
        vendorEmail: vendorInfo?.email,
        supplierName: itemSupplierDetails?.supplierName,
        supplierOrderNumber: itemSupplierDetails?.supplierOrderNumber,
        estimatedDeliveryDate: itemSupplierDetails?.estimatedDeliveryDate,
        unitCost: itemSupplierDetails?.unitCost,
        totalCost: itemSupplierDetails?.totalCost,
        notes: itemSupplierDetails?.notes,
        ...existingUpdate
      };

      await savePurchaseUpdate(token, updatedData);
      
      // Update local state
      setData(prevData => {
        if (!prevData) return prevData;
        
        const updatedUpdates = [...prevData.updates];
        const existingIndex = updatedUpdates.findIndex(u => u.po_order_id === orderId);
        
        if (existingIndex >= 0) {
          updatedUpdates[existingIndex] = {
            ...updatedUpdates[existingIndex],
            purchased_quantity: localUpdate?.purchasedQuantity ?? updatedUpdates[existingIndex].purchased_quantity
          };
        } else {
          updatedUpdates.push({
            po_order_id: orderId,
            purchased_quantity: localUpdate?.purchasedQuantity ?? 0,
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
    const vendorInfo = getVendorInfo();
    
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
        vendorName: vendorInfo?.name,
        vendorEmail: vendorInfo?.email,
        ...existingUpdate
      };

      await savePurchaseUpdate(token, updatedData);
      
      // Update local state
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

  const handleUndoNotAvailable = async (orderId: string) => {
    const order = data?.poOrders.find(o => o.id === orderId);
    if (!order || !token || !data) return;

    const existingUpdate = data.updates.find(u => u.po_order_id === orderId);
    const vendorInfo = getVendorInfo();
    
    setSavingItems(prev => new Set(prev).add(orderId));

    try {
      const updatedData = {
        poOrderId: orderId,
        poNumber: order.po_number,
        asin: order.asin,
        skuCode: order.sku_code,
        modelNumber: order.model_number,
        title: order.title,
        metadata: { not_available: false },
        purchasedQuantity: 0,
        vendorName: vendorInfo?.name,
        vendorEmail: vendorInfo?.email,
        ...existingUpdate
      };

      await savePurchaseUpdate(token, updatedData);
      
      // Update local state
      setData(prevData => {
        if (!prevData) return prevData;
        
        const updatedUpdates = [...prevData.updates];
        const existingIndex = updatedUpdates.findIndex(u => u.po_order_id === orderId);
        
        if (existingIndex >= 0) {
          updatedUpdates[existingIndex] = {
            ...updatedUpdates[existingIndex],
            metadata: { not_available: false },
            purchased_quantity: 0
          };
        }
        
        return {
          ...prevData,
          updates: updatedUpdates
        };
      });
      
      toast.success('Status reset to pending');
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

  const handleInputFocus = (orderId: string) => {
    setTimeout(() => {
      const cardElement = cardRefs.current[orderId];
      if (cardElement) {
        cardElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest'
        });
      }
    }, 300);
  };

  // Handle opening barcode scanner for a specific order
  const handleOpenBarcodeScanner = useCallback((orderId: string) => {
    setScanningOrderId(orderId);
    setScanDialogOpen(true);
  }, []);

  // Handle barcode scanned
  const handleBarcodeScanned = useCallback(async (barcode: string, format: string) => {
    if (!scanningOrderId || !data) return;
    
    const order = data.poOrders.find(o => o.id === scanningOrderId);
    if (!order) return;
    
    await linkBarcode({
      barcode,
      barcodeType: format,
      asin: order.asin || undefined,
      skuCode: order.sku_code || undefined,
      modelNumber: order.model_number || undefined,
      title: order.title || undefined,
      poOrderId: order.id,
      userId: data.link.user_id,
    });
    
    setScanDialogOpen(false);
    setScanningOrderId(null);
  }, [scanningOrderId, data, linkBarcode]);

  // Get current scanning order info for dialog
  const scanningOrder = scanningOrderId ? data?.poOrders.find(o => o.id === scanningOrderId) : null;

  // Selection handlers
  const handleSelectItem = (orderId: string, checked: boolean) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(orderId);
      } else {
        newSet.delete(orderId);
      }
      return newSet;
    });
  };

  const handleBulkMarkPurchased = async (quantity: number) => {
    if (!token || !data) return;
    const vendorInfo = getVendorInfo();
    
    const promises = Array.from(selectedItems).map(async orderId => {
      const order = data.poOrders.find(o => o.id === orderId);
      if (!order) return;
      
      const updatedData = {
        poOrderId: orderId,
        poNumber: order.po_number,
        asin: order.asin,
        skuCode: order.sku_code,
        modelNumber: order.model_number,
        title: order.title,
        purchasedQuantity: quantity,
        vendorName: vendorInfo?.name,
        vendorEmail: vendorInfo?.email,
      };
      
      return savePurchaseUpdate(token, updatedData);
    });
    
    await Promise.all(promises);
    setSelectedItems(new Set());
    if (token) await fetchLinkData(token);
    toast.success(`${selectedItems.size} items marked as purchased`);
  };

  const handleBulkMarkNotAvailable = async () => {
    if (!token || !data) return;
    const vendorInfo = getVendorInfo();
    
    const promises = Array.from(selectedItems).map(async orderId => {
      const order = data.poOrders.find(o => o.id === orderId);
      if (!order) return;
      
      const updatedData = {
        poOrderId: orderId,
        poNumber: order.po_number,
        asin: order.asin,
        skuCode: order.sku_code,
        modelNumber: order.model_number,
        title: order.title,
        metadata: { not_available: true },
        vendorName: vendorInfo?.name,
        vendorEmail: vendorInfo?.email,
      };
      
      return savePurchaseUpdate(token, updatedData);
    });
    
    await Promise.all(promises);
    setSelectedItems(new Set());
    if (token) await fetchLinkData(token);
    toast.success(`${selectedItems.size} items marked as not available`);
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
    
    const relatedOrders = data.poOrders.filter(o => 
      (order.asin && o.asin === order.asin) || 
      (order.sku_code && o.sku_code === order.sku_code)
    );
    
    if (relatedOrders.length > 1) {
      const totalQty = relatedOrders.reduce((sum, o) => sum + o.quantity, 0);
      return {
        total: totalQty,
        count: relatedOrders.length,
        poNumbers: relatedOrders.map(o => o.po_number)
      };
    }
    
    return null;
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
    }).length || 0,
    pending: 0
  };
  stats.pending = stats.total - stats.purchased - stats.partial - stats.notAvailable;

  // Calculate selected items total required qty
  const selectedTotalRequired = Array.from(selectedItems).reduce((sum, id) => {
    const order = data?.poOrders.find(o => o.id === id);
    return sum + (order?.quantity || 0);
  }, 0);

  // Prepare export data
  const exportData = data?.poOrders.map(order => {
    const update = data.updates.find(u => u.po_order_id === order.id);
    const status = getItemStatus(order, update);
    const details = supplierDetails[order.id] || {};
    
    return {
      poNumber: order.po_number,
      asin: order.asin,
      skuCode: order.sku_code,
      title: order.title,
      requiredQty: order.quantity,
      purchasedQty: update?.purchased_quantity || 0,
      status,
      supplierName: details.supplierName,
      supplierOrderNumber: details.supplierOrderNumber,
      notes: details.notes,
    };
  }) || [];

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
      <div className="container max-w-7xl mx-auto p-4 md:p-6 space-y-4 pb-[300px] md:pb-6">
        {/* Enhanced Summary Header */}
        <PurchaseSummaryHeader
          title={data.link.title}
          description={data.link.description}
          expiresAt={data.link.expires_at}
          stats={stats}
          lastUpdated={data.updates[0]?.updated_at}
        />

        {/* Vendor Info Form */}
        {token && <VendorInfoForm linkToken={token} />}

        {/* Filters and Export */}
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
            <ExportButton data={exportData} linkTitle={data.link.title} />
          </div>
          
          <div className="flex gap-2 flex-wrap mt-4">
            <Button
              variant={filterStatus === 'pending' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('pending')}
            >
              <Circle className="h-4 w-4 mr-1" />
              Pending ({stats.pending})
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
            const isSelected = selectedItems.has(order.id);
            
            return (
              <Card 
                key={order.id} 
                className={`p-4 transition-all ${isSelected ? 'ring-2 ring-primary' : ''}`}
                ref={(el) => cardRefs.current[order.id] = el}
              >
                <div className="flex flex-col gap-4">
                  {/* Top section */}
                  <div className="flex gap-4 items-start">
                    {/* Checkbox for bulk selection */}
                    <div className="flex items-center pt-1">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => handleSelectItem(order.id, !!checked)}
                        disabled={status === 'purchased' || status === 'not_available'}
                      />
                    </div>
                    
                    {/* Product Image */}
                    <Dialog>
                      <DialogTrigger asChild>
                        <div className="flex-shrink-0 w-16 h-16 rounded-md overflow-hidden bg-muted flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity">
                          {order.product_image?.image_url ? (
                            <img 
                              src={order.product_image.image_url} 
                              alt={order.title || 'Product'}
                              className="w-full h-full object-contain p-1"
                            />
                          ) : (
                            <Image className="h-6 w-6 text-muted-foreground" />
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
                    <div className="flex-1 space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
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
                      <p className="font-medium text-sm truncate">{order.title}</p>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {order.asin && <span>ASIN: {order.asin}</span>}
                        {order.sku_code && <span>SKU: {order.sku_code}</span>}
                        <LinkedBarcodesBadge 
                          asin={order.asin} 
                          skuCode={order.sku_code}
                          poOrderId={order.id}
                        />
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

                    {/* Purchase Actions */}
                    <div className="flex flex-col gap-2 w-full md:w-auto">
                      {status !== 'not_available' ? (
                        <>
                          <div className="flex gap-2 md:items-end">
                            <div className="space-y-1 flex-1 md:flex-initial md:w-28">
                              <Label className="text-xs">Purchased Qty</Label>
                              <Input
                                type="number"
                                placeholder="0"
                                value={localUpdate?.purchasedQuantity ?? update?.purchased_quantity ?? ''}
                                onChange={(e) => handleUpdateField(order.id, 'purchasedQuantity', parseInt(e.target.value) || 0)}
                                onFocus={() => handleInputFocus(order.id)}
                                className="h-9 text-[16px]"
                                disabled={savingItems.has(order.id)}
                              />
                            </div>
                            
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleSaveItem(order.id)}
                              disabled={(!localUpdate?.purchasedQuantity && !supplierDetails[order.id]) || savingItems.has(order.id)}
                              className="h-9 w-9 p-0 self-end"
                              title="Save"
                            >
                              {savingItems.has(order.id) ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                            </Button>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleMarkNotAvailable(order.id)}
                              disabled={savingItems.has(order.id)}
                              className="h-9 px-3 self-end"
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              <span className="hidden sm:inline">N/A</span>
                            </Button>
                          </div>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenBarcodeScanner(order.id)}
                            className="h-8 w-full md:w-auto"
                          >
                            <ScanLine className="h-4 w-4 mr-2" />
                            Scan Barcode
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUndoNotAvailable(order.id)}
                          disabled={savingItems.has(order.id)}
                          className="h-9"
                        >
                          {savingItems.has(order.id) ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <RotateCcw className="h-4 w-4 mr-2" />
                          )}
                          Undo Not Available
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Supplier Details Form */}
                  {status !== 'not_available' && (
                    <SupplierDetailsForm
                      details={supplierDetails[order.id] || {}}
                      onChange={(details) => setSupplierDetails(prev => ({ ...prev, [order.id]: details }))}
                      disabled={savingItems.has(order.id)}
                    />
                  )}
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

      {/* Bulk Actions Bar */}
      <BulkActionsBar
        selectedCount={selectedItems.size}
        totalRequired={selectedTotalRequired}
        onMarkAllPurchased={handleBulkMarkPurchased}
        onMarkNotAvailable={handleBulkMarkNotAvailable}
        onClearSelection={() => setSelectedItems(new Set())}
      />
      
      {/* Barcode Scanner Dialog */}
      <BarcodeScannerDialog
        open={scanDialogOpen}
        onOpenChange={setScanDialogOpen}
        onBarcodeScanned={handleBarcodeScanned}
        title="Link Barcode to Product"
        productInfo={scanningOrder ? {
          title: scanningOrder.title || undefined,
          asin: scanningOrder.asin || undefined,
          sku: scanningOrder.sku_code || undefined,
        } : undefined}
        isLinking={barcodeLoading}
      />
    </div>
  );
}
