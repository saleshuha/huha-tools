import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText, Printer, Download, BarChart3, Package, CheckCircle, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { POOrder } from '@/components/POTracker';
import { format } from 'date-fns';

interface POReportsSectionProps {
  poOrders: POOrder[];
  inventoryData?: any[];
  skuInventoryData?: any[];
}

type ReportType = 'processed' | 'inventory' | 'instock' | 'pending' | 'all';

export const POReportsSection: React.FC<POReportsSectionProps> = ({
  poOrders,
  inventoryData = [],
  skuInventoryData = []
}) => {
  const { toast } = useToast();
  const [selectedReportType, setSelectedReportType] = useState<ReportType>('processed');
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [selectedPO, setSelectedPO] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Get unique PO numbers for filtering
  const uniquePONumbers = useMemo(() => {
    const poNumbers = Array.from(new Set(poOrders.map(order => order.po_number)));
    return poNumbers.sort();
  }, [poOrders]);

  // Filter and process data based on report type
  const reportData = useMemo(() => {
    let filteredOrders = [...poOrders];

    // Apply PO number filter
    if (selectedPO !== 'all') {
      filteredOrders = filteredOrders.filter(order => order.po_number === selectedPO);
    }

    // Apply date range filter
    if (dateRange.from || dateRange.to) {
      filteredOrders = filteredOrders.filter(order => {
        const orderDate = order.order_date ? new Date(order.order_date) : new Date(order.created_at || '');
        if (dateRange.from && orderDate < dateRange.from) return false;
        if (dateRange.to && orderDate > dateRange.to) return false;
        return true;
      });
    }

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

    // Filter by report type
    switch (selectedReportType) {
      case 'processed':
        return filteredOrders.filter(order => 
          ['ordered', 'shipped', 'delivered'].includes(order.status)
        );
      case 'inventory':
        // Combine PO orders with inventory data
        const inventoryItems = [
          ...inventoryData.map(item => ({ ...item, source: 'asin_inventory' })),
          ...skuInventoryData.map(item => ({ ...item, source: 'sku_inventory' }))
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
  }, [poOrders, inventoryData, skuInventoryData, selectedReportType, selectedPO, dateRange, searchQuery]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const processed = poOrders.filter(order => ['ordered', 'shipped', 'delivered'].includes(order.status));
    const pending = poOrders.filter(order => order.status === 'pending');
    const totalValue = poOrders.reduce((sum, order) => sum + (order.total_cost || 0), 0);
    const processedValue = processed.reduce((sum, order) => sum + (order.total_cost || 0), 0);

    return {
      totalItems: poOrders.length,
      processedItems: processed.length,
      pendingItems: pending.length,
      totalValue: totalValue,
      processedValue: processedValue,
      inventoryItems: inventoryData.length + skuInventoryData.length,
      inStockItems: inventoryData.filter(item => item.status === 'in-stock').length +
                   skuInventoryData.filter(item => item.status === 'in-stock').length
    };
  }, [poOrders, inventoryData, skuInventoryData]);

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
            .status-badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; }
            .status-pending { background: #fef3c7; color: #92400e; }
            .status-ordered { background: #dbeafe; color: #1e40af; }
            .status-shipped { background: #d1fae5; color: #065f46; }
            .status-delivered { background: #d1fae5; color: #065f46; }
            .status-in-stock { background: #d1fae5; color: #065f46; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${reportTitle}</h1>
            <p>Generated on: ${currentDate}</p>
            ${selectedPO !== 'all' ? `<p>PO Number: ${selectedPO}</p>` : ''}
            ${dateRange.from || dateRange.to ? `<p>Date Range: ${dateRange.from ? format(dateRange.from, 'MMM dd, yyyy') : 'Start'} - ${dateRange.to ? format(dateRange.to, 'MMM dd, yyyy') : 'End'}</p>` : ''}
          </div>

          <div class="summary">
            <h2>Summary Statistics</h2>
            <div class="summary-grid">
              <div class="summary-card">
                <strong>Total Items:</strong> ${summaryStats.totalItems}
              </div>
              <div class="summary-card">
                <strong>Processed Items:</strong> ${summaryStats.processedItems}
              </div>
              <div class="summary-card">
                <strong>Pending Items:</strong> ${summaryStats.pendingItems}
              </div>
              <div class="summary-card">
                <strong>Inventory Items:</strong> ${summaryStats.inventoryItems}
              </div>
              <div class="summary-card">
                <strong>In-Stock Items:</strong> ${summaryStats.inStockItems}
              </div>
              <div class="summary-card">
                <strong>Total Value:</strong> ${summaryStats.totalValue.toFixed(2)}
              </div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                ${selectedReportType === 'inventory' ? `
                  <th>Type</th>
                  <th>Identifier</th>
                  <th>Title</th>
                  <th>Quantity</th>
                  <th>Status</th>
                  <th>Date Added</th>
                ` : `
                  <th>PO Number</th>
                  <th>SKU/ASIN</th>
                  <th>Title</th>
                  <th>Quantity</th>
                  <th>Status</th>
                  <th>Unit Cost</th>
                  <th>Total Cost</th>
                  <th>Order Date</th>
                `}
              </tr>
            </thead>
            <tbody>
              ${reportData.map((item: any) => `
                <tr>
                  ${selectedReportType === 'inventory' ? `
                    <td>${item.source === 'asin_inventory' ? 'ASIN' : 'SKU'}</td>
                    <td>${item.asin || item.sku_number || 'N/A'}</td>
                    <td>${item.title || 'N/A'}</td>
                    <td>${item.quantity || 0}</td>
                    <td><span class="status-badge status-${item.status || 'unknown'}">${item.status || 'Unknown'}</span></td>
                    <td>${item.date_added ? format(new Date(item.date_added), 'MMM dd, yyyy') : 'N/A'}</td>
                  ` : `
                    <td>${item.po_number}</td>
                    <td>${item.asin || item.sku_code || 'N/A'}</td>
                    <td>${item.title || 'N/A'}</td>
                    <td>${item.quantity}</td>
                    <td><span class="status-badge status-${item.status}">${item.status}</span></td>
                    <td>${item.unit_cost ? item.unit_cost.toFixed(2) : 'N/A'}</td>
                    <td>${item.total_cost ? item.total_cost.toFixed(2) : 'N/A'}</td>
                    <td>${item.order_date ? format(new Date(item.order_date), 'MMM dd, yyyy') : format(new Date(item.created_at || ''), 'MMM dd, yyyy')}</td>
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
      
      // Small delay to ensure content is loaded before printing
      setTimeout(() => {
        printWindow.print();
      }, 500);

      toast({
        title: "Report Generated",
        description: "Print dialog opened successfully"
      });

    } catch (error) {
      console.error('Print error:', error);
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
        ? ['Type', 'Identifier', 'Title', 'Quantity', 'Status', 'Date Added']
        : ['PO Number', 'SKU/ASIN', 'Title', 'Quantity', 'Status', 'Unit Cost', 'Total Cost', 'Order Date'];

      const csvContent = [
        headers.join(','),
        ...reportData.map((item: any) => {
          if (selectedReportType === 'inventory') {
            return [
              item.source === 'asin_inventory' ? 'ASIN' : 'SKU',
              `"${item.asin || item.sku_number || 'N/A'}"`,
              `"${item.title || 'N/A'}"`,
              item.quantity || 0,
              item.status || 'Unknown',
              item.date_added ? format(new Date(item.date_added), 'yyyy-MM-dd') : 'N/A'
            ].join(',');
          } else {
            return [
              `"${item.po_number}"`,
              `"${item.asin || item.sku_code || 'N/A'}"`,
              `"${item.title || 'N/A'}"`,
              item.quantity,
              item.status,
              item.unit_cost || 'N/A',
              item.total_cost || 'N/A',
              item.order_date ? format(new Date(item.order_date), 'yyyy-MM-dd') : format(new Date(item.created_at || ''), 'yyyy-MM-dd')
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
      console.error('Export error:', error);
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
                <SelectItem value="inventory">Inventory Items</SelectItem>
                <SelectItem value="instock">In-Stock Items</SelectItem>
                <SelectItem value="pending">Pending Items</SelectItem>
                <SelectItem value="all">All Items</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="po-filter">PO Number</Label>
            <Select value={selectedPO} onValueChange={setSelectedPO}>
              <SelectTrigger>
                <SelectValue placeholder="All POs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All PO Numbers</SelectItem>
                {uniquePONumbers.map(poNumber => (
                  <SelectItem key={poNumber} value={poNumber}>{poNumber}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          </div>
        </div>

        {/* Summary Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Items</p>
                  <p className="text-xl font-bold">{summaryStats.totalItems}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Processed</p>
                  <p className="text-xl font-bold">{summaryStats.processedItems}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-xl font-bold">{summaryStats.pendingItems}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-purple-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Inventory</p>
                  <p className="text-xl font-bold">{summaryStats.inventoryItems}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">In-Stock</p>
                  <p className="text-xl font-bold">{summaryStats.inStockItems}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-indigo-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Report Items</p>
                  <p className="text-xl font-bold">{reportData.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Report Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {selectedReportType === 'inventory' ? (
                  <>
                    <TableHead>Type</TableHead>
                    <TableHead>Identifier</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date Added</TableHead>
                  </>
                ) : (
                  <>
                    <TableHead>PO Number</TableHead>
                    <TableHead>SKU/ASIN</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Unit Cost</TableHead>
                    <TableHead>Total Cost</TableHead>
                    <TableHead>Order Date</TableHead>
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={selectedReportType === 'inventory' ? 6 : 8} className="text-center py-8 text-muted-foreground">
                    No data available for the selected filters
                  </TableCell>
                </TableRow>
              ) : (
                reportData.slice(0, 100).map((item: any, index) => (
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
                        <TableCell>
                          <Badge variant={item.status === 'in-stock' ? 'default' : 'secondary'}>
                            {item.status || 'Unknown'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {item.date_added ? format(new Date(item.date_added), 'MMM dd, yyyy') : 'N/A'}
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell className="font-mono text-sm">{item.po_number}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {item.asin || item.sku_code || 'N/A'}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {item.title || 'N/A'}
                        </TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              item.status === 'delivered' ? 'default' :
                              item.status === 'shipped' ? 'secondary' :
                              item.status === 'ordered' ? 'outline' : 'destructive'
                            }
                          >
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{item.unit_cost ? `$${item.unit_cost.toFixed(2)}` : 'N/A'}</TableCell>
                        <TableCell>{item.total_cost ? `$${item.total_cost.toFixed(2)}` : 'N/A'}</TableCell>
                        <TableCell>
                          {item.order_date ? format(new Date(item.order_date), 'MMM dd, yyyy') : 
                           format(new Date(item.created_at || ''), 'MMM dd, yyyy')}
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {reportData.length > 100 && (
            <div className="p-4 text-center text-sm text-muted-foreground border-t">
              Showing first 100 results of {reportData.length} total items. Use filters to narrow down results.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};