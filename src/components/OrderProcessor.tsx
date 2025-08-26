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
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { FileSpreadsheet, Search, Minus, Download, History, CheckCircle, Package, AlertTriangle, TrendingUp, Clock, DollarSign, ShoppingCart, Printer, CheckSquare, Square, Tag } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { useAsinInventory, AsinInventoryItem } from '@/hooks/useAsinInventory';
import { useSkuInventory, SkuInventoryItem } from '@/hooks/useSkuInventory';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { generateOrderLabelZPL, generateBulkOrderLabelsZPL, printZPLToPrinter, downloadZPLFile, previewOrderLabel, OrderLabelSettings } from '@/utils/order-label-printer';
import QZTrayPrinter from '@/utils/qz-tray-printer';
import { LabelPrintDialog } from '@/components/inventory/LabelPrintDialog';
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
  const [allOrders, setAllOrders] = useState<OrderItem[]>([]); // All imported orders
  const [unmatchedOrders, setUnmatchedOrders] = useState<OrderItem[]>([]); // Orders without inventory match
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [fileName, setFileName] = useState<string>('');
  const [dbResults, setDbResults] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('process');
  const [labelSettings, setLabelSettings] = useState<OrderLabelSettings>({
    labelSize: '4x3',
    dpi: 203,
    showOrderId: true,
    showAsin: true,
    showSku: true,
    showTitle: true,
    showQuantity: true,
    includeBarcode: true,
    barcodeContent: 'asin'
  });
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50); // Show 50 items per page

  // QZ Tray state
  const [qzConnected, setQzConnected] = useState(false);
  const [selectedPrinter, setSelectedPrinter] = useState<string>('');
  const [availablePrinters, setAvailablePrinters] = useState<string[]>([]);
  
  // Label print dialog state
  const [labelPrintDialogOpen, setLabelPrintDialogOpen] = useState(false);
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
        console.log('Loaded processed orders from DB:', data);
        setDbResults(data || []);
      }
    };
    loadProcessedOrders();
  }, []);

  // Load all imported orders from database
  useEffect(() => {
    const loadAllOrders = async () => {
      const { data, error } = await supabase
        .from('order_imports')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error loading imported orders:', error);
      } else {
        const formattedOrders: OrderItem[] = (data || []).map((order: any) => ({
          orderId: order.order_id || '',
          orderStatus: order.order_status || '',
          warehouseCode: order.warehouse_code || '',
          orderPlaceDate: order.order_place_date || '',
          requiredShipDate: order.required_ship_date || '',
          shipMethod: order.ship_method || '',
          shipMethodCode: order.ship_method_code || '',
          shipToName: order.ship_to_name || '',
          shipToAddressLine1: order.ship_to_address_line1 || '',
          shipToAddressLine2: order.ship_to_address_line2 || '',
          shipToAddressLine3: order.ship_to_address_line3 || '',
          shipToCity: order.ship_to_city || '',
          shipToState: order.ship_to_state || '',
          shipToZipCode: order.ship_to_zip_code || '',
          shipToCountry: order.ship_to_country || '',
          phoneNumber: order.phone_number || '',
          isGift: order.is_gift || '',
          itemCost: order.item_cost || '',
          sku: order.sku || '',
          asin: order.asin || '',
          itemTitle: order.item_title || '',
          itemQuantity: order.item_quantity || 1,
          giftMessage: order.gift_message || '',
          trackingId: order.tracking_id || '',
          shippedDate: order.shipped_date || ''
        }));
        
        setOrderData(formattedOrders);
        if (formattedOrders.length > 0) {
          await matchOrdersWithInventory(formattedOrders);
        }
      }
    };
    
    loadAllOrders();
  }, []);

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
        console.log('Loaded processed orders from DB:', data);
        setDbResults(data || []);
      }
    };
    loadProcessedOrders();
  }, []);

  // Initialize QZ Tray connection on component mount
  useEffect(() => {
    const initializeQZTray = async () => {
      try {
        await QZTrayPrinter.connect();
        const printers = await QZTrayPrinter.getPrinters();
        setAvailablePrinters(printers);
        
        // Auto-select first Zebra printer or default printer
        const defaultPrinter = await QZTrayPrinter.getDefaultPrinter();
        if (defaultPrinter) {
          setSelectedPrinter(defaultPrinter);
        }
        
        setQzConnected(true);
        console.log('QZ Tray initialized successfully');
      } catch (error) {
        console.log('QZ Tray not available:', error);
        setQzConnected(false);
      }
    };

    initializeQZTray();

    // Cleanup on unmount
    return () => {
      QZTrayPrinter.disconnect();
    };
  }, []);

  // Save all orders to database during file upload
  const saveOrdersToDatabase = async (orders: OrderItem[], fileName: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const orderRecords = orders.map(order => ({
      user_id: user.id,
      order_id: order.orderId,
      order_status: order.orderStatus,
      warehouse_code: order.warehouseCode,
      order_place_date: order.orderPlaceDate,
      required_ship_date: order.requiredShipDate,
      ship_method: order.shipMethod,
      ship_method_code: order.shipMethodCode,
      ship_to_name: order.shipToName,
      ship_to_address_line1: order.shipToAddressLine1,
      ship_to_address_line2: order.shipToAddressLine2,
      ship_to_address_line3: order.shipToAddressLine3,
      ship_to_city: order.shipToCity,
      ship_to_state: order.shipToState,
      ship_to_zip_code: order.shipToZipCode,
      ship_to_country: order.shipToCountry,
      phone_number: order.phoneNumber,
      is_gift: order.isGift,
      item_cost: order.itemCost,
      sku: order.sku,
      asin: order.asin,
      item_title: order.itemTitle,
      item_quantity: order.itemQuantity,
      gift_message: order.giftMessage,
      tracking_id: order.trackingId,
      shipped_date: order.shippedDate,
      source_file: fileName
    }));

    const { error } = await supabase
      .from('order_imports')
      .insert(orderRecords);
    
    if (error) {
      console.error('Error saving orders to database:', error);
      throw error;
    }
  };

  // Update order match status in database
  const updateOrderMatchStatus = async (orderId: string, hasMatch: boolean, matchType?: string, matchFieldType?: string, inventoryId?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('order_imports')
      .update({
        has_inventory_match: hasMatch,
        inventory_match_type: matchType || null,
        match_field_type: matchFieldType || null,
        inventory_id: inventoryId || null,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .eq('order_id', orderId);
    
    if (error) {
      console.error('Error updating order match status:', error);
    }
  };
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
      setAllOrders(formattedOrders);
      setFileName(file.name);
      
      // Save all orders to database first
      await saveOrdersToDatabase(formattedOrders, file.name);
      
      const matches = await matchOrdersWithInventory(formattedOrders);

      toast({
        title: "Orders Uploaded",
        description: `Successfully uploaded ${formattedOrders.length} orders to database. Found ${matches.filter(m => m.inventoryMatch).length} matches.`
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
    const matches: MatchedItem[] = [];
    
    for (const order of orders) {
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

      // Update match status in database
      await updateOrderMatchStatus(
        order.orderId, 
        !!inventoryMatch, 
        inventoryType, 
        matchType, 
        inventoryMatch?.id
      );

      const match: MatchedItem = {
        orderItem: order,
        inventoryMatch,
        inventoryType,
        matchType
      };
      
      matches.push(match);
    }
    
    // Separate matched and unmatched orders
    const matchedOrders = matches.filter(m => m.inventoryMatch);
    const unmatchedOrdersList = matches.filter(m => !m.inventoryMatch).map(m => m.orderItem);
    
    setMatchedItems(matches);
    setUnmatchedOrders(unmatchedOrdersList);
    
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
      
      // Refresh the processed orders from database
      const { data } = await supabase.from('processed_orders').select('*').order('processed_at', { ascending: false });
      if (data) {
        setDbResults(data);
      }
      
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
    const processedOrdersCount = dbResults.length; // All records in processed_orders table are processed
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

  // Print individual order label
  const printOrderLabel = async (match: MatchedItem) => {
    try {
      const zpl = generateOrderLabelZPL(match.orderItem, labelSettings);
      await printZPLToPrinter(zpl);
      toast({
        title: "Label Printing",
        description: `ZPL label generated for order ${match.orderItem.orderId}. Send to your Zebra printer.`
      });
    } catch (error) {
      toast({
        title: "Print Error",
        description: "Failed to generate label.",
        variant: "destructive"
      });
    }
  };

  // Print individual order label directly via QZ Tray
  const printOrderLabelDirect = async (match: MatchedItem) => {
    if (!qzConnected) {
      toast({
        title: "QZ Tray Not Connected",
        description: "Please ensure QZ Tray is running and connected.",
        variant: "destructive"
      });
      return;
    }

    try {
      const zpl = generateOrderLabelZPL(match.orderItem, labelSettings);
      await QZTrayPrinter.printZPL(zpl, { printerName: selectedPrinter });
      toast({
        title: "Label Printed",
        description: `Successfully printed label for order ${match.orderItem.orderId}.`
      });
    } catch (error) {
      toast({
        title: "Print Error",
        description: "Failed to print label directly. " + (error instanceof Error ? error.message : 'Unknown error'),
        variant: "destructive"
      });
    }
  };

  // Print bulk order labels
  const printBulkOrderLabels = async () => {
    const itemsToPrint = Array.from(selectedItems).map(index => filteredMatches[index].orderItem);
    try {
      const zpl = generateBulkOrderLabelsZPL(itemsToPrint, labelSettings);
      await printZPLToPrinter(zpl);
      toast({
        title: "Bulk Label Printing",
        description: `Generated ${itemsToPrint.length} labels. Send ZPL to your Zebra printer.`
      });
    } catch (error) {
      toast({
        title: "Print Error",
        description: "Failed to generate bulk labels.",
        variant: "destructive"
      });
    }
  };

  // Print bulk order labels directly via QZ Tray
  const printBulkOrderLabelsDirect = async () => {
    if (!qzConnected) {
      toast({
        title: "QZ Tray Not Connected",
        description: "Please ensure QZ Tray is running and connected.",
        variant: "destructive"
      });
      return;
    }

    const itemsToPrint = Array.from(selectedItems).map(index => filteredMatches[index].orderItem);
    try {
      const zplCodes = itemsToPrint.map(item => generateOrderLabelZPL(item, labelSettings));
      await QZTrayPrinter.printMultipleZPL(zplCodes, { printerName: selectedPrinter });
      toast({
        title: "Labels Printed",
        description: `Successfully printed ${itemsToPrint.length} labels.`
      });
    } catch (error) {
      toast({
        title: "Print Error",
        description: "Failed to print labels directly. " + (error instanceof Error ? error.message : 'Unknown error'),
        variant: "destructive"
      });
    }
  };

  // Download ZPL file for all found items
  const downloadAllLabelsZPL = () => {
    const foundItems = filteredMatches.filter(match => match.inventoryMatch).map(match => match.orderItem);
    if (foundItems.length === 0) {
      toast({
        title: "No Items",
        description: "No found items to generate labels for.",
        variant: "destructive"
      });
      return;
    }
    
    const zpl = generateBulkOrderLabelsZPL(foundItems, labelSettings);
    downloadZPLFile(zpl, `order-labels-${fileName}-${Date.now()}.zpl`);
    toast({
      title: "ZPL Downloaded",
      description: `Downloaded ZPL file with ${foundItems.length} labels.`
    });
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
      'Match Type': match.matchType || 'N/A',
      'Serial/Bin Number': match.inventoryMatch ? 
        ('serialNumber' in match.inventoryMatch ? 
          `="${match.inventoryMatch.serialNumber}"` : // Preserve leading zeros for serial numbers
          `="${match.inventoryMatch.binSerialNumber}"`) : // Preserve leading zeros for bin numbers
        'N/A'
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
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="process" className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                Process Orders
              </TabsTrigger>
              <TabsTrigger value="all-orders" className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                All Orders ({allOrders.length})
              </TabsTrigger>
              <TabsTrigger value="matched-orders" className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Matched ({matchedItems.filter(m => m.inventoryMatch).length})
              </TabsTrigger>
              <TabsTrigger value="processed" className="flex items-center gap-2">
                <History className="w-4 h-4" />
                Processed ({analytics.processedOrdersCount})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="all-orders" className="space-y-4">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-semibold">All Imported Orders ({allOrders.length})</h4>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => {
                      setOrderData([]);
                      setAllOrders([]);
                      setMatchedItems([]);
                      setUnmatchedOrders([]);
                    }}>
                      Clear All
                    </Button>
                  </div>
                </div>
                
                {allOrders.length > 0 ? (
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order ID</TableHead>
                          <TableHead>ASIN</TableHead>
                          <TableHead>SKU</TableHead>
                          <TableHead>Title</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Match Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((order, index) => {
                          const match = matchedItems.find(m => m.orderItem.orderId === order.orderId);
                          const hasMatch = !!match?.inventoryMatch;
                          
                          return (
                            <TableRow key={`${order.orderId}-${index}`}>
                              <TableCell className="font-mono text-sm">{order.orderId}</TableCell>
                              <TableCell className="font-mono text-sm">{order.asin}</TableCell>
                              <TableCell className="font-mono text-sm">{order.sku}</TableCell>
                              <TableCell className="max-w-xs truncate">{order.itemTitle}</TableCell>
                              <TableCell>{order.itemQuantity}</TableCell>
                              <TableCell>
                                <Badge variant="secondary">{order.orderStatus}</Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant={hasMatch ? "default" : "destructive"}>
                                  {hasMatch ? `Matched (${match?.matchType})` : "No Match"}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    No orders uploaded yet. Upload a file to see all orders here.
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="matched-orders" className="space-y-4">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-semibold">Matched Orders ({matchedItems.filter(m => m.inventoryMatch).length})</h4>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={processSelectedItems}
                      disabled={selectedItems.size === 0}
                    >
                      Process Selected ({selectedItems.size})
                    </Button>
                  </div>
                </div>

                {matchedItems.filter(m => m.inventoryMatch).length > 0 ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <Label htmlFor="search-matched">Search Matched Orders</Label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                          <Input 
                            id="search-matched" 
                            placeholder="Search matched orders..." 
                            value={searchTerm} 
                            onChange={e => setSearchTerm(e.target.value)} 
                            className="pl-10" 
                          />
                        </div>
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
                              />
                            </TableHead>
                            <TableHead>Order ID</TableHead>
                            <TableHead>Product</TableHead>
                            <TableHead>Match Info</TableHead>
                            <TableHead>Stock</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {matchedItems.filter(m => m.inventoryMatch)
                            .filter(match => 
                              !searchTerm || 
                              match.orderItem.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              match.orderItem.asin?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              match.orderItem.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              match.orderItem.itemTitle?.toLowerCase().includes(searchTerm.toLowerCase())
                            )
                            .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                            .map((match, index) => {
                              const globalIndex = matchedItems.findIndex(m => m === match);
                              return (
                                <TableRow key={`${match.orderItem.orderId}-${index}`}>
                                  <TableCell>
                                    <Checkbox 
                                      checked={selectedItems.has(globalIndex)}
                                      onCheckedChange={() => handleSelectItem(globalIndex)}
                                    />
                                  </TableCell>
                                  <TableCell className="font-mono text-sm">{match.orderItem.orderId}</TableCell>
                                  <TableCell>
                                    <div className="space-y-1">
                                      <div className="font-medium text-sm truncate max-w-xs">{match.orderItem.itemTitle}</div>
                                      <div className="text-xs text-muted-foreground">
                                        ASIN: {match.orderItem.asin} | SKU: {match.orderItem.sku}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        Qty: {match.orderItem.itemQuantity}
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="space-y-1">
                                      <Badge variant="default" className="text-xs">
                                        {match.inventoryType?.toUpperCase()} - {match.matchType?.toUpperCase()}
                                      </Badge>
                                      <div className="text-xs text-muted-foreground">
                                        {'asin' in match.inventoryMatch! ? match.inventoryMatch.asin : match.inventoryMatch!.skuNumber}
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={
                                      match.inventoryMatch!.quantity >= match.orderItem.itemQuantity ? "default" : 
                                      match.inventoryMatch!.quantity === 0 ? "destructive" : "destructive"
                                    }>
                                      {match.inventoryMatch!.quantity} available
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex gap-1">
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => handleQuantityUpdate(match, -match.orderItem.itemQuantity, globalIndex)}
                                        disabled={match.inventoryMatch!.quantity < match.orderItem.itemQuantity}
                                      >
                                        <Minus className="w-3 h-3" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => printOrderLabelDirect(match)}
                                        disabled={!qzConnected}
                                      >
                                        <Printer className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    No matched orders found. Upload a file and ensure you have matching inventory.
                  </div>
                )}
              </div>
            </TabsContent>
            
            
            <TabsContent value="all-orders" className="space-y-4">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-semibold">All Imported Orders ({allOrders.length})</h4>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => {
                      setOrderData([]);
                      setAllOrders([]);
                      setMatchedItems([]);
                      setUnmatchedOrders([]);
                    }}>
                      Clear All
                    </Button>
                  </div>
                </div>
                
                {allOrders.length > 0 ? (
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order ID</TableHead>
                          <TableHead>ASIN</TableHead>
                          <TableHead>SKU</TableHead>
                          <TableHead>Title</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Match Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((order, index) => {
                          const match = matchedItems.find(m => m.orderItem.orderId === order.orderId);
                          const hasMatch = !!match?.inventoryMatch;
                          
                          return (
                            <TableRow key={`${order.orderId}-${index}`}>
                              <TableCell className="font-mono text-sm">{order.orderId}</TableCell>
                              <TableCell className="font-mono text-sm">{order.asin}</TableCell>
                              <TableCell className="font-mono text-sm">{order.sku}</TableCell>
                              <TableCell className="max-w-xs truncate">{order.itemTitle}</TableCell>
                              <TableCell>{order.itemQuantity}</TableCell>
                              <TableCell>
                                <Badge variant="secondary">{order.orderStatus}</Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant={hasMatch ? "default" : "destructive"}>
                                  {hasMatch ? `Matched (${match?.matchType})` : "No Match"}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    No orders uploaded yet. Upload a file to see all orders here.
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="matched-orders" className="space-y-4">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-semibold">Matched Orders (Ready to Process)</h4>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={processSelectedItems}
                      disabled={selectedItems.size === 0}
                    >
                      Process Selected ({selectedItems.size})
                    </Button>
                  </div>
                </div>

                {matchedItems.filter(m => m.inventoryMatch).length > 0 ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <Label htmlFor="search-matched">Search Matched Orders</Label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                          <Input 
                            id="search-matched" 
                            placeholder="Search matched orders..." 
                            value={searchTerm} 
                            onChange={e => setSearchTerm(e.target.value)} 
                            className="pl-10" 
                          />
                        </div>
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
                              />
                            </TableHead>
                            <TableHead>Order ID</TableHead>
                            <TableHead>Product</TableHead>
                            <TableHead>Match Info</TableHead>
                            <TableHead>Stock</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {matchedItems.filter(m => m.inventoryMatch)
                            .filter(match => 
                              !searchTerm || 
                              match.orderItem.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              match.orderItem.asin?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              match.orderItem.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              match.orderItem.itemTitle?.toLowerCase().includes(searchTerm.toLowerCase())
                            )
                            .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                            .map((match, index) => {
                              const globalIndex = matchedItems.findIndex(m => m === match);
                              return (
                                <TableRow key={`${match.orderItem.orderId}-${index}`}>
                                  <TableCell>
                                    <Checkbox 
                                      checked={selectedItems.has(globalIndex)}
                                      onCheckedChange={() => handleSelectItem(globalIndex)}
                                    />
                                  </TableCell>
                                  <TableCell className="font-mono text-sm">{match.orderItem.orderId}</TableCell>
                                  <TableCell>
                                    <div className="space-y-1">
                                      <div className="font-medium text-sm truncate max-w-xs">{match.orderItem.itemTitle}</div>
                                      <div className="text-xs text-muted-foreground">
                                        ASIN: {match.orderItem.asin} | SKU: {match.orderItem.sku}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        Qty: {match.orderItem.itemQuantity}
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="space-y-1">
                                      <Badge variant="default" className="text-xs">
                                        {match.inventoryType?.toUpperCase()} - {match.matchType?.toUpperCase()}
                                      </Badge>
                                      <div className="text-xs text-muted-foreground">
                                        {'asin' in match.inventoryMatch! ? match.inventoryMatch.asin : match.inventoryMatch!.skuNumber}
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={
                                      match.inventoryMatch!.quantity >= match.orderItem.itemQuantity ? "default" : 
                                      match.inventoryMatch!.quantity === 0 ? "destructive" : "destructive"
                                    }>
                                      {match.inventoryMatch!.quantity} available
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex gap-1">
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => handleQuantityUpdate(match, -match.orderItem.itemQuantity, globalIndex)}
                                        disabled={match.inventoryMatch!.quantity < match.orderItem.itemQuantity}
                                      >
                                        <Minus className="w-3 h-3" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => printOrderLabelDirect(match)}
                                        disabled={!qzConnected}
                                      >
                                        <Printer className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    No matched orders found. Upload a file and ensure you have matching inventory.
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="process" className="space-y-4">

            {orderData.length === 0 ? (
              <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}`}>
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
                
                {/* Keep existing analytics cards and table content */}
                {/* ... rest of existing process tab content ... */}
              </div>
            )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-full">
                      <ShoppingCart className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{analytics.totalOrders}</div>
                      <div className="text-xs text-muted-foreground">
                        Total Orders
                      </div>
                    </div>
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-full">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">{analytics.foundOrders}</div>
                      <div className="text-xs text-muted-foreground">
                        Found Items
                      </div>
                    </div>
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 rounded-full">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-red-600">{analytics.totalOrders - analytics.foundOrders}</div>
                      <div className="text-xs text-muted-foreground">
                        Missing Items
                      </div>
                    </div>
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-full">
                      <TrendingUp className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{analytics.fulfillmentRate.toFixed(1)}%</div>
                      <div className="text-xs text-muted-foreground">
                        Fulfillment Rate
                      </div>
                    </div>
                  </div>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-full">
                      <Tag className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-purple-600">{analytics.foundByAsin}</div>
                      <div className="text-xs text-muted-foreground">
                        Found by ASIN
                      </div>
                    </div>
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 rounded-full">
                      <Tag className="w-4 h-4 text-orange-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-orange-600">{analytics.foundBySku}</div>
                      <div className="text-xs text-muted-foreground">
                        Found by SKU
                      </div>
                    </div>
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 rounded-full">
                      <Clock className="w-4 h-4 text-amber-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-amber-600">{analytics.urgentOrders}</div>
                      <div className="text-xs text-muted-foreground">
                        Urgent Orders
                      </div>
                    </div>
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded-full">
                      <History className="w-4 h-4 text-gray-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{analytics.processedOrdersCount}</div>
                      <div className="text-xs text-muted-foreground">
                        Total in database
                      </div>
                    </div>
                  </div>
                </Card>
              </div>}
            </TabsContent>

            <TabsContent value="matched-orders" className="space-y-4">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-semibold">Matched Orders (Ready to Process)</h4>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={processSelectedItems}
                      disabled={selectedItems.size === 0}
                    >
                      Process Selected ({selectedItems.size})
                    </Button>
                  </div>
                </div>

                {matchedItems.filter(m => m.inventoryMatch).length > 0 ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <Label htmlFor="search-matched">Search Matched Orders</Label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                          <Input 
                            id="search-matched" 
                            placeholder="Search matched orders..." 
                            value={searchTerm} 
                            onChange={e => setSearchTerm(e.target.value)} 
                            className="pl-10" 
                          />
                        </div>
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
                              />
                            </TableHead>
                            <TableHead>Order ID</TableHead>
                            <TableHead>Product</TableHead>
                            <TableHead>Match Info</TableHead>
                            <TableHead>Stock</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {matchedItems.filter(m => m.inventoryMatch)
                            .filter(match => 
                              !searchTerm || 
                              match.orderItem.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              match.orderItem.asin?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              match.orderItem.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              match.orderItem.itemTitle?.toLowerCase().includes(searchTerm.toLowerCase())
                            )
                            .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                            .map((match, index) => {
                              const globalIndex = matchedItems.findIndex(m => m === match);
                              return (
                                <TableRow key={`${match.orderItem.orderId}-${index}`}>
                                  <TableCell>
                                    <Checkbox 
                                      checked={selectedItems.has(globalIndex)}
                                      onCheckedChange={() => handleSelectItem(globalIndex)}
                                    />
                                  </TableCell>
                                  <TableCell className="font-mono text-sm">{match.orderItem.orderId}</TableCell>
                                  <TableCell>
                                    <div className="space-y-1">
                                      <div className="font-medium text-sm truncate max-w-xs">{match.orderItem.itemTitle}</div>
                                      <div className="text-xs text-muted-foreground">
                                        ASIN: {match.orderItem.asin} | SKU: {match.orderItem.sku}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        Qty: {match.orderItem.itemQuantity}
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="space-y-1">
                                      <Badge variant="default" className="text-xs">
                                        {match.inventoryType?.toUpperCase()} - {match.matchType?.toUpperCase()}
                                      </Badge>
                                      <div className="text-xs text-muted-foreground">
                                        {'asin' in match.inventoryMatch! ? match.inventoryMatch.asin : match.inventoryMatch!.skuNumber}
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={
                                      match.inventoryMatch!.quantity >= match.orderItem.itemQuantity ? "default" : 
                                      match.inventoryMatch!.quantity === 0 ? "destructive" : "destructive"
                                    }>
                                      {match.inventoryMatch!.quantity} available
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex gap-1">
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => handleQuantityUpdate(match, -match.orderItem.itemQuantity, globalIndex)}
                                        disabled={match.inventoryMatch!.quantity < match.orderItem.itemQuantity}
                                      >
                                        <Minus className="w-3 h-3" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => printOrderLabelDirect(match)}
                                        disabled={!qzConnected}
                                      >
                                        <Printer className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    No matched orders found. Upload a file and ensure you have matching inventory.
                  </div>
                )}
              </div>
            </TabsContent>
            

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
            </TabsContent>
            
            <TabsContent value="processed" className="space-y-4">
              <div className="space-y-4">
                <h4 className="font-semibold">Session Processed Items ({processedItems.length})</h4>
                {processedItems.length > 0 ? (
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order ID</TableHead>
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
                              {item.orderItem.orderId}
                            </TableCell>
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
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No items processed in this session yet.</p>
                    <p className="text-sm">Process orders from the "Process Orders" tab to see them here.</p>
                  </div>
                )}
                
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-4">All Database Records ({analytics.processedOrdersCount})</h4>
                  {analytics.processedOrdersCount > 0 ? (
                    <div className="rounded-lg border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Order Number</TableHead>
                            <TableHead>ASIN/SKU</TableHead>
                            <TableHead>Item Title</TableHead>
                            <TableHead>Quantity</TableHead>
                            <TableHead>Previous → New Stock</TableHead>
                            <TableHead>Source File</TableHead>
                            <TableHead>Processed At</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dbResults.slice(0, 50).map((record) => (
                            <TableRow key={record.id}>
                              <TableCell className="font-mono text-sm">
                                {record.order_number}
                              </TableCell>
                              <TableCell className="font-mono text-sm">
                                {record.asin || record.sku}
                              </TableCell>
                              <TableCell className="text-sm truncate max-w-[200px]">
                                {record.item_title || '-'}
                              </TableCell>
                              <TableCell>{record.quantity_processed}</TableCell>
                              <TableCell>
                                <span className="font-mono text-sm">{record.previous_stock} → {record.new_stock}</span>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground truncate max-w-[150px]">
                                {record.source_file || '-'}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {new Date(record.processed_at).toLocaleString()}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {dbResults.length > 50 && (
                        <div className="p-4 text-center text-sm text-muted-foreground border-t">
                          Showing latest 50 records out of {dbResults.length} total
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No processed orders in database yet.</p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </Card>

      {filteredMatches.length > 0 && <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">Processing Results ({filteredMatches.length} items)</h4>
              
              <div className="flex items-center gap-2">
                {/* QZ Tray Status and Printer Selection */}
                {qzConnected && availablePrinters.length > 0 && (
                  <div className="flex items-center gap-2 mr-4">
                    <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400">
                      QZ Tray Connected
                    </Badge>
                    <select 
                      value={selectedPrinter} 
                      onChange={(e) => setSelectedPrinter(e.target.value)}
                      className="text-xs px-2 py-1 border rounded"
                    >
                      {availablePrinters.map(printer => (
                        <option key={printer} value={printer}>{printer}</option>
                      ))}
                    </select>
                  </div>
                )}
                
                <Button onClick={printFoundItems} variant="outline" size="sm" disabled={analytics.foundOrders === 0}>
                  <Printer className="w-4 h-4 mr-2" />
                  Print Report ({analytics.foundOrders})
                </Button>
                <Button onClick={downloadAllLabelsZPL} variant="outline" size="sm" disabled={analytics.foundOrders === 0}>
                  <Tag className="w-4 h-4 mr-2" />
                  Download All Labels
                </Button>
                {selectedItems.size > 0 && <>
                    <Button onClick={processSelectedItems} className="bg-gradient-primary hover:opacity-90 text-white" disabled={loading}>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Process Selected ({selectedItems.size})
                    </Button>
                    <Button onClick={printBulkOrderLabels} variant="outline" size="sm" disabled={selectedItems.size === 0}>
                      <Tag className="w-4 h-4 mr-2" />
                      Print Labels ({selectedItems.size})
                    </Button>
                    <Button onClick={() => setLabelPrintDialogOpen(true)} variant="outline" size="sm" disabled={selectedItems.size === 0}>
                      <Tag className="w-4 h-4 mr-2" />
                      Custom Labels ({selectedItems.size})
                    </Button>
                    {qzConnected && (
                      <Button onClick={printBulkOrderLabelsDirect} variant="outline" size="sm" disabled={selectedItems.size === 0}>
                        <Printer className="w-4 h-4 mr-2" />
                        Direct Print ({selectedItems.size})
                      </Button>
                    )}
                    <Button onClick={printSelectedItems} variant="outline" size="sm" disabled={selectedItems.size === 0}>
                      <Printer className="w-4 h-4 mr-2" />
                      Print Report
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
                              Process
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => printOrderLabel(match)} title="Print label for this order">
                              <Tag className="w-3 h-3 mr-1" />
                              Label
                            </Button>
                            {qzConnected && (
                              <Button size="sm" variant="outline" onClick={() => printOrderLabelDirect(match)} title="Print label directly to Zebra printer">
                                <Printer className="w-3 h-3 mr-1" />
                                Print
                              </Button>
                            )}
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
        
        {/* Label Print Dialog */}
        <LabelPrintDialog
          open={labelPrintDialogOpen}
          onOpenChange={setLabelPrintDialogOpen}
          selectedItems={Array.from(selectedItems).map(index => {
            const match = filteredMatches[index];
            return {
              id: match.inventoryMatch?.id || '',
              asin: match.orderItem.asin || '',
              sku: match.orderItem.sku || '',
              title: match.orderItem.itemTitle || '',
              quantity: match.inventoryMatch?.quantity || 0,
              type: match.inventoryType || 'asin',
              order_id: match.orderItem.orderId,
              order_quantity: match.orderItem.itemQuantity
            };
          })}
          inventoryType="mixed"
        />
    </div>;
}