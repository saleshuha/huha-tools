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
  
  const { inventory: asinInventory, updateQuantity: updateAsinQuantity } = useAsinInventory();
  const { inventory: skuInventory, updateQuantity: updateSkuQuantity } = useSkuInventory();
  const { toast } = useToast();

  // Load order processing results from database
  useEffect(() => {
    const loadOrderResults = async () => {
      const { data, error } = await supabase
        .from('order_processing_results')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error loading order results:', error);
      } else {
        setDbResults(data || []);
      }
    };

    loadOrderResults();
  }, []);

  // Save order results to database
  const saveOrderResults = async (matches: MatchedItem[], currentFileName: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const results = matches.map(match => ({
      user_id: user.id,
      order_id: match.orderItem.orderId,
      asin: match.orderItem.asin,
      sku: match.orderItem.sku,
      item_title: match.orderItem.itemTitle,
      order_quantity: match.orderItem.itemQuantity,
      inventory_type: match.inventoryType,
      match_type: match.matchType,
      inventory_id: match.inventoryMatch?.id,
      inventory_status: match.inventoryMatch ? 'found' : 'not_found',
      current_stock: match.inventoryMatch?.quantity || 0,
      file_name: currentFileName
    }));

    const { error } = await supabase
      .from('order_processing_results')
      .insert(results);

    if (error) {
      console.error('Error saving order results:', error);
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
        const result = Papa.parse(text, { header: true, skipEmptyLines: true });
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
      await saveOrderResults(matches, file.name);
      
      toast({
        title: "Orders Uploaded",
        description: `Successfully processed ${formattedOrders.length} orders.`,
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

      // Try to match by ASIN in ASIN inventory
      if (order.asin && order.asin.trim()) {
        const asinMatch = asinInventory.find(item => 
          item.asin.toLowerCase() === order.asin.toLowerCase().trim()
        );
        if (asinMatch) {
          inventoryMatch = asinMatch;
          inventoryType = 'asin';
          matchType = 'asin';
        }
      }

      // Try to match by SKU in ASIN inventory
      if (!inventoryMatch && order.sku && order.sku.trim()) {
        const asinSkuMatch = asinInventory.find(item => 
          item.sku && item.sku.toLowerCase() === order.sku.toLowerCase().trim()
        );
        if (asinSkuMatch) {
          inventoryMatch = asinSkuMatch;
          inventoryType = 'asin';
          matchType = 'sku';
        }
      }

      // Try to match by SKU in SKU inventory
      if (!inventoryMatch && order.sku && order.sku.trim()) {
        const skuMatch = skuInventory.find(item => 
          item.skuNumber.toLowerCase() === order.sku.toLowerCase().trim()
        );
        if (skuMatch) {
          inventoryMatch = skuMatch;
          inventoryType = 'sku';
          matchType = 'sku';
        }
      }

      // Try to match by ASIN as SKU in SKU inventory (sometimes ASIN might be stored as SKU)
      if (!inventoryMatch && order.asin && order.asin.trim()) {
        const skuAsinMatch = skuInventory.find(item => 
          item.skuNumber.toLowerCase() === order.asin.toLowerCase().trim()
        );
        if (skuAsinMatch) {
          inventoryMatch = skuAsinMatch;
          inventoryType = 'sku';
          matchType = 'asin';
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
      
      toast({
        title: "Quantity Updated",
        description: `Successfully updated quantity to ${newQuantity}. Item moved to processed list.`,
      });
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to update quantity.",
        variant: "destructive"
      });
    }
  };

  // Enhanced real-time analytics with database integration
  const analytics = useMemo(() => {
    const totalOrders = matchedItems.length;
    const foundOrders = matchedItems.filter(m => m.inventoryMatch).length;
    const foundByAsin = matchedItems.filter(m => m.inventoryMatch && m.matchType === 'asin').length;
    const foundBySku = matchedItems.filter(m => m.inventoryMatch && m.matchType === 'sku').length;
    const processedOrdersCount = dbResults.filter(r => r.processed).length;
    
    const totalValue = matchedItems.reduce((sum, match) => {
      const cost = parseFloat(match.orderItem.itemCost) || 0;
      return sum + (cost * match.orderItem.itemQuantity);
    }, 0);

    const lowStockItems = matchedItems.filter(m => 
      m.inventoryMatch && m.inventoryMatch.quantity < m.orderItem.itemQuantity
    );

    const criticalStockItems = matchedItems.filter(m => 
      m.inventoryMatch && m.inventoryMatch.quantity === 0
    );

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
      return sum + (cost * item.orderItem.itemQuantity);
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
      fulfillmentRate: totalOrders > 0 ? (foundOrders / totalOrders) * 100 : 0
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

    for (const { match, index } of itemsToProcess) {
      if (match.inventoryMatch) {
        await handleQuantityUpdate(match, -match.orderItem.itemQuantity, index);
      }
    }
    
    setSelectedItems(new Set());
    setSelectAll(false);
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
                  <td>${match.inventoryMatch ? 
                    ('serialNumber' in match.inventoryMatch ? 
                      match.inventoryMatch.serialNumber : 
                      match.inventoryMatch.binSerialNumber) : '-'}</td>
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

  const filteredMatches = matchedItems.filter(match => 
    match.orderItem.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    match.orderItem.asin.toLowerCase().includes(searchTerm.toLowerCase()) ||
    match.orderItem.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    match.orderItem.itemTitle.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => {
    // Sort found items first, then not found items
    const aHasMatch = a.inventoryMatch ? 1 : 0;
    const bHasMatch = b.inventoryMatch ? 1 : 0;
    return bHasMatch - aHasMatch;
  });

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
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

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-primary" />
                Order Processing
              </h3>
              <div className="flex items-center gap-2">
                {processedItems.length > 0 && (
                  <Dialog>
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
                            {processedItems.map((item, index) => (
                              <TableRow key={index}>
                                <TableCell className="font-mono text-sm">
                                  {item.orderItem.asin || item.orderItem.sku}
                                </TableCell>
                                <TableCell className="font-mono text-sm">
                                  {'serialNumber' in item.inventoryMatch! 
                                    ? item.inventoryMatch.serialNumber 
                                    : item.inventoryMatch!.binSerialNumber
                                  }
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
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
                {matchedItems.length > 0 && (
                  <Button onClick={exportToExcel} variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Export Results
                  </Button>
                )}
              </div>
            </div>

          {orderData.length === 0 ? (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
              }`}
            >
              <input {...getInputProps()} />
              <FileSpreadsheet className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h4 className="text-lg font-medium mb-2">Upload Order File</h4>
              <p className="text-muted-foreground mb-2">
                Drop your Excel or CSV file here, or click to browse
              </p>
              <p className="text-sm text-muted-foreground">
                Expected columns: Order ID, ASIN, SKU, Item Quantity, Item Title, etc.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Label htmlFor="search">Search Orders</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      id="search"
                      placeholder="Search by Order ID, ASIN, SKU, or Title..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Button onClick={() => {setOrderData([]); setMatchedItems([]); setProcessedItems([]);}} variant="outline">
                  Upload New File
                </Button>
              </div>

              {/* Enhanced Real-time Analytics Dashboard */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="glass-container border-0 shadow-elegant hover:shadow-glow transition-all duration-300 animate-fade-in">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-gradient-primary">
                          <ShoppingCart className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Total Orders</p>
                          <p className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                            {analytics.totalOrders}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Fulfillment Rate</span>
                        <span className="font-medium">{analytics.fulfillmentRate.toFixed(1)}%</span>
                      </div>
                      <Progress value={analytics.fulfillmentRate} className="h-2" />
                    </div>
                  </div>
                </Card>

                <Card className="glass-container border-0 shadow-elegant hover:shadow-glow transition-all duration-300 animate-fade-in">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600">
                          <Package className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Found Orders</p>
                          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                            {analytics.foundOrders}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div>By ASIN: {analytics.foundByAsin}</div>
                      <div>By SKU: {analytics.foundBySku}</div>
                    </div>
                  </div>
                </Card>

                <Card className="glass-container border-0 shadow-elegant hover:shadow-glow transition-all duration-300 animate-fade-in">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
                          <CheckCircle className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Processed Orders</p>
                          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
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

                <Card className="glass-container border-0 shadow-elegant hover:shadow-glow transition-all duration-300 animate-fade-in">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-yellow-500 to-orange-600">
                          <AlertTriangle className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Stock Alerts</p>
                          <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                            {analytics.lowStockItems}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {analytics.criticalStockItems} critical stock items
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}
        </div>
      </Card>

      {filteredMatches.length > 0 && (
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">Processing Results ({filteredMatches.length} items)</h4>
              
              <div className="flex items-center gap-2">
                {selectedItems.size > 0 && (
                  <>
                    <Button 
                      onClick={processSelectedItems}
                      className="bg-gradient-primary hover:opacity-90 text-white"
                      disabled={loading}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Process Selected ({selectedItems.size})
                    </Button>
                    <Button 
                      onClick={printSelectedItems}
                      variant="outline"
                      disabled={selectedItems.size === 0}
                    >
                      <Printer className="w-4 h-4 mr-2" />
                      Print Selected
                    </Button>
                  </>
                )}
              </div>
            </div>
            
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectAll}
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all items"
                      />
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
                  {filteredMatches.map((match, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Checkbox
                          checked={selectedItems.has(index)}
                          onCheckedChange={() => handleSelectItem(index)}
                          aria-label={`Select order ${match.orderItem.orderId}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-mono text-sm">{match.orderItem.asin || match.orderItem.sku}</div>
                          {match.matchType && (
                            <Badge variant="outline" className="text-xs">
                              Matched by {match.matchType.toUpperCase()}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {match.inventoryMatch ? (
                          <div className="font-mono text-sm">
                            {'serialNumber' in match.inventoryMatch 
                              ? match.inventoryMatch.serialNumber 
                              : match.inventoryMatch.binSerialNumber
                            }
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{match.orderItem.itemQuantity}</TableCell>
                      <TableCell>
                        {match.inventoryMatch ? (
                          <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400">
                            Found ({match.inventoryType?.toUpperCase()})
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            Not Found
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {match.inventoryMatch ? (
                          <span className={match.inventoryMatch.quantity < match.orderItem.itemQuantity ? 'text-red-600 font-medium' : ''}>
                            {match.inventoryMatch.quantity}
                          </span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {match.inventoryMatch && (
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              className="bg-gradient-primary hover:opacity-90 text-white shadow-md hover:shadow-lg transition-all duration-200"
                              onClick={() => handleQuantityUpdate(match, -match.orderItem.itemQuantity, matchedItems.findIndex(m => m === match))}
                              disabled={loading}
                              title="Process order and update inventory"
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Process Order
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}