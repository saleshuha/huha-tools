// Print dialog for PO items with preview and options
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { POOrder } from '@/components/POTracker';
import { POPrintItem, aggregatePOItemsByASIN, convertOrdersToPrintItems, formatPONumbers, fetchTotalPrintedByASIN, fetchShippedQtyByASIN, fetchFbaQtyByASIN } from '@/utils/po-print-helpers';
import { POPrintDocument } from './POPrintDocument';
import { generateBulkPOLabelsZPL } from '@/utils/po-label-printer';
import { useProductImages } from '@/hooks/useProductImages';
import { useToast } from '@/hooks/use-toast';
import { Printer, Download, FileText, Tag, Loader2, Package, Search, TableIcon, ExternalLink, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { qzConnectionManager } from '@/utils/qz-connection-manager';
import { useReactToPrint } from 'react-to-print';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Papa from 'papaparse';
import { supabase } from '@/integrations/supabase/client';
import { PrintService } from '@/services/print-service';
import { LabelDoc, LabelDataset } from '@/types/label';

interface POPrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orders: POOrder[];
  mode: 'single' | 'bulk';
  title?: string;
}

export const POPrintDialog: React.FC<POPrintDialogProps> = ({
  open,
  onOpenChange,
  orders,
  mode,
  title = 'Print Purchase Order Items'
}) => {
  const [printFormat, setPrintFormat] = useState<'document' | 'label'>('document');
  const [previewMode, setPreviewMode] = useState<'document' | 'table'>('document');
  const [includeImages, setIncludeImages] = useState(true);
  const [bulkAggregate, setBulkAggregate] = useState(false);
  const [copies, setCopies] = useState(1);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set(Array.from({ length: orders.length }, (_, i) => i)));
  const [isPrinting, setIsPrinting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [stockSort, setStockSort] = useState<'none' | 'asc' | 'desc'>('none');
  const [poTemplate, setPoTemplate] = useState<LabelDoc | null>(null);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [truePrintedTotals, setTruePrintedTotals] = useState<Map<string, number>>(new Map());
  const [shippedTotals, setShippedTotals] = useState<Map<string, number>>(new Map());
  const [fbaTotals, setFbaTotals] = useState<Map<string, number>>(new Map());
  const navigate = useNavigate();
  
  const printRef = useRef<HTMLDivElement>(null);
  const { getImageByAsin } = useProductImages();
  const { toast } = useToast();

  // Load PO template when dialog opens
  React.useEffect(() => {
    const loadTemplate = async () => {
      if (!open) return;
      
      setLoadingTemplate(true);
      try {
        // Get selected template ID from localStorage (set in ReceiveStock page)
        const selectedTemplateId = localStorage.getItem('stock-receiving-po-template-id');
        
        if (!selectedTemplateId) {
          console.log('No PO template selected, will use fallback generator');
          setPoTemplate(null);
          return;
        }

        const { data, error } = await supabase
          .from('label_templates')
          .select('*')
          .eq('id', selectedTemplateId)
          .single();

        if (error) throw error;

        if (data) {
          setPoTemplate({
            id: data.id,
            name: data.name,
            size: { width: data.width, height: data.height, unit: 'mm' },
            elements: data.canvas_data?.elements || [],
            createdAt: data.created_at,
            updatedAt: data.updated_at
          });
          console.log('✅ Loaded PO template:', data.name);
        }
      } catch (error) {
        console.error('Failed to load PO template:', error);
      } finally {
        setLoadingTemplate(false);
      }
    };

    loadTemplate();
  }, [open]);

  // Fetch true printed totals, shipped qty, and FBA qty from DB when dialog opens
  React.useEffect(() => {
    if (!open || orders.length === 0) return;
    
    const asins = [...new Set(orders.map(o => o.asin).filter(Boolean))] as string[];
    
    const fetchTotals = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user?.id) return;
      const userId = userData.user.id;
      
      const [printed, shipped, fba] = await Promise.all([
        fetchTotalPrintedByASIN(asins, userId),
        fetchShippedQtyByASIN(asins, userId),
        fetchFbaQtyByASIN(asins, userId),
      ]);
      
      setTruePrintedTotals(printed);
      setShippedTotals(shipped);
      setFbaTotals(fba);
    };
    
    fetchTotals();
  }, [open, orders]);

  // Debug: Log total orders received
  React.useEffect(() => {
    if (orders.length > 0) {
      console.log('🖨️ POPrintDialog: Received', orders.length, 'orders');
      console.log('  Unique ASINs:', new Set(orders.map(o => o.asin)).size);
      console.log('  Unique POs:', [...new Set(orders.map(o => o.po_number))].join(', '));
      console.log('  Total quantity:', orders.reduce((sum, o) => sum + o.quantity, 0));
    }
  }, [orders]);

  // Filter orders based on search query and maintain proper indices
  const filteredOrdersWithIndices = React.useMemo(() => {
    if (!searchQuery.trim()) {
      return orders.map((order, index) => ({ order, originalIndex: index }));
    }
    
    const query = searchQuery.toLowerCase();
    return orders
      .map((order, index) => ({ order, originalIndex: index }))
      .filter(({ order, originalIndex }) => {
        const searchText = [
          order.asin,
          order.sku_code,
          order.title,
          order.po_number,
          order.model_number,
          `#${originalIndex + 1}` // Allow searching by serial number
        ].filter(Boolean).join(' ').toLowerCase();
        
        return searchText.includes(query);
      });
  }, [orders, searchQuery]);

  // Extract filtered orders for easier access
  const filteredOrders = React.useMemo(() => {
    return filteredOrdersWithIndices.map(({ order }) => order);
  }, [filteredOrdersWithIndices]);

  // Helper to extract stock quantity from order notes
  const extractStockQuantity = (notes?: string): number => {
    if (!notes) return 0;
    const match = notes.match(/Fulfilled from stock:\s*(\d+)/);
    return match ? parseInt(match[1]) : 0;
  };

  // Prepare print items based on selection and aggregation
  const printItems = React.useMemo(() => {
    const selectedOrders = orders.filter((_, index) => selectedItems.has(index));
    
    console.log('🔍 POPrintDialog - Selected orders for printing:', {
      count: selectedOrders.length,
      sample: selectedOrders[0],
      allPriorities: selectedOrders.map(o => ({ po: o.po_number, asin: o.asin, priority: o.priority }))
    });
    
    let items: POPrintItem[];
    if (mode === 'bulk' && bulkAggregate) {
      items = aggregatePOItemsByASIN(selectedOrders);
    } else {
      items = convertOrdersToPrintItems(selectedOrders);
    }
    
    console.log('📦 POPrintDialog - Items after aggregation/conversion:', {
      count: items.length,
      sample: items[0],
      allPriorities: items.map(i => ({ asin: i.asin, priority: i.priority }))
    });

    // Add images and stock fulfillment data, then sort by quantity (high to low)
    const enrichedItems = items
      .map(item => {
        // Find matching order to extract stock metadata
        const matchingOrder = selectedOrders.find(o => o.asin === item.asin) as any;
        const stockMeta = matchingOrder?._stockFulfillment;
        const stockQty = extractStockQuantity(matchingOrder?.notes);
        
        return {
          ...item,
          imageUrl: getImageByAsin(item.asin)?.image_url,
          // Add stock tracking
          fulfilledFromStock: stockMeta?.isFromStock || stockQty > 0 || false,
          stockQuantity: stockQty || stockMeta?.stockQuantity || 0,
          supplierQuantity: stockMeta?.supplierQuantity || (stockQty > 0 ? Math.max(0, item.quantity - stockQty) : item.quantity),
          inventorySource: stockMeta?.inventoryMatch?.type,
          serialNumber: stockMeta?.inventoryMatch?.serialNumber,
          fulfillmentNotes: matchingOrder?.notes,
          // Inventory availability data
          inventoryQty: matchingOrder?._inventoryQty ?? undefined,
          inventoryStatus: matchingOrder?._inventoryStatus ?? undefined,
          // Print tracking
          printedQuantity: truePrintedTotals.get(item.asin) ?? matchingOrder?.printed_quantity ?? 0,
          // External inventory reference
          shippedQty: shippedTotals.get(item.asin) ?? 0,
          fbaQty: fbaTotals.get(item.asin) ?? 0,
        };
      })
      .sort((a, b) => {
        // Apply stock sort if active, otherwise default to qty high-to-low
        if (stockSort === 'desc') return (b.inventoryQty ?? 0) - (a.inventoryQty ?? 0);
        if (stockSort === 'asc') return (a.inventoryQty ?? 0) - (b.inventoryQty ?? 0);
        return b.quantity - a.quantity;
      });
    
    console.log('✅ POPrintDialog - Final printItems:', {
      count: enrichedItems.length,
      sample: enrichedItems[0],
      priorities: enrichedItems.map(i => ({ asin: i.asin, priority: i.priority }))
    });
    
    return enrichedItems;
  }, [orders, selectedItems, mode, bulkAggregate, getImageByAsin, stockSort, truePrintedTotals, shippedTotals, fbaTotals]);

  const toggleItem = (index: number) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedItems(newSelected);
  };

  const toggleAll = () => {
    if (selectedItems.size === orders.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(Array.from({ length: orders.length }, (_, i) => i)));
    }
  };

  const selectFilteredResults = () => {
    const filteredIndices = filteredOrdersWithIndices.map(({ originalIndex }) => originalIndex);
    setSelectedItems(new Set(filteredIndices));
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
  });

  const handlePrintLabel = async () => {
    setIsPrinting(true);
    try {
      // Check QZ Tray connection
      const isConnected = await qzConnectionManager.connect();
      if (!isConnected) {
        throw new Error('QZ Tray is not connected. Please ensure QZ Tray is running.');
      }

      let zpl: string;

        // Use template system if template is loaded
        if (poTemplate) {
          console.log('🏷️ Using template system for PO labels');
          
          // Create dataset with standard PO columns
          const dataset: LabelDataset = {
            id: 'po-print-session',
            name: 'PO Print Session',
            description: 'Temporary dataset for PO label printing',
            headers: ['PO Number', 'Priority', 'asin', 'sku_code', 'model_number', 'title', 'quantity'],
            data: printItems.map(item => [
              item.poNumbers.join(', '),
              item.priority?.toString() || '3',
              item.asin || '',
              item.sku_code || '',
              item.model_number || '',
              item.title,
              item.quantity.toString()
            ]),
            rowCount: printItems.length,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          console.log('📊 POPrintDialog - Dataset created:', {
            headers: dataset.headers,
            rowCount: dataset.data.length,
            firstRow: dataset.data[0]
          });

          const printDarkness = parseInt(localStorage.getItem('stock-receiving-print-darkness') || '10');

          console.log('🎯 Using PrintService.generateZPL with standard column names');
          
          zpl = PrintService.generateZPL(poTemplate, dataset, {
            format: 'zpl',
            dpi: 203,
            copies: copies,
            darkness: printDarkness,
            labelsPerPage: 1,
            paperSize: 'custom',
            orientation: 'portrait',
            margin: 0
          });
        
        console.log('✅ POPrintDialog - ZPL generated, length:', zpl.length);

        console.log('✅ ZPL generated using template, length:', zpl.length);
      } else {
        // Fallback to hardcoded generator
        console.log('⚠️ No template selected, using fallback generator');
        toast({
          title: "Using default labels",
          description: "Select a PO template in Receive Stock settings for custom labels",
        });

        zpl = generateBulkPOLabelsZPL(printItems, {
          dpi: 203,
          labelWidth: 4 * 203,
          labelHeight: 6 * 203,
          includeBarcode: true
        }, copies);
      }

      // Get printers and use default
      const printers = await qzConnectionManager.getPrinters();
      if (printers.length === 0) {
        throw new Error('No printers found');
      }

      const defaultPrinter = await qzConnectionManager.getDefaultPrinter() || printers[0];

      // Print ZPL
      await qzConnectionManager.print(zpl, defaultPrinter);

      toast({
        title: "Print sent successfully",
        description: `${printItems.length} label(s) sent to ${defaultPrinter}`,
      });

      onOpenChange(false);
    } catch (error: any) {
      console.error('Print error:', error);
      toast({
        title: "Print failed",
        description: error.message || "Failed to print labels",
        variant: "destructive"
      });
    } finally {
      setIsPrinting(false);
    }
  };

  const handleDownloadZPL = () => {
    const zpl = generateBulkPOLabelsZPL(printItems, {
      dpi: 203,
      labelWidth: 4 * 203,
      labelHeight: 6 * 203,
      includeBarcode: true
    }, copies);

    const blob = new Blob([zpl], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `po-labels-${Date.now()}.zpl`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "ZPL downloaded",
      description: "Label file has been downloaded",
    });
  };

  const handleExportCSV = () => {
    const csvHeaders = ['#', 'ASIN', 'Title', 'SKU', 'Model', 'Quantity', 'PO Numbers'];
    const csvRows = printItems.map((item, index) => [
      index + 1,
      item.asin || '',
      item.title || '',
      item.sku_code || '',
      item.model_number || '',
      item.quantity,
      Array.isArray(item.poNumbers) ? item.poNumbers.join('; ') : item.poNumbers
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `po-items-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "CSV Exported",
      description: `Exported ${printItems.length} items without images`,
    });
  };

  const handleOpenWorkspace = () => {
    const selectedOrders = orders.filter((_, index) => selectedItems.has(index));
    
    if (selectedOrders.length === 0) {
      toast({
        title: 'No items selected',
        description: 'Please select at least one item to open in workspace',
        variant: 'destructive'
      });
      return;
    }

    // Enrich orders with image URLs before passing to workspace
    const enrichedOrders = selectedOrders.map(order => ({
      ...order,
      _workspaceImageUrl: getImageByAsin(order.asin)?.image_url
    }));
    
    navigate('/po-print-workspace', {
      state: {
        orders: enrichedOrders,
        settings: {
          printFormat,
          includeImages,
          bulkAggregate,
          copies
        }
      }
    });
    
    onOpenChange(false);
  };

  const totalQuantity = printItems.reduce((sum, item) => sum + item.quantity, 0);
  const itemsWithImages = printItems.filter(item => item.imageUrl).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>
            Select items and configure print settings for your purchase order documents or labels.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-4 flex-1 overflow-hidden">
          {/* Left Panel - Options */}
          <div className="w-80 space-y-4 overflow-y-auto pr-2">
            {/* Print Format */}
            <div className="space-y-2">
              <Label>Print Format</Label>
              <RadioGroup value={printFormat} onValueChange={(value: any) => setPrintFormat(value)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="document" id="format-document" />
                  <Label htmlFor="format-document" className="flex items-center gap-2 cursor-pointer">
                    <FileText className="h-4 w-4" />
                    Document (A4)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="label" id="format-label" />
                  <Label htmlFor="format-label" className="flex items-center gap-2 cursor-pointer">
                    <Tag className="h-4 w-4" />
                    Shipping Label (4x6)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Options */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="include-images">Include Images</Label>
                <Switch
                  id="include-images"
                  checked={includeImages}
                  onCheckedChange={setIncludeImages}
                  disabled={printFormat === 'label'} // Images not supported in ZPL
                />
              </div>

              {mode === 'bulk' && (
                <div className="flex items-center justify-between">
                  <Label htmlFor="aggregate">Aggregate by ASIN</Label>
                  <Switch
                    id="aggregate"
                    checked={bulkAggregate}
                    onCheckedChange={setBulkAggregate}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="copies">Copies per Item</Label>
                <Input
                  id="copies"
                  type="number"
                  min="1"
                  max="10"
                  value={copies}
                  onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
                />
              </div>
            </div>

            {/* Item Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Items to Print ({filteredOrders.length})</Label>
                <div className="flex items-center gap-1">
                  <Button
                    variant={stockSort !== 'none' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setStockSort(prev => prev === 'none' ? 'desc' : prev === 'desc' ? 'asc' : 'none')}
                    className="text-xs gap-1 h-7 px-2"
                    title="Sort by in-stock quantity"
                  >
                    📦 Stock
                    {stockSort === 'desc' ? <ArrowDown className="h-3 w-3" /> : stockSort === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleAll}
                    className="h-7"
                  >
                    {selectedItems.size === orders.length ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>
              </div>

              {/* Search Input */}
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by ASIN, SKU, Title, PO, or #number..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
                {searchQuery && filteredOrdersWithIndices.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={selectFilteredResults}
                    className="w-full"
                  >
                    Select All Results ({filteredOrdersWithIndices.length})
                  </Button>
                )}
              </div>

              <ScrollArea className="h-48 border rounded-md p-2">
                {filteredOrdersWithIndices.length > 0 ? (
                  <div className="space-y-2">
                    {filteredOrdersWithIndices.map(({ order, originalIndex }) => (
                      <div key={originalIndex} className="flex items-start gap-2 p-2 hover:bg-muted rounded">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold flex-shrink-0">
                          {originalIndex + 1}
                        </div>
                        <Checkbox
                          checked={selectedItems.has(originalIndex)}
                          onCheckedChange={() => toggleItem(originalIndex)}
                        />
                        <div className="flex-1 text-sm">
                          <div className="font-medium">{order.asin || 'N/A'}</div>
                          {order.sku_code && (
                            <div className="text-xs text-muted-foreground">SKU: {order.sku_code}</div>
                          )}
                          <div className="text-xs text-muted-foreground truncate">{order.title || 'No title'}</div>
                          <div className="text-xs text-muted-foreground">
                            Qty: {order.quantity} | PO: {order.po_number}
                            {(order.printed_quantity ?? 0) > 0 && (
                              <span className="ml-1 text-primary">| 🖨 {order.printed_quantity}/{order.quantity}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center p-4">
                    <Package className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">No items found</p>
                    <p className="text-xs text-muted-foreground">Try a different search term</p>
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Summary */}
            <div className="border rounded-lg p-3 bg-muted/50 space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Selected Items:</span>
                <span className="font-semibold">{printItems.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Quantity:</span>
                <span className="font-semibold">{totalQuantity}</span>
              </div>
              {includeImages && printFormat === 'document' && (
                <div className="flex justify-between">
                  <span>With Images:</span>
                  <span className="font-semibold">{itemsWithImages}/{printItems.length}</span>
                </div>
              )}
              {mode === 'bulk' && bulkAggregate && (
                <div className="text-xs text-muted-foreground pt-1">
                  Items aggregated by ASIN
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Preview */}
          <div className="flex-1 border rounded-lg overflow-hidden bg-muted/20 flex flex-col">
            {/* View Mode Toggle for Document Format */}
            {printFormat === 'document' && (
              <div className="flex items-center gap-2 p-3 border-b bg-card">
                <Button
                  variant={previewMode === 'document' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setPreviewMode('document')}
                  className="gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Document
                </Button>
                <Button
                  variant={previewMode === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setPreviewMode('table')}
                  className="gap-2"
                >
                  <TableIcon className="h-4 w-4" />
                  Table
                </Button>
              </div>
            )}
            
            <div className="flex-1 overflow-auto p-4">
              <div ref={printRef}>
                {printFormat === 'document' ? (
                  previewMode === 'document' ? (
                    <POPrintDocument
                      items={printItems}
                      includeImages={includeImages}
                      title={title}
                    />
                  ) : (
                    <div className="bg-white text-black" style={{ maxWidth: '210mm', margin: '0 auto' }}>
                      {/* Print Styles */}
                      <style>{`
                        @media print {
                          @page {
                            size: A4;
                            margin: 15mm;
                          }
                          body {
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                          }
                          .table-print-view {
                            width: 100%;
                          }
                        }
                      `}</style>

                      <div className="table-print-view p-6">
                        {/* Document Header - Same as POPrintDocument */}
                        <div className="text-center mb-8 pb-4 border-b-[3px] border-black">
                          <h1 className="text-3xl font-bold mb-3">{title}</h1>
                          <p className="text-sm text-gray-600 mb-1">
                            Generated: {new Date().toLocaleString()}
                          </p>
                          <p className="text-sm text-gray-600">
                            Total Items: {printItems.length} | Total Quantity: {totalQuantity}
                          </p>
                        </div>

                        {/* Table */}
                        <div className="border-2 border-gray-300 rounded overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-gray-100 hover:bg-gray-100">
                                <TableHead className="w-12 font-bold text-black text-center border-r border-gray-300">#</TableHead>
                                {includeImages && <TableHead className="w-32 font-bold text-black border-r border-gray-300">Image</TableHead>}
                                <TableHead className="font-bold text-black border-r border-gray-300">Product Details</TableHead>
                                <TableHead className="w-20 font-bold text-black text-center border-r border-gray-300">Qty</TableHead>
                                <TableHead className="w-20 font-bold text-black text-center border-r border-gray-300">Printed</TableHead>
                                <TableHead className="w-32 font-bold text-black border-r border-gray-300">PO Number(s)</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {printItems.map((item, index) => (
                                <TableRow 
                                  key={index} 
                                  className="hover:bg-gray-50 border-b border-gray-300"
                                >
                                  <TableCell className="font-semibold text-center border-r border-gray-300">
                                    {index + 1}
                                  </TableCell>
                                   {includeImages && (
                                     <TableCell className="py-2 border-r border-gray-300">
                                       {item.imageUrl ? (
                                         <div 
                                           className="w-24 h-24 rounded border border-gray-300 overflow-hidden bg-white cursor-pointer hover:opacity-80 transition-opacity"
                                           onClick={() => window.open(item.imageUrl, '_blank')}
                                           title="Click to open image in new tab"
                                         >
                                           <img 
                                             src={item.imageUrl} 
                                             alt={item.asin}
                                             className="w-full h-full object-contain"
                                           />
                                         </div>
                                       ) : (
                                         <div className="w-24 h-24 bg-gray-50 rounded border border-dashed border-gray-400 flex items-center justify-center">
                                           <Package className="h-8 w-8 text-gray-400" />
                                         </div>
                                       )}
                                     </TableCell>
                                   )}
                                   <TableCell className="border-r border-gray-300">
                                     <div className="space-y-1.5">
                                       <div className="flex items-center gap-2">
                                         <div className="font-bold text-base">
                                           {item.asin}
                                         </div>
                                         {item.fulfilledFromStock && (
                                           <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-500/10 text-green-700 border border-green-500/20">
                                             ✓ From Stock
                                           </span>
                                         )}
                                       </div>
                                       <div className="text-sm line-clamp-2">
                                         {item.title || 'N/A'}
                                       </div>
                                       {item.sku_code && (
                                         <div className="text-xs text-gray-600">
                                           SKU: {item.sku_code}
                                         </div>
                                       )}
                                       {item.model_number && (
                                         <div className="text-xs text-gray-600">
                                           Model: {item.model_number}
                                         </div>
                                       )}
                                     </div>
                                   </TableCell>
                                   <TableCell className="text-center border-r border-gray-300">
                                     <div className="space-y-1">
                                       <div className="text-2xl font-bold">
                                         {item.quantity}
                                       </div>
                                       {item.fulfilledFromStock && item.stockQuantity > 0 && (
                                         <div className="text-xs text-green-600">
                                           Stock: {item.stockQuantity}
                                         </div>
                                       )}
                                       {item.supplierQuantity > 0 && item.fulfilledFromStock && (
                                         <div className="text-xs text-amber-600">
                                           Supplier: {item.supplierQuantity}
                                         </div>
                                       )}
                                     </div>
                                   </TableCell>
                                   <TableCell className="text-center border-r border-gray-300">
                                     <div className="text-lg font-semibold" style={{ color: (item.printedQuantity ?? 0) > 0 ? '#8b5cf6' : '#999' }}>
                                       {item.printedQuantity ?? 0}/{item.quantity}
                                     </div>
                                   </TableCell>
                                  <TableCell className="border-r border-gray-300">
                                    <div className="text-xs font-bold break-words">
                                      {item.poNumbers}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>

                        {/* Footer - Same as POPrintDocument */}
                        <div className="mt-8 pt-4 border-t-2 border-black text-center">
                          <p className="text-xs text-gray-600">
                            This is a computer-generated document. No signature required.
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                    <Tag className="h-16 w-16 text-muted-foreground" />
                    <div>
                      <div className="font-semibold text-lg">Label Print Preview</div>
                      <div className="text-sm text-muted-foreground mt-2">
                        ZPL labels will be sent directly to your printer
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {printItems.length} label(s) × {copies} {copies > 1 ? 'copies' : 'copy'}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          
          <Button 
            variant="secondary" 
            onClick={handleOpenWorkspace}
            disabled={printItems.length === 0}
            className="bg-blue-500/10 text-blue-700 hover:bg-blue-500/20 border border-blue-500/20"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open in Workspace
          </Button>
          
          <Button variant="outline" onClick={handleExportCSV} disabled={printItems.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV (No Images)
          </Button>

          {printFormat === 'label' && (
            <Button variant="outline" onClick={handleDownloadZPL}>
              <Download className="h-4 w-4 mr-2" />
              Download ZPL
            </Button>
          )}

          {printFormat === 'document' ? (
            <Button onClick={handlePrint} disabled={printItems.length === 0}>
              <Printer className="h-4 w-4 mr-2" />
              Print Document
            </Button>
          ) : (
            <Button 
              onClick={handlePrintLabel} 
              disabled={printItems.length === 0 || isPrinting}
            >
              {isPrinting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Printing...
                </>
              ) : (
                <>
                  <Printer className="h-4 w-4 mr-2" />
                  Print Labels
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
