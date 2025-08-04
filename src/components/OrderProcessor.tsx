import { useState, useMemo, useEffect } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Progress } from './ui/progress';
import { Checkbox } from './ui/checkbox';
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from './ui/pagination';
import { FileSpreadsheet, Search, Minus, Download, History, CheckCircle, Package, AlertTriangle, TrendingUp, Clock, DollarSign, ShoppingCart, Printer, CheckSquare, Square } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { useAsinInventory, AsinInventoryItem } from '@/hooks/useAsinInventory';
import { useSkuInventory, SkuInventoryItem } from '@/hooks/useSkuInventory';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
interface OrderItem {
  orderId: string;
  orderStatus: string;
  warehouseCode: string;
  orderPlaceDate: string;
  requiredShipDate: string;
  shipMethod: string;
  shipMethodCode: string;
  shipToName: string;
  shipToAddressLine1: string;
  shipToAddressLine2: string;
  shipToAddressLine3: string;
  shipToCity: string;
  shipToState: string;
  shipToZipCode: string;
  shipToCountry: string;
  phoneNumber: string;
  isGift: string;
  itemCost: string;
  sku: string;
  asin: string;
  itemTitle: string;
  itemQuantity: number;
  giftMessage: string;
  trackingId: string;
  shippedDate: string;
}
interface MatchedItem {
  orderItem: OrderItem;
  inventoryMatch?: AsinInventoryItem | SkuInventoryItem;
  inventoryType?: 'asin' | 'sku';
  matchType?: 'asin' | 'sku';
}
interface ProcessedItem extends MatchedItem {
  processedAt: string;
  action: 'subtract' | 'add';
  quantityChanged: number;
  previousQuantity: number;
  newQuantity: number;
}
export function OrderProcessor() {
  const [orderData, setOrderData] = useState<OrderItem[]>([]);
  const [matchedItems, setMatchedItems] = useState<MatchedItem[]>([]);
  const [processedItems, setProcessedItems] = useState<ProcessedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [fileName, setFileName] = useState<string>('');
  const [dbResults, setDbResults] = useState<any[]>([]);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50); // Show 50 items per page
  const {
    inventory: asinInventory,
    updateQuantity: updateAsinQuantity
  } = useAsinInventory();
  const {
    inventory: skuInventory,
    updateQuantity: updateSkuQuantity
  } = useSkuInventory();
  const {
    toast
  } = useToast();

  // Load processed orders from database
  useEffect(() => {
    const loadProcessedOrders = async () => {
      const {
        data,
        error
      } = await supabase.from('processed_orders').select('*').order('processed_at', {
        ascending: false
      });
      if (error) {
        console.error('Error loading processed orders:', error);
      } else {
        setDbResults(data || []);
      }
    };
    loadProcessedOrders();
  }, []);

  // Save processed order to database
  const saveProcessedOrder = async (match: MatchedItem, previousStock: number, newStock: number, fileName: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const processedOrder = {
      user_id: user.id,
      order_number: match.orderItem.orderId,
      asin: match.orderItem.asin || null,
      sku: match.orderItem.sku || null,
      item_title: match.orderItem.itemTitle || null,
      quantity_processed: match.orderItem.itemQuantity,
      inventory_type: match.inventoryType!,
      match_type: match.matchType!,
      inventory_id: match.inventoryMatch?.id || null,
      previous_stock: previousStock,
      new_stock: newStock,
      source_file: fileName,
      notes: `Processed order for ${match.orderItem.itemQuantity} units`
    };

    const { error } = await supabase
      .from('processed_orders')
      .insert([processedOrder]);
    
    if (error) {
      console.error('Error saving processed order:', error);
    }
  };
  const onDrop = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    setLoading(true);
    try {
      let data: any[] = [];
      if (file.name.toLowerCase().endsWith('.csv')) {
        const text = await file.text();
        const result = Papa.parse(text, {
          header: true,
          skipEmptyLines: true
        });
        data = result.data;
      } else {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        data = XLSX.utils.sheet_to_json(worksheet);
      }
      const formattedOrders: OrderItem[] = data.map((row: any) => ({
        orderId: row['Order ID'] || '',
        orderStatus: row['Order Status'] || '',
        warehouseCode: row['Warehouse Code'] || '',
        orderPlaceDate: row['Order Place Date'] || '',
        requiredShipDate: row['Required Ship Date'] || '',
        shipMethod: row['Ship Method'] || '',
        shipMethodCode: row['Ship Method Code'] || '',
        shipToName: row['Ship To Name'] || '',
        shipToAddressLine1: row['Ship To Address Line 1'] || '',
        shipToAddressLine2: row['Ship To Address Line 2'] || '',
        shipToAddressLine3: row['Ship To Address Line 3'] || '',
        shipToCity: row['Ship To City'] || '',
        shipToState: row['Ship To State'] || '',
        shipToZipCode: row['Ship To ZIP Code'] || '',
        shipToCountry: row['Ship To Country or Region'] || '',
        phoneNumber: row['Phone Number'] || '',
        isGift: row['Is it Gift?'] || '',
        itemCost: row['Item Cost'] || '',
        sku: row['SKU'] || '',
        asin: row['ASIN'] || '',
        itemTitle: row['Item Title'] || '',
        itemQuantity: parseInt(row['Item Quantity']) || 1,
        giftMessage: row['Gift Message'] || '',
        trackingId: row['Tracking ID'] || '',
        shippedDate: row['Shipped Date'] || ''
      }));
      setOrderData(formattedOrders);
      setFileName(file.name);
      const matches = await matchOrdersWithInventory(formattedOrders);

      // Save to database
      // No need to save unprocessed orders anymore
      toast({
        title: "Orders Uploaded",
        description: `Successfully processed ${formattedOrders.length} orders.`
      });
    } catch (error) {
      console.error('Error processing file:', error);
      toast({
        title: "Upload Error",
        description: "Failed to process the uploaded file.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const matchOrdersWithInventory = async (orders: OrderItem[]) => {
    const matches: MatchedItem[] = orders.map(order => {
      let inventoryMatch: AsinInventoryItem | SkuInventoryItem | undefined;
      let inventoryType: 'asin' | 'sku' | undefined;
      let matchType: 'asin' | 'sku' | undefined;

      // Try to match by ASIN in ASIN inventory (ASIN field matched with ASIN field)
      if (order.asin && order.asin.trim()) {
        const asinMatch = asinInventory.find(item => item.asin.toLowerCase() === order.asin.toLowerCase().trim());
        if (asinMatch) {
          inventoryMatch = asinMatch;
          inventoryType = 'asin';
          matchType = 'asin'; // Matched using ASIN field
        }
      }

      // Try to match by SKU in ASIN inventory (SKU field matched with SKU field in ASIN inventory)
      if (!inventoryMatch && order.sku && order.sku.trim()) {
        const asinSkuMatch = asinInventory.find(item => item.sku && item.sku.toLowerCase() === order.sku.toLowerCase().trim());
        if (asinSkuMatch) {
          inventoryMatch = asinSkuMatch;
          inventoryType = 'asin';
          matchType = 'sku'; // Matched using SKU field
        }
      }

      // Try to match by SKU in SKU inventory (SKU field matched with SKU field)
      if (!inventoryMatch && order.sku && order.sku.trim()) {
        const skuMatch = skuInventory.find(item => item.skuNumber.toLowerCase() === order.sku.toLowerCase().trim());
        if (skuMatch) {
          inventoryMatch = skuMatch;
          inventoryType = 'sku';
          matchType = 'sku'; // Matched using SKU field
        }
      }

      // Try to match by ASIN as SKU in SKU inventory (ASIN value stored as SKU)
      if (!inventoryMatch && order.asin && order.asin.trim()) {
        const skuAsinMatch = skuInventory.find(item => item.skuNumber.toLowerCase() === order.asin.toLowerCase().trim());
        if (skuAsinMatch) {
          inventoryMatch = skuAsinMatch;
          inventoryType = 'sku';
          matchType = 'asin'; // Matched using ASIN field (but found in SKU inventory)
        }
      }

      return {
        orderItem: order,
        inventoryMatch,
        inventoryType,
        matchType
      };
    });
    setMatchedItems(matches);
    return matches;
  };
  const handleQuantityUpdate = async (match: MatchedItem, changeAmount: number, matchIndex: number) => {
    if (!match.inventoryMatch || !match.inventoryType) return;
    const previousQuantity = match.inventoryMatch.quantity;
    const newQuantity = Math.max(0, previousQuantity + changeAmount);
    try {
      if (match.inventoryType === 'asin') {
        await updateAsinQuantity(match.inventoryMatch.id, newQuantity, `Order processing: ${changeAmount > 0 ? 'Added' : 'Removed'} ${Math.abs(changeAmount)} units`);
      } else {
        await updateSkuQuantity(match.inventoryMatch.id, newQuantity, `Order processing: ${changeAmount > 0 ? 'Added' : 'Removed'} ${Math.abs(changeAmount)} units`);
      }

      // Save processed order to database
      await saveProcessedOrder(match, previousQuantity, newQuantity, fileName);

      // Add to processed items
      const processedItem: ProcessedItem = {
        ...match,
        processedAt: new Date().toLocaleString(),
        action: changeAmount > 0 ? 'add' : 'subtract',
        quantityChanged: Math.abs(changeAmount),
        previousQuantity,
        newQuantity
      };
      setProcessedItems(prev => [processedItem, ...prev]);

      // Remove the processed item from the list
      setMatchedItems(prev => prev.filter((_, index) => index !== matchIndex));
      
      // Refresh the processed orders count
      setDbResults(prev => [...prev, { processed: true }]);
      
      toast({
        title: "Order Processed",
        description: `Successfully processed order ${match.orderItem.orderId}. Quantity updated to ${newQuantity}.`
      });
    } catch (error) {
      toast({
        title: "Processing Failed",
        description: "Failed to process order.",
        variant: "destructive"
      });
    }
  };

  // Enhanced real-time analytics with database integration
  const analytics = useMemo(() => {
    const totalOrders = matchedItems.length;
    const foundOrders = matchedItems.filter(m => m.inventoryMatch).length;

    // Debug logging to understand the matching issue
    console.log('=== DEBUG: All matched items ===');
    matchedItems.forEach((m, index) => {
      if (m.inventoryMatch) {
        console.log(`Item ${index + 1}:`, {
          orderId: m.orderItem.orderId,
          orderAsin: m.orderItem.asin,
          orderSku: m.orderItem.sku,
          matchType: m.matchType,
          inventoryType: m.inventoryType,
          inventoryAsin: 'asin' in m.inventoryMatch ? m.inventoryMatch.asin : 'N/A',
          inventorySku: 'sku' in m.inventoryMatch ? m.inventoryMatch.sku : ('skuNumber' in m.inventoryMatch ? m.inventoryMatch.skuNumber : 'N/A')
        });
      }
    });

    // More detailed breakdown of matches - accurate counting by match type
    const foundByAsin = matchedItems.filter(m => 
      m.inventoryMatch && m.matchType === 'asin'
    ).length;
    const foundBySku = matchedItems.filter(m => 
      m.inventoryMatch && m.matchType === 'sku'
    ).length;
    
    console.log('=== DEBUG: Final counts ===', { foundByAsin, foundBySku, totalFound: matchedItems.filter(m => m.inventoryMatch).length });
    const processedOrdersCount = dbResults.filter(r => r.processed).length;
    const totalValue = matchedItems.reduce((sum, match) => {
      const cost = parseFloat(match.orderItem.itemCost) || 0;
      return sum + cost * match.orderItem.itemQuantity;
    }, 0);
    const lowStockItems = matchedItems.filter(m => m.inventoryMatch && m.inventoryMatch.quantity < m.orderItem.itemQuantity);
    const criticalStockItems = matchedItems.filter(m => m.inventoryMatch && m.inventoryMatch.quantity === 0);
    const averageOrderValue = totalOrders > 0 ? totalValue / totalOrders : 0;
    const urgentOrders = matchedItems.filter(m => {
      const shipDate = new Date(m.orderItem.requiredShipDate);
      const today = new Date();
      const diffTime = shipDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 1;
    });
    const processedValue = processedItems.reduce((sum, item) => {
      const cost = parseFloat(item.orderItem.itemCost) || 0;
      return sum + cost * item.orderItem.itemQuantity;
    }, 0);
    return {
      totalOrders,
      foundOrders,
      foundByAsin,
      foundBySku,
      processedOrdersCount,
      totalValue,
      lowStockItems: lowStockItems.length,
      criticalStockItems: criticalStockItems.length,
      averageOrderValue,
      urgentOrders: urgentOrders.length,
      processedValue,
      fulfillmentRate: totalOrders > 0 ? foundOrders / totalOrders * 100 : 0
    };
  }, [matchedItems, processedItems, dbResults]);

  // Selection handlers
  const handleSelectItem = (index: number) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedItems(newSelected);
    setSelectAll(newSelected.size === filteredMatches.length);
  };
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredMatches.map((_, index) => index)));
    }
    setSelectAll(!selectAll);
  };
  const processSelectedItems = async () => {
    const itemsToProcess = Array.from(selectedItems).map(index => ({
      match: filteredMatches[index],
      index: matchedItems.findIndex(m => m === filteredMatches[index])
    }));
    for (const {
      match,
      index
    } of itemsToProcess) {
      if (match.inventoryMatch) {
        await handleQuantityUpdate(match, -match.orderItem.itemQuantity, index);
      }
    }
    setSelectedItems(new Set());
    setSelectAll(false);
  };
  const printFoundItems = () => {
    const foundItems = filteredMatches.filter(match => match.inventoryMatch);
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const printContent = `
      <html>
        <head>
          <title>Found Items Report - ${fileName}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .found { background-color: #d4edda; }
            .print-date { font-size: 12px; color: #666; margin-bottom: 20px; }
            .summary { background-color: #e9f7ff; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <h1>Found Items Report</h1>
          <div class="print-date">
            <strong>File:</strong> ${fileName}<br>
            <strong>Print Date:</strong> ${new Date().toLocaleString()}<br>
          </div>
          <div class="summary">
            <strong>Summary:</strong><br>
            Total Found Items: ${foundItems.length}<br>
            Found by ASIN: ${analytics.foundByAsin}<br>
            Found by SKU: ${analytics.foundBySku}<br>
            Fulfillment Rate: ${analytics.fulfillmentRate.toFixed(1)}%
          </div>
          <table>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>ASIN/SKU</th>
                <th>Item Title</th>
                <th>Order Qty</th>
                <th>Current Stock</th>
                <th>Match Type</th>
                <th>Serial/Bin Number</th>
                <th>Inventory Type</th>
              </tr>
            </thead>
            <tbody>
              ${foundItems.map(match => `
                <tr class="found">
                  <td>${match.orderItem.orderId}</td>
                  <td>${match.orderItem.asin || match.orderItem.sku}</td>
                  <td>${match.orderItem.itemTitle}</td>
                  <td>${match.orderItem.itemQuantity}</td>
                  <td>${match.inventoryMatch?.quantity || '-'}</td>
                  <td>${match.matchType?.toUpperCase() || '-'}</td>
                  <td>${match.inventoryMatch ? 'serialNumber' in match.inventoryMatch ? match.inventoryMatch.serialNumber : match.inventoryMatch.binSerialNumber : '-'}</td>
                  <td>${match.inventoryType?.toUpperCase() || '-'}</td>
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
    printWindow.print();
  };
  const printSelectedItems = () => {
    const itemsToPrint = Array.from(selectedItems).map(index => filteredMatches[index]);
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const printContent = `
      <html>
        <head>
          <title>Order Processing Results - ${fileName}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .found { background-color: #d4edda; }
            .not-found { background-color: #f8d7da; }
            .print-date { font-size: 12px; color: #666; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <h1>Order Processing Results</h1>
          <div class="print-date">
            <strong>File:</strong> ${fileName}<br>
            <strong>Print Date:</strong> ${new Date().toLocaleString()}<br>
            <strong>Total Items:</strong> ${itemsToPrint.length}
          </div>
          <table>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>ASIN/SKU</th>
                <th>Item Title</th>
                <th>Order Qty</th>
                <th>Status</th>
                <th>Current Stock</th>
                <th>Match Type</th>
                <th>Serial/Bin Number</th>
              </tr>
            </thead>
            <tbody>
              ${itemsToPrint.map(match => `
                <tr class="${match.inventoryMatch ? 'found' : 'not-found'}">
                  <td>${match.orderItem.orderId}</td>
                  <td>${match.orderItem.asin || match.orderItem.sku}</td>
                  <td>${match.orderItem.itemTitle}</td>
                  <td>${match.orderItem.itemQuantity}</td>
                  <td>${match.inventoryMatch ? 'Found' : 'Not Found'}</td>
                  <td>${match.inventoryMatch?.quantity || '-'}</td>
                  <td>${match.matchType?.toUpperCase() || '-'}</td>
                  <td>${match.inventoryMatch ? 'serialNumber' in match.inventoryMatch ? match.inventoryMatch.serialNumber : match.inventoryMatch.binSerialNumber : '-'}</td>
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
    printWindow.print();
  };
  const filteredMatches = matchedItems.filter(match => match.orderItem.orderId.toLowerCase().includes(searchTerm.toLowerCase()) || match.orderItem.asin.toLowerCase().includes(searchTerm.toLowerCase()) || match.orderItem.sku.toLowerCase().includes(searchTerm.toLowerCase()) || match.orderItem.itemTitle.toLowerCase().includes(searchTerm.toLowerCase())).sort((a, b) => {
    // Sort found items first, then not found items
    const aHasMatch = a.inventoryMatch ? 1 : 0;
    const bHasMatch = b.inventoryMatch ? 1 : 0;
    return bHasMatch - aHasMatch;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredMatches.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedMatches = filteredMatches.slice(startIndex, endIndex);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);
  const {
    getRootProps,
    getInputProps,
    isDragActive
  } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    multiple: false
  });
  const exportToExcel = () => {
    const exportData = matchedItems.map(match => ({
      'Order ID': match.orderItem.orderId,
      'ASIN': match.orderItem.asin,
      'SKU': match.orderItem.sku,
      'Item Title': match.orderItem.itemTitle,
      'Order Quantity': match.orderItem.itemQuantity,
      'Inventory Status': match.inventoryMatch ? 'Found' : 'Not Found',
      'Inventory Type': match.inventoryType || 'N/A',
      'Current Stock': match.inventoryMatch?.quantity || 0,
      'Match Type': match.matchType || 'N/A'
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Order Processing Results');
    XLSX.writeFile(wb, 'order-processing-results.xlsx');
  };
  return <div className="space-y-6">
      <Card className="p-6">
        <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-primary" />
                Order Processing
              </h3>
              <div className="flex items-center gap-2">
                {processedItems.length > 0 && <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <History className="w-4 h-4 mr-2" />
                        Processed ({processedItems.length})
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
                      <DialogHeader>
                        <DialogTitle>Processed Items</DialogTitle>
                      </DialogHeader>
                      <div className="flex-1 overflow-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>ASIN/SKU</TableHead>
                              <TableHead>Serial/Bin</TableHead>
                              <TableHead>Action</TableHead>
                              <TableHead>Quantity Change</TableHead>
                              <TableHead>Previous → New</TableHead>
                              <TableHead>Processed At</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {processedItems.map((item, index) => <TableRow key={index}>
                                <TableCell className="font-mono text-sm">
                                  {item.orderItem.asin || item.orderItem.sku}
                                </TableCell>
                                <TableCell className="font-mono text-sm">
                                  {'serialNumber' in item.inventoryMatch! ? item.inventoryMatch.serialNumber : item.inventoryMatch!.binSerialNumber}
                                </TableCell>
                                <TableCell>
                                  <Badge variant={item.action === 'subtract' ? 'destructive' : 'default'}>
                                    {item.action === 'subtract' ? 'Subtracted' : 'Added'}
                                  </Badge>
                                </TableCell>
                                <TableCell>{item.quantityChanged}</TableCell>
                                <TableCell>
                                  <span className="font-mono">{item.previousQuantity} → {item.newQuantity}</span>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {item.processedAt}
                                </TableCell>
                              </TableRow>)}
                          </TableBody>
                        </Table>
                      </div>
                    </DialogContent>
                  </Dialog>}
                {matchedItems.length > 0}
              </div>
            </div>

          {orderData.length === 0 ? <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}`}>
              <input {...getInputProps()} />
              <FileSpreadsheet className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h4 className="text-lg font-medium mb-2">Upload Order File</h4>
              <p className="text-muted-foreground mb-2">
                Drop your Excel or CSV file here, or click to browse
              </p>
              <p className="text-sm text-muted-foreground">
                Expected columns: Order ID, ASIN, SKU, Item Quantity, Item Title, etc.
              </p>
            </div> : <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Label htmlFor="search">Search Orders</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input id="search" placeholder="Search by Order ID, ASIN, SKU, or Title..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
                  </div>
                </div>
                <Button onClick={() => {
              setOrderData([]);
              setMatchedItems([]);
              setProcessedItems([]);
            }} variant="outline">
                  Upload New File
                </Button>
              </div>

              {/* Enhanced Real-time Analytics Dashboard - 2 Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                <Card className="glass-container border-0 shadow-elegant hover:shadow-glow transition-all duration-300 animate-fade-in">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600">
                          <Package className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Total Found Orders</p>
                          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                            {analytics.foundOrders}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Orders matched in inventory
                    </div>
                  </div>
                </Card>

                <Card className="glass-container border-0 shadow-elegant hover:shadow-glow transition-all duration-300 animate-fade-in">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-red-600">
                          <CheckCircle className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Processed Orders</p>
                          <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                            {analytics.processedOrdersCount}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Total in database
                    </div>
                  </div>
                </Card>
              </div>
            </div>}
        </div>
      </Card>

      {filteredMatches.length > 0 && <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">Processing Results ({filteredMatches.length} items)</h4>
              
              <div className="flex items-center gap-2">
                <Button onClick={printFoundItems} variant="outline" disabled={analytics.foundOrders === 0}>
                  <Printer className="w-4 h-4 mr-2" />
                  Print Found Items ({analytics.foundOrders})
                </Button>
                {selectedItems.size > 0 && <>
                    <Button onClick={processSelectedItems} className="bg-gradient-primary hover:opacity-90 text-white" disabled={loading}>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Process Selected ({selectedItems.size})
                    </Button>
                    <Button onClick={printSelectedItems} variant="outline" disabled={selectedItems.size === 0}>
                      <Printer className="w-4 h-4 mr-2" />
                      Print Selected
                    </Button>
                  </>}
              </div>
            </div>
            
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox checked={selectAll} onCheckedChange={handleSelectAll} aria-label="Select all items" />
                    </TableHead>
                    <TableHead>ASIN/SKU</TableHead>
                    <TableHead>Serial/Bin Number</TableHead>
                    <TableHead>Order Qty</TableHead>
                    <TableHead>Inventory Status</TableHead>
                    <TableHead>Current Stock</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedMatches.map((match, index) => <TableRow key={startIndex + index}>
                      <TableCell>
                        <Checkbox 
                          checked={selectedItems.has(startIndex + index)} 
                          onCheckedChange={() => handleSelectItem(startIndex + index)} 
                          aria-label={`Select order ${match.orderItem.orderId}`} 
                        />
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-mono text-sm">{match.orderItem.asin || match.orderItem.sku}</div>
                          {match.inventoryType && <Badge variant="outline" className="text-xs">
                              Found in {match.inventoryType.toUpperCase()} Inventory
                            </Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        {match.inventoryMatch ? <div className="font-mono text-sm">
                            {'serialNumber' in match.inventoryMatch ? match.inventoryMatch.serialNumber : match.inventoryMatch.binSerialNumber}
                          </div> : <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell>{match.orderItem.itemQuantity}</TableCell>
                      <TableCell>
                        {match.inventoryMatch ? <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400">
                            Found ({match.inventoryType?.toUpperCase()})
                          </Badge> : <Badge variant="destructive">
                            Not Found
                          </Badge>}
                      </TableCell>
                      <TableCell>
                        {match.inventoryMatch ? <span className={match.inventoryMatch.quantity < match.orderItem.itemQuantity ? 'text-red-600 font-medium' : ''}>
                            {match.inventoryMatch.quantity}
                          </span> : '-'}
                      </TableCell>
                      <TableCell>
                        {match.inventoryMatch && <div className="flex items-center gap-2">
                            <Button size="sm" className="bg-gradient-primary hover:opacity-90 text-white shadow-md hover:shadow-lg transition-all duration-200" onClick={() => handleQuantityUpdate(match, -match.orderItem.itemQuantity, matchedItems.findIndex(m => m === match))} disabled={loading} title="Process order and update inventory">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Process Order
                            </Button>
                          </div>}
                      </TableCell>
                    </TableRow>)}
                </TableBody>
              </Table>
            </div>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {startIndex + 1}-{Math.min(endIndex, filteredMatches.length)} of {filteredMatches.length} items
                </div>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        href="#" 
                        onClick={(e) => {
                          e.preventDefault();
                          if (currentPage > 1) setCurrentPage(currentPage - 1);
                        }}
                        className={currentPage <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                    
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <PaginationItem key={pageNum}>
                          <PaginationLink
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              setCurrentPage(pageNum);
                            }}
                            isActive={currentPage === pageNum}
                            className="cursor-pointer"
                          >
                            {pageNum}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}
                    
                    {totalPages > 5 && currentPage < totalPages - 2 && (
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                    )}
                    
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                        }}
                        className={currentPage >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </div>
        </Card>}
    </div>;
}