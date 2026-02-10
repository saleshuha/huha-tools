import { useState, useMemo } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Search, Download, Eye, ChevronUp, ChevronDown, Filter, X, CheckSquare, SlidersHorizontal } from 'lucide-react';
import { Order } from '@/types/amazon-fulfillment';
import { useCurrencyConverter } from '@/hooks/useCurrencyConverter';
import { useCurrencyDisplay } from '@/components/amazon/CurrencySelector';
import { useCountry } from '@/contexts/CountryContext';
import { usePaymentTerms } from '@/hooks/usePaymentTerms';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import * as XLSX from 'xlsx';

interface OrdersTableProps {
  orders: Order[];
  onUpdateOrder: (id: string, updates: Partial<Order>) => void;
  onDeleteOrder: (id: string) => void;
  onBulkUpdateStatus?: (ids: string[], status: string) => Promise<void>;
}

export const OrdersTable = ({ orders, onUpdateOrder, onDeleteOrder, onBulkUpdateStatus }: OrdersTableProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [sortField, setSortField] = useState<keyof Order | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const { formatCurrency, convertCurrency } = useCurrencyConverter();
  const { displayCurrency } = useCurrencyDisplay();
  const { selectedCountry } = useCountry();
  const { creditDays } = usePaymentTerms();

  const warehouseCodes = useMemo(() => {
    const codes = new Set(orders.map(o => o.warehouse_code).filter(Boolean));
    return Array.from(codes).sort();
  }, [orders]);

  const sortedOrders = [...orders].sort((a, b) => {
    if (!sortField) return 0;
    const aVal = a[sortField], bVal = b[sortField];
    if (aVal == null) return 1;
    if (bVal == null) return -1;
    if (typeof aVal === 'string' && typeof bVal === 'string')
      return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    if (typeof aVal === 'number' && typeof bVal === 'number')
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    return 0;
  });

  const filteredOrders = sortedOrders.filter(order => {
    if (searchTerm && ![order.order_id, order.item_title, order.asin, order.sku]
      .some(f => f?.toLowerCase().includes(searchTerm.toLowerCase()))) return false;
    if (statusFilter !== 'all' && order.status !== statusFilter) return false;
    if (paymentStatusFilter !== 'all' && order.payment_status !== paymentStatusFilter) return false;
    if (warehouseFilter !== 'all' && order.warehouse_code !== warehouseFilter) return false;
    if (dateRange?.from && dateRange?.to && order.shipment_date) {
      const d = new Date(order.shipment_date);
      if (d < dateRange.from || d > dateRange.to) return false;
    }
    const cost = (order.item_cost || 0) * (order.quantity || 1);
    if (minAmount && cost < parseFloat(minAmount)) return false;
    if (maxAmount && cost > parseFloat(maxAmount)) return false;
    if (overdueOnly) {
      if (!order.shipment_date) return false;
      const s = (order.status || '').toLowerCase().trim();
      if (s !== 'approved' && s !== 'non-submitted') return false;
      const due = new Date(order.shipment_date);
      due.setDate(due.getDate() + creditDays);
      if (due > new Date()) return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSort = (field: keyof Order) => {
    if (sortField === field) setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDirection('asc'); }
  };

  const SortIcon = ({ field }: { field: keyof Order }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ChevronUp className="h-3 w-3 ml-0.5" /> : <ChevronDown className="h-3 w-3 ml-0.5" />;
  };

  const statusColor = (s: string) => {
    switch (s.toLowerCase()) {
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      case 'paid': return 'secondary';
      default: return 'outline';
    }
  };

  const paymentColor = (s: string) => {
    switch (s.toLowerCase()) {
      case 'completed': return 'default';
      case 'overdue': return 'destructive';
      case 'due_soon': return 'secondary';
      default: return 'outline';
    }
  };

  const toggleSelectAll = () => {
    setSelectedIds(selectedIds.size === paginatedOrders.length ? new Set() : new Set(paginatedOrders.map(o => o.id)));
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
  };

  const resetFilters = () => {
    setSearchTerm(''); setStatusFilter('all'); setPaymentStatusFilter('all');
    setWarehouseFilter('all'); setDateRange(undefined); setMinAmount(''); setMaxAmount('');
    setOverdueOnly(false); setCurrentPage(1);
  };

  const hasActiveFilters = searchTerm || statusFilter !== 'all' || paymentStatusFilter !== 'all' || warehouseFilter !== 'all' || dateRange?.from || minAmount || maxAmount || overdueOnly;

  const exportToExcel = (onlySelected = false) => {
    const data = (onlySelected ? filteredOrders.filter(o => selectedIds.has(o.id)) : filteredOrders).map(o => ({
      'Order ID': o.order_id, 'Invoice ID': o.invoice_id || '', ASIN: o.asin || '', SKU: o.sku || '',
      'Item Title': o.item_title || '', Quantity: o.quantity, 'Item Cost': o.item_cost,
      Currency: o.currency, Status: o.status, 'Payment Status': o.payment_status,
      'Shipment Date': o.shipment_date || '', 'Payment Due': o.payment_due_date || '', Country: o.country,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Orders');
    XLSX.writeFile(wb, `amazon-orders-${selectedCountry}-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-2 flex-1">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="pl-8 h-9 w-56 text-sm"
            />
          </div>
          <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-32 h-9 text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Non Submitted">Non Submitted</SelectItem>
              <SelectItem value="Approved">Approved</SelectItem>
              <SelectItem value="Rejected">Rejected</SelectItem>
              <SelectItem value="Paid">Paid</SelectItem>
            </SelectContent>
          </Select>
          <Select value={paymentStatusFilter} onValueChange={v => { setPaymentStatusFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-32 h-9 text-sm"><SelectValue placeholder="Payment" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Payments</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="due_soon">Due Soon</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-1.5">
          <Button variant="ghost" size="sm" className="h-9" onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}>
            <SlidersHorizontal className="h-3.5 w-3.5 mr-1" />
            Filters
            {hasActiveFilters && <span className="ml-1 w-1.5 h-1.5 rounded-full bg-destructive inline-block" />}
          </Button>
          <Button onClick={() => exportToExcel()} variant="ghost" size="sm" className="h-9">
            <Download className="h-3.5 w-3.5 mr-1" /> Export
          </Button>
        </div>
      </div>

      {/* Advanced Filters */}
      <Collapsible open={showAdvancedFilters} onOpenChange={setShowAdvancedFilters}>
        <CollapsibleContent>
          <Card className="border border-border/60">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium">Advanced Filters</span>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={resetFilters}>
                    <X className="h-3 w-3 mr-1" /> Reset
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">Date Range</label>
                  <DatePickerWithRange date={dateRange} onDateChange={(d) => { setDateRange(d); setCurrentPage(1); }} className="w-full" />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">Warehouse</label>
                  <Select value={warehouseFilter} onValueChange={v => { setWarehouseFilter(v); setCurrentPage(1); }}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="All" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {warehouseCodes.map(c => <SelectItem key={c} value={c!}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">Min $</label>
                    <Input type="number" placeholder="0" value={minAmount} onChange={e => { setMinAmount(e.target.value); setCurrentPage(1); }} className="h-9 text-sm" />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">Max $</label>
                    <Input type="number" placeholder="∞" value={maxAmount} onChange={e => { setMaxAmount(e.target.value); setCurrentPage(1); }} className="h-9 text-sm" />
                  </div>
                </div>
                <div className="flex items-end">
                  <Button
                    variant={overdueOnly ? 'destructive' : 'outline'}
                    size="sm"
                    className="w-full h-9 text-xs"
                    onClick={() => { setOverdueOnly(!overdueOnly); setCurrentPage(1); }}
                  >
                    Overdue Only
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 p-2 bg-primary/5 border border-primary/20 rounded-lg text-sm">
          <CheckSquare className="h-3.5 w-3.5 text-primary" />
          <span className="font-medium">{selectedIds.size} selected</span>
          <div className="flex gap-1.5 ml-auto">
            {onBulkUpdateStatus && (
              <Button size="sm" className="h-7 text-xs" onClick={() => onBulkUpdateStatus(Array.from(selectedIds), 'completed').then(() => setSelectedIds(new Set()))}>
                Mark Paid
              </Button>
            )}
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => exportToExcel(true)}>
              Export
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setSelectedIds(new Set())}>Clear</Button>
          </div>
        </div>
      )}

      {/* Summary & Per-page */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{filteredOrders.length} orders {filteredOrders.length !== orders.length && `(filtered from ${orders.length})`}</span>
        <Select value={itemsPerPage.toString()} onValueChange={(v) => { setItemsPerPage(Number(v)); setCurrentPage(1); }}>
          <SelectTrigger className="w-24 h-7 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[50, 100, 500].map(n => <SelectItem key={n} value={n.toString()}>{n}/page</SelectItem>)}
            <SelectItem value={filteredOrders.length.toString()}>All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border border-border/60 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="w-8 px-3">
                  <Checkbox checked={paginatedOrders.length > 0 && selectedIds.size === paginatedOrders.length} onCheckedChange={toggleSelectAll} />
                </TableHead>
                {[
                  { field: 'order_id' as keyof Order, label: 'Order' },
                  { field: 'item_title' as keyof Order, label: 'Item' },
                  { field: 'item_cost' as keyof Order, label: 'Cost' },
                  { field: 'status' as keyof Order, label: 'Status' },
                  { field: 'payment_status' as keyof Order, label: 'Payment' },
                  { field: 'shipment_date' as keyof Order, label: 'Dates' },
                ].map(({ field, label }) => (
                  <TableHead key={field}>
                    <button onClick={() => handleSort(field)} className="flex items-center text-xs font-semibold hover:text-foreground transition-colors">
                      {label} <SortIcon field={field} />
                    </button>
                  </TableHead>
                ))}
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedOrders.map((order, idx) => (
                <TableRow
                  key={order.id}
                  className={`text-sm transition-colors ${idx % 2 === 1 ? 'bg-muted/10' : ''} ${selectedIds.has(order.id) ? 'bg-primary/5' : ''}`}
                >
                  <TableCell className="px-3">
                    <Checkbox checked={selectedIds.has(order.id)} onCheckedChange={() => toggleSelect(order.id)} />
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-xs">{order.order_id}</div>
                    {order.invoice_id && <div className="text-[10px] text-muted-foreground">INV: {order.invoice_id}</div>}
                  </TableCell>
                  <TableCell>
                    <div className="text-xs font-medium truncate max-w-[200px]">{order.item_title || '—'}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {[order.asin && `ASIN: ${order.asin}`, order.sku && `SKU: ${order.sku}`, `Qty: ${order.quantity}`].filter(Boolean).join(' · ')}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs font-medium tabular-nums">
                      {formatCurrency(convertCurrency(order.item_cost, order.currency, displayCurrency), displayCurrency)}
                    </div>
                    {displayCurrency !== order.currency && (
                      <div className="text-[10px] text-muted-foreground tabular-nums">{formatCurrency(order.item_cost, order.currency)}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusColor(order.status)} className="text-[10px] px-1.5 h-5">{order.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={paymentColor(
                      (order.status.toLowerCase() === 'paid' || order.payment_status.toLowerCase() === 'completed') ? 'completed' : order.payment_status
                    )} className="text-[10px] px-1.5 h-5">
                      {(order.status.toLowerCase() === 'paid' || order.payment_status.toLowerCase() === 'completed') ? 'completed' : order.payment_status.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-[10px] text-muted-foreground space-y-0.5">
                      {order.shipment_date && <div>Ship: {new Date(order.shipment_date).toLocaleDateString()}</div>}
                      {order.payment_due_date && <div>Due: {new Date(order.payment_due_date).toLocaleDateString()}</div>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setSelectedOrder(order)}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Page {currentPage} of {totalPages}</span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Prev</Button>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next</Button>
          </div>
        </div>
      )}

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">Order: {selectedOrder?.order_id}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <DetailSection title="Order Info" items={[
                ['Order ID', selectedOrder.order_id],
                selectedOrder.invoice_id ? ['Invoice', selectedOrder.invoice_id] : null,
                selectedOrder.vat_id ? ['VAT ID', selectedOrder.vat_id] : null,
                ['Country', selectedOrder.country],
                selectedOrder.warehouse_code ? ['Warehouse', selectedOrder.warehouse_code] : null,
              ].filter(Boolean) as [string, string][]} />
              <DetailSection title="Product" items={[
                ['Title', selectedOrder.item_title || 'N/A'],
                selectedOrder.asin ? ['ASIN', selectedOrder.asin] : null,
                selectedOrder.sku ? ['SKU', selectedOrder.sku] : null,
                ['Quantity', selectedOrder.quantity.toString()],
              ].filter(Boolean) as [string, string][]} />
              <DetailSection title="Financial" items={[
                ['Cost', formatCurrency(selectedOrder.item_cost, selectedOrder.currency)],
                displayCurrency !== selectedOrder.currency ? ['Converted', formatCurrency(convertCurrency(selectedOrder.item_cost, selectedOrder.currency, displayCurrency), displayCurrency)] : null,
                ['Tax Rate', `${selectedOrder.tax_rate}%`],
                ['Total', formatCurrency(convertCurrency(selectedOrder.item_cost * selectedOrder.quantity, selectedOrder.currency, displayCurrency), displayCurrency)],
              ].filter(Boolean) as [string, string][]} />
              <DetailSection title="Status & Dates" items={[
                ['Status', selectedOrder.status],
                ['Payment', selectedOrder.payment_status.replace('_', ' ')],
                ['Credit Terms', `${creditDays} days`],
                selectedOrder.shipment_date ? ['Shipped', new Date(selectedOrder.shipment_date).toLocaleDateString()] : null,
                selectedOrder.invoice_date ? ['Invoiced', new Date(selectedOrder.invoice_date).toLocaleDateString()] : null,
                selectedOrder.payment_due_date ? ['Due', new Date(selectedOrder.payment_due_date).toLocaleDateString()] : null,
                selectedOrder.payment_completed_date ? ['Paid On', new Date(selectedOrder.payment_completed_date).toLocaleDateString()] : null,
              ].filter(Boolean) as [string, string][]} />
              {selectedOrder.payment_notes && (
                <div className="col-span-full">
                  <h4 className="text-xs font-semibold text-muted-foreground mb-1">Notes</h4>
                  <p className="text-xs bg-muted p-2 rounded-md">{selectedOrder.payment_notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const DetailSection = ({ title, items }: { title: string; items: [string, string][] }) => (
  <div>
    <h4 className="text-xs font-semibold text-muted-foreground mb-2">{title}</h4>
    <div className="space-y-1.5">
      {items.map(([k, v]) => (
        <div key={k} className="flex justify-between text-xs">
          <span className="text-muted-foreground">{k}</span>
          <span className="font-medium">{v}</span>
        </div>
      ))}
    </div>
  </div>
);
