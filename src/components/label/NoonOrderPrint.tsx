import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CalendarIcon, Printer, Download, Eye, Filter, Copy, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useLabelDoc } from '@/contexts/SimpleLabelDocContext';
import { PrintService } from '@/services/print-service';
import { LabelDataset, PrintSettings, LabelDoc, LabelElement } from '@/types/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { qzConnectionManager } from '@/utils/qz-connection-manager';

interface NoonOrderToProcess {
  id: string;
  file_name: string;
  asin_code?: string;
  sku_code?: string;
  partner_sku?: string;
  product_title?: string;
  quantity: number;
  order_number?: string;
  order_date: string;
  status: string;
  has_match: boolean;
  printable: boolean;
}

export const NoonOrderPrint: React.FC = () => {
  const { document: labelDoc, dataset, loadDataset } = useLabelDoc();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'custom'>('today');
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [dateFilterType, setDateFilterType] = useState<'upload_date' | 'order_date'>('upload_date');
  const [orders, setOrders] = useState<NoonOrderToProcess[]>([]);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showOnlyPrintable, setShowOnlyPrintable] = useState(false);
  const [printSettings, setPrintSettings] = useState<PrintSettings>({
    format: 'zpl',
    paperSize: 'custom',
    orientation: 'portrait',
    dpi: 203,
    copies: 1,
    labelsPerPage: 1,
    margin: 0,
    darkness: 10, // Default Zebra print darkness
  });
  const [useCustomPageSize, setUseCustomPageSize] = useState(false);
  const [customPageSize, setCustomPageSize] = useState({
    width: 210, // A4 width in mm
    height: 297, // A4 height in mm
  });
  const [usePerQuantityPrinting, setUsePerQuantityPrinting] = useState(true);
  
  // QZ Tray state
  const [qzConnected, setQzConnected] = useState(false);
  const [availablePrinters, setAvailablePrinters] = useState<string[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<string>('');
  const [matchingLoading, setMatchingLoading] = useState(false);

  useEffect(() => {
    fetchOrders();
    initializeQZ();
  }, [selectedDate, dateRange, endDate, statusFilter, dateFilterType]);

  const initializeQZ = async () => {
    try {
      const connected = await qzConnectionManager.connect();
      if (connected) {
        setQzConnected(true);
        const printers = await qzConnectionManager.getPrinters();
        setAvailablePrinters(printers);
        
        // Set default printer (prefer saved or default printer) 
        const savedDefaultPrinter = localStorage.getItem('qz-default-printer');
        const defaultPrinter = savedDefaultPrinter || (await qzConnectionManager.getDefaultPrinter());
        if (defaultPrinter) {
          setSelectedPrinter(defaultPrinter);
        } else if (printers.length > 0) {
          setSelectedPrinter(printers[0]);
        }
        
        toast.success('QZ Tray connected successfully');
      }
    } catch (error) {
      console.error('Failed to connect to QZ Tray:', error);
      // Don't show error toast as it's optional
    }
  };

  const matchWithOrders = async () => {
    try {
      setMatchingLoading(true);
      
      // Simply refresh the orders data to show updated printable status
      await fetchOrders();
      
      const printableCount = orders.filter(order => order.printable).length;
      const totalCount = orders.length;
      
      toast.success(
        `Orders refreshed! ${printableCount} of ${totalCount} orders are printable with your current print eligible items.`
      );

    } catch (error) {
      console.error('Error refreshing orders:', error);
      toast.error('Failed to refresh orders');
    } finally {
      setMatchingLoading(false);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      let startDate = new Date(selectedDate);
      let queryEndDate = new Date(selectedDate);

      // Set date range based on selection
      switch (dateRange) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          queryEndDate.setHours(23, 59, 59, 999);
          break;
        case 'week':
          const weekStart = new Date(selectedDate);
          weekStart.setDate(weekStart.getDate() - weekStart.getDay());
          weekStart.setHours(0, 0, 0, 0);
          startDate = weekStart;
          queryEndDate = new Date(weekStart);
          queryEndDate.setDate(queryEndDate.getDate() + 6);
          queryEndDate.setHours(23, 59, 59, 999);
          break;
        case 'month':
          startDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
          queryEndDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
          queryEndDate.setHours(23, 59, 59, 999);
          break;
        case 'custom':
          startDate.setHours(0, 0, 0, 0);
          queryEndDate = new Date(endDate);
          queryEndDate.setHours(23, 59, 59, 999);
          break;
      }

      // Build the query for noon_processing_orders
      let query = supabase
        .from('noon_processing_orders')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply date filter
      const dateColumn = dateFilterType === 'order_date' ? 'order_received_at' : 'created_at';
      query = query
        .gte(dateColumn, startDate.toISOString())
        .lte(dateColumn, queryEndDate.toISOString());

      // Apply status filter
      if (statusFilter !== 'all') {
        query = query.eq('item_status' as any, statusFilter as any);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching noon orders:', error);
        toast.error('Failed to fetch noon orders');
        return;
      }

      const formattedOrders: NoonOrderToProcess[] = (data || []).map((order: any) => ({
        id: order.id,
        file_name: order.file_name || 'Unknown File',
        asin_code: order.purchase_item_nr || '',
        sku_code: order.sku || '',
        partner_sku: order.partner_sku || '',
        product_title: order.title || order.sku || 'Unknown Product',
        quantity: order.quantity || 1,
        order_number: order.order_nr || '',
        order_date: dateFilterType === 'order_date' && order.order_received_at 
          ? format(new Date(order.order_received_at), 'MMM dd, yyyy')
          : format(new Date(order.created_at), 'MMM dd, yyyy HH:mm'),
        status: order.item_status || 'pending',
        has_match: false, // Not used anymore, replaced by printable
        printable: true, // For now, all noon orders are printable
      }));

      setOrders(formattedOrders);
      setSelectedOrders([]);
    } catch (error) {
      console.error('Error:', error);
      toast.error('An error occurred while fetching noon orders');
    } finally {
      setLoading(false);
    }
  };

  const handleOrderSelection = (orderId: string, checked: boolean) => {
    const order = orders.find(o => o.id === orderId);
    if (!order?.printable) {
      toast.error('This order cannot be printed. The SKU is not in your print eligible items.');
      return;
    }
    
    setSelectedOrders(prev => 
      checked 
        ? [...prev, orderId]
        : prev.filter(id => id !== orderId)
    );
  };

  const handleSelectAll = (checked: boolean) => {
    const filteredOrders = getFilteredOrders();
    const printableOrders = filteredOrders.filter(order => order.printable);
    setSelectedOrders(checked ? printableOrders.map(order => order.id) : []);
  };

  const getFilteredOrders = () => {
    return showOnlyPrintable ? orders.filter(order => order.printable) : orders;
  };

  const createDatasetFromOrders = (): LabelDataset => {
    const selectedOrderData = orders.filter(order => selectedOrders.includes(order.id));
    
    const headers = [
      'Order Number',
      'ASIN',
      'SKU',
      'Partner SKU',
      'Title',
      'Quantity',
      'Order Date',
      'Status',
      'File Name'
    ];

    let data: any[][] = [];
    
    if (usePerQuantityPrinting) {
      // Create a row for each quantity
      selectedOrderData.forEach(order => {
        for (let i = 0; i < order.quantity; i++) {
          data.push([
            order.order_number || '',
            order.asin_code || '',
            order.sku_code || '',
            order.partner_sku || '',
            order.product_title || '',
            '1', // Each label represents quantity of 1
            order.order_date,
            order.status,
            order.file_name
          ]);
        }
      });
    } else {
      // Single row per order
      data = selectedOrderData.map(order => [
        order.order_number || '',
        order.asin_code || '',
        order.sku_code || '',
        order.partner_sku || '',
        order.product_title || '',
        order.quantity.toString(),
        order.order_date,
        order.status,
        order.file_name
      ]);
    }

    return {
      id: `noon_orders_${Date.now()}`,
      name: `Noon_Orders_${format(selectedDate, 'yyyy-MM-dd')}`,
      description: `Noon Orders from ${format(selectedDate, 'MMM dd, yyyy')}`,
      headers,
      data,
      rowCount: data.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  };

  const handlePrintLabels = async () => {
    if (!labelDoc) {
      toast.error('Please create a label template first');
      return;
    }

    if (selectedOrders.length === 0) {
      toast.error('Please select at least one order to print');
      return;
    }

    try {
      const ordersDataset = createDatasetFromOrders();
      
      if (qzConnected && selectedPrinter && printSettings.format === 'zpl') {
        // Direct printing via QZ Tray
        const zplCode = PrintService.generateZPL(labelDoc, ordersDataset, printSettings);
        
        await qzConnectionManager.print(zplCode, selectedPrinter);
        
        const totalLabels = ordersDataset.data.length * printSettings.copies;
        toast.success(`Successfully sent ${totalLabels} labels to printer: ${selectedPrinter}`);
      } else {
        // Fallback to HTML printing
        const printWindow = window.open('', '_blank', 'width=800,height=600');
        
        if (!printWindow) {
          toast.error('Unable to open print window. Please allow popups for this site.');
          return;
        }

        const html = generatePrintWindowHTML(labelDoc, ordersDataset, ordersDataset.data.length);
        printWindow.document.write(html);
        printWindow.document.close();
        
        toast.success(`Preparing ${ordersDataset.data.length} labels for printing...`);
      }
      
    } catch (error) {
      console.error('Print error:', error);
      toast.error('Failed to print labels: ' + (error as Error).message);
    }
  };

  const generatePrintWindowHTML = (
    document: LabelDoc,
    dataset: LabelDataset | null,
    maxLabels: number = 10
  ): string => {
    const isBulk = dataset && dataset.data.length > 0;
    const totalLabels = Math.min(isBulk ? dataset.data.length : 1, maxLabels);
    
    // Use custom page size if enabled, otherwise use label size
    const pageWidth = useCustomPageSize ? customPageSize.width : document.size.width;  
    const pageHeight = useCustomPageSize ? customPageSize.height : document.size.height;

    let labelsHTML = '';

    for (let labelIndex = 0; labelIndex < totalLabels; labelIndex++) {
      const dataRow = isBulk ? dataset.data[labelIndex] : [];
      
      labelsHTML += `<div class="label" style="
        width: ${pageWidth}mm;
        height: ${pageHeight}mm;
        position: relative;
        background: white;
        border: 1px solid #ccc;
        margin: 10px 0;
        page-break-after: always;
      ">`;
      
      for (const element of document.elements) {
        labelsHTML += renderElementToHTML(element, dataset, dataRow);
      }
      
      labelsHTML += `</div>`;
    }

    return `
      <html>
        <head>
          <title>Print Noon Labels</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 0;
              padding: 20px;
            }
            .label { 
              page-break-inside: avoid; 
            }
            .element { 
              position: absolute; 
            }
            .text { 
              font-family: Arial, sans-serif; 
            }
            .barcode, .qr { 
              text-align: center;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            @media print {
              body {
                margin: 0;
                padding: 0;
              }
              .label { 
                margin: 0; 
                border: none;
                page-break-after: always;
              }
              .label:last-child {
                page-break-after: avoid;
              }
              @page {
                size: ${pageWidth}mm ${pageHeight}mm;
                margin: 0;
              }
            }
          </style>
        </head>
        <body>
          <h2 style="margin-bottom: 20px;">Noon Order Labels (${totalLabels} total)</h2>
          ${labelsHTML}
          <script>
            setTimeout(() => {
              window.focus();
              window.print();
            }, 500);
          </script>
        </body>
      </html>
    `;
  };

  const renderElementToHTML = (
    element: LabelElement,
    dataset: LabelDataset | null,
    dataRow: any[]
  ): string => {
    const pxToMM = (px: number) => px * 0.264583; // Convert pixels to mm
    
    const style = `
      left: ${pxToMM(element.x)}mm;
      top: ${pxToMM(element.y)}mm;
      width: ${pxToMM(element.width)}mm;
      height: ${pxToMM(element.height)}mm;
      font-size: ${element.fontSize || 12}px;
      color: ${element.color || '#000000'};
    `;

    const resolveMappedContent = (element: LabelElement, dataRow: any[], headers: string[]): string => {
      if (element.dataColumn && headers.includes(element.dataColumn)) {
        const columnIndex = headers.indexOf(element.dataColumn);
        return dataRow[columnIndex] || element.text || '';
      }
      return element.text || '';
    };

    const headers = dataset?.headers || [];
    const resolvedContent = resolveMappedContent(element, dataRow, headers);

    switch (element.type) {
      case 'text':
        return `<div class="element text" style="${style}">${resolvedContent}</div>`;
      case 'barcode':
        return `<div class="element barcode" style="${style}">[BARCODE: ${resolvedContent}]</div>`;
      case 'qr':
        return `<div class="element qr" style="${style}">[QR: ${resolvedContent}]</div>`;
      case 'image':
        return `<div class="element" style="${style}"><img src="${resolvedContent}" alt="Image" style="width: 100%; height: 100%; object-fit: contain;" /></div>`;
      default:
        return `<div class="element" style="${style}">${resolvedContent}</div>`;
    }
  };

  const filteredOrders = getFilteredOrders();
  const selectedCount = selectedOrders.length;
  const printableCount = filteredOrders.filter(order => order.printable).length;
  const allPrintableSelected = printableCount > 0 && selectedCount === printableCount;

  return (
    <div className="space-y-6">
      <Card className="border-2 border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Date-wise Order Printing (Noon)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Date and Filter Controls */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Date Range</Label>
              <Select value={dateRange} onValueChange={(value: any) => setDateRange(value)}>
                <SelectTrigger className="border-2 border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left border-2 border-border">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(selectedDate, 'MMM dd, yyyy')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {dateRange === 'custom' && (
              <div className="space-y-2">
                <Label>End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left border-2 border-border">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(endDate, 'MMM dd, yyyy')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={(date) => date && setEndDate(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            <div className="space-y-2">
              <Label>Date Filter</Label>
              <Select value={dateFilterType} onValueChange={(value: any) => setDateFilterType(value)}>
                <SelectTrigger className="border-2 border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="upload_date">Upload Date</SelectItem>
                  <SelectItem value="order_date">Order Date</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Status Filter and Actions */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="status-filter">Status:</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40 border-2 border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="show-printable"
                checked={showOnlyPrintable}
                onCheckedChange={(checked) => setShowOnlyPrintable(checked === true)}
              />
              <Label htmlFor="show-printable">Show only printable orders</Label>
            </div>

            <Button 
              variant="outline" 
              size="sm" 
              onClick={matchWithOrders} 
              disabled={matchingLoading}
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", matchingLoading && "animate-spin")} />
              Refresh Orders
            </Button>
          </div>

          {/* Order Statistics */}
          <div className="flex flex-wrap gap-4">
            <Badge variant="outline" className="px-3 py-1">
              Total: {filteredOrders.length}
            </Badge>
            <Badge variant="outline" className="px-3 py-1 bg-green-50 border-green-200 text-green-700">
              Printable: {printableCount}
            </Badge>
            <Badge variant="outline" className="px-3 py-1 bg-blue-50 border-blue-200 text-blue-700">
              Selected: {selectedCount}
            </Badge>
          </div>

          {/* Print Settings */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg bg-muted/50">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
              <Checkbox
                id="per-quantity"
                checked={usePerQuantityPrinting}
                onCheckedChange={(checked) => setUsePerQuantityPrinting(checked === true)}
              />
                <Label htmlFor="per-quantity" className="text-sm">Print per quantity</Label>
              </div>
              <p className="text-xs text-muted-foreground">
                {usePerQuantityPrinting 
                  ? "Create separate labels for each quantity" 
                  : "One label per order line"}
              </p>
            </div>

            {qzConnected && (
              <div className="space-y-2">
                <Label>Printer</Label>
                <Select value={selectedPrinter} onValueChange={setSelectedPrinter}>
                  <SelectTrigger className="border-2 border-border">
                    <SelectValue placeholder="Select printer" />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePrinters.map(printer => (
                      <SelectItem key={printer} value={printer}>
                        {printer}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {qzConnected && selectedPrinter?.toLowerCase().includes('zebra') && (
              <div className="space-y-2">
                <Label>Print Darkness</Label>
                <Select 
                  value={printSettings.darkness?.toString()} 
                  onValueChange={(value) => setPrintSettings(prev => ({ ...prev, darkness: parseInt(value) }))}
                >
                  <SelectTrigger className="border-2 border-border">
                    <SelectValue placeholder="Select darkness" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">Light (5)</SelectItem>
                    <SelectItem value="10">Normal (10)</SelectItem>
                    <SelectItem value="15">Medium (15)</SelectItem>
                    <SelectItem value="20">Dark (20)</SelectItem>
                    <SelectItem value="25">Very Dark (25)</SelectItem>
                    <SelectItem value="30">Maximum (30)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Adjust print darkness (5-30)
                </p>
              </div>
            )}

            <div className="flex items-end">
              <Button 
                onClick={handlePrintLabels} 
                disabled={selectedCount === 0 || !labelDoc}
                className="w-full"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print Labels ({selectedCount})
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      <Card className="border-2 border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>Step 2: Order Selection</CardTitle>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="select-all"
                checked={allPrintableSelected}
                onCheckedChange={(checked) => handleSelectAll(checked === true)}
              />
              <Label htmlFor="select-all" className="text-sm">
                Select All Printable ({printableCount})
              </Label>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            {loading ? (
              <div className="text-center py-8">Loading orders...</div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No orders found for the selected criteria
              </div>
            ) : (
              <div className="space-y-2">
                {filteredOrders.map((order) => (
                  <div
                    key={order.id}
                    className={cn(
                      "flex items-center space-x-4 p-4 border rounded-lg",
                      selectedOrders.includes(order.id) ? "bg-primary/5 border-primary" : "",
                      !order.printable ? "opacity-60" : ""
                    )}
                  >
                    <Checkbox
                      checked={selectedOrders.includes(order.id)}
                      onCheckedChange={(checked) => handleOrderSelection(order.id, checked as boolean)}
                      disabled={!order.printable}
                    />
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-2">
                      <div>
                        <p className="font-medium text-sm">{order.order_number}</p>
                        <p className="text-xs text-muted-foreground">{order.asin_code}</p>
                      </div>
                      <div>
                        <p className="text-sm">{order.sku_code}</p>
                        <p className="text-xs text-muted-foreground">SKU Code</p>
                      </div>
                      <div>
                        <p className="text-sm truncate" title={order.product_title}>
                          {order.product_title}
                        </p>
                        <p className="text-xs text-muted-foreground">Qty: {order.quantity}</p>
                      </div>
                      <div>
                        <p className="text-sm">{order.order_date}</p>
                        <Badge variant="outline" className="text-xs">
                          {order.status}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{order.file_name}</p>
                        {order.printable ? (
                          <Badge variant="outline" className="text-xs bg-green-50 border-green-200 text-green-700">
                            Printable
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs bg-red-50 border-red-200 text-red-700">
                            Not Printable
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};