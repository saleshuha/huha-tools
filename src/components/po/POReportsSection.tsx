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
import { FileText, Printer, Download, BarChart3, Package, CheckCircle, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { POOrder } from '@/components/POTracker';
import { format } from 'date-fns';

interface POReportsSectionProps {
  poOrders: POOrder[];
  inventoryData?: any[];
  skuInventoryData?: any[];
}

type ReportType = 'processed' | 'inventory' | 'instock' | 'pending' | 'fulfilled-stock' | 'all';

export const POReportsSection: React.FC<POReportsSectionProps> = ({
  poOrders,
  inventoryData = [],
  skuInventoryData = []
}) => {
  const { toast } = useToast();
  const [selectedReportType, setSelectedReportType] = useState<ReportType>('processed');
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [selectedPOs, setSelectedPOs] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Get unique PO numbers for filtering
  const uniquePONumbers = useMemo(() => {
    const poNumbers = Array.from(new Set(poOrders.map(order => order.po_number)));
    return poNumbers.sort();
  }, [poOrders]);

  // Filter and process data based on report type
  const reportData = useMemo(() => {
    // First filter - only exclude cancelled POs (keep closed for fulfilled from stock)
    let filteredOrders = poOrders.filter(order => 
      order.status !== 'cancelled'
    );

    // Apply PO number filter
    if (selectedPOs.length > 0) {
      filteredOrders = filteredOrders.filter(order => selectedPOs.includes(order.po_number));
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

    // Filter by report type and enhance data
    switch (selectedReportType) {
      case 'processed':
        return filteredOrders.filter(order => 
          ['ordered', 'shipped', 'delivered', 'closed', 'partial-fulfilled'].includes(order.status)
        );
      case 'fulfilled-stock':
        // Enhanced data for fulfilled from stock items
        const fulfilledOrders = filteredOrders.filter(order => 
          ['closed', 'partial-fulfilled'].includes(order.status)
        );
        
        console.log('🔍 Fulfilled orders found:', fulfilledOrders.length);
        console.log('🔍 Sample fulfilled order:', fulfilledOrders[0]);
        
        return fulfilledOrders.map(order => {
          // Extract fulfilled quantity from notes - much simpler now
          const notes = order.notes || '';
          let fulfilledQuantity = order.quantity;
          let serialNumbers = 'N/A';

          console.log('📋 Processing order:', order.po_number, 'ASIN:', order.asin);

          // Parse notes for fulfillment quantity only
          if (notes.includes('Fulfilled from stock:')) {
            const quantityMatch = notes.match(/Fulfilled from stock:\s*(\d+)\s*units?\s*deducted/);
            if (quantityMatch) {
              fulfilledQuantity = parseInt(quantityMatch[1]);
              console.log('📦 Found fulfillment quantity:', fulfilledQuantity);
            }
          }

          // Simple lookup: find serial number from inventory data using ASIN
          if (order.asin && inventoryData && inventoryData.length > 0) {
            const inventoryItem = inventoryData.find(item => item.asin === order.asin);
            if (inventoryItem && inventoryItem.serial_number) {
              serialNumbers = inventoryItem.serial_number;
              console.log('🏷️ Found serial number from inventory:', serialNumbers);
            }
          }

          const result = {
            ...order,
            displayQuantity: fulfilledQuantity,
            displaySerialNumber: serialNumbers
          };
          
          console.log('✅ Final processed order - displayQuantity:', result.displayQuantity, 'displaySerialNumber:', result.displaySerialNumber);
          return result;
        });
      case 'inventory':
        // For inventory, filter only active inventory items (exclude any with deleted/inactive status)
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
  }, [poOrders, inventoryData, skuInventoryData, selectedReportType, selectedPOs, dateRange, searchQuery]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    // Filter out cancelled POs for consistent statistics (keep closed for fulfilled from stock)
    const activePOs = poOrders.filter(order => 
      order.status !== 'cancelled'
    );
    
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
            ${selectedPOs.length > 0 ? `<p>PO Numbers: ${selectedPOs.join(', ')}</p>` : ''}
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
                <strong>From Stock:</strong> ${summaryStats.fulfilledFromStockItems}
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
                  <th>Serial Number</th>
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
                    <td>${item.serial_number || item.bin_serial_number || 'N/A'}</td>
                  ` : `
                    <td>${item.po_number}</td>
                    <td>${item.asin || 'N/A'}</td>
                    <td>${item.sku_code || 'N/A'}</td>
                    <td>${item.title || 'N/A'}</td>
                    <td>${item.displayQuantity || item.quantity}</td>
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
        ? ['Type', 'ASIN/SKU', 'Title', 'QTY', 'Serial Number']
        : ['PO Number', 'ASIN', 'SKU', 'Title', 'QTY', 'Serial Number'];

      const csvContent = [
        headers.join(','),
        ...reportData.map((item: any) => {
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
              item.quantity,
              `"${item.serial_number || 'N/A'}"`
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
                        if (checked) {
                          setSelectedPOs([]);
                        }
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
          </div>
        </div>

        {/* Summary Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-7 gap-4">
          <Card className="relative overflow-hidden border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-500/5 to-background hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
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

          <Card className="relative overflow-hidden border-l-4 border-l-green-500 bg-gradient-to-br from-green-500/5 to-background hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
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

          <Card className="relative overflow-hidden border-l-4 border-l-emerald-500 bg-gradient-to-br from-emerald-500/5 to-background hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-emerald-500" />
                <div>
                  <p className="text-sm text-muted-foreground">From Stock</p>
                  <p className="text-xl font-bold">{summaryStats.fulfilledFromStockItems}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-l-4 border-l-yellow-500 bg-gradient-to-br from-yellow-500/5 to-background hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
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

          <Card className="relative overflow-hidden border-l-4 border-l-purple-500 bg-gradient-to-br from-purple-500/5 to-background hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
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

          <Card className="relative overflow-hidden border-l-4 border-l-green-500 bg-gradient-to-br from-green-500/5 to-background hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
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

          <Card className="relative overflow-hidden border-l-4 border-l-indigo-500 bg-gradient-to-br from-indigo-500/5 to-background hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
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
                    <TableHead>ASIN/SKU</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>QTY</TableHead>
                    <TableHead>Serial Number</TableHead>
                  </>
                ) : (
                  <>
                     <TableHead>PO Number</TableHead>
                     <TableHead>ASIN</TableHead>
                     <TableHead>SKU</TableHead>
                     <TableHead>Title</TableHead>
                     <TableHead>QTY</TableHead>
                     <TableHead>Status</TableHead>
                     <TableHead>Serial Number</TableHead>
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={selectedReportType === 'inventory' ? 5 : 6} className="text-center py-8 text-muted-foreground">
                    No data available for the selected filters
                  </TableCell>
                </TableRow>
              ) : (
                reportData.slice(0, 100).map((item: any, index) => {
                  console.log('🎯 Rendering item:', index, 'Type:', selectedReportType, 'Item:', item);
                  return (
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
                        <TableCell className="font-mono text-sm">{item.po_number}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {item.asin || 'N/A'}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {item.sku_code || 'N/A'}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {item.title || 'N/A'}
                        </TableCell>
                        <TableCell>
                          {(() => {
                            console.log('🔢 Quantity rendering - displayQuantity:', item.displayQuantity, 'quantity:', item.quantity);
                            return item.displayQuantity !== undefined ? item.displayQuantity : item.quantity;
                          })()}
                        </TableCell>
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
                        <TableCell className="font-mono text-sm">
                          {(() => {
                            console.log('🏷️ Serial rendering - displaySerialNumber:', item.displaySerialNumber);
                            const serialValue = item.displaySerialNumber || 'N/A';
                            return serialValue === 'N/A' ? (
                              <span className="text-muted-foreground">N/A</span>
                            ) : serialValue;
                          })()}
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                  );
                })
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