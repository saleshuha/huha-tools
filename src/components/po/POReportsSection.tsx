import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText, Printer, Download, BarChart3, Package, CheckCircle, Clock, ArrowUpDown, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { POOrder } from '@/components/POTracker';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { AdvancedFiltersPanel } from './AdvancedFiltersPanel';
import { ReportTablePagination } from './ReportTablePagination';
import { ReportCharts } from './ReportCharts';
import { EnhancedStatCard } from './EnhancedStatCard';

interface POReportsSectionProps {
  poOrders: POOrder[];
  inventoryData?: any[];
  skuInventoryData?: any[];
}

type ReportType = 'processed' | 'inventory' | 'instock' | 'pending' | 'fulfilled-stock' | 'all';
type SortField = 'po_number' | 'asin' | 'sku_code' | 'quantity' | 'total_cost' | 'status';
type SortOrder = 'asc' | 'desc';

export const POReportsSection: React.FC<POReportsSectionProps> = ({
  poOrders,
  inventoryData = [],
  skuInventoryData = []
}) => {
  const { toast } = useToast();
  const [selectedReportType, setSelectedReportType] = useState<ReportType>('processed');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedPOs, setSelectedPOs] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Advanced filters
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [valueRange, setValueRange] = useState<[number, number]>([0, 10000]);
  const [quantityRange, setQuantityRange] = useState<[number, number]>([0, 1000]);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  
  // Sorting
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  
  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(['po_number', 'asin', 'sku_code', 'title', 'quantity', 'status', 'serial_number'])
  );

  // Get unique PO numbers for filtering
  const uniquePONumbers = useMemo(() => {
    const poNumbers = Array.from(new Set(poOrders.map(order => order.po_number)));
    return poNumbers.sort();
  }, [poOrders]);

  // Calculate max values for sliders
  const maxValues = useMemo(() => {
    const costs = poOrders.map(o => o.total_cost || 0);
    const quantities = poOrders.map(o => o.quantity || 0);
    return {
      maxValue: Math.max(...costs, 10000),
      maxQuantity: Math.max(...quantities, 1000)
    };
  }, [poOrders]);

  // Initialize ranges when data changes
  React.useEffect(() => {
    setValueRange([0, maxValues.maxValue]);
    setQuantityRange([0, maxValues.maxQuantity]);
  }, [maxValues]);

  // Create serial number lookup Map for performance
  const serialNumberMap = useMemo(() => {
    const map = new Map<string, string>();
    inventoryData.forEach(item => {
      if (item.asin && item.serial_number) {
        map.set(item.asin, item.serial_number);
      }
    });
    return map;
  }, [inventoryData]);

  // Filter and process data based on report type
  const reportData = useMemo(() => {
    let filteredOrders = poOrders.filter(order => order.status !== 'cancelled');

    // Apply PO number filter
    if (selectedPOs.length > 0) {
      filteredOrders = filteredOrders.filter(order => selectedPOs.includes(order.po_number));
    }

    // Apply date range filter
    if (dateRange?.from || dateRange?.to) {
      filteredOrders = filteredOrders.filter(order => {
        const orderDate = order.order_date ? new Date(order.order_date) : new Date(order.created_at || '');
        if (dateRange.from && orderDate < dateRange.from) return false;
        if (dateRange.to && orderDate > dateRange.to) return false;
        return true;
      });
    }

    // Apply status filter
    if (statusFilter.length > 0) {
      filteredOrders = filteredOrders.filter(order => statusFilter.includes(order.status));
    }

    // Apply value range filter
    filteredOrders = filteredOrders.filter(order => {
      const cost = order.total_cost || 0;
      return cost >= valueRange[0] && cost <= valueRange[1];
    });

    // Apply quantity range filter
    filteredOrders = filteredOrders.filter(order => {
      const qty = order.quantity || 0;
      return qty >= quantityRange[0] && qty <= quantityRange[1];
    });

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filteredOrders = filteredOrders.filter(order =>
        order.sku_code?.toLowerCase().includes(query) ||
        order.title?.toLowerCase().includes(query) ||
        order.asin?.toLowerCase().includes(query) ||
        order.model_number?.toLowerCase().includes(query) ||
        order.po_number?.toLowerCase().includes(query)
      );
    }

    // Filter by report type and enhance data
    switch (selectedReportType) {
      case 'processed':
        return filteredOrders.filter(order => 
          ['ordered', 'shipped', 'delivered', 'closed', 'partial-fulfilled'].includes(order.status)
        );
      case 'fulfilled-stock':
        const fulfilledOrders = filteredOrders.filter(order => 
          ['closed', 'partial-fulfilled'].includes(order.status)
        );
        
        return fulfilledOrders.map(order => {
          const notes = order.notes || '';
          let fulfilledQuantity = order.quantity;
          let serialNumbers = 'N/A';

          if (notes.includes('Fulfilled from stock:')) {
            const quantityMatch = notes.match(/Fulfilled from stock:\s*(\d+)\s*units?\s*deducted/);
            if (quantityMatch) {
              fulfilledQuantity = parseInt(quantityMatch[1]);
            }
          }

          if (order.asin) {
            serialNumbers = serialNumberMap.get(order.asin) || 'N/A';
          }

          return {
            ...order,
            displayQuantity: fulfilledQuantity,
            displaySerialNumber: serialNumbers
          };
        });
      case 'inventory':
        const inventoryItems = [
          ...inventoryData.filter(item => item.status !== 'deleted' && item.status !== 'inactive').map(item => ({ ...item, source: 'asin_inventory' })),
          ...skuInventoryData.filter(item => item.status !== 'deleted' && item.status !== 'inactive').map(item => ({ ...item, source: 'sku_inventory' }))
        ];
        return inventoryItems;
      case 'instock':
        return filteredOrders.filter(order => order.status === 'pending');
      case 'pending':
        return filteredOrders.filter(order => order.status === 'pending');
      case 'all':
      default:
        return filteredOrders;
    }
  }, [poOrders, inventoryData, skuInventoryData, selectedReportType, selectedPOs, dateRange, searchQuery, statusFilter, valueRange, quantityRange, serialNumberMap]);

  // Apply sorting
  const sortedData = useMemo(() => {
    if (!sortField) return reportData;
    
    return [...reportData].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      
      if (aVal === bVal) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      
      const comparison = aVal < bVal ? -1 : 1;
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [reportData, sortField, sortOrder]);

  // Pagination
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedData.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedData, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(sortedData.length / itemsPerPage);

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [selectedReportType, dateRange, selectedPOs, searchQuery, statusFilter, valueRange, quantityRange]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const activePOs = poOrders.filter(order => order.status !== 'cancelled');
    const processed = activePOs.filter(order => ['ordered', 'shipped', 'delivered', 'closed', 'partial-fulfilled'].includes(order.status));
    const fulfilledFromStock = activePOs.filter(order => ['closed', 'partial-fulfilled'].includes(order.status));
    const pending = activePOs.filter(order => order.status === 'pending');
    const totalValue = activePOs.reduce((sum, order) => sum + (order.total_cost || 0), 0);
    const processedValue = processed.reduce((sum, order) => sum + (order.total_cost || 0), 0);

    return {
      totalItems: activePOs.length,
      processedItems: processed.length,
      fulfilledFromStockItems: fulfilledFromStock.length,
      pendingItems: pending.length,
      totalValue: totalValue,
      processedValue: processedValue,
      inventoryItems: inventoryData.length + skuInventoryData.length,
      inStockItems: inventoryData.filter(item => item.status === 'in-stock').length +
                   skuInventoryData.filter(item => item.status === 'in-stock').length
    };
  }, [poOrders, inventoryData, skuInventoryData]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (dateRange?.from || dateRange?.to) count++;
    if (statusFilter.length > 0) count++;
    if (valueRange[0] !== 0 || valueRange[1] !== maxValues.maxValue) count++;
    if (quantityRange[0] !== 0 || quantityRange[1] !== maxValues.maxQuantity) count++;
    return count;
  }, [dateRange, statusFilter, valueRange, quantityRange, maxValues]);

  const handleClearFilters = () => {
    setDateRange(undefined);
    setStatusFilter([]);
    setValueRange([0, maxValues.maxValue]);
    setQuantityRange([0, maxValues.maxQuantity]);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const toggleColumnVisibility = (column: string) => {
    const newVisible = new Set(visibleColumns);
    if (newVisible.has(column)) {
      newVisible.delete(column);
    } else {
      newVisible.add(column);
    }
    setVisibleColumns(newVisible);
  };

  const handlePrintReport = async () => {
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast({
          title: "Error",
          description: "Unable to open print window. Please check your browser's popup settings.",
          variant: "destructive"
        });
        return;
      }

      const reportTitle = `${selectedReportType.charAt(0).toUpperCase() + selectedReportType.slice(1)} Items Report`;
      const currentDate = format(new Date(), 'MMM dd, yyyy HH:mm');

      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${reportTitle}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
            .summary { margin-bottom: 30px; }
            .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
            .summary-card { border: 1px solid #ddd; padding: 15px; border-radius: 5px; background: #f9f9f9; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${reportTitle}</h1>
            <p>Generated on: ${currentDate}</p>
            ${selectedPOs.length > 0 ? `<p>PO Numbers: ${selectedPOs.join(', ')}</p>` : ''}
            ${dateRange?.from || dateRange?.to ? `<p>Date Range: ${dateRange?.from ? format(dateRange.from, 'MMM dd, yyyy') : 'Start'} - ${dateRange?.to ? format(dateRange.to, 'MMM dd, yyyy') : 'End'}</p>` : ''}
          </div>

          <div class="summary">
            <h2>Summary Statistics</h2>
            <div class="summary-grid">
              <div class="summary-card"><strong>Total Items:</strong> ${summaryStats.totalItems}</div>
              <div class="summary-card"><strong>Processed Items:</strong> ${summaryStats.processedItems}</div>
              <div class="summary-card"><strong>From Stock:</strong> ${summaryStats.fulfilledFromStockItems}</div>
              <div class="summary-card"><strong>Pending Items:</strong> ${summaryStats.pendingItems}</div>
              <div class="summary-card"><strong>Inventory Items:</strong> ${summaryStats.inventoryItems}</div>
              <div class="summary-card"><strong>In-Stock Items:</strong> ${summaryStats.inStockItems}</div>
              <div class="summary-card"><strong>Total Value:</strong> ${summaryStats.totalValue.toFixed(2)}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                ${selectedReportType === 'inventory' ? `
                  <th>Type</th>
                  <th>ASIN/SKU</th>
                  <th>Title</th>
                  <th>QTY</th>
                  <th>Serial Number</th>
                ` : `
                  <th>PO Number</th>
                  <th>ASIN</th>
                  <th>SKU</th>
                  <th>Title</th>
                  <th>QTY</th>
                  <th>Status</th>
                  <th>Serial Number</th>
                `}
              </tr>
            </thead>
            <tbody>
              ${sortedData.map((item: any) => `
                <tr>
                  ${selectedReportType === 'inventory' ? `
                    <td>${item.source === 'asin_inventory' ? 'ASIN' : 'SKU'}</td>
                    <td>${item.asin || item.sku_number || 'N/A'}</td>
                    <td>${item.title || 'N/A'}</td>
                    <td>${item.quantity || 0}</td>
                    <td>${item.serial_number || item.bin_serial_number || 'N/A'}</td>
                  ` : `
                    <td>${item.po_number}</td>
                    <td>${item.asin || 'N/A'}</td>
                    <td>${item.sku_code || 'N/A'}</td>
                    <td>${item.title || 'N/A'}</td>
                    <td>${item.displayQuantity || item.quantity}</td>
                    <td>${item.status}</td>
                    <td>${item.displaySerialNumber || item.serial_number || 'N/A'}</td>
                  `}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
        </html>
      `;

      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      
      setTimeout(() => {
        printWindow.print();
      }, 500);

      toast({
        title: "Report Generated",
        description: "Print dialog opened successfully"
      });

    } catch (error) {
      toast({
        title: "Print Error",
        description: "Failed to generate print report",
        variant: "destructive"
      });
    }
  };

  const handleExportCSV = () => {
    try {
      const headers = selectedReportType === 'inventory' 
        ? ['Type', 'ASIN/SKU', 'Title', 'QTY', 'Serial Number']
        : ['PO Number', 'ASIN', 'SKU', 'Title', 'QTY', 'Status', 'Serial Number'];

      const csvContent = [
        headers.join(','),
        ...sortedData.map((item: any) => {
          if (selectedReportType === 'inventory') {
            return [
              item.source === 'asin_inventory' ? 'ASIN' : 'SKU',
              `"${item.asin || item.sku_number || 'N/A'}"`,
              `"${item.title || 'N/A'}"`,
              item.quantity || 0,
              `"${item.serial_number || item.bin_serial_number || 'N/A'}"`
            ].join(',');
          } else {
            return [
              `"${item.po_number}"`,
              `"${item.asin || 'N/A'}"`,
              `"${item.sku_code || 'N/A'}"`,
              `"${item.title || 'N/A'}"`,
              item.displayQuantity || item.quantity,
              `"${item.status}"`,
              `"${item.displaySerialNumber || item.serial_number || 'N/A'}"`
            ].join(',');
          }
        })
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${selectedReportType}_report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Export Successful",
        description: "CSV file downloaded successfully"
      });

    } catch (error) {
      toast({
        title: "Export Error",
        description: "Failed to export CSV file",
        variant: "destructive"
      });
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Reports & Analytics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Report Controls */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="report-type">Report Type</Label>
            <Select value={selectedReportType} onValueChange={(value: ReportType) => setSelectedReportType(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select report type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="processed">Processed Items</SelectItem>
                <SelectItem value="fulfilled-stock">Fulfilled from Stock</SelectItem>
                <SelectItem value="inventory">Inventory Items</SelectItem>
                <SelectItem value="instock">In-Stock Items</SelectItem>
                <SelectItem value="pending">Pending Items</SelectItem>
                <SelectItem value="all">All Items</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="po-filter">PO Numbers</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  {selectedPOs.length === 0 ? 'All PO Numbers' : `${selectedPOs.length} PO(s) selected`}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="all-pos"
                      checked={selectedPOs.length === 0}
                      onCheckedChange={(checked) => {
                        if (checked) setSelectedPOs([]);
                      }}
                    />
                    <Label htmlFor="all-pos" className="text-sm font-medium">All PO Numbers</Label>
                  </div>
                  <div className="border-t pt-2 max-h-48 overflow-y-auto">
                    {uniquePONumbers.map(poNumber => (
                      <div key={poNumber} className="flex items-center space-x-2">
                        <Checkbox
                          id={`po-${poNumber}`}
                          checked={selectedPOs.includes(poNumber)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedPOs(prev => [...prev, poNumber]);
                            } else {
                              setSelectedPOs(prev => prev.filter(po => po !== poNumber));
                            }
                          }}
                        />
                        <Label htmlFor={`po-${poNumber}`} className="text-sm">{poNumber}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label htmlFor="search">Search</Label>
            <Input
              id="search"
              placeholder="Search SKU, ASIN, Title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-end gap-2">
            <Button onClick={handlePrintReport} variant="outline" className="flex items-center gap-2">
              <Printer className="h-4 w-4" />
              Print
            </Button>
            <Button onClick={handleExportCSV} variant="outline" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              CSV
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon">
                  <Eye className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64">
                <div className="space-y-2">
                  <p className="font-medium text-sm">Toggle Columns</p>
                  {['po_number', 'asin', 'sku_code', 'title', 'quantity', 'status', 'serial_number'].map(col => (
                    <div key={col} className="flex items-center space-x-2">
                      <Checkbox
                        id={`col-${col}`}
                        checked={visibleColumns.has(col)}
                        onCheckedChange={() => toggleColumnVisibility(col)}
                      />
                      <Label htmlFor={`col-${col}`} className="text-sm capitalize">
                        {col.replace('_', ' ')}
                      </Label>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Advanced Filters */}
        <AdvancedFiltersPanel
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          valueRange={valueRange}
          onValueRangeChange={setValueRange}
          quantityRange={quantityRange}
          onQuantityRangeChange={setQuantityRange}
          maxValue={maxValues.maxValue}
          maxQuantity={maxValues.maxQuantity}
          onClearFilters={handleClearFilters}
          activeFilterCount={activeFilterCount}
        />

        {/* Summary Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
          <EnhancedStatCard
            title="Total Items"
            value={summaryStats.totalItems}
            icon={Package}
            colorClass="blue-500"
          />
          <EnhancedStatCard
            title="Processed"
            value={summaryStats.processedItems}
            icon={CheckCircle}
            colorClass="green-500"
          />
          <EnhancedStatCard
            title="From Stock"
            value={summaryStats.fulfilledFromStockItems}
            icon={Package}
            colorClass="emerald-500"
          />
          <EnhancedStatCard
            title="Pending"
            value={summaryStats.pendingItems}
            icon={Clock}
            colorClass="yellow-500"
          />
          <EnhancedStatCard
            title="Inventory"
            value={summaryStats.inventoryItems}
            icon={Package}
            colorClass="purple-500"
          />
          <EnhancedStatCard
            title="In-Stock"
            value={summaryStats.inStockItems}
            icon={CheckCircle}
            colorClass="green-500"
          />
          <EnhancedStatCard
            title="Report Items"
            value={sortedData.length}
            icon={FileText}
            colorClass="indigo-500"
          />
        </div>

        {/* Charts */}
        <ReportCharts data={sortedData} reportType={selectedReportType} />

        {/* Report Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {selectedReportType === 'inventory' ? (
                  <>
                    <TableHead>Type</TableHead>
                    <TableHead>ASIN/SKU</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>QTY</TableHead>
                    <TableHead>Serial Number</TableHead>
                  </>
                ) : (
                  <>
                    {visibleColumns.has('po_number') && (
                      <TableHead className="cursor-pointer" onClick={() => handleSort('po_number')}>
                        <div className="flex items-center gap-1">
                          PO Number
                          {sortField === 'po_number' && <ArrowUpDown className="h-3 w-3" />}
                        </div>
                      </TableHead>
                    )}
                    {visibleColumns.has('asin') && (
                      <TableHead className="cursor-pointer" onClick={() => handleSort('asin')}>
                        <div className="flex items-center gap-1">
                          ASIN
                          {sortField === 'asin' && <ArrowUpDown className="h-3 w-3" />}
                        </div>
                      </TableHead>
                    )}
                    {visibleColumns.has('sku_code') && (
                      <TableHead className="cursor-pointer" onClick={() => handleSort('sku_code')}>
                        <div className="flex items-center gap-1">
                          SKU
                          {sortField === 'sku_code' && <ArrowUpDown className="h-3 w-3" />}
                        </div>
                      </TableHead>
                    )}
                    {visibleColumns.has('title') && <TableHead>Title</TableHead>}
                    {visibleColumns.has('quantity') && (
                      <TableHead className="cursor-pointer" onClick={() => handleSort('quantity')}>
                        <div className="flex items-center gap-1">
                          QTY
                          {sortField === 'quantity' && <ArrowUpDown className="h-3 w-3" />}
                        </div>
                      </TableHead>
                    )}
                    {visibleColumns.has('status') && (
                      <TableHead className="cursor-pointer" onClick={() => handleSort('status')}>
                        <div className="flex items-center gap-1">
                          Status
                          {sortField === 'status' && <ArrowUpDown className="h-3 w-3" />}
                        </div>
                      </TableHead>
                    )}
                    {visibleColumns.has('serial_number') && <TableHead>Serial Number</TableHead>}
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No data available for the selected filters
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((item: any, index) => (
                  <TableRow key={index}>
                    {selectedReportType === 'inventory' ? (
                      <>
                        <TableCell>
                          <Badge variant="outline">
                            {item.source === 'asin_inventory' ? 'ASIN' : 'SKU'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {item.asin || item.sku_number || 'N/A'}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {item.title || 'N/A'}
                        </TableCell>
                        <TableCell>{item.quantity || 0}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {item.serial_number || item.bin_serial_number || 'N/A'}
                        </TableCell>
                      </>
                    ) : (
                      <>
                        {visibleColumns.has('po_number') && (
                          <TableCell className="font-mono text-sm">{item.po_number}</TableCell>
                        )}
                        {visibleColumns.has('asin') && (
                          <TableCell className="font-mono text-sm">{item.asin || 'N/A'}</TableCell>
                        )}
                        {visibleColumns.has('sku_code') && (
                          <TableCell className="font-mono text-sm">{item.sku_code || 'N/A'}</TableCell>
                        )}
                        {visibleColumns.has('title') && (
                          <TableCell className="max-w-xs truncate">{item.title || 'N/A'}</TableCell>
                        )}
                        {visibleColumns.has('quantity') && (
                          <TableCell>
                            {item.displayQuantity !== undefined ? item.displayQuantity : item.quantity}
                          </TableCell>
                        )}
                        {visibleColumns.has('status') && (
                          <TableCell>
                            <Badge 
                              variant={
                                item.status === 'closed' ? 'secondary' : 
                                item.status === 'partial-fulfilled' ? 'outline' :
                                item.status === 'delivered' ? 'default' :
                                item.status === 'shipped' ? 'secondary' :
                                item.status === 'ordered' ? 'secondary' : 'outline'
                              }
                            >
                              {item.status === 'closed' ? 'Fulfilled from Stock' :
                               item.status === 'partial-fulfilled' ? 'Partial from Stock' :
                               item.status}
                            </Badge>
                          </TableCell>
                        )}
                        {visibleColumns.has('serial_number') && (
                          <TableCell className="font-mono text-sm">
                            {item.displaySerialNumber || item.serial_number || (
                              <span className="text-muted-foreground">N/A</span>
                            )}
                          </TableCell>
                        )}
                      </>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          <ReportTablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            totalItems={sortedData.length}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(value) => {
              setItemsPerPage(value);
              setCurrentPage(1);
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
};
