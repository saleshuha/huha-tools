import React, { useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, AlertCircle, Printer, Trash2, Download, FileSpreadsheet, Check } from 'lucide-react';
import { POOrder } from '@/components/POTracker';
import { POPrintDocument } from '@/components/po/POPrintDocument';
import { convertWorkspaceOrdersToPrintItems } from '@/utils/workspace-helpers';
import { useToast } from '@/hooks/use-toast';
import { generateOrderLabelZPL } from '@/utils/order-label-printer';
import { aggregatePOItemsByASIN } from '@/utils/po-print-helpers';
import Papa from 'papaparse';

export default function POPrintWorkspace() {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Receive initial data from navigation state
  const initialOrders = location.state?.orders || [];
  const initialSettings = location.state?.settings || {};
  
  // Local state (in-memory only, never saved to DB)
  const [workspaceOrders, setWorkspaceOrders] = useState<POOrder[]>(
    initialOrders.map((order: POOrder) => ({...order}))
  );
  const [selectedItems, setSelectedItems] = useState<Set<number>>(
    new Set(initialOrders.map((_: any, i: number) => i))
  );
  const [printFormat, setPrintFormat] = useState<'document' | 'label'>(
    initialSettings.printFormat || 'document'
  );
  const [includeImages, setIncludeImages] = useState(
    initialSettings.includeImages !== undefined ? initialSettings.includeImages : true
  );
  const [bulkAggregate, setBulkAggregate] = useState(
    initialSettings.bulkAggregate || false
  );
  const [searchQuery, setSearchQuery] = useState('');

  // Filter orders based on search
  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return workspaceOrders;
    const query = searchQuery.toLowerCase();
    return workspaceOrders.filter(order => 
      order.asin?.toLowerCase().includes(query) ||
      order.title?.toLowerCase().includes(query) ||
      order.sku_code?.toLowerCase().includes(query) ||
      order.po_number?.toLowerCase().includes(query)
    );
  }, [workspaceOrders, searchQuery]);

  // Convert workspace orders to print items
  const printItems = useMemo(() => {
    const selected = workspaceOrders.filter((_, index) => selectedItems.has(index));
    return convertWorkspaceOrdersToPrintItems(selected, bulkAggregate);
  }, [workspaceOrders, selectedItems, bulkAggregate]);

  // Workspace-specific operations (all in-memory)
  const handleQuantityChange = (index: number, newQty: number) => {
    if (newQty < 1) return;
    setWorkspaceOrders(orders => 
      orders.map((o, i) => i === index ? {...o, quantity: newQty} : o)
    );
  };
  
  const handleMarkFromStock = (index: number) => {
    setWorkspaceOrders(orders => 
      orders.map((o, i) => i === index 
        ? {...o, _localFromStock: !o._localFromStock, _localStockQuantity: o.quantity}
        : o
      )
    );
  };
  
  const handleRemoveItem = (index: number) => {
    setWorkspaceOrders(orders => orders.filter((_, i) => i !== index));
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      newSet.delete(index);
      // Rebuild indices after removal
      const newIndices = new Set<number>();
      Array.from(newSet).forEach(oldIndex => {
        if (oldIndex < index) {
          newIndices.add(oldIndex);
        } else if (oldIndex > index) {
          newIndices.add(oldIndex - 1);
        }
      });
      return newIndices;
    });
  };

  const toggleItem = (index: number) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const toggleAll = () => {
    if (selectedItems.size === filteredOrders.length) {
      setSelectedItems(new Set());
    } else {
      const allIndices = workspaceOrders.map((_, i) => i);
      setSelectedItems(new Set(allIndices));
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: 'Print blocked',
        description: 'Please allow pop-ups to print',
        variant: 'destructive'
      });
      return;
    }

    const printContent = document.getElementById('print-preview-content');
    if (!printContent) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Preview - PO Workspace</title>
          <style>
            body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
            @media print {
              body { padding: 0; }
              @page { margin: 0.5cm; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
    }, 250);

    toast({
      title: 'Print initiated',
      description: `Printing ${printItems.length} items`
    });
  };

  const handleDownloadZPL = () => {
    try {
      const selected = workspaceOrders.filter((_, index) => selectedItems.has(index));
      let zplContent = '';

      selected.forEach(order => {
        const zpl = generateOrderLabelZPL({
          orderId: order.po_number,
          asin: order.asin || '',
          sku: order.sku_code || '',
          itemTitle: order.title || '',
          itemQuantity: order.quantity
        });
        zplContent += zpl + '\n\n';
      });

      const blob = new Blob([zplContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `workspace-labels-${Date.now()}.zpl`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'ZPL downloaded',
        description: `Generated ${selected.length} labels`
      });
    } catch (error) {
      toast({
        title: 'Download failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    }
  };

  const handleExportCSV = () => {
    const selected = workspaceOrders.filter((_, index) => selectedItems.has(index));
    const csvData = selected.map(order => ({
      'PO Number': order.po_number,
      'ASIN': order.asin || '',
      'SKU': order.sku_code || '',
      'Title': order.title || '',
      'Quantity': order.quantity,
      'From Stock': order._localFromStock ? 'Yes' : 'No',
      'Status': order.status
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `workspace-export-${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: 'CSV exported',
      description: `Exported ${selected.length} items`
    });
  };

  if (workspaceOrders.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Card className="p-8 text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-bold mb-2">No Items Loaded</h2>
          <p className="text-muted-foreground mb-4">
            Please select items from the print dialog to use the workspace
          </p>
          <Button onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="h-16 border-b bg-card px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-xl font-bold">Print Workspace (Isolated)</h1>
            <p className="text-sm text-muted-foreground">
              Changes here do NOT affect database • {workspaceOrders.length} items loaded
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-orange-600 border-orange-600">
            <AlertCircle className="h-3 w-3 mr-1" />
            Temporary Workspace
          </Badge>
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          {printFormat === 'label' && (
            <Button variant="outline" size="sm" onClick={handleDownloadZPL}>
              <Download className="h-4 w-4 mr-2" />
              Download ZPL
            </Button>
          )}
          <Button size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </header>
      
      {/* Two-Panel Layout */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Panel: Controls & Item List */}
        <div className="w-96 border-r flex flex-col bg-card">
          <div className="p-4 border-b space-y-4 shrink-0">
            {/* Print Options */}
            <div>
              <Label className="text-sm font-semibold mb-2 block">Print Format</Label>
              <RadioGroup value={printFormat} onValueChange={(v: any) => setPrintFormat(v)}>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="document" id="doc" />
                  <Label htmlFor="doc" className="cursor-pointer">Document View</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="label" id="lbl" />
                  <Label htmlFor="lbl" className="cursor-pointer">Label View</Label>
                </div>
              </RadioGroup>
            </div>
            
            <div className="flex items-center justify-between">
              <Label>Include Images</Label>
              <Switch checked={includeImages} onCheckedChange={setIncludeImages} />
            </div>
            
            <div className="flex items-center justify-between">
              <Label>Aggregate by ASIN</Label>
              <Switch checked={bulkAggregate} onCheckedChange={setBulkAggregate} />
            </div>

            <div className="pt-2 border-t">
              <Input 
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={toggleAll}
                className="h-8"
              >
                {selectedItems.size === workspaceOrders.length ? 'Deselect All' : 'Select All'}
              </Button>
              <span className="text-sm text-muted-foreground">
                {selectedItems.size} of {workspaceOrders.length} selected
              </span>
            </div>
          </div>
          
          {/* Item List with Edit Controls */}
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-2">
              {filteredOrders.map((order, index) => {
                const actualIndex = workspaceOrders.indexOf(order);
                return (
                  <Card key={actualIndex} className="p-3">
                    <div className="flex items-start gap-2">
                      <Checkbox 
                        checked={selectedItems.has(actualIndex)}
                        onCheckedChange={() => toggleItem(actualIndex)}
                        className="mt-1"
                      />
                      
                      <div className="flex-1 space-y-2 min-w-0">
                        <div className="text-sm font-medium truncate" title={order.title}>
                          {order.title || 'No Title'}
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div>ASIN: {order.asin || 'N/A'}</div>
                          <div>PO: {order.po_number}</div>
                        </div>
                        
                        {/* Editable Quantity */}
                        <div className="flex items-center gap-2">
                          <Label className="text-xs">Qty:</Label>
                          <Input 
                            type="number"
                            value={order.quantity}
                            onChange={(e) => handleQuantityChange(actualIndex, parseInt(e.target.value) || 1)}
                            className="h-7 w-20"
                            min={1}
                          />
                        </div>
                        
                        {/* Local Stock Marking */}
                        <Button 
                          size="sm" 
                          variant={order._localFromStock ? "default" : "outline"}
                          onClick={() => handleMarkFromStock(actualIndex)}
                          className="h-7 text-xs w-full"
                        >
                          {order._localFromStock ? (
                            <>
                              <Check className="h-3 w-3 mr-1" />
                              From Stock
                            </>
                          ) : (
                            'Mark From Stock'
                          )}
                        </Button>
                        
                        {/* Remove Button */}
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => handleRemoveItem(actualIndex)}
                          className="h-7 text-xs text-destructive hover:text-destructive w-full"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Remove from Workspace
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        </div>
        
        {/* Right Panel: Live Preview */}
        <div className="flex-1 bg-muted/30 overflow-auto">
          <div className="p-8">
            <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden">
              {printFormat === 'document' ? (
                <div id="print-preview-content">
                  <POPrintDocument 
                    items={printItems}
                    includeImages={includeImages}
                    title="Workspace Print Preview"
                  />
                </div>
              ) : (
                <div id="print-preview-content" className="p-8">
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold mb-2">Label Preview</h2>
                    <p className="text-muted-foreground">
                      {printItems.length} labels will be generated
                    </p>
                  </div>
                  <div className="space-y-4">
                    {printItems.map((item, idx) => (
                      <div key={idx} className="border rounded-lg p-4 bg-muted/30">
                        <div className="font-mono text-sm space-y-2">
                          <div><strong>PO:</strong> {item.poNumbers.join(', ')}</div>
                          <div><strong>ASIN:</strong> {item.asin}</div>
                          <div><strong>SKU:</strong> {item.sku_code || 'N/A'}</div>
                          <div><strong>Title:</strong> {item.title}</div>
                          <div><strong>Qty:</strong> {item.quantity}</div>
                          {item.fulfilledFromStock && (
                            <div className="text-green-600 font-semibold">✓ FROM STOCK</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
