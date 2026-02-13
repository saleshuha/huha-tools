import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { usePurchaseLink } from '@/hooks/usePurchaseLink';
import { useProductBarcodes } from '@/hooks/useProductBarcodes';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { Loader2, Package, Search, CheckCircle2, Circle, AlertCircle, Image, XCircle, Check, ArrowUp, ArrowDown, ScanLine, RotateCcw, ChevronDown, Filter } from 'lucide-react';
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
}

export default function PurchaseLink() {
  const { token } = useParams<{ token: string }>();
  const { data: hookData, loading, error, savePurchaseUpdate, fetchLinkData } = usePurchaseLink(token);
  const { linkBarcode, loading: barcodeLoading } = useProductBarcodes();
  const [data, setData] = useState(hookData);
  const [skuSearchTerm, setSkuSearchTerm] = useState('');
  const [titleSearchTerm, setTitleSearchTerm] = useState('');
  const [debouncedSkuSearch, setDebouncedSkuSearch] = useState('');
  const [debouncedTitleSearch, setDebouncedTitleSearch] = useState('');
  const [metricsOpen, setMetricsOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'purchased' | 'partial' | 'pending' | 'not_available'>('pending');
  const [sortBy, setSortBy] = useState<'qty-high-low' | 'qty-low-high' | null>(null);
  const [savingItems, setSavingItems] = useState<Set<string>>(new Set());
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const parentRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  
  // Barcode scanning state
  const [scanDialogOpen, setScanDialogOpen] = useState(false);
  const [scanningGroupKey, setScanningGroupKey] = useState<string | null>(null);

  // Debounce search inputs
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSkuSearch(skuSearchTerm), 200);
    return () => clearTimeout(timer);
  }, [skuSearchTerm]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedTitleSearch(titleSearchTerm), 200);
    return () => clearTimeout(timer);
  }, [titleSearchTerm]);

  // Auto-scroll to top when search changes while focused
  useEffect(() => {
    if (searchFocused && parentRef.current) {
      parentRef.current.scrollTop = 0;
    }
  }, [debouncedSkuSearch, debouncedTitleSearch, searchFocused]);

  // Sync hook data with local state
  useEffect(() => {
    if (hookData) {
      setData(hookData);
    }
  }, [hookData]);

  // O(1) updates lookup map
  const updatesMap = useMemo(() => {
    if (!data?.updates) return new Map<string, any>();
    const map = new Map<string, any>();
    for (const u of data.updates) {
      map.set(u.po_order_id, u);
    }
    return map;
  }, [data?.updates]);

  // Group orders by ASIN with pre-computed status
  const groupedOrders = useMemo((): GroupedOrder[] => {
    if (!data?.poOrders) return [];
    
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
          status: 'pending',
        };
      }
      
      groups[key].orders.push(order);
      groups[key].totalRequired += order.quantity || 0;
      groups[key].orderIds.push(order.id);
      
      if (!groups[key].poNumbers.includes(order.po_number)) {
        groups[key].poNumbers.push(order.po_number);
      }
      
      if (!groups[key].image && order.product_image) {
        groups[key].image = order.product_image;
      }
      
      const update = updatesMap.get(order.id);
      groups[key].totalPurchased += update?.purchased_quantity || 0;
    }
    
    // Pre-compute status for each group
    const result = Object.values(groups);
    for (const group of result) {
      group.status = computeGroupStatus(group, updatesMap);
    }
    return result;
  }, [data?.poOrders, updatesMap]);

  // Save: distribute full required qty across underlying orders
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
      
      toast.success('Marked as done', { duration: 1500 });
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

  const handleMarkNotAvailable = async (groupKey: string) => {
    const group = groupedOrders.find(g => g.key === groupKey);
    if (!group || !token || !data) return;

    setSavingItems(prev => new Set(prev).add(groupKey));

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

  const handleOpenBarcodeScanner = useCallback((groupKey: string) => {
    setScanningGroupKey(groupKey);
    setScanDialogOpen(true);
  }, []);

  // Barcode scanned => link barcode AND auto-mark as done
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
    
    // Auto-mark as done with full required quantity
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

  // Fuse.js indexes for cascading dual search
  const skuFuse = useMemo(() => {
    return new Fuse(groupedOrders, {
      keys: ['asin', 'skuCode', 'poNumbers'],
      threshold: 0.3,
      ignoreLocation: true,
    });
  }, [groupedOrders]);

  // Filter and sort: status -> SKU match -> title match (cascading)
  const filteredGroups = useMemo(() => {
    // 1. Status filter first
    let groups = groupedOrders.filter(g => g.status === filterStatus);
    
    // 2. SKU/ASIN search narrows the set
    if (debouncedSkuSearch.trim()) {
      const skuResults = new Fuse(groups, {
        keys: ['asin', 'skuCode', 'poNumbers'],
        threshold: 0.3,
        ignoreLocation: true,
      }).search(debouncedSkuSearch);
      groups = skuResults.map(r => r.item);
    }
    
    // 3. Title search further narrows within SKU-matched results
    if (debouncedTitleSearch.trim()) {
      const titleResults = new Fuse(groups, {
        keys: ['title'],
        threshold: 0.3,
        ignoreLocation: true,
      }).search(debouncedTitleSearch);
      groups = titleResults.map(r => r.item);
    }

    if (sortBy === 'qty-high-low') groups = [...groups].sort((a, b) => b.totalRequired - a.totalRequired);
    else if (sortBy === 'qty-low-high') groups = [...groups].sort((a, b) => a.totalRequired - b.totalRequired);
    return groups;
  }, [groupedOrders, debouncedSkuSearch, debouncedTitleSearch, filterStatus, sortBy]);

  // Stats based on pre-computed status
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
    poNumber: group.poNumbers.join(', '),
    asin: group.asin,
    skuCode: group.skuCode,
    title: group.title,
    requiredQty: group.totalRequired,
    purchasedQty: group.totalPurchased,
    status: group.status,
  }));

  // Virtualizer
  const rowVirtualizer = useVirtualizer({
    count: filteredGroups.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 180,
    overscan: 5,
  });

  const filterLabel = filterStatus === 'not_available' ? 'N/A' : filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1);
  const filterCount = filterStatus === 'purchased' ? stats.purchased : filterStatus === 'partial' ? stats.partial : filterStatus === 'not_available' ? stats.notAvailable : stats.pending;

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
        {/* Collapsible Metrics Header */}
        <Collapsible open={metricsOpen} onOpenChange={setMetricsOpen}>
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-between bg-card border rounded-lg px-4 py-3 hover:bg-accent/50 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <Package className="h-5 w-5 text-primary flex-shrink-0" />
                <span className="font-semibold text-sm truncate">{data.link.title || 'Purchase Tracking'}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge variant="secondary" className="text-xs">
                  {stats.total > 0 ? Math.round(((stats.purchased + stats.partial * 0.5) / stats.total) * 100) : 0}%
                </Badge>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${metricsOpen ? 'rotate-180' : ''}`} />
              </div>
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <PurchaseSummaryHeader
              title={data.link.title}
              description={data.link.description}
              expiresAt={data.link.expires_at}
              stats={stats}
              lastUpdated={data.updates[0]?.updated_at}
            />
          </CollapsibleContent>
        </Collapsible>

        {/* Sticky Search + Filter Bar */}
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b -mx-3 px-3 py-2 md:-mx-6 md:px-6 md:border md:rounded-lg md:mx-0 md:static md:backdrop-blur-none space-y-2">
          {/* Dual Search - always visible */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by SKU / ASIN / PO..."
                value={skuSearchTerm}
                onChange={(e) => setSkuSearchTerm(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                className="pl-9 h-10"
              />
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title..."
                value={titleSearchTerm}
                onChange={(e) => setTitleSearchTerm(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                className="pl-9 h-10"
              />
            </div>
          </div>

          {/* Collapsible Filters */}
          <Collapsible open={filterOpen} onOpenChange={setFilterOpen}>
            <div className="flex items-center gap-2">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-9 gap-1.5 px-2 text-xs">
                  <Filter className="h-3.5 w-3.5" />
                  <span className="font-medium">{filterLabel}</span>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">{filterCount.toLocaleString()}</Badge>
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <div className="flex-1 text-xs text-muted-foreground text-right">
                {filteredGroups.length.toLocaleString()} items
              </div>
              <ExportButton data={exportData} linkTitle={data.link.title} />
            </div>

            <CollapsibleContent className="pt-2">
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
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Virtualized Items List */}
        {filteredGroups.length > 0 ? (
          <div ref={parentRef} className={`h-[calc(100vh-280px)] overflow-auto ${searchFocused ? 'pb-[50vh]' : ''}`}>
            <div
              style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const group = filteredGroups[virtualRow.index];
                const isSelected = isGroupSelected(group);
                const isSaving = savingItems.has(group.key);
                const status = group.status;
                
                return (
                  <div
                    key={group.key}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                    className="pb-3"
                  >
                    <Card 
                      className={`overflow-hidden transition-all border-l-4 h-full ${getStatusBorderColor(status)} ${isSelected ? 'ring-2 ring-primary' : ''}`}
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
                                    loading="lazy"
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

                        {/* Actions row: Scan Done + N/A (no qty input) */}
                        {status !== 'not_available' ? (
                          <div className="flex items-center gap-2">
                            <div className="bg-muted/50 rounded-md px-2.5 py-1.5 text-sm flex items-center gap-1 flex-shrink-0">
                              <span className="text-muted-foreground text-xs">Req:</span>
                              <span className="font-bold">{group.totalRequired.toLocaleString()}</span>
                              {group.orders.length > 1 && (
                                <span className="text-muted-foreground text-[10px]">({group.orders.length} POs)</span>
                              )}
                            </div>
                            
                            {status !== 'purchased' && (
                              <>
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => handleOpenBarcodeScanner(group.key)}
                                  disabled={isSaving}
                                  className="h-10 flex-1 gap-1.5"
                                >
                                  {isSaving ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <ScanLine className="h-4 w-4" />
                                  )}
                                  <span className="text-xs">Scan (Done)</span>
                                </Button>
                                
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleMarkNotAvailable(group.key)}
                                  disabled={isSaving}
                                  className="h-10 px-3 gap-1"
                                >
                                  <XCircle className="h-4 w-4" />
                                  <span className="text-xs">N/A</span>
                                </Button>
                              </>
                            )}
                            
                            {status === 'purchased' && (
                              <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400 text-sm font-medium">
                                <CheckCircle2 className="h-4 w-4" />
                                Done ({group.totalPurchased.toLocaleString()}/{group.totalRequired.toLocaleString()})
                              </div>
                            )}
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
                      </div>
                    </Card>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
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

// Pure function for computing group status using Map
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
    if (update?.metadata?.not_available) {
      someNA = true;
      continue;
    }
    effectivePurchased += update?.purchased_quantity || 0;
    effectiveRequired += order.quantity || 0;
  }

  if (effectiveRequired === 0) return 'not_available';
  if (effectivePurchased >= effectiveRequired) return 'purchased';
  if (effectivePurchased > 0 || someNA) return 'partial';
  return 'pending';
}
