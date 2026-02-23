import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { NoonStore } from '@/hooks/useNoonStores';
import { Search, Package, Trash2, Settings2, ChevronDown, ChevronLeft, ChevronRight, FileDown, MoreHorizontal, Eye, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FilterChips } from '@/components/order-processing/FilterChips';

interface SearchChip {
  type: string;
  value: string;
}

const SEARCH_TYPE_OPTIONS = [
  { label: 'All', fields: ['order_nr', 'purchase_item_nr', 'sku', 'partner_sku', 'title', 'order_country_code'] },
  { label: 'Order Nr', fields: ['order_nr'] },
  { label: 'SKU', fields: ['sku'] },
  { label: 'Partner SKU', fields: ['partner_sku'] },
  { label: 'Title', fields: ['title'] },
  { label: 'Item Nr', fields: ['purchase_item_nr'] },
  { label: 'Country', fields: ['order_country_code'] },
];

interface ProcessingOrder {
  id: string;
  order_nr: string;
  order_status: string;
  quantity: number;
  purchase_item_nr: string;
  sku: string;
  partner_sku: string;
  title: string;
  order_country_code: string;
  file_name: string;
  file_upload_date?: string;
  order_received_at?: string;
  created_at: string;
  image_key?: string;
  selected_store_id?: string;
}

const ALL_COLUMNS = [
  { key: 'select', label: '', default: true },
  { key: 'image', label: 'Image', default: true },
  { key: 'order_nr', label: 'Order Nr', default: true },
  { key: 'purchase_item_nr', label: 'Item Nr', default: true },
  { key: 'sku', label: 'SKU', default: true },
  { key: 'partner_sku', label: 'Partner SKU', default: true },
  { key: 'title', label: 'Title', default: true },
  { key: 'quantity', label: 'Qty', default: true },
  { key: 'order_status', label: 'Status', default: true },
  { key: 'order_country_code', label: 'Country', default: true },
  { key: 'order_received_at', label: 'Order Date', default: true },
  { key: 'file_upload_date', label: 'File Upload', default: false },
  { key: 'created_at', label: 'Created', default: false },
  { key: 'file_name', label: 'File Name', default: false },
  { key: 'actions', label: '', default: true },
];

