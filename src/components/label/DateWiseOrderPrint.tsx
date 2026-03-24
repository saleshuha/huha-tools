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

interface OrderToProcess {
  id: string;
  file_name: string;
  asin_code?: string;
  sku_code?: string;
  product_title?: string;
  quantity: number;
  order_number?: string;
  order_date: string;
  status: string;
  has_match: boolean;
  printable: boolean;
}

export const DateWiseOrderPrint: React.FC = () => {
  const { document: labelDoc, dataset, loadDataset } = useLabelDoc();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'custom'>('week');
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [dateFilterType, setDateFilterType] = useState<'upload_date' | 'order_date'>('upload_date');
  const [orders, setOrders] = useState<OrderToProcess[]>([]);
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
      console.log('🔄 Attempting to connect to QZ Tray...');
      const connected = await qzConnectionManager.connect();
      console.log('🔗 QZ Tray connection result:', connected);
      
      if (connected) {
        setQzConnected(true);
        console.log('✅ QZ Tray connected successfully');
        
        const printers = await qzConnectionManager.getPrinters();
        console.log('🖨️ Available printers:', printers);
        setAvailablePrinters(printers);
        
        const savedDefaultPrinter = localStorage.getItem('qz-default-printer');
        const defaultPrinter = savedDefaultPrinter || (await qzConnectionManager.getDefaultPrinter());
        console.log('🎯 Default printer:', defaultPrinter);
        
        if (defaultPrinter) {
          setSelectedPrinter(defaultPrinter);
        } else if (printers.length > 0) {
          setSelectedPrinter(printers[0]);
        }
        
        toast.success(`QZ Tray connected! Found ${printers.length} printer(s)`);
      } else {
        throw new Error('Connection returned false');
      }
    } catch (error) {
      console.error('❌ Failed to connect to QZ Tray:', error);
      setQzConnected(false);
      
      // Switch to PDF mode as fallback
      setPrintSettings(prev => ({ ...prev, format: 'pdf' }));
      
      toast.error('QZ Tray connection failed. Switched to PDF printing mode.');
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

      // Use the new get_printable_orders function
      const { data, error } = await supabase.rpc('get_printable_orders', {
        start_date: startDate.toISOString(),
        end_date: queryEndDate.toISOString(),
        date_filter_type: dateFilterType === 'order_date' ? 'order_date' : 'created_at',
        status_filter: statusFilter
      });

      if (error) {
        console.error('Error fetching orders:', error);
        toast.error('Failed to fetch orders');
        return;
      }

      const formattedOrders: OrderToProcess[] = ((data as any) || []).map((order: any) => ({
        id: order.id,
        file_name: order.source_file || 'Unknown File',
        asin_code: order.asin || '',
        sku_code: order.sku || '',
        product_title: order.item_title || order.sku || order.asin || 'Unknown Product',
        quantity: order.item_quantity || 1,
        order_number: order.order_id || '',
        order_date: dateFilterType === 'order_date' && order.order_place_date 
          ? format(new Date(order.order_place_date), 'MMM dd, yyyy')
          : format(new Date(order.created_at), 'MMM dd, yyyy HH:mm'),
        status: order.order_status || 'pending',
        has_match: false, // Not used anymore, replaced by printable
        printable: order.printable || false,
      }));

      setOrders(formattedOrders);
      setSelectedOrders([]);
    } catch (error) {
      console.error('Error:', error);
      toast.error('An error occurred while fetching orders');
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
        order.product_title || '',
        order.quantity.toString(),
        order.order_date,
        order.status,
        order.file_name
      ]);
    }

    return {
      id: `orders_${Date.now()}`,
      name: `Orders_${format(selectedDate, 'yyyy-MM-dd')}`,
      description: `Orders from ${format(selectedDate, 'MMM dd, yyyy')}`,
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
          <title>Print Labels</title>
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
          <h2 style="margin-bottom: 20px;">Labels (${totalLabels} total)</h2>
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

  const generateCustomHTMLForPrint = (
    document: LabelDoc,
    dataset: LabelDataset | null,
    maxLabels: number = 10
  ): string => {
    const isBulk = dataset && dataset.data.length > 0;
    const totalLabels = Math.min(isBulk ? dataset.data.length : 1, maxLabels);

    // Use custom page size if enabled, otherwise use label size
    const pageWidth = useCustomPageSize ? customPageSize.width : document.size.width;
    const pageHeight = useCustomPageSize ? customPageSize.height : document.size.height;

    let html = `
      <html>
        <head>
          <title>Label Print</title>
          <style>
            @page {
              size: ${pageWidth}mm ${pageHeight}mm;
              margin: 0;
            }
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 0;
            }
            .label { 
              width: ${pageWidth}mm;
              height: ${pageHeight}mm;
              position: relative; 
              background: white;
              page-break-after: always;
            }
            .label:last-child {
              page-break-after: avoid;
            }
            .element { position: absolute; }
            .text { font-family: Arial; }
            .barcode, .qr { text-align: center; }
            @media print {
              .label {
                page-break-after: always;
              }
              .label:last-child {
                page-break-after: avoid;
              }
            }
          </style>
        </head>
        <body>
    `;

    for (let labelIndex = 0; labelIndex < totalLabels; labelIndex++) {
      const dataRow = isBulk ? dataset.data[labelIndex] : [];
      
      html += `<div class="label">`;
      
      for (const element of document.elements) {
        html += renderElementToHTML(element, dataset, dataRow);
      }
      
      html += `</div>`;
    }

    html += `</body></html>`;
    return html;
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
        let value = dataRow[columnIndex] || '';
        
        if (element.dataTransform) {
          const transform = element.dataTransform;
          if (transform.prefix) value = transform.prefix + value;
          if (transform.suffix) value = value + transform.suffix;
          if (transform.uppercase) value = value.toUpperCase();
          if (transform.truncate && value.length > transform.truncate) {
            value = value.substring(0, transform.truncate) + '...';
          }
        }
        
        return value;
      }
      return element.text || '';
    };

    switch (element.type) {
      case 'text':
        const content = resolveMappedContent(element, dataRow, dataset?.headers || []);
        return `<div class="element text" style="${style}">${content}</div>`;

      case 'multitext':
        const multiContent = resolveMappedContent(element, dataRow, dataset?.headers || []);
        const multiStyle = `
          ${style} 
          line-height: ${element.lineHeight || 1.2}; 
          word-wrap: break-word; 
          white-space: pre-wrap; 
          overflow: hidden;
          text-align: ${element.textAlign || 'left'};
          font-family: ${element.fontFamily || 'Arial'};
        `;
        return `<div class="element text" style="${multiStyle}">${multiContent}</div>`;

      case 'rectangle':
        const rectStyle = `${style} background: ${element.fill || 'transparent'}; border: ${element.strokeWidth || 1}px solid ${element.stroke || '#000000'};`;
        return `<div class="element" style="${rectStyle}"></div>`;

      case 'circle':
        const circleStyle = `${style} background: ${element.fill || 'transparent'}; border: ${element.strokeWidth || 1}px solid ${element.stroke || '#000000'}; border-radius: 50%;`;
        return `<div class="element" style="${circleStyle}"></div>`;

      case 'barcode':
        const barcodeContent = resolveMappedContent(element, dataRow, dataset?.headers || []);
        return `<div class="element barcode" style="${style}">*${barcodeContent}*</div>`;

      case 'qr':
        const qrContent = resolveMappedContent(element, dataRow, dataset?.headers || []);
        return `<div class="element qr" style="${style}">QR: ${qrContent}</div>`;

      default:
        return '';
    }
  };

  const handlePreviewLabels = async () => {
    if (!labelDoc) {
      toast.error('Please create a label template first');
      return;
    }

    if (selectedOrders.length === 0) {
      toast.error('Please select at least one order to preview');
      return;
    }

    try {
      const ordersDataset = createDatasetFromOrders();
      const html = PrintService.generateHTMLPreview(labelDoc, ordersDataset, 10);
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(html);
        newWindow.document.close();
      }
    } catch (error) {
      console.error('Preview error:', error);
      toast.error('Failed to generate preview');
    }
  };

  const handleLoadAsDataset = () => {
    if (selectedOrders.length === 0) {
      toast.error('Please select at least one order');
      return;
    }

    const ordersDataset = createDatasetFromOrders();
    // Create a simple dataset object that can be used by the label system
    const simpleDataset = {
      name: ordersDataset.name,
      headers: ordersDataset.headers,
      data: ordersDataset.data,
      rowCount: ordersDataset.rowCount,
    };
    
    // We'll create a simple way to load this data
    toast.success(`Dataset created with ${selectedOrders.length} orders. Use the data in your label template.`);
  };

  const getTotalLabels = (): number => {
    if (selectedOrders.length === 0) return 0;
    
    const selectedOrderData = orders.filter(order => selectedOrders.includes(order.id));
    
    if (usePerQuantityPrinting) {
      const totalQuantity = selectedOrderData.reduce((sum, order) => sum + order.quantity, 0);
      return totalQuantity * printSettings.copies;
    } else {
      return selectedOrders.length * printSettings.copies;
    }
  };

  return (
    <Card className="w-full h-fit border-2 border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <CalendarIcon className="h-5 w-5" />
          Step 1: Date-Wise Order Printing
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Select orders by date to process labels for all available orders
        </p>
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
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal border-2 border-border", !selectedDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "MMM dd, yyyy") : <span>Pick date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-background border shadow-md">
                <Calendar mode="single" selected={selectedDate} onSelect={(date) => date && setSelectedDate(date)} className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>

          {dateRange === 'custom' && (
            <div className="space-y-2">
              <Label>End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal border-2 border-border", !endDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "MMM dd, yyyy") : <span>Pick date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-background border shadow-md">
                  <Calendar mode="single" selected={endDate} onSelect={(date) => date && setEndDate(date)} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
          )}

          <div className="space-y-2">
            <Label>Filter By</Label>
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

        {/* Status and Format Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Status Filter</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="border-2 border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Orders</SelectItem>
                <SelectItem value="processed">Processed</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Print Format</Label>
            <Select value={printSettings.format} onValueChange={(value: any) => setPrintSettings(prev => ({...prev, format: value}))}>
              <SelectTrigger className="border-2 border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="zpl">ZPL (Direct Print)</SelectItem>
                <SelectItem value="pdf">PDF (Preview)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Print Settings */}
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Copies</Label>
              <Input
                type="number"
                min="1"
                max="100"
                value={printSettings.copies}
                onChange={(e) => setPrintSettings(prev => ({
                  ...prev,
                  copies: parseInt(e.target.value) || 1
                }))}
              />
            </div>
            <div>
              <Label>DPI</Label>
              <Select 
                value={printSettings.dpi.toString()} 
                onValueChange={(value) => setPrintSettings(prev => ({
                  ...prev,
                  dpi: parseInt(value) as 203 | 300
                }))}
              >
                <SelectTrigger className="border-2 border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="203">203 DPI</SelectItem>
                  <SelectItem value="300">300 DPI</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Darkness (0-30)</Label>
              <Input
                type="number"
                min="0"
                max="30"
                value={printSettings.darkness || 10}
                onChange={(e) => setPrintSettings(prev => ({
                  ...prev,
                  darkness: parseInt(e.target.value) || 10
                }))}
                placeholder="10"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              checked={usePerQuantityPrinting}
              onCheckedChange={(checked) => setUsePerQuantityPrinting(!!checked)}
            />
            <Label className="text-sm font-medium">Print separate label for each quantity</Label>
          </div>
          
          <div className="flex items-center gap-2">
            <Checkbox
              checked={useCustomPageSize}
              onCheckedChange={(checked) => setUseCustomPageSize(!!checked)}
            />
            <Label className="text-sm font-medium">Use Custom Page Size</Label>
          </div>
          
          {useCustomPageSize && (
            <div className="grid grid-cols-2 gap-3 p-3 bg-muted rounded-lg">
              <div>
                <Label className="text-xs">Width (mm)</Label>
                <Input
                  type="number"
                  value={customPageSize.width}
                  onChange={(e) => setCustomPageSize(prev => ({...prev, width: Number(e.target.value)}))}
                  placeholder="210"
                  className="h-8"
                />
              </div>
              <div>
                <Label className="text-xs">Height (mm)</Label>
                <Input
                  type="number"
                  value={customPageSize.height}
                  onChange={(e) => setCustomPageSize(prev => ({...prev, height: Number(e.target.value)}))}
                  placeholder="297"
                  className="h-8"
                />
              </div>
              <div className="col-span-2">
                <Label className="text-xs text-muted-foreground">
                  Page Size: {customPageSize.width} × {customPageSize.height} mm
                  {!useCustomPageSize && ` (using label size: ${labelDoc?.size.width || 0} × ${labelDoc?.size.height || 0} mm)`}
                </Label>
              </div>
            </div>
          )}
        </div>

        {/* QZ Tray Status and Printer Selection */}
        {printSettings.format === 'zpl' && (
          <div className="space-y-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-center gap-2">
              <Badge variant={qzConnected ? "default" : "secondary"} className={qzConnected ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400" : ""}>
                QZ Tray {qzConnected ? "Connected" : "Disconnected"}
              </Badge>
              {!qzConnected && (
                <Button variant="outline" size="sm" onClick={initializeQZ}>
                  Reconnect
                </Button>
              )}
            </div>
            
            {qzConnected && availablePrinters.length > 0 && (
              <div>
                <Label className="text-sm font-medium">Select Printer</Label>
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
            
            {!qzConnected && (
              <p className="text-sm text-blue-700 dark:text-blue-400">
                Install and run QZ Tray for direct printer support
              </p>
            )}
          </div>
        )}

        {/* Match with Orders Section */}
        <div className="p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Refresh Order Printability</h3>
              <p className="text-sm text-muted-foreground">
                Check which orders can be printed based on your current print eligible items
              </p>
            </div>
            <Button 
              onClick={matchWithOrders}
              disabled={matchingLoading}
              className="ml-4"
            >
              {matchingLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Orders
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Orders List */}
        <div className="space-y-3 p-4 border-2 border-border rounded-lg bg-card/50">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Step 2: Order Selection & Stats</h3>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {orders.length} orders found
              </Badge>
              <Badge variant="default" className="bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400">
                {orders.filter(o => o.printable).length} printable
              </Badge>
              {selectedOrders.length > 0 && (
                <Badge variant="default">
                  {selectedOrders.length} selected
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="show-printable"
                  checked={showOnlyPrintable}
                  onCheckedChange={(checked) => setShowOnlyPrintable(!!checked)}
                />
                <Label htmlFor="show-printable" className="text-sm">
                  Show only printable
                </Label>
              </div>
              <Button variant="outline" size="sm" onClick={fetchOrders} disabled={loading}>
                <Filter className="h-4 w-4 mr-1" />
                Refresh
              </Button>
            </div>
          </div>

          {getFilteredOrders().length > 0 && (
            <div className="flex items-center gap-2 p-2 bg-muted rounded">
              <Checkbox
                checked={selectedOrders.length === getFilteredOrders().filter(o => o.printable).length && getFilteredOrders().filter(o => o.printable).length > 0}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm">
                Select All Printable ({getFilteredOrders().filter(o => o.printable).length} of {getFilteredOrders().length} orders)
              </span>
            </div>
          )}

          <ScrollArea className="max-h-48 w-full">
            <div className="space-y-2">
              {loading ? (
                <div className="text-center text-muted-foreground py-4">Loading orders...</div>
              ) : getFilteredOrders().length === 0 ? (
                <div className="text-center text-muted-foreground py-4">
                  {showOnlyPrintable ? "No printable orders found for the selected date range" : "No orders found for the selected date range"}
                </div>
              ) : (
                getFilteredOrders().map((order) => (
                  <div key={order.id} className={cn(
                    "flex items-start gap-3 p-3 border rounded-lg",
                    order.printable ? "hover:bg-muted/50" : "opacity-50 bg-muted/20"
                  )}>
                    <Checkbox
                      checked={selectedOrders.includes(order.id)}
                      onCheckedChange={(checked) => handleOrderSelection(order.id, !!checked)}
                      disabled={!order.printable}
                    />
                     <div className="flex-1 min-w-0">
                       <div className="flex items-center gap-2 mb-1">
                         <span className="font-medium text-sm truncate">{order.product_title}</span>
                         <Badge variant="outline" className="text-xs">{order.status}</Badge>
                         {order.printable ? (
                           <Badge variant="default" className="text-xs bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400">
                             Printable
                           </Badge>
                         ) : (
                           <Badge variant="secondary" className="text-xs bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400">
                             Not Printable
                           </Badge>
                         )}
                       </div>
                       <div className="text-xs text-muted-foreground space-y-1">
                         {order.order_number && <div>Order: {order.order_number}</div>}
                         {order.asin_code && <div>ASIN: {order.asin_code}</div>}
                         {order.sku_code && <div>SKU: {order.sku_code}</div>}
                         <div>Qty: {order.quantity} • {order.order_date}</div>
                         {!order.printable && (
                           <div className="text-red-600 dark:text-red-400 text-xs">
                             SKU not in print eligible items
                           </div>
                         )}
                       </div>
                     </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            onClick={handlePreviewLabels}
            disabled={selectedOrders.length === 0 || !labelDoc}
            className="w-full"
          >
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button
            variant="outline"
            onClick={handleLoadAsDataset}
            disabled={selectedOrders.length === 0}
            className="w-full"
          >
            <Download className="h-4 w-4 mr-2" />
            Load Data
          </Button>
        </div>
        
        <Button
          onClick={handlePrintLabels}
          disabled={selectedOrders.length === 0 || !labelDoc}
          className="w-full"
        >
          <Printer className="h-4 w-4 mr-2" />
          {printSettings.format === 'zpl' && qzConnected && selectedPrinter ? 'Direct Print' : 'Print'} {selectedOrders.length > 0 ? `${getTotalLabels()} ` : ''}Labels
        </Button>

        {/* Status Messages */}
        {!labelDoc && (
          <div className="p-3 bg-muted rounded-lg text-xs text-muted-foreground text-center">
            Create a label template to enable printing
          </div>
        )}

        {labelDoc && selectedOrders.length === 0 && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-xs text-blue-700 dark:text-blue-300 text-center">
            Select orders to enable printing
          </div>
        )}

        {printSettings.format === 'zpl' && (!qzConnected || !selectedPrinter) && selectedOrders.length > 0 && labelDoc && (
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-xs text-yellow-700 dark:text-yellow-300 text-center">
            {!qzConnected ? 'QZ Tray not connected - will print as PDF' : 'No printer selected - will print as PDF'}
          </div>
        )}

        {selectedOrders.length > 0 && (
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-xs space-y-2">
            <p className="font-medium text-green-900 dark:text-green-300">
              Print Summary:
            </p>
            <ul className="text-green-700 dark:text-green-400 space-y-1">
              <li>• Format: {printSettings.format.toUpperCase()}</li>
              <li>• Selected Orders: {selectedOrders.length}</li>
              <li>• Labels per Order: {usePerQuantityPrinting ? 'Per Quantity' : '1'}</li>
              <li>• Total Labels: {getTotalLabels()}</li>
              <li>• DPI: {printSettings.dpi}</li>
              <li>• Copies: {printSettings.copies}</li>
              {qzConnected && selectedPrinter && (
                <li>• Printer: {selectedPrinter}</li>
              )}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};