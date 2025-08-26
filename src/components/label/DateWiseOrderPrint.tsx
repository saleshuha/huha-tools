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
import { CalendarIcon, Printer, Download, Eye, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useLabelDoc } from '@/contexts/LabelDocContext';
import { PrintService } from '@/services/print-service';
import { LabelDataset, PrintSettings, LabelDoc, LabelElement } from '@/types/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
}

export const DateWiseOrderPrint: React.FC = () => {
  const { document: labelDoc, dataset, loadDataset } = useLabelDoc();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'custom'>('today');
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [orders, setOrders] = useState<OrderToProcess[]>([]);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [printSettings, setPrintSettings] = useState<PrintSettings>({
    format: 'pdf',
    paperSize: 'a4',
    orientation: 'portrait',
    dpi: 203,
    copies: 1,
    labelsPerPage: 4,
    margin: 10,
  });
  const [useCustomPageSize, setUseCustomPageSize] = useState(false);
  const [customPageSize, setCustomPageSize] = useState({
    width: 210, // A4 width in mm
    height: 297, // A4 height in mm
  });

  useEffect(() => {
    fetchOrders();
  }, [selectedDate, dateRange, endDate, statusFilter]);

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

      // Fetch all orders from database for label processing
      const { data, error } = await supabase
        .from('order_imports')
        .select('id, order_id, asin, sku, item_title, item_quantity, order_place_date, order_status, has_inventory_match, source_file, created_at')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', queryEndDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching orders:', error);
        toast.error('Failed to fetch orders');
        return;
      }

      const formattedOrders: OrderToProcess[] = (data || []).map((order: any) => ({
        id: order.id,
        file_name: order.source_file || 'Unknown File',
        asin_code: order.asin || '',
        sku_code: order.sku || '',
        product_title: order.item_title || order.sku || order.asin || 'Unknown Product',
        quantity: order.item_quantity || 1,
        order_number: order.order_id || '',
        order_date: format(new Date(order.created_at), 'MMM dd, yyyy HH:mm'),
        status: order.order_status || 'pending',
        has_match: order.has_inventory_match || false,
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
    setSelectedOrders(prev => 
      checked 
        ? [...prev, orderId]
        : prev.filter(id => id !== orderId)
    );
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedOrders(checked ? orders.map(order => order.id) : []);
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

    const data = selectedOrderData.map(order => [
      order.order_number || '',
      order.asin_code || '',
      order.sku_code || '',
      order.product_title || '',
      order.quantity.toString(),
      order.order_date,
      order.status,
      order.file_name
    ]);

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
    console.log('Print labels clicked');
    
    if (!labelDoc) {
      console.log('No label document found');
      toast.error('Please create a label template first');
      return;
    }

    if (selectedOrders.length === 0) {
      console.log('No orders selected');
      toast.error('Please select at least one order to print');
      return;
    }

    try {
      console.log('Generating dataset for orders:', selectedOrders.length);
      const ordersDataset = createDatasetFromOrders();
      
      console.log('Generating HTML for direct print...');
      // Generate HTML content for direct printing
      const html = generateDirectPrintHTML(labelDoc, ordersDataset, selectedOrders.length);
      
      // Create temporary container
      const printContainer = document.createElement('div');
      printContainer.innerHTML = html;
      printContainer.style.position = 'fixed';
      printContainer.style.top = '-9999px';
      printContainer.style.left = '-9999px';
      
      // Add to document
      document.body.appendChild(printContainer);
      
      // Create print-specific styles
      const printStyles = document.createElement('style');
      printStyles.innerHTML = generatePrintStyles();
      document.head.appendChild(printStyles);
      
      // Add class to body to trigger print styles
      document.body.classList.add('printing-labels');
      
      console.log('Triggering direct print...');
      // Print directly
      window.print();
      
      // Clean up after printing
      setTimeout(() => {
        document.body.removeChild(printContainer);
        document.head.removeChild(printStyles);
        document.body.classList.remove('printing-labels');
      }, 1000);
      
      toast.success(`Printing ${selectedOrders.length} labels...`);
      
    } catch (error) {
      console.error('Print error:', error);
      toast.error('Failed to print labels: ' + error.message);
    }
  };

  const generateDirectPrintHTML = (
    document: LabelDoc,
    dataset: LabelDataset | null,
    maxLabels: number = 10
  ): string => {
    const isBulk = dataset && dataset.data.length > 0;
    const totalLabels = Math.min(isBulk ? dataset.data.length : 1, maxLabels);

    let html = '';

    for (let labelIndex = 0; labelIndex < totalLabels; labelIndex++) {
      const dataRow = isBulk ? dataset.data[labelIndex] : [];
      
      html += `<div class="print-label">`;
      
      for (const element of document.elements) {
        html += renderElementToHTML(element, dataset, dataRow);
      }
      
      html += `</div>`;
    }

    return html;
  };

  const generatePrintStyles = (): string => {
    const pageWidth = useCustomPageSize ? customPageSize.width : labelDoc?.size.width || 210;
    const pageHeight = useCustomPageSize ? customPageSize.height : labelDoc?.size.height || 297;

    return `
      @media print {
        @page {
          size: ${pageWidth}mm ${pageHeight}mm;
          margin: 0;
        }
        
        body.printing-labels * {
          visibility: hidden;
        }
        
        body.printing-labels .print-label,
        body.printing-labels .print-label * {
          visibility: visible;
        }
        
        body.printing-labels .print-label {
          position: absolute;
          left: 0;
          top: 0;
          width: ${pageWidth}mm;
          height: ${pageHeight}mm;
          background: white;
          page-break-after: always;
        }
        
        body.printing-labels .print-label:last-child {
          page-break-after: avoid;
        }
        
        body.printing-labels .element {
          position: absolute;
        }
        
        body.printing-labels .text {
          font-family: Arial;
        }
        
        body.printing-labels .barcode,
        body.printing-labels .qr {
          text-align: center;
        }
      }
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

  return (
    <Card className="w-full h-fit">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <CalendarIcon className="h-5 w-5" />
          Date-Wise Order Printing
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Select orders by date to process labels for all available orders
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Date Selection */}
        <div className="grid grid-cols-1 gap-4">
          <div>
            <Label>Date Range</Label>
            <Select value={dateRange} onValueChange={(value: any) => setDateRange(value)}>
              <SelectTrigger>
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

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}>
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
              <div>
                <Label>End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
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
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <Label>Status Filter</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
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
            <div className="flex-1">
              <Label>Print Format</Label>
              <Select value={printSettings.format} onValueChange={(value: any) => setPrintSettings(prev => ({...prev, format: value}))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="zpl">ZPL</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Page Size Settings */}
        <div className="space-y-3">
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

        {/* Orders List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {orders.length} orders found
              </Badge>
              {selectedOrders.length > 0 && (
                <Badge variant="default">
                  {selectedOrders.length} selected
                </Badge>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={fetchOrders} disabled={loading}>
              <Filter className="h-4 w-4 mr-1" />
              Refresh
            </Button>
          </div>

          {orders.length > 0 && (
            <div className="flex items-center gap-2 p-2 bg-muted rounded">
              <Checkbox
                checked={selectedOrders.length === orders.length}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm">Select All ({orders.length} orders)</span>
            </div>
          )}

          <ScrollArea className="max-h-48 w-full">
            <div className="space-y-2">
              {loading ? (
                <div className="text-center text-muted-foreground py-4">Loading orders...</div>
              ) : orders.length === 0 ? (
                <div className="text-center text-muted-foreground py-4">
                  No orders found for the selected date range
                </div>
              ) : (
                orders.map((order) => (
                  <div key={order.id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50">
                    <Checkbox
                      checked={selectedOrders.includes(order.id)}
                      onCheckedChange={(checked) => handleOrderSelection(order.id, !!checked)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm truncate">{order.product_title}</span>
                        <Badge variant="outline" className="text-xs">{order.status}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        {order.order_number && <div>Order: {order.order_number}</div>}
                        {order.asin_code && <div>ASIN: {order.asin_code}</div>}
                        {order.sku_code && <div>SKU: {order.sku_code}</div>}
                        <div>Qty: {order.quantity} • {order.order_date}</div>
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
          Print {selectedOrders.length > 0 ? `${selectedOrders.length} ` : ''}Labels
        </Button>

        {!labelDoc && (
          <div className="p-3 bg-muted rounded-lg text-xs text-muted-foreground text-center">
            Create a label template to enable printing
          </div>
        )}

        {selectedOrders.length > 0 && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-xs space-y-2">
            <p className="font-medium text-blue-900 dark:text-blue-300">
              Print Settings:
            </p>
            <ul className="text-blue-700 dark:text-blue-400 space-y-1">
              <li>• Format: {printSettings.format.toUpperCase()}</li>
              <li>• Selected: {selectedOrders.length} orders</li>
              <li>• Total Labels: {selectedOrders.length * printSettings.copies}</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};