const STATUS_OPTIONS = ['All', 'Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
const PAGE_SIZES = [25, 50, 100];

interface NoonOrdersTabProps {
  stores: NoonStore[];
  selectedStoreId: string;
  onStoreChange: (id: string) => void;
}

export function NoonOrdersTab({ stores, selectedStoreId, onStoreChange }: NoonOrdersTabProps) {
  const [orders, setOrders] = useState<ProcessingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchChips, setSearchChips] = useState<SearchChip[]>([]);
  const [searchType, setSearchType] = useState('All');
  const [inputValue, setInputValue] = useState('');
  const chipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    ALL_COLUMNS.filter(col => col.default).map(col => col.key)
  );
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const fetchOrders = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('noon_processing_orders')
        .select('id, order_nr, order_status, quantity, purchase_item_nr, sku, partner_sku, title, order_country_code, file_name, file_upload_date, order_received_at, created_at, image_key, selected_store_id')
        .order('created_at', { ascending: false });
      if (selectedStoreId) query = query.eq('selected_store_id', selectedStoreId as any);
      const { data, error } = await query;
      if (error) throw error;
      setOrders((data as any) || []);
    } catch (error) {
      console.error('Error fetching processing orders:', error);
      toast({ title: "Error", description: "Failed to fetch processing orders", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, [selectedStoreId]);

  // Auto-chip creation with 1.5s debounce
  const createChip = useCallback(() => {
    const val = inputValue.trim();
    if (!val) return;
    const isDuplicate = searchChips.some(c => c.type === searchType && c.value.toLowerCase() === val.toLowerCase());
    if (!isDuplicate) {
      setSearchChips(prev => [...prev, { type: searchType, value: val }]);
    }
    setInputValue('');
  }, [inputValue, searchType, searchChips]);

  useEffect(() => {
    if (!inputValue.trim()) return;
    chipTimerRef.current = setTimeout(() => {
      createChip();
    }, 1500);
    return () => {
      if (chipTimerRef.current) clearTimeout(chipTimerRef.current);
    };
  }, [inputValue, createChip]);

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (chipTimerRef.current) clearTimeout(chipTimerRef.current);
      createChip();
    }
  };

  const removeChip = (index: number) => {
    setSearchChips(prev => prev.filter((_, i) => i !== index));
  };

  const clearAllChips = () => {
    setSearchChips([]);
  };

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // Check all chips (AND logic)
      const matchesChips = searchChips.length === 0 || searchChips.every(chip => {
        const searchVal = chip.value.toLowerCase();
        const typeOption = SEARCH_TYPE_OPTIONS.find(t => t.label === chip.type);
        const fields = typeOption?.fields || SEARCH_TYPE_OPTIONS[0].fields;
        return fields.some(field => {
          const fieldValue = (order as any)[field];
          return fieldValue && String(fieldValue).toLowerCase().includes(searchVal);
        });
      });
      const matchesStatus = statusFilter === 'All' || 
        (order.order_status && order.order_status.toLowerCase() === statusFilter.toLowerCase());
      return matchesChips && matchesStatus;
    });
  }, [orders, searchChips, statusFilter]);

  const paginatedOrders = useMemo(() => {
    const start = page * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, page, pageSize]);

  const totalPages = Math.ceil(filteredOrders.length / pageSize);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { All: orders.length };
    orders.forEach(o => {
      const s = o.order_status?.toLowerCase() || 'unknown';
      const key = s.charAt(0).toUpperCase() + s.slice(1);
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [orders]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedOrders.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(paginatedOrders.map(o => o.id)));
  };

  const deleteSelected = async () => {
    if (selectedIds.size === 0) return;
    try {
      const ids = Array.from(selectedIds);
      const { error } = await supabase.from('noon_processing_orders').delete().in('id', ids as any);
      if (error) throw error;
      setOrders(prev => prev.filter(o => !selectedIds.has(o.id)));
      setSelectedIds(new Set());
      toast({ title: "Deleted", description: `${ids.length} orders deleted` });
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete orders", variant: "destructive" });
    }
  };

  const deleteOrder = async (id: string) => {
    try {
      const { error } = await supabase.from('noon_processing_orders').delete().eq('id', id as any);
      if (error) throw error;
      setOrders(prev => prev.filter(o => o.id !== id));
      toast({ title: "Deleted", description: "Order deleted" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete order", variant: "destructive" });
    }
  };

  const clearAllOrders = async () => {
    try {
      let query = supabase.from('noon_processing_orders').delete().neq('id', '00000000-0000-0000-0000-000000000000' as any);
      if (selectedStoreId) query = query.eq('selected_store_id', selectedStoreId as any);
      const { error } = await query;
      if (error) throw error;
      setOrders([]);
      toast({ title: "Success", description: "All processing orders cleared" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to clear orders", variant: "destructive" });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'processing': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'shipped': return 'bg-primary/10 text-primary border-primary/20';
      case 'delivered': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case 'cancelled': return 'bg-destructive/10 text-destructive border-destructive/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString() : 'N/A';
  const formatDateTime = (d?: string) => d ? new Date(d).toLocaleString() : 'N/A';

  const toggleColumn = (key: string) => {
    setVisibleColumns(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stat Bar */}
      <div className="flex flex-wrap items-center gap-3 p-2.5 rounded-xl bg-card border border-border">
        <div className="flex items-center gap-2 px-3 py-1.5">
          <div className="w-2 h-2 rounded-full bg-primary" />
          <span className="text-xs text-muted-foreground">Total</span>
          <span className="text-sm font-semibold text-foreground">{orders.length}</span>
        </div>
        {['Pending', 'Processing', 'Shipped', 'Delivered'].map(status => (
          <React.Fragment key={status}>
            <div className="w-px h-6 bg-border" />
            <div className="flex items-center gap-2 px-3 py-1.5">
              <div className={`w-2 h-2 rounded-full ${
                status === 'Pending' ? 'bg-yellow-500' : status === 'Processing' ? 'bg-blue-500' : status === 'Shipped' ? 'bg-primary' : 'bg-emerald-500'
              }`} />
              <span className="text-xs text-muted-foreground">{status}</span>
              <span className="text-sm font-semibold text-foreground">{statusCounts[status] || 0}</span>
            </div>
          </React.Fragment>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-card border border-border">
        {/* Status filter pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {STATUS_OPTIONS.map(status => (
            <button
              key={status}
              onClick={() => { setStatusFilter(status); setPage(0); }}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                statusFilter === status
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              }`}
            >
              {status} {statusCounts[status] !== undefined ? `(${statusCounts[status]})` : ''}
            </button>
          ))}
        </div>

        <div className="w-px h-6 bg-border hidden sm:block" />

        {/* Store filter */}
        <select
          value={selectedStoreId}
          onChange={e => { onStoreChange(e.target.value); setPage(0); }}
          className="px-3 py-1.5 rounded-lg border border-border bg-background text-foreground text-xs min-w-[140px] outline-none"
        >
          <option value="">All Stores</option>
          {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>

        {/* Search with type selector */}
        <div className="flex flex-1 min-w-[200px] gap-1.5">
          <Select value={searchType} onValueChange={setSearchType}>
            <SelectTrigger className="h-8 w-[120px] text-xs border-border bg-background shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              {SEARCH_TYPE_OPTIONS.map(opt => (
                <SelectItem key={opt.label} value={opt.label} className="text-xs">{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder={`Search by ${searchType.toLowerCase()}...`}
              value={inputValue}
              onChange={e => { setInputValue(e.target.value); setPage(0); }}
              onKeyDown={handleSearchKeyDown}
              className="pl-8 h-8 text-xs border-border bg-background"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {/* Bulk actions */}
          {selectedIds.size > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="text-xs h-8 gap-1">
                  Actions ({selectedIds.size}) <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={deleteSelected} className="text-destructive">
                  <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete Selected
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Column toggle */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                <Settings2 className="h-3.5 w-3.5" /> Columns
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48">
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase">Toggle Columns</h4>
                {ALL_COLUMNS.filter(c => c.key !== 'select' && c.key !== 'actions').map(col => (
                  <div key={col.key} className="flex items-center gap-2">
                    <Checkbox id={`col-${col.key}`} checked={visibleColumns.includes(col.key)} onCheckedChange={() => toggleColumn(col.key)} />
                    <label htmlFor={`col-${col.key}`} className="text-xs text-foreground">{col.label}</label>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {orders.length > 0 && (
            <Button variant="outline" size="sm" onClick={clearAllOrders} className="h-8 text-xs text-destructive hover:text-destructive border-destructive/20 hover:bg-destructive/5 gap-1">
              <Trash2 className="h-3.5 w-3.5" /> Clear All
            </Button>
          )}

          <Badge variant="secondary" className="text-xs">{filteredOrders.length} items</Badge>
        </div>
      </div>

      {/* Search Chips */}
      {searchChips.length > 0 && (
        <FilterChips
          filters={searchChips.map((chip, index) => ({
            label: chip.type,
            value: chip.value,
            onRemove: () => removeChip(index),
          }))}
          onClearAll={clearAllChips}
        />
      )}

      {/* Desktop Table */}
      {filteredOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
            <Package className="h-7 w-7 text-muted-foreground/60" />
          </div>
          <p className="text-sm font-medium text-foreground">{orders.length === 0 ? 'No processing orders' : 'No orders match your filters'}</p>
          <p className="text-xs text-muted-foreground mt-1">{orders.length === 0 ? 'Upload orders in the Upload tab' : 'Try adjusting your search or filters'}</p>
        </div>
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden md:block border border-border rounded-xl overflow-hidden bg-card">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/40">
                    {visibleColumns.includes('select') && (
                      <th className="p-3 w-10">
                        <Checkbox
                          checked={selectedIds.size === paginatedOrders.length && paginatedOrders.length > 0}
                          onCheckedChange={toggleSelectAll}
                        />
                      </th>
                    )}
                    {visibleColumns.filter(k => k !== 'select' && k !== 'actions').map(key => {
                      const col = ALL_COLUMNS.find(c => c.key === key);
                      return <th key={key} className="text-left p-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{col?.label}</th>;
                    })}
                    {visibleColumns.includes('actions') && <th className="p-3 w-10" />}
                  </tr>
                </thead>
                <tbody>
                  {paginatedOrders.map((order, i) => (
                    <tr key={order.id} className={`border-t border-border/30 transition-colors hover:bg-muted/20 ${i % 2 === 0 ? '' : 'bg-muted/10'}`}>
                      {visibleColumns.includes('select') && (
                        <td className="p-3"><Checkbox checked={selectedIds.has(order.id)} onCheckedChange={() => toggleSelect(order.id)} /></td>
                      )}
                      {visibleColumns.filter(k => k !== 'select' && k !== 'actions').map(key => (
                        <td key={key} className="p-3 text-sm">
                          {key === 'image' ? (
                            order.image_key ? (
                              <img src={`https://z.nooncdn.com/tr:n-t_400/${order.image_key}.jpg`} alt="" className="w-10 h-10 object-contain rounded border bg-white" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                            ) : (
                              <div className="w-10 h-10 rounded border bg-muted flex items-center justify-center"><Package className="w-5 h-5 text-muted-foreground" /></div>
                            )
                          ) : key === 'order_nr' ? (
                            <span className="font-mono font-medium text-foreground">{order.order_nr}</span>
                          ) : key === 'purchase_item_nr' ? (
                            <span className="font-mono text-muted-foreground">{order.purchase_item_nr}</span>
                          ) : key === 'sku' ? (
                            <span className="font-mono text-foreground">{order.sku || 'N/A'}</span>
                          ) : key === 'partner_sku' ? (
                            <span className="font-mono text-muted-foreground">{order.partner_sku || 'N/A'}</span>
                          ) : key === 'title' ? (
                            <span className="max-w-[200px] truncate block text-foreground" title={order.title}>{order.title || 'N/A'}</span>
                          ) : key === 'quantity' ? (
                            <span className="font-medium">{order.quantity}</span>
                          ) : key === 'order_status' ? (
                            <Badge className={`${getStatusColor(order.order_status)} border`}>{order.order_status || 'Unknown'}</Badge>
                          ) : key === 'order_country_code' ? (
                            <span className="uppercase font-medium">{order.order_country_code}</span>
                          ) : key === 'order_received_at' ? (
                            <span className="text-muted-foreground">{formatDateTime(order.order_received_at)}</span>
                          ) : key === 'file_upload_date' ? (
                            <span className="text-muted-foreground">{formatDate(order.file_upload_date)}</span>
                          ) : key === 'created_at' ? (
                            <span className="text-muted-foreground">{formatDate(order.created_at)}</span>
                          ) : key === 'file_name' ? (
                            <span className="text-muted-foreground text-xs">{order.file_name}</span>
                          ) : 'N/A'}
                        </td>
                      ))}
                      {visibleColumns.includes('actions') && (
                        <td className="p-3">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => deleteOrder(order.id)} className="text-destructive">
                                <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {paginatedOrders.map(order => (
              <div key={order.id} className="p-3 rounded-xl bg-card border border-border space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Checkbox checked={selectedIds.has(order.id)} onCheckedChange={() => toggleSelect(order.id)} />
                    {order.image_key ? (
                      <img src={`https://z.nooncdn.com/tr:n-t_400/${order.image_key}.jpg`} alt="" className="w-10 h-10 object-contain rounded border bg-white shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded border bg-muted flex items-center justify-center shrink-0"><Package className="w-5 h-5 text-muted-foreground" /></div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{order.title || 'N/A'}</p>
                      <p className="text-xs font-mono text-muted-foreground">{order.order_nr}</p>
                    </div>
                  </div>
                  <Badge className={`${getStatusColor(order.order_status)} border text-xs shrink-0`}>{order.order_status || 'Unknown'}</Badge>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>SKU: {order.sku || 'N/A'}</span>
                  <span>•</span>
                  <span>Qty: {order.quantity}</span>
                  <span>•</span>
                  <span>{order.order_country_code}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-card border border-border">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={e => { setPageSize(Number(e.target.value)); setPage(0); }}
                  className="px-2 py-1 rounded border border-border bg-background text-xs outline-none"
                >
                  {PAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {page * pageSize + 1}-{Math.min((page + 1) * pageSize, filteredOrders.length)} of {filteredOrders.length}
                </span>
                <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
