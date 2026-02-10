import { useState, useMemo } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Search, Download, Eye, ChevronUp, ChevronDown, Filter, X, CheckSquare } from 'lucide-react';
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

  // Unique warehouse codes for filter dropdown
  const warehouseCodes = useMemo(() => {
    const codes = new Set(orders.map(o => o.warehouse_code).filter(Boolean));
    return Array.from(codes).sort();
  }, [orders]);

  // Sort orders
  const sortedOrders = [...orders].sort((a, b) => {
    if (!sortField) return 0;
    const aValue = a[sortField];
    const bValue = b[sortField];
    if (aValue === null || aValue === undefined) return 1;
    if (bValue === null || bValue === undefined) return -1;
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    }
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    }
    return 0;
  });

  // Filter orders
  const filteredOrders = sortedOrders.filter(order => {
    const matchesSearch = searchTerm === '' ||
      order.order_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.item_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.asin?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.sku?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesPaymentStatus = paymentStatusFilter === 'all' || order.payment_status === paymentStatusFilter;
    const matchesWarehouse = warehouseFilter === 'all' || order.warehouse_code === warehouseFilter;

    // Date range filter
    let matchesDate = true;
    if (dateRange?.from && dateRange?.to && order.shipment_date) {
      const shipDate = new Date(order.shipment_date);
      matchesDate = shipDate >= dateRange.from && shipDate <= dateRange.to;
    }

    // Amount range filter
    let matchesAmount = true;
    const cost = (order.item_cost || 0) * (order.quantity || 1);
    if (minAmount && cost < parseFloat(minAmount)) matchesAmount = false;
    if (maxAmount && cost > parseFloat(maxAmount)) matchesAmount = false;

    // Overdue only filter
    let matchesOverdue = true;
    if (overdueOnly) {
      if (!order.shipment_date) {
        matchesOverdue = false;
      } else {
        const status = (order.status || '').toLowerCase().trim();
        if (status !== 'approved' && status !== 'non-submitted') {
          matchesOverdue = false;
        } else {
          const dueDate = new Date(order.shipment_date);
          dueDate.setDate(dueDate.getDate() + creditDays);
          matchesOverdue = dueDate <= new Date();
        }
      }
    }

    return matchesSearch && matchesStatus && matchesPaymentStatus && matchesWarehouse && matchesDate && matchesAmount && matchesOverdue;
  });

  // Paginate
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedOrders = filteredOrders.slice(startIndex, startIndex + itemsPerPage);

  const handleSort = (field: keyof Order) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: keyof Order) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ?
      <ChevronUp className="h-4 w-4 ml-1" /> :
      <ChevronDown className="h-4 w-4 ml-1" />;
  };

  const getStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      case 'paid': return 'secondary';
      default: return 'outline';
    }
  };

  const getPaymentStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'default';
      case 'overdue': return 'destructive';
      case 'due_soon': return 'secondary';
      default: return 'outline';
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedOrders.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedOrders.map(o => o.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setPaymentStatusFilter('all');
    setWarehouseFilter('all');
    setDateRange(undefined);
    setMinAmount('');
    setMaxAmount('');
    setOverdueOnly(false);
    setCurrentPage(1);
  };

  const hasActiveFilters = searchTerm || statusFilter !== 'all' || paymentStatusFilter !== 'all' || warehouseFilter !== 'all' || dateRange?.from || minAmount || maxAmount || overdueOnly;

  const exportToExcel = (onlySelected = false) => {
    const dataToExport = onlySelected
      ? filteredOrders.filter(o => selectedIds.has(o.id))
      : filteredOrders;

    const exportData = dataToExport.map(order => ({
      'Order ID': order.order_id,
      'Invoice ID': order.invoice_id || '',
      'ASIN': order.asin || '',
      'SKU': order.sku || '',
      'Item Title': order.item_title || '',
      'Quantity': order.quantity,
      'Item Cost': order.item_cost,
      'Currency': order.currency,
      'Status': order.status,
      'Payment Status': order.payment_status,
      'Shipment Date': order.shipment_date || '',
      'Payment Due Date': order.payment_due_date || '',
      'Country': order.country,
      'Created At': new Date(order.created_at).toLocaleDateString(),
      'Last Modified': new Date(order.updated_at).toLocaleDateString() + ' ' + new Date(order.updated_at).toLocaleTimeString(),
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Orders');
    XLSX.writeFile(wb, `amazon-orders-${selectedCountry}-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-4">
      {/* Primary Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search orders, ASIN, SKU..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="pl-10 w-full sm:w-64"
            />
          </div>

          <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Non Submitted">Non Submitted</SelectItem>
              <SelectItem value="Approved">Approved</SelectItem>
              <SelectItem value="Rejected">Rejected</SelectItem>
              <SelectItem value="Paid">Paid</SelectItem>
            </SelectContent>
          </Select>

          <Select value={paymentStatusFilter} onValueChange={v => { setPaymentStatusFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Payment" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Payments</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="due_soon">Due Soon</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={itemsPerPage.toString()} onValueChange={(value) => { setItemsPerPage(Number(value)); setCurrentPage(1); }}>
            <SelectTrigger className="w-full sm:w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="50">50 per page</SelectItem>
              <SelectItem value="100">100 per page</SelectItem>
              <SelectItem value="500">500 per page</SelectItem>
              <SelectItem value="1000">1000 per page</SelectItem>
              <SelectItem value={filteredOrders.length.toString()}>All ({filteredOrders.length})</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" size="sm" onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}>
            <Filter className="h-4 w-4 mr-1" />
            Filters
            {hasActiveFilters && <Badge variant="destructive" className="ml-1 h-4 w-4 p-0 text-[10px] flex items-center justify-center rounded-full">!</Badge>}
          </Button>
          <Button onClick={() => exportToExcel()} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1" /> Export
          </Button>
        </div>
      </div>

      {/* Advanced Filters */}
      <Collapsible open={showAdvancedFilters} onOpenChange={setShowAdvancedFilters}>
        <CollapsibleContent>
          <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Advanced Filters</span>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={resetFilters}>
                  <X className="h-3 w-3 mr-1" /> Reset All
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Shipment Date Range</label>
                <DatePickerWithRange date={dateRange} onDateChange={(d) => { setDateRange(d); setCurrentPage(1); }} className="w-full" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Warehouse</label>
                <Select value={warehouseFilter} onValueChange={v => { setWarehouseFilter(v); setCurrentPage(1); }}>
                  <SelectTrigger><SelectValue placeholder="All Warehouses" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Warehouses</SelectItem>
                    {warehouseCodes.map(code => (
                      <SelectItem key={code} value={code!}>{code}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Min Amount</label>
                  <Input type="number" placeholder="0" value={minAmount} onChange={e => { setMinAmount(e.target.value); setCurrentPage(1); }} className="h-9" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Max Amount</label>
                  <Input type="number" placeholder="∞" value={maxAmount} onChange={e => { setMaxAmount(e.target.value); setCurrentPage(1); }} className="h-9" />
                </div>
              </div>
              <div className="flex items-end">
                <Button
                  variant={overdueOnly ? 'destructive' : 'outline'}
                  size="sm"
                  className="w-full h-9"
                  onClick={() => { setOverdueOnly(!overdueOnly); setCurrentPage(1); }}
                >
                  Overdue Only
                </Button>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <CheckSquare className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <div className="flex gap-2 ml-auto">
            {onBulkUpdateStatus && (
              <Button size="sm" variant="default" onClick={() => onBulkUpdateStatus(Array.from(selectedIds), 'completed').then(() => setSelectedIds(new Set()))}>
                Mark as Paid
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => exportToExcel(true)}>
              <Download className="h-3 w-3 mr-1" /> Export Selected
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Results summary */}
      <div className="text-sm text-muted-foreground">
        Showing {paginatedOrders.length} of {filteredOrders.length} orders
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={paginatedOrders.length > 0 && selectedIds.size === paginatedOrders.length}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('order_id')} className="h-auto p-0 font-semibold hover:bg-transparent">
                    Order ID {getSortIcon('order_id')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('item_title')} className="h-auto p-0 font-semibold hover:bg-transparent">
                    Item Details {getSortIcon('item_title')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('item_cost')} className="h-auto p-0 font-semibold hover:bg-transparent">
                    Cost {getSortIcon('item_cost')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('status')} className="h-auto p-0 font-semibold hover:bg-transparent">
                    Status {getSortIcon('status')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('payment_status')} className="h-auto p-0 font-semibold hover:bg-transparent">
                    Payment {getSortIcon('payment_status')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('shipment_date')} className="h-auto p-0 font-semibold hover:bg-transparent">
                    Dates {getSortIcon('shipment_date')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('updated_at')} className="h-auto p-0 font-semibold hover:bg-transparent">
                    Last Modified {getSortIcon('updated_at')}
                  </Button>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedOrders.map((order, idx) => (
                <TableRow
                  key={order.id}
                  className={`hover:bg-muted/50 transition-colors ${idx % 2 === 0 ? '' : 'bg-muted/20'} ${selectedIds.has(order.id) ? 'bg-primary/5' : ''}`}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(order.id)}
                      onCheckedChange={() => toggleSelect(order.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    <div>
                      <div className="font-semibold">{order.order_id}</div>
                      {order.invoice_id && (
                        <div className="text-xs text-muted-foreground">INV: {order.invoice_id}</div>
                      )}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium text-sm">{order.item_title || 'No title'}</div>
                      {order.asin && <div className="text-xs text-muted-foreground">ASIN: {order.asin}</div>}
                      {order.sku && <div className="text-xs text-muted-foreground">SKU: {order.sku}</div>}
                      <div className="text-xs">Qty: {order.quantity}</div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">
                        {formatCurrency(convertCurrency(order.item_cost, order.currency, displayCurrency), displayCurrency)}
                      </div>
                      {displayCurrency !== order.currency && (
                        <div className="text-xs text-muted-foreground">
                          Original: {formatCurrency(order.item_cost, order.currency)}
                        </div>
                      )}
                    </div>
                  </TableCell>

                  <TableCell>
                    <Badge variant={getStatusVariant(order.status)}>{order.status}</Badge>
                  </TableCell>

                  <TableCell>
                    <div className="space-y-1">
                      <Badge variant={getPaymentStatusVariant(
                        (order.status.toLowerCase() === 'paid' || order.payment_status.toLowerCase() === 'completed') ? 'completed' : order.payment_status
                      )}>
                        {(order.status.toLowerCase() === 'paid' || order.payment_status.toLowerCase() === 'completed')
                          ? 'completed'
                          : order.payment_status.replace('_', ' ')
                        }
                      </Badge>
                      {order.payment_due_date && (
                        <div className="text-xs text-muted-foreground">
                          Due: {new Date(order.payment_due_date).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="text-xs space-y-1">
                      {order.shipment_date && <div>Ship: {new Date(order.shipment_date).toLocaleDateString()}</div>}
                      {order.invoice_date && <div>Inv: {new Date(order.invoice_date).toLocaleDateString()}</div>}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="text-xs text-muted-foreground">
                      {new Date(order.updated_at).toLocaleDateString()} {new Date(order.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </TableCell>

                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedOrder(order)}>
                      <Eye className="h-4 w-4" />
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
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Previous</Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next</Button>
          </div>
        </div>
      )}

      {/* Order Details Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Details - {selectedOrder?.order_id}</DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground">Order Information</h3>
                  <div className="space-y-2 mt-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Order ID:</span>
                      <span className="text-sm font-medium">{selectedOrder.order_id}</span>
                    </div>
                    {selectedOrder.invoice_id && (
                      <div className="flex justify-between">
                        <span className="text-sm">Invoice ID:</span>
                        <span className="text-sm font-medium">{selectedOrder.invoice_id}</span>
                      </div>
                    )}
                    {selectedOrder.vat_id && (
                      <div className="flex justify-between">
                        <span className="text-sm">VAT ID:</span>
                        <span className="text-sm font-medium">{selectedOrder.vat_id}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-sm">Country:</span>
                      <span className="text-sm font-medium">{selectedOrder.country}</span>
                    </div>
                    {selectedOrder.warehouse_code && (
                      <div className="flex justify-between">
                        <span className="text-sm">Warehouse:</span>
                        <span className="text-sm font-medium">{selectedOrder.warehouse_code}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground">Product Information</h3>
                  <div className="space-y-2 mt-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Title:</span>
                      <span className="text-sm font-medium">{selectedOrder.item_title || 'N/A'}</span>
                    </div>
                    {selectedOrder.asin && (
                      <div className="flex justify-between">
                        <span className="text-sm">ASIN:</span>
                        <span className="text-sm font-medium">{selectedOrder.asin}</span>
                      </div>
                    )}
                    {selectedOrder.sku && (
                      <div className="flex justify-between">
                        <span className="text-sm">SKU:</span>
                        <span className="text-sm font-medium">{selectedOrder.sku}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-sm">Quantity:</span>
                      <span className="text-sm font-medium">{selectedOrder.quantity}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground">Financial Information</h3>
                  <div className="space-y-2 mt-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Original Cost:</span>
                      <span className="text-sm font-medium">{formatCurrency(selectedOrder.item_cost, selectedOrder.currency)}</span>
                    </div>
                    {displayCurrency !== selectedOrder.currency && (
                      <div className="flex justify-between">
                        <span className="text-sm">Converted Cost:</span>
                        <span className="text-sm font-medium">
                          {formatCurrency(convertCurrency(selectedOrder.item_cost, selectedOrder.currency, displayCurrency), displayCurrency)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-sm">Tax Rate:</span>
                      <span className="text-sm font-medium">{selectedOrder.tax_rate}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Total Value:</span>
                      <span className="text-sm font-medium">
                        {formatCurrency(convertCurrency(selectedOrder.item_cost * selectedOrder.quantity, selectedOrder.currency, displayCurrency), displayCurrency)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground">Status Information</h3>
                  <div className="space-y-2 mt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Order Status:</span>
                      <Badge variant={getStatusVariant(selectedOrder.status)}>{selectedOrder.status}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Payment Status:</span>
                      <Badge variant={getPaymentStatusVariant(selectedOrder.payment_status)}>
                        {selectedOrder.payment_status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground">Important Dates</h3>
                  <div className="space-y-2 mt-2">
                    {selectedOrder.shipment_date && (
                      <div className="flex justify-between">
                        <span className="text-sm">Shipment Date:</span>
                        <span className="text-sm font-medium">{new Date(selectedOrder.shipment_date).toLocaleDateString()}</span>
                      </div>
                    )}
                    {selectedOrder.invoice_date && (
                      <div className="flex justify-between">
                        <span className="text-sm">Invoice Date:</span>
                        <span className="text-sm font-medium">{new Date(selectedOrder.invoice_date).toLocaleDateString()}</span>
                      </div>
                    )}
                    {selectedOrder.payment_due_date && (
                      <div className="flex justify-between">
                        <span className="text-sm">Payment Due:</span>
                        <span className="text-sm font-medium">{new Date(selectedOrder.payment_due_date).toLocaleDateString()}</span>
                      </div>
                    )}
                    {selectedOrder.payment_reminder_date && (
                      <div className="flex justify-between">
                        <span className="text-sm">Payment Reminder:</span>
                        <span className="text-sm font-medium">{new Date(selectedOrder.payment_reminder_date).toLocaleDateString()}</span>
                      </div>
                    )}
                    {selectedOrder.payment_completed_date && (
                      <div className="flex justify-between">
                        <span className="text-sm">Payment Completed:</span>
                        <span className="text-sm font-medium">{new Date(selectedOrder.payment_completed_date).toLocaleDateString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-sm">Payment Schedule:</span>
                      <span className="text-sm font-medium">{creditDays} days</span>
                    </div>
                  </div>
                </div>

                {selectedOrder.payment_notes && (
                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground">Payment Notes</h3>
                    <div className="mt-2">
                      <p className="text-sm bg-muted p-3 rounded-md">{selectedOrder.payment_notes}</p>
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground">System Information</h3>
                  <div className="space-y-2 mt-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Created:</span>
                      <span className="text-sm font-medium">{new Date(selectedOrder.created_at).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Last Updated:</span>
                      <span className="text-sm font-medium">{new Date(selectedOrder.updated_at).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
