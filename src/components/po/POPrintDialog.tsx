// Print dialog for PO items with preview and options
import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { POOrder } from '@/components/POTracker';
import { POPrintItem, aggregatePOItemsByASIN, convertOrdersToPrintItems, formatPONumbers } from '@/utils/po-print-helpers';
import { POPrintDocument } from './POPrintDocument';
import { generateBulkPOLabelsZPL } from '@/utils/po-label-printer';
import { useProductImages } from '@/hooks/useProductImages';
import { useToast } from '@/hooks/use-toast';
import { Printer, Download, FileText, Tag, Loader2, Package, Search, TableIcon } from 'lucide-react';
import { qzConnectionManager } from '@/utils/qz-connection-manager';
import { useReactToPrint } from 'react-to-print';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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
  const [bulkAggregate, setBulkAggregate] = useState(true);
  const [copies, setCopies] = useState(1);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set(Array.from({ length: orders.length }, (_, i) => i)));
  const [isPrinting, setIsPrinting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const printRef = useRef<HTMLDivElement>(null);
  const { getImageByAsin } = useProductImages();
  const { toast } = useToast();

  // Filter orders based on search query
  const filteredOrders = React.useMemo(() => {
    if (!searchQuery.trim()) return orders;
    
    const query = searchQuery.toLowerCase();
    return orders.filter((order, index) => {
      const searchText = [
        order.asin,
        order.sku_code,
        order.title,
        order.po_number,
        order.model_number,
        `#${index + 1}` // Allow searching by serial number
      ].filter(Boolean).join(' ').toLowerCase();
      
      return searchText.includes(query);
    });
  }, [orders, searchQuery]);

  // Map filtered orders back to their original indices for selection
  const filteredOrdersWithIndices = React.useMemo(() => {
    return filteredOrders.map(order => ({
      order,
      originalIndex: orders.findIndex(o => o.id === order.id)
    }));
  }, [filteredOrders, orders]);

  // Prepare print items based on selection and aggregation
  const printItems = React.useMemo(() => {
    const selectedOrders = orders.filter((_, index) => selectedItems.has(index));
    
    let items: POPrintItem[];
    if (mode === 'bulk' && bulkAggregate) {
      items = aggregatePOItemsByASIN(selectedOrders);
    } else {
      items = convertOrdersToPrintItems(selectedOrders);
    }

    // Add images if available
    return items.map(item => ({
      ...item,
      imageUrl: getImageByAsin(item.asin)?.image_url
    }));
  }, [orders, selectedItems, mode, bulkAggregate, getImageByAsin]);

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

      // Generate ZPL
      const zpl = generateBulkPOLabelsZPL(printItems, {
        dpi: 203,
        labelWidth: 4 * 203,
        labelHeight: 6 * 203,
        includeBarcode: true
      }, copies);

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
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleAll}
                >
                  {selectedItems.size === orders.length ? 'Deselect All' : 'Select All'}
                </Button>
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
                      <div key={order.id} className="flex items-start gap-2 p-2 hover:bg-muted rounded">
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
                          <div className="text-xs text-muted-foreground">Qty: {order.quantity} | PO: {order.po_number}</div>
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
                    <div className="space-y-4">
                      <div className="text-lg font-semibold">{title}</div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">#</TableHead>
                            {includeImages && <TableHead className="w-20">Image</TableHead>}
                            <TableHead>ASIN</TableHead>
                            <TableHead>SKU</TableHead>
                            <TableHead>Title</TableHead>
                            <TableHead>Model</TableHead>
                            <TableHead className="w-20">Qty</TableHead>
                            <TableHead>PO Number(s)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {printItems.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">{index + 1}</TableCell>
                              {includeImages && (
                                <TableCell>
                                  {item.imageUrl ? (
                                    <img 
                                      src={item.imageUrl} 
                                      alt={item.asin}
                                      className="w-16 h-16 object-cover rounded border"
                                    />
                                  ) : (
                                    <div className="w-16 h-16 bg-muted rounded border flex items-center justify-center">
                                      <Package className="h-6 w-6 text-muted-foreground" />
                                    </div>
                                  )}
                                </TableCell>
                              )}
                              <TableCell className="font-mono text-sm">{item.asin}</TableCell>
                              <TableCell className="text-sm">{item.sku_code || '-'}</TableCell>
                              <TableCell className="max-w-xs truncate">{item.title || 'N/A'}</TableCell>
                              <TableCell className="text-sm">{item.model_number || '-'}</TableCell>
                              <TableCell className="text-center font-semibold">{item.quantity}</TableCell>
                              <TableCell className="text-sm font-mono">{item.poNumbers}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      <div className="flex justify-end gap-6 text-sm border-t pt-4">
                        <div>
                          <span className="text-muted-foreground">Total Items: </span>
                          <span className="font-semibold">{printItems.length}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Total Quantity: </span>
                          <span className="font-semibold">{totalQuantity}</span>
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
