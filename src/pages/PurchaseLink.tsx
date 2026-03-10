import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { usePurchaseLink } from '@/hooks/usePurchaseLink';
import { useProductBarcodes } from '@/hooks/useProductBarcodes';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Package, Search, CheckCircle2, Circle, AlertCircle, Image, XCircle, ScanLine, RotateCcw, ArrowUpDown } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { BarcodeScannerDialog } from '@/components/barcode/BarcodeScannerDialog';
import { LinkedBarcodesBadge } from '@/components/barcode/LinkedBarcodesBadge';
import { BulkActionsBar } from '@/components/purchase-link/BulkActionsBar';
import { ExportButton } from '@/components/purchase-link/ExportButton';
import { PurchaseSummaryHeader } from '@/components/purchase-link/PurchaseSummaryHeader';
import { useVirtualizer } from '@tanstack/react-virtual';
import Fuse from 'fuse.js';

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
  status: string;
  // Inventory metrics (ASIN-level, not summed per order)
  shipped: number;
  fba: number;
  instock: number;
  printed: number;
}

export default function PurchaseLink() {
  const { token } = useParams<{ token: string }>();
  const { data: hookData, loading, error, savePurchaseUpdate, fetchLinkData } = usePurchaseLink(token);
  const { linkBarcode, loading: barcodeLoading } = useProductBarcodes();
  const [data, setData] = useState(hookData);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'purchased' | 'partial' | 'pending' | 'not_available'>('pending');
  const [sortBy, setSortBy] = useState<'qty-high-low' | 'qty-low-high' | null>(null);
  const [savingItems, setSavingItems] = useState<Set<string>>(new Set());
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [searchFocused, setSearchFocused] = useState(false);
  const parentRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Per-item supplier + cost state
  const [itemCosts, setItemCosts] = useState<Map<string, string>>(new Map());
  const [itemSuppliers, setItemSuppliers] = useState<Map<string, string>>(new Map());

  // Barcode scanning state
  const [scanDialogOpen, setScanDialogOpen] = useState(false);
  const [scanningGroupKey, setScanningGroupKey] = useState<string | null>(null);

  // Debounce unified search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 200);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    if (searchFocused && parentRef.current) {
      parentRef.current.scrollTop = 0;
    }
  }, [debouncedSearch, searchFocused]);

  useEffect(() => {
    if (hookData) setData(hookData);
  }, [hookData]);

  const updatesMap = useMemo(() => {
    if (!data?.updates) return new Map<string, any>();
    const map = new Map<string, any>();
    for (const u of data.updates) map.set(u.po_order_id, u);
    return map;
  }, [data?.updates]);

  const groupedOrders = useMemo((): GroupedOrder[] => {
    if (!data?.poOrders) return [];
    const groups: Record<string, GroupedOrder> = {};
    for (const order of data.poOrders) {
      const key = order.asin || order.sku_code || order.id;
      if (!groups[key]) {
        groups[key] = {
          key, orders: [], totalRequired: 0, totalPurchased: 0,
          image: order.product_image, title: order.title || '',
          asin: order.asin, skuCode: order.sku_code, modelNumber: order.model_number,
          poNumbers: [], orderIds: [], status: 'pending',
          shipped: order.metrics?.shipped || 0,
          fba: order.metrics?.fba || 0,
          instock: order.metrics?.instock || 0,
          printed: 0,
        };
      }
      groups[key].orders.push(order);
      groups[key].totalRequired += order.quantity || 0;
      groups[key].printed += order.printed_quantity || 0;
      groups[key].orderIds.push(order.id);
      if (!groups[key].poNumbers.includes(order.po_number)) groups[key].poNumbers.push(order.po_number);
      if (!groups[key].image && order.product_image) groups[key].image = order.product_image;
      const update = updatesMap.get(order.id);
      groups[key].totalPurchased += update?.purchased_quantity || 0;
    }
    const result = Object.values(groups);
    for (const group of result) group.status = computeGroupStatus(group, updatesMap);
    return result;
  }, [data?.poOrders, updatesMap]);

  const handleSaveGroup = async (groupKey: string, overrideQty?: number) => {
    const group = groupedOrders.find(g => g.key === groupKey);
    if (!group || !token || !data) return;
    setSavingItems(prev => new Set(prev).add(groupKey));
    try {
      const totalQty = overrideQty ?? group.totalRequired;
      let remaining = totalQty;
      const activeOrders = group.orders.filter(order => {
        const update = updatesMap.get(order.id);
        return !update?.metadata?.not_available;
      });
      const unitCost = parseFloat(itemCosts.get(groupKey) || '0') || undefined;
      const supplier = itemSuppliers.get(groupKey);
      for (const order of activeOrders) {
        const qtyForThis = Math.min(remaining, order.quantity);
        remaining = Math.max(0, remaining - order.quantity);
        await savePurchaseUpdate(token, {
          poOrderId: order.id, poNumber: order.po_number, asin: order.asin,
          skuCode: order.sku_code, modelNumber: order.model_number, title: order.title,
          purchasedQuantity: qtyForThis,
          supplierName: supplier?.name || undefined,
          supplierOrderNumber: supplier?.order || undefined,
          unitCost, totalCost: unitCost ? unitCost * qtyForThis : undefined,
        });
      }
      setData(prevData => {
        if (!prevData) return prevData;
        const updatedUpdates = [...prevData.updates];
        let rem = totalQty;
        for (const order of activeOrders) {
          const qtyForThis = Math.min(rem, order.quantity);
          rem = Math.max(0, rem - order.quantity);
          const existingIndex = updatedUpdates.findIndex(u => u.po_order_id === order.id);
          if (existingIndex >= 0) {
            updatedUpdates[existingIndex] = { ...updatedUpdates[existingIndex], purchased_quantity: qtyForThis };
          } else {
            updatedUpdates.push({ po_order_id: order.id, purchased_quantity: qtyForThis, link_id: prevData.link.id, metadata: {} } as any);
          }
        }
        return { ...prevData, updates: updatedUpdates };
      });
      toast.success('Marked as done', { duration: 1500 });
    } catch (error) {
      toast.error('Failed to save');
    } finally {
      setSavingItems(prev => { const s = new Set(prev); s.delete(groupKey); return s; });
    }
  };

  const handleMarkNotAvailable = async (groupKey: string) => {
    const group = groupedOrders.find(g => g.key === groupKey);
    if (!group || !token || !data) return;
    setSavingItems(prev => new Set(prev).add(groupKey));
    try {
      for (const order of group.orders) {
        await savePurchaseUpdate(token, {
          poOrderId: order.id, poNumber: order.po_number, asin: order.asin,
          skuCode: order.sku_code, modelNumber: order.model_number, title: order.title,
          metadata: { not_available: true },
        });
      }
      setData(prevData => {
        if (!prevData) return prevData;
        const updatedUpdates = [...prevData.updates];
        for (const order of group.orders) {
          const existingIndex = updatedUpdates.findIndex(u => u.po_order_id === order.id);
          if (existingIndex >= 0) updatedUpdates[existingIndex] = { ...updatedUpdates[existingIndex], metadata: { not_available: true } };
          else updatedUpdates.push({ po_order_id: order.id, link_id: prevData.link.id, metadata: { not_available: true } } as any);
        }
        return { ...prevData, updates: updatedUpdates };
      });
      toast.success('Marked as not available');
    } catch (error) {
      toast.error('Failed to update');
    } finally {
      setSavingItems(prev => { const s = new Set(prev); s.delete(groupKey); return s; });
    }
  };

  const handleUndoNotAvailable = async (groupKey: string) => {
    const group = groupedOrders.find(g => g.key === groupKey);
    if (!group || !token || !data) return;
    setSavingItems(prev => new Set(prev).add(groupKey));
    try {
      for (const order of group.orders) {
        await savePurchaseUpdate(token, {
          poOrderId: order.id, poNumber: order.po_number, asin: order.asin,
          skuCode: order.sku_code, modelNumber: order.model_number, title: order.title,
          metadata: { not_available: false }, purchasedQuantity: 0,
        });
      }
      setData(prevData => {
        if (!prevData) return prevData;
        const updatedUpdates = [...prevData.updates];
        for (const order of group.orders) {
          const existingIndex = updatedUpdates.findIndex(u => u.po_order_id === order.id);
          if (existingIndex >= 0) {
            updatedUpdates[existingIndex] = { ...updatedUpdates[existingIndex], metadata: { not_available: false }, purchased_quantity: 0 };
          }
        }
        return { ...prevData, updates: updatedUpdates };
      });
      toast.success('Status reset to pending');
    } catch (error) {
      toast.error('Failed to update');
    } finally {
      setSavingItems(prev => { const s = new Set(prev); s.delete(groupKey); return s; });
    }
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
      barcode, barcodeType: format,
      asin: firstOrder.asin || undefined, skuCode: firstOrder.sku_code || undefined,
      modelNumber: firstOrder.model_number || undefined, title: firstOrder.title || undefined,
      poOrderId: firstOrder.id, userId: data.link.user_id,
    });
    await handleSaveGroup(scanningGroupKey, group.totalRequired);
    setScanDialogOpen(false);
    setScanningGroupKey(null);
  }, [scanningGroupKey, data, groupedOrders, linkBarcode]);

  const scanningGroup = scanningGroupKey ? groupedOrders.find(g => g.key === scanningGroupKey) : null;

  const handleSelectGroup = (groupKey: string, checked: boolean) => {
    const group = groupedOrders.find(g => g.key === groupKey);
    if (!group) return;
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (checked) group.orderIds.forEach(id => newSet.add(id));
      else group.orderIds.forEach(id => newSet.delete(id));
      return newSet;
    });
  };

  const isGroupSelected = (group: GroupedOrder) => group.orderIds.some(id => selectedItems.has(id));

  const handleBulkMarkPurchased = async (quantity: number) => {
    if (!token || !data) return;
    const promises = Array.from(selectedItems).map(async orderId => {
      const order = data.poOrders.find(o => o.id === orderId);
      if (!order) return;
      return savePurchaseUpdate(token, {
        poOrderId: orderId, poNumber: order.po_number, asin: order.asin,
        skuCode: order.sku_code, modelNumber: order.model_number, title: order.title,
        purchasedQuantity: quantity,
      });
    });
    await Promise.all(promises);
    setSelectedItems(new Set());
    if (token) await fetchLinkData(token);
    toast.success(`${selectedItems.size} items marked as purchased`);
  };

  const handleBulkMarkNotAvailable = async () => {
    if (!token || !data) return;
    const promises = Array.from(selectedItems).map(async orderId => {
      const order = data.poOrders.find(o => o.id === orderId);
      if (!order) return;
      return savePurchaseUpdate(token, {
        poOrderId: orderId, poNumber: order.po_number, asin: order.asin,
        skuCode: order.sku_code, modelNumber: order.model_number, title: order.title,
        metadata: { not_available: true },
      });
    });
    await Promise.all(promises);
    setSelectedItems(new Set());
    if (token) await fetchLinkData(token);
    toast.success(`${selectedItems.size} items marked as not available`);
  };

  // Realtime subscription
  useEffect(() => {
    if (!token || !data?.link?.id) return;
    const channel = supabase
      .channel('purchase-updates-changes')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'purchase_updates',
        filter: `link_id=eq.${data.link.id}`
      }, (payload) => {
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
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [token, data?.link?.id]);

  // Unified filter + search
  const filteredGroups = useMemo(() => {
    let groups = groupedOrders.filter(g => g.status === filterStatus);

    if (debouncedSearch.trim()) {
      const term = debouncedSearch.trim().toLowerCase();
      // First try exact substring on SKU/ASIN/PO
      const exactMatch = groups.filter(g => {
        const asin = (g.asin || '').toLowerCase();
        const sku = (g.skuCode || '').toLowerCase();
        const pos = (g.poNumbers || []).join(' ').toLowerCase();
        return asin.includes(term) || sku.includes(term) || pos.includes(term);
      });

      if (exactMatch.length > 0) {
        groups = exactMatch;
      } else {
        // Fallback to fuzzy title search
        const titleResults = new Fuse(groups, {
          keys: ['title'], threshold: 0.4, ignoreLocation: true,
        }).search(debouncedSearch);
        groups = titleResults.map(r => r.item);
      }
    }

    if (sortBy === 'qty-high-low') groups = [...groups].sort((a, b) => b.totalRequired - a.totalRequired);
    else if (sortBy === 'qty-low-high') groups = [...groups].sort((a, b) => a.totalRequired - b.totalRequired);
    return groups;
  }, [groupedOrders, debouncedSearch, filterStatus, sortBy]);

  const stats = useMemo(() => {
    const result = { total: groupedOrders.length, purchased: 0, partial: 0, notAvailable: 0, pending: 0 };
    for (const group of groupedOrders) {
      if (group.status === 'purchased') result.purchased++;
      else if (group.status === 'partial') result.partial++;
      else if (group.status === 'not_available') result.notAvailable++;
      else result.pending++;
    }
    return result;
  }, [groupedOrders]);

  const selectedTotalRequired = Array.from(selectedItems).reduce((sum, id) => {
    const order = data?.poOrders.find(o => o.id === id);
    return sum + (order?.quantity || 0);
  }, 0);

  const exportData = groupedOrders.map(group => ({
    poNumber: group.poNumbers.join(', '), asin: group.asin, skuCode: group.skuCode,
    title: group.title, requiredQty: group.totalRequired, purchasedQty: group.totalPurchased, status: group.status,
  }));

  const rowVirtualizer = useVirtualizer({
    count: filteredGroups.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 280,
    overscan: 5,
  });

  const updateItemSupplier = (key: string, field: 'name' | 'order', value: string) => {
    setItemSuppliers(prev => {
      const next = new Map(prev);
      const current = next.get(key) || { name: '', order: '' };
      next.set(key, { ...current, [field]: value });
      return next;
    });
  };

  const statusFilters = [
    { key: 'pending' as const, label: 'Pending', count: stats.pending, dotClass: 'bg-muted-foreground' },
    { key: 'partial' as const, label: 'Partial', count: stats.partial, dotClass: 'bg-yellow-500' },
    { key: 'purchased' as const, label: 'Done', count: stats.purchased, dotClass: 'bg-green-500' },
    { key: 'not_available' as const, label: 'N/A', count: stats.notAvailable, dotClass: 'bg-red-400' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
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
      <div className="max-w-2xl mx-auto px-3 py-3 md:px-4 md:py-4 space-y-3 pb-32">
        {/* Compact Summary Header */}
        <PurchaseSummaryHeader
          title={data.link.title}
          description={data.link.description}
          expiresAt={data.link.expires_at}
          stats={stats}
          lastUpdated={data.updates[0]?.updated_at}
        />

        {/* Sticky Search + Filters */}
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm -mx-3 px-3 py-2 space-y-2 border-b border-border/50">
          {/* Unified Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search SKU, ASIN, PO, or title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              className="pl-9 h-8 text-xs"
            />
          </div>

          {/* Status Filters + Sort — always visible, horizontal scroll */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
            {statusFilters.map(({ key, label, count, dotClass }) => (
              <button
                key={key}
                onClick={() => setFilterStatus(key)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                  filterStatus === key
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${filterStatus === key ? 'bg-primary-foreground' : dotClass}`} />
                {label}
                <span className={`text-[10px] ${filterStatus === key ? 'text-primary-foreground/80' : 'text-muted-foreground/60'}`}>
                  {count}
                </span>
              </button>
            ))}
            <div className="w-px h-5 bg-border flex-shrink-0 mx-0.5" />
            <button
              onClick={() => setSortBy(sortBy === 'qty-high-low' ? 'qty-low-high' : sortBy === 'qty-low-high' ? null : 'qty-high-low')}
              className={`flex items-center gap-1 px-2 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors flex-shrink-0 ${
                sortBy ? 'bg-primary text-primary-foreground' : 'bg-muted/60 text-muted-foreground hover:bg-muted'
              }`}
            >
              <ArrowUpDown className="h-3 w-3" />
              {sortBy === 'qty-high-low' ? 'Qty ↓' : sortBy === 'qty-low-high' ? 'Qty ↑' : 'Sort'}
            </button>
            <div className="ml-auto flex-shrink-0">
              <ExportButton data={exportData} linkTitle={data.link.title} />
            </div>
          </div>

          {/* Results count */}
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{filteredGroups.length.toLocaleString()} items</span>
            {selectedItems.size > 0 && (
              <button onClick={() => setSelectedItems(new Set())} className="text-primary hover:underline">
                {selectedItems.size} selected — clear
              </button>
            )}
          </div>
        </div>

        {/* Virtualized Items */}
        {filteredGroups.length > 0 ? (
          <div ref={parentRef} className={`h-[calc(100vh-260px)] overflow-auto ${searchFocused ? 'pb-[50vh]' : ''}`}>
            <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const group = filteredGroups[virtualRow.index];
                const isSaving = savingItems.has(group.key);
                const status = group.status;
                const supplierData = itemSuppliers.get(group.key);

                return (
                  <div
                    key={group.key}
                    style={{
                      position: 'absolute', top: 0, left: 0, width: '100%',
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                    className="pb-2"
                  >
                    <Card className="h-full overflow-hidden border-l-[3px] transition-colors"
                      style={{
                        borderLeftColor: status === 'purchased' ? 'hsl(var(--chart-2, 142 71% 45%))' 
                          : status === 'partial' ? 'hsl(var(--chart-4, 43 96% 56%))' 
                          : status === 'not_available' ? 'hsl(var(--destructive))' 
                          : 'hsl(var(--muted-foreground) / 0.3)'
                      }}
                      ref={(el) => cardRefs.current[group.key] = el}
                    >
                      <div className="p-3 space-y-2.5">
                        {/* Row 1: Image + Title + Status */}
                        <div className="flex gap-2.5 items-start">
                          {/* Image */}
                          <Dialog>
                            <DialogTrigger asChild>
                              <div className="flex-shrink-0 w-12 h-12 rounded-md overflow-hidden bg-muted flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity border">
                                {group.image?.image_url ? (
                                  <img src={group.image.image_url} alt="" className="w-full h-full object-contain p-0.5" loading="lazy" />
                                ) : (
                                  <Image className="h-4 w-4 text-muted-foreground/40" />
                                )}
                              </div>
                            </DialogTrigger>
                            {group.image?.image_url && (
                              <DialogContent className="max-w-3xl">
                                <img src={group.image.image_url} alt={group.title || 'Product'} className="w-full h-auto" />
                              </DialogContent>
                            )}
                          </Dialog>

                          {/* Title + Identifiers */}
                          <div className="flex-1 min-w-0 space-y-1">
                            <p className="text-xs font-medium leading-snug line-clamp-2">{group.title}</p>
                            <div className="flex flex-wrap gap-1 items-center">
                              {group.asin && (
                                <Badge variant="outline" className="text-[9px] font-mono px-1 py-0 h-4">
                                  {group.asin}
                                </Badge>
                              )}
                              {group.skuCode && (
                                <Badge variant="outline" className="text-[9px] font-mono px-1 py-0 h-4">
                                  {group.skuCode}
                                </Badge>
                              )}
                              {group.poNumbers.map(po => (
                                <Badge key={po} variant="secondary" className="text-[9px] font-mono px-1 py-0 h-4">
                                  {po}
                                </Badge>
                              ))}
                              <LinkedBarcodesBadge asin={group.asin} skuCode={group.skuCode} poOrderId={group.orderIds[0]} />
                            </div>
                          </div>

                          {/* Qty badge */}
                          <div className="flex-shrink-0 text-center">
                            <div className="bg-muted rounded-md px-2 py-1">
                              <span className="text-sm font-bold">{group.totalRequired}</span>
                              <p className="text-[9px] text-muted-foreground leading-none">req</p>
                            </div>
                          </div>
                        </div>

                        {/* Row 2: Inventory Metrics */}
                        <div className="grid grid-cols-6 gap-1 text-center">
                          {[
                            { label: 'Shipped', value: group.shipped },
                            { label: 'FBA', value: group.fba },
                            { label: 'PO Req', value: group.totalRequired },
                            { label: 'Printed', value: group.printed },
                            { label: 'InStock', value: group.instock },
                            { label: 'Pending', value: Math.max(0, group.totalRequired - group.printed - group.instock) },
                          ].map(m => (
                            <div key={m.label} className="bg-muted/50 rounded px-1 py-1">
                              <span className="text-[11px] font-bold block leading-none">{m.value}</span>
                              <span className="text-[8px] text-muted-foreground leading-none">{m.label}</span>
                            </div>
                          ))}
                        </div>

                        {/* Row 3: Per-item supplier + cost (only for pending/partial) */}
                        {(status === 'pending' || status === 'partial') && (
                          <div className="grid grid-cols-3 gap-1.5">
                            <div className="relative">
                              <Input
                                placeholder="Supplier"
                                value={supplierData?.name || ''}
                                onChange={e => updateItemSupplier(group.key, 'name', e.target.value)}
                                className="h-7 text-[11px] pl-2 pr-1"
                              />
                            </div>
                            <div className="relative">
                              <Input
                                placeholder="Order #"
                                value={supplierData?.order || ''}
                                onChange={e => updateItemSupplier(group.key, 'order', e.target.value)}
                                className="h-7 text-[11px] pl-2 pr-1"
                              />
                            </div>
                            <div className="relative">
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="Cost (SAR)"
                                value={itemCosts.get(group.key) || ''}
                                onChange={e => setItemCosts(prev => new Map(prev).set(group.key, e.target.value))}
                                className="h-7 text-[11px] pl-2 pr-1"
                              />
                            </div>
                          </div>
                        )}

                        {/* Row 3: Actions */}
                        {status !== 'not_available' ? (
                          <div className="flex items-center gap-1.5">
                            {itemCosts.get(group.key) && parseFloat(itemCosts.get(group.key)!) > 0 && (
                              <span className="text-[10px] text-muted-foreground mr-auto">
                                Total: {(parseFloat(itemCosts.get(group.key)!) * group.totalRequired).toFixed(2)} SAR
                              </span>
                            )}
                            {status === 'purchased' ? (
                              <div className="flex items-center gap-1.5 text-xs font-medium ml-auto" style={{ color: 'hsl(var(--chart-2, 142 71% 45%))' }}>
                                <CheckCircle2 className="h-4 w-4" />
                                Done ({group.totalPurchased}/{group.totalRequired})
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 ml-auto">
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => handleOpenBarcodeScanner(group.key)}
                                  disabled={isSaving}
                                  className="h-8 gap-1 text-xs px-3"
                                >
                                  {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ScanLine className="h-3.5 w-3.5" />}
                                  Scan Done
                                </Button>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => handleSaveGroup(group.key)}
                                  disabled={isSaving}
                                  className="h-8 gap-1 text-xs px-3"
                                >
                                  {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                                  Done
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleMarkNotAvailable(group.key)}
                                  disabled={isSaving}
                                  className="h-8 gap-1 text-xs px-2 text-destructive hover:text-destructive"
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                  N/A
                                </Button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-destructive font-medium flex items-center gap-1">
                              <XCircle className="h-3.5 w-3.5" /> Not Available
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUndoNotAvailable(group.key)}
                              disabled={isSaving}
                              className="h-7 px-2 text-xs ml-auto"
                            >
                              {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                              <span className="ml-1">Undo</span>
                            </Button>
                          </div>
                        )}
                      </div>
                    </Card>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="py-16 text-center">
            <Package className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No items match your filters</p>
          </div>
        )}
      </div>

      <BulkActionsBar
        selectedCount={selectedItems.size}
        totalRequired={selectedTotalRequired}
        onMarkAllPurchased={handleBulkMarkPurchased}
        onMarkNotAvailable={handleBulkMarkNotAvailable}
        onClearSelection={() => setSelectedItems(new Set())}
      />

      <BarcodeScannerDialog
        open={scanDialogOpen}
        onOpenChange={setScanDialogOpen}
        onBarcodeScanned={handleBarcodeScanned}
        title="Scan Barcode (Mark as Done)"
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

function computeGroupStatus(group: GroupedOrder, updatesMap: Map<string, any>): string {
  const allNA = group.orders.every(order => {
    const update = updatesMap.get(order.id);
    return update?.metadata?.not_available === true;
  });
  if (allNA && group.orders.length > 0) return 'not_available';
  let someNA = false;
  let effectivePurchased = 0;
  let effectiveRequired = 0;
  for (const order of group.orders) {
    const update = updatesMap.get(order.id);
    if (update?.metadata?.not_available) { someNA = true; continue; }
    effectivePurchased += update?.purchased_quantity || 0;
    effectiveRequired += order.quantity || 0;
  }
  if (effectiveRequired === 0) return 'not_available';
  if (effectivePurchased >= effectiveRequired) return 'purchased';
  if (effectivePurchased > 0 || someNA) return 'partial';
  return 'pending';
}
