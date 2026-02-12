import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
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

interface GroupedOrder {
  key: string;
  orders: any[];
  totalRequired: number;
  totalPurchased: number;
  image: any;
  title: string;
  asin: string | null;
  skuCode: string | null;
  modelNumber: string | null;
  poNumbers: string[];
  orderIds: string[];
}

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
  const [scanningGroupKey, setScanningGroupKey] = useState<string | null>(null);

  // Sync hook data with local state
  useEffect(() => {
    if (hookData) {
      setData(hookData);
    }
  }, [hookData]);

  // Group orders by ASIN (fall back to SKU, then order ID)
  const groupedOrders = useMemo((): GroupedOrder[] => {
    if (!data?.poOrders || !data?.updates) return [];
    
    const groups: Record<string, GroupedOrder> = {};
    
    for (const order of data.poOrders) {
      const key = order.asin || order.sku_code || order.id;
      
      if (!groups[key]) {
        groups[key] = {
          key,
          orders: [],
          totalRequired: 0,
          totalPurchased: 0,
          image: order.product_image,
          title: order.title || '',
          asin: order.asin,
          skuCode: order.sku_code,
          modelNumber: order.model_number,
          poNumbers: [],
          orderIds: [],
        };
      }
      
      groups[key].orders.push(order);
      groups[key].totalRequired += order.quantity || 0;
      groups[key].orderIds.push(order.id);
      
      if (!groups[key].poNumbers.includes(order.po_number)) {
        groups[key].poNumbers.push(order.po_number);
      }
      
      // Use image from first order that has one
      if (!groups[key].image && order.product_image) {
        groups[key].image = order.product_image;
      }
      
      // Sum purchased from updates
      const update = data.updates.find(u => u.po_order_id === order.id);
      groups[key].totalPurchased += update?.purchased_quantity || 0;
    }
    
    return Object.values(groups);
  }, [data?.poOrders, data?.updates]);

  const getVendorInfo = () => {
    if (!token) return null;
    return getStoredVendorInfo(token);
  };

  const getGroupStatus = (group: GroupedOrder): string => {
    // Check if ALL underlying orders are N/A
    const allNA = group.orders.every(order => {
      const update = data?.updates.find(u => u.po_order_id === order.id);
      return update?.metadata?.not_available === true;
    });
    if (allNA && group.orders.length > 0) return 'not_available';
    
    // Check some are N/A
    const someNA = group.orders.some(order => {
      const update = data?.updates.find(u => u.po_order_id === order.id);
      return update?.metadata?.not_available === true;
    });
    
    // Calculate effective purchased (excluding N/A orders)
    const effectivePurchased = group.orders.reduce((sum, order) => {
      const update = data?.updates.find(u => u.po_order_id === order.id);
      if (update?.metadata?.not_available) return sum;
      return sum + (update?.purchased_quantity || 0);
    }, 0);
    
    const effectiveRequired = group.orders.reduce((sum, order) => {
      const update = data?.updates.find(u => u.po_order_id === order.id);
      if (update?.metadata?.not_available) return sum;
      return sum + (order.quantity || 0);
    }, 0);
    
    if (effectiveRequired === 0) return 'not_available';
    if (effectivePurchased >= effectiveRequired) return 'purchased';
    if (effectivePurchased > 0 || someNA) return 'partial';
    return 'pending';
  };

  // Save: distribute qty across underlying orders sequentially
  const handleSaveGroup = async (groupKey: string) => {
    const group = groupedOrders.find(g => g.key === groupKey);
    if (!group || !token || !data) return;

    const localUpdate = localUpdates[groupKey];
    const groupSupplierDetails = supplierDetails[groupKey];
    
    if (!localUpdate && !groupSupplierDetails) {
      toast.info('No changes to save');
      return;
    }

    setSavingItems(prev => new Set(prev).add(groupKey));
    const vendorInfo = getVendorInfo();

    try {
      const totalQty = localUpdate?.purchasedQuantity ?? group.totalPurchased ?? 0;
      let remaining = totalQty;

      // Distribute sequentially across non-N/A orders
      const activeOrders = group.orders.filter(order => {
        const update = data.updates.find(u => u.po_order_id === order.id);
        return !update?.metadata?.not_available;
      });

      for (const order of activeOrders) {
        const qtyForThis = Math.min(remaining, order.quantity);
        remaining = Math.max(0, remaining - order.quantity);

        await savePurchaseUpdate(token, {
          poOrderId: order.id,
          poNumber: order.po_number,
          asin: order.asin,
          skuCode: order.sku_code,
          modelNumber: order.model_number,
          title: order.title,
          purchasedQuantity: qtyForThis,
          vendorName: vendorInfo?.name,
          vendorEmail: vendorInfo?.email,
          supplierName: groupSupplierDetails?.supplierName,
          supplierOrderNumber: groupSupplierDetails?.supplierOrderNumber,
          estimatedDeliveryDate: groupSupplierDetails?.estimatedDeliveryDate,
          unitCost: groupSupplierDetails?.unitCost,
          totalCost: groupSupplierDetails?.totalCost,
          notes: groupSupplierDetails?.notes,
        });
      }
      
      // Update local state
      setData(prevData => {
        if (!prevData) return prevData;
        const updatedUpdates = [...prevData.updates];
        let rem = totalQty;
        
        for (const order of activeOrders) {
          const qtyForThis = Math.min(rem, order.quantity);
          rem = Math.max(0, rem - order.quantity);
          
          const existingIndex = updatedUpdates.findIndex(u => u.po_order_id === order.id);
          if (existingIndex >= 0) {
            updatedUpdates[existingIndex] = {
              ...updatedUpdates[existingIndex],
              purchased_quantity: qtyForThis,
            };
          } else {
            updatedUpdates.push({
              po_order_id: order.id,
              purchased_quantity: qtyForThis,
              link_id: prevData.link.id,
              metadata: {},
            } as any);
          }
        }
        
        return { ...prevData, updates: updatedUpdates };
      });
      
      setLocalUpdates(prev => {
        const newUpdates = { ...prev };
        delete newUpdates[groupKey];
        return newUpdates;
      });
      
      toast.success('Saved successfully', { duration: 1500 });
    } catch (error) {
      toast.error('Failed to save');
      console.error('Save error:', error);
    } finally {
      setSavingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(groupKey);
        return newSet;
      });
    }
  };

  const handleUpdateField = (groupKey: string, field: string, value: any) => {
    setLocalUpdates(prev => ({
      ...prev,
      [groupKey]: { ...prev[groupKey], [field]: value }
    }));
  };

  const handleMarkNotAvailable = async (groupKey: string) => {
    const group = groupedOrders.find(g => g.key === groupKey);
    if (!group || !token || !data) return;

    setSavingItems(prev => new Set(prev).add(groupKey));
    const vendorInfo = getVendorInfo();

    try {
      for (const order of group.orders) {
        await savePurchaseUpdate(token, {
          poOrderId: order.id,
          poNumber: order.po_number,
          asin: order.asin,
          skuCode: order.sku_code,
          modelNumber: order.model_number,
          title: order.title,
          metadata: { not_available: true },
          vendorName: vendorInfo?.name,
          vendorEmail: vendorInfo?.email,
        });
      }
      
      setData(prevData => {
        if (!prevData) return prevData;
        const updatedUpdates = [...prevData.updates];
        for (const order of group.orders) {
          const existingIndex = updatedUpdates.findIndex(u => u.po_order_id === order.id);
          if (existingIndex >= 0) {
            updatedUpdates[existingIndex] = { ...updatedUpdates[existingIndex], metadata: { not_available: true } };
          } else {
            updatedUpdates.push({ po_order_id: order.id, link_id: prevData.link.id, metadata: { not_available: true } } as any);
          }
        }
        return { ...prevData, updates: updatedUpdates };
      });
      
      setLocalUpdates(prev => {
        const newUpdates = { ...prev };
        delete newUpdates[groupKey];
        return newUpdates;
      });
      
      toast.success('Marked as not available');
    } catch (error) {
      toast.error('Failed to update');
    } finally {
      setSavingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(groupKey);
        return newSet;
      });
    }
  };

  const handleUndoNotAvailable = async (groupKey: string) => {
    const group = groupedOrders.find(g => g.key === groupKey);
    if (!group || !token || !data) return;

    setSavingItems(prev => new Set(prev).add(groupKey));
    const vendorInfo = getVendorInfo();

    try {
      for (const order of group.orders) {
        await savePurchaseUpdate(token, {
          poOrderId: order.id,
          poNumber: order.po_number,
          asin: order.asin,
          skuCode: order.sku_code,
          modelNumber: order.model_number,
          title: order.title,
          metadata: { not_available: false },
          purchasedQuantity: 0,
          vendorName: vendorInfo?.name,
          vendorEmail: vendorInfo?.email,
        });
      }
      
      setData(prevData => {
        if (!prevData) return prevData;
        const updatedUpdates = [...prevData.updates];
        for (const order of group.orders) {
          const existingIndex = updatedUpdates.findIndex(u => u.po_order_id === order.id);
          if (existingIndex >= 0) {
            updatedUpdates[existingIndex] = {
              ...updatedUpdates[existingIndex],
              metadata: { not_available: false },
              purchased_quantity: 0,
            };
          }
        }
        return { ...prevData, updates: updatedUpdates };
      });
      
      toast.success('Status reset to pending');
    } catch (error) {
      toast.error('Failed to update');
    } finally {
      setSavingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(groupKey);
        return newSet;
      });
    }
  };

  const handleInputFocus = (groupKey: string) => {
    setTimeout(() => {
      const cardElement = cardRefs.current[groupKey];
      if (cardElement) {
        cardElement.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      }
    }, 300);
  };

  const handleOpenBarcodeScanner = useCallback((groupKey: string) => {
    setScanningGroupKey(groupKey);
    setScanDialogOpen(true);
  }, []);

  const handleBarcodeScanned = useCallback(async (barcode: string, format: string) => {
    if (!scanningGroupKey || !data) return;
    const group = groupedOrders.find(g => g.key === scanningGroupKey);
    if (!group) return;
    const firstOrder = group.orders[0];
    
    await linkBarcode({
      barcode,
      barcodeType: format,
      asin: firstOrder.asin || undefined,
      skuCode: firstOrder.sku_code || undefined,
      modelNumber: firstOrder.model_number || undefined,
      title: firstOrder.title || undefined,
      poOrderId: firstOrder.id,
      userId: data.link.user_id,
    });
    
    setScanDialogOpen(false);
    setScanningGroupKey(null);
  }, [scanningGroupKey, data, groupedOrders, linkBarcode]);

  const scanningGroup = scanningGroupKey ? groupedOrders.find(g => g.key === scanningGroupKey) : null;

  // Select/deselect all order IDs in a group
  const handleSelectGroup = (groupKey: string, checked: boolean) => {
    const group = groupedOrders.find(g => g.key === groupKey);
    if (!group) return;
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (checked) {
        group.orderIds.forEach(id => newSet.add(id));
      } else {
        group.orderIds.forEach(id => newSet.delete(id));
      }
      return newSet;
    });
  };

  const isGroupSelected = (group: GroupedOrder) => {
    return group.orderIds.some(id => selectedItems.has(id));
  };

  const handleBulkMarkPurchased = async (quantity: number) => {
    if (!token || !data) return;
    const vendorInfo = getVendorInfo();
    
    const promises = Array.from(selectedItems).map(async orderId => {
      const order = data.poOrders.find(o => o.id === orderId);
      if (!order) return;
      return savePurchaseUpdate(token, {
        poOrderId: orderId, poNumber: order.po_number, asin: order.asin,
        skuCode: order.sku_code, modelNumber: order.model_number, title: order.title,
        purchasedQuantity: quantity, vendorName: vendorInfo?.name, vendorEmail: vendorInfo?.email,
      });
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
      return savePurchaseUpdate(token, {
        poOrderId: orderId, poNumber: order.po_number, asin: order.asin,
        skuCode: order.sku_code, modelNumber: order.model_number, title: order.title,
        metadata: { not_available: true }, vendorName: vendorInfo?.name, vendorEmail: vendorInfo?.email,
      });
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
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'purchase_updates',
        filter: `link_id=eq.${data.link.id}`
      }, (payload) => {
        console.log('Realtime update received:', payload);
        if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
          const newRecord = payload.new as any;
          setData(prevData => {
            if (!prevData) return prevData;
            const updatedUpdates = [...prevData.updates];
            const existingIndex = updatedUpdates.findIndex(u => u.po_order_id === newRecord.po_order_id);
            if (existingIndex >= 0) updatedUpdates[existingIndex] = newRecord;
            else updatedUpdates.push(newRecord);
            return { ...prevData, updates: updatedUpdates };
          });
          toast.info('Item updated', { duration: 1500 });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [token, data?.link?.id]);

  const getStatusBorderColor = (status: string) => {
    switch (status) {
      case 'purchased': return 'border-l-green-500';
      case 'partial': return 'border-l-yellow-500';
      case 'not_available': return 'border-l-red-400';
      default: return 'border-l-muted-foreground/30';
    }
  };

  // Filter and sort grouped orders
  const filteredGroups = useMemo(() => {
    let groups = groupedOrders.filter(group => {
      const status = getGroupStatus(group);
      const matchesSearch = 
        group.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.asin?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.skuCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.poNumbers.some(po => po.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesSearch && status === filterStatus;
    });

    if (sortBy === 'qty-high-low') groups = [...groups].sort((a, b) => b.totalRequired - a.totalRequired);
    else if (sortBy === 'qty-low-high') groups = [...groups].sort((a, b) => a.totalRequired - b.totalRequired);
    return groups;
  }, [groupedOrders, searchTerm, filterStatus, sortBy, data?.updates]);

  // Stats based on grouped orders
  const stats = useMemo(() => {
    const result = { total: groupedOrders.length, purchased: 0, partial: 0, notAvailable: 0, pending: 0 };
    for (const group of groupedOrders) {
      const status = getGroupStatus(group);
      if (status === 'purchased') result.purchased++;
      else if (status === 'partial') result.partial++;
      else if (status === 'not_available') result.notAvailable++;
      else result.pending++;
    }
    return result;
  }, [groupedOrders, data?.updates]);

  const selectedTotalRequired = Array.from(selectedItems).reduce((sum, id) => {
    const order = data?.poOrders.find(o => o.id === id);
    return sum + (order?.quantity || 0);
  }, 0);

  const exportData = groupedOrders.map(group => {
    const status = getGroupStatus(group);
    const details = supplierDetails[group.key] || {};
    return {
      poNumber: group.poNumbers.join(', '),
      asin: group.asin,
      skuCode: group.skuCode,
      title: group.title,
      requiredQty: group.totalRequired,
      purchasedQty: group.totalPurchased,
      status,
      supplierName: details.supplierName,
      supplierOrderNumber: details.supplierOrderNumber,
      notes: details.notes,
    };
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading purchase link...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="p-8 max-w-md text-center border-destructive/20">
          <Package className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <h2 className="text-xl font-semibold mb-2">Link Not Found</h2>
          <p className="text-muted-foreground text-sm">
            {error || 'This purchase link is invalid or has expired.'}
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto px-3 py-4 md:px-6 md:py-6 space-y-4 pb-[300px] md:pb-6">
        {/* Summary Header */}
        <PurchaseSummaryHeader
          title={data.link.title}
          description={data.link.description}
          expiresAt={data.link.expires_at}
          stats={stats}
          lastUpdated={data.updates[0]?.updated_at}
        />

        {/* Vendor Info */}
        {token && <VendorInfoForm linkToken={token} />}

        {/* Sticky Filter Bar */}
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b -mx-3 px-3 py-3 md:-mx-6 md:px-6 md:border md:rounded-lg md:mx-0 md:static md:backdrop-blur-none">
          <div className="flex flex-col gap-2">
            {/* Search + Export */}
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by title, ASIN, SKU, or PO..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-11"
                />
              </div>
              <ExportButton data={exportData} linkTitle={data.link.title} />
            </div>
            
            {/* Filter buttons + Sort inline */}
            <div className="flex gap-2 overflow-x-auto pb-1 -mb-1 scrollbar-hide items-center">
              {[
                { key: 'pending' as const, icon: Circle, label: 'Pending', count: stats.pending },
                { key: 'partial' as const, icon: AlertCircle, label: 'Partial', count: stats.partial },
                { key: 'purchased' as const, icon: CheckCircle2, label: 'Done', count: stats.purchased },
                { key: 'not_available' as const, icon: XCircle, label: 'N/A', count: stats.notAvailable },
              ].map(({ key, icon: Icon, label, count }) => (
                <Button
                  key={key}
                  variant={filterStatus === key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterStatus(key)}
                  className="h-9 min-h-[44px] min-w-[44px] flex-shrink-0 text-xs"
                >
                  <Icon className="h-3.5 w-3.5 mr-1" />
                  {label} ({count.toLocaleString()})
                </Button>
              ))}
              <div className="w-px h-6 bg-border flex-shrink-0 mx-1" />
              <Button
                variant={sortBy === 'qty-high-low' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy(sortBy === 'qty-high-low' ? null : 'qty-high-low')}
                className="h-9 min-h-[44px] text-xs flex-shrink-0"
              >
                <ArrowDown className="h-3 w-3 mr-1" />
                Qty↓
              </Button>
              <Button
                variant={sortBy === 'qty-low-high' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy(sortBy === 'qty-low-high' ? null : 'qty-low-high')}
                className="h-9 min-h-[44px] text-xs flex-shrink-0"
              >
                <ArrowUp className="h-3 w-3 mr-1" />
                Qty↑
              </Button>
            </div>
          </div>
        </div>

        {/* Items List - Grouped by ASIN */}
        <div className="space-y-3">
          {filteredGroups.map((group) => {
            const localUpdate = localUpdates[group.key];
            const status = getGroupStatus(group);
            const isSelected = isGroupSelected(group);
            const isSaving = savingItems.has(group.key);
            
            return (
              <Card 
                key={group.key} 
                className={`overflow-hidden transition-all border-l-4 ${getStatusBorderColor(status)} ${isSelected ? 'ring-2 ring-primary' : ''}`}
                ref={(el) => cardRefs.current[group.key] = el}
              >
                <div className="p-3 space-y-2">
                  {/* Header row: image + info + checkbox */}
                  <div className="flex gap-3 items-start">
                    {/* Product Image */}
                    <Dialog>
                      <DialogTrigger asChild>
                        <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-muted flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity border">
                          {group.image?.image_url ? (
                            <img 
                              src={group.image.image_url} 
                              alt={group.title || 'Product'}
                              className="w-full h-full object-contain p-1"
                            />
                          ) : (
                            <Image className="h-5 w-5 text-muted-foreground/50" />
                          )}
                        </div>
                      </DialogTrigger>
                      {group.image?.image_url && (
                        <DialogContent className="max-w-3xl">
                          <img 
                            src={group.image.image_url} 
                            alt={group.title || 'Product'}
                            className="w-full h-auto"
                          />
                        </DialogContent>
                      )}
                    </Dialog>

                    {/* Item Info */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="font-medium text-sm leading-snug line-clamp-2">{group.title}</p>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                        {group.poNumbers.map(po => (
                          <Badge key={po} variant="outline" className="text-[10px] font-mono px-1.5 py-0">
                            {po}
                          </Badge>
                        ))}
                        {group.asin && <span className="font-mono">ASIN: {group.asin}</span>}
                        {group.skuCode && <span className="font-mono">SKU: {group.skuCode}</span>}
                        <LinkedBarcodesBadge 
                          asin={group.asin} 
                          skuCode={group.skuCode}
                          poOrderId={group.orderIds[0]}
                        />
                      </div>
                    </div>

                    {/* Checkbox top-right */}
                    <div className="flex-shrink-0 flex flex-col items-center gap-1">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => handleSelectGroup(group.key, !!checked)}
                        disabled={status === 'purchased' || status === 'not_available'}
                        className="h-5 w-5"
                      />
                      {status === 'purchased' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                      {status === 'partial' && <AlertCircle className="h-4 w-4 text-yellow-500" />}
                      {status === 'not_available' && <XCircle className="h-4 w-4 text-red-400" />}
                    </div>
                  </div>

                  {/* Quantity + Actions row */}
                  {status !== 'not_available' ? (
                    <div className="flex items-end gap-2 flex-wrap">
                      <div className="bg-muted/50 rounded-md px-2.5 py-1.5 text-sm flex items-center gap-1 flex-shrink-0">
                        <span className="text-muted-foreground text-xs">Req:</span>
                        <span className="font-bold">{group.totalRequired.toLocaleString()}</span>
                        {group.orders.length > 1 && (
                          <span className="text-muted-foreground text-[10px]">({group.orders.length} POs)</span>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-[80px] max-w-[120px]">
                        <Input
                          type="number"
                          placeholder="Qty"
                          value={localUpdate?.purchasedQuantity ?? (group.totalPurchased > 0 ? group.totalPurchased : '')}
                          onChange={(e) => handleUpdateField(group.key, 'purchasedQuantity', parseInt(e.target.value) || 0)}
                          onFocus={() => handleInputFocus(group.key)}
                          className="h-10 text-[16px]"
                          disabled={isSaving}
                        />
                      </div>
                      
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleSaveGroup(group.key)}
                        disabled={(!localUpdate?.purchasedQuantity && !supplierDetails[group.key]) || isSaving}
                        className="h-10 w-10 p-0"
                        title="Save"
                      >
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleMarkNotAvailable(group.key)}
                        disabled={isSaving}
                        className="h-10 px-2.5"
                        title="Not Available"
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenBarcodeScanner(group.key)}
                        className="h-10 px-2.5"
                        title="Scan Barcode"
                      >
                        <ScanLine className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="bg-red-50 dark:bg-red-950/30 rounded-md px-2.5 py-1.5 text-sm text-red-600 dark:text-red-400 flex-1">
                        Not Available
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUndoNotAvailable(group.key)}
                        disabled={isSaving}
                        className="h-10 px-3"
                      >
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                        <span className="ml-1 text-xs">Undo</span>
                      </Button>
                    </div>
                  )}

                  {/* Supplier Details */}
                  {status !== 'not_available' && (
                    <SupplierDetailsForm
                      details={supplierDetails[group.key] || {}}
                      onChange={(details) => setSupplierDetails(prev => ({ ...prev, [group.key]: details }))}
                      disabled={isSaving}
                    />
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        {filteredGroups.length === 0 && (
          <Card className="p-12 text-center border-dashed">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
            <p className="text-muted-foreground text-sm">No items match your filters</p>
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
        productInfo={scanningGroup ? {
          title: scanningGroup.title || undefined,
          asin: scanningGroup.asin || undefined,
          sku: scanningGroup.skuCode || undefined,
        } : undefined}
        isLinking={barcodeLoading}
      />
    </div>
  );
}
