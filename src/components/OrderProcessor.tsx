import { useState, useMemo, useEffect } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Progress } from './ui/progress';
import { Checkbox } from './ui/checkbox';
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from './ui/pagination';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { FileSpreadsheet, Search, Minus, Download, Package, AlertTriangle, TrendingUp, Clock, DollarSign, ShoppingCart, Printer, CheckSquare, Square, Tag } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { useAsinInventory, AsinInventoryItem } from '@/hooks/useAsinInventory';
import { useSkuInventory, SkuInventoryItem } from '@/hooks/useSkuInventory';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
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
  uploadDate?: string; // Add upload date for filtering
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
  const [allOrders, setAllOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [allOrdersSearchTerm, setAllOrdersSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [fileName, setFileName] = useState<string>('');
  const [dbResults, setDbResults] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('process');
  const [processingProgress, setProcessingProgress] = useState(0);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);
  
  // Filter state
  const [orderDateFilter, setOrderDateFilter] = useState('');
  const [uploadDateFilter, setUploadDateFilter] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');

  const {
    inventory: asinInventory,
    updateQuantity: updateAsinQuantity
  } = useAsinInventory();
  
  const {
    inventory: skuInventory,
    updateQuantity: updateSkuQuantity
  } = useSkuInventory();
  
  const { toast } = useToast();

  // Load all imported orders from database, ordered by date
  useEffect(() => {
    const loadAllOrders = async () => {
      console.log('Loading orders from database...');
      setLoading(true);
      
      const { data, error } = await supabase
        .from('order_imports')
        .select('*')
        .order('order_place_date', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error loading imported orders:', error);
        setLoading(false);
      } else {
        console.log(`Loaded ${data?.length || 0} orders from database`);
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
          shippedDate: order.shipped_date || '',
          uploadDate: order.created_at ? new Date(order.created_at).toISOString().split('T')[0] : ''
        }));
        
        setOrderData(formattedOrders);
        setAllOrders(formattedOrders);
        
        if (formattedOrders.length > 0) {
          console.log('Matching orders with inventory...');
          await matchOrdersWithInventory(formattedOrders);
        }
        
        setLoading(false);
        console.log('Orders loading complete');
      }
    };
    
    loadAllOrders();
  }, []);

  // Load processed orders from database
  useEffect(() => {
    const loadProcessedOrders = async () => {
      const { data, error } = await supabase
        .from('processed_orders')
        .select('*')
        .order('processed_at', { ascending: false });
      
      if (error) {
        console.error('Error loading processed orders:', error);
      } else {
        setDbResults(data || []);
      }
    };
    
    loadProcessedOrders();
  }, []);

  // Save all orders to database during file upload with duplicate prevention
  const saveOrdersToDatabase = async (orders: OrderItem[], fileName: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Check for existing order IDs to prevent duplicates
    const orderIds = orders.map(order => order.orderId).filter(id => id);
    const { data: existingOrders } = await supabase
      .from('order_imports')
      .select('order_id')
      .eq('user_id', user.id)
      .in('order_id', orderIds);

    const existingOrderIds = new Set((existingOrders || []).map(o => o.order_id));
    
    // Filter out duplicate orders
    const newOrders = orders.filter(order => !existingOrderIds.has(order.orderId));
    const duplicateCount = orders.length - newOrders.length;

    if (duplicateCount > 0) {
      toast({
        title: "Duplicate Orders Detected",
        description: `Skipped ${duplicateCount} duplicate orders. Adding ${newOrders.length} new orders.`,
        variant: "default"
      });
    }

    if (newOrders.length === 0) {
      toast({
        title: "No New Orders",
        description: "All orders in the file already exist in the database.",
        variant: "default"
      });
      return { newCount: 0, duplicateCount };
    }

    const orderRecords = newOrders.map(order => ({
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

    return { newCount: newOrders.length, duplicateCount };
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
      
      // Save all orders to database first with duplicate prevention
      const saveResult = await saveOrdersToDatabase(formattedOrders, file.name);
      
      const matches = await matchOrdersWithInventory(formattedOrders);

      const matchedCount = matches.filter(m => m.inventoryMatch).length;
      toast({
        title: "Orders Upload Complete",
        description: saveResult 
          ? `Added ${saveResult.newCount} new orders (${saveResult.duplicateCount} duplicates skipped). Found ${matchedCount} inventory matches.`
          : `Processed ${formattedOrders.length} orders. Found ${matchedCount} inventory matches.`
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
    console.log(`Starting to match ${orders.length} orders with inventory...`);
    const matches: MatchedItem[] = [];
    
    for (const order of orders) {
      let inventoryMatch: AsinInventoryItem | SkuInventoryItem | undefined;
      let inventoryType: 'asin' | 'sku' | undefined;
      let matchType: 'asin' | 'sku' | undefined;

      // Try to match by ASIN in ASIN inventory
      if (order.asin && order.asin.trim()) {
        const asinMatch = asinInventory.find(item => item.asin.toLowerCase() === order.asin.toLowerCase().trim());
        if (asinMatch) {
          inventoryMatch = asinMatch;
          inventoryType = 'asin';
          matchType = 'asin';
        }
      }

      // Try to match by SKU in ASIN inventory
      if (!inventoryMatch && order.sku && order.sku.trim()) {
        const asinSkuMatch = asinInventory.find(item => item.sku && item.sku.toLowerCase() === order.sku.toLowerCase().trim());
        if (asinSkuMatch) {
          inventoryMatch = asinSkuMatch;
          inventoryType = 'asin';
          matchType = 'sku';
        }
      }

      // Try to match by SKU in SKU inventory
      if (!inventoryMatch && order.sku && order.sku.trim()) {
        const skuMatch = skuInventory.find(item => item.skuNumber.toLowerCase() === order.sku.toLowerCase().trim());
        if (skuMatch) {
          inventoryMatch = skuMatch;
          inventoryType = 'sku';
          matchType = 'sku';
        }
      }

      // Try to match by ASIN as SKU in SKU inventory
      if (!inventoryMatch && order.asin && order.asin.trim()) {
        const skuAsinMatch = skuInventory.find(item => item.skuNumber.toLowerCase() === order.asin.toLowerCase().trim());
        if (skuAsinMatch) {
          inventoryMatch = skuAsinMatch;
          inventoryType = 'sku';
          matchType = 'asin';
        }
      }

      const match: MatchedItem = {
        orderItem: order,
        inventoryMatch,
        inventoryType,
        matchType
      };
      
      matches.push(match);
    }
    
    console.log(`Found ${matches.filter(m => m.inventoryMatch).length} matches out of ${matches.length} orders`);
    setMatchedItems(matches);
    return matches;
  };

  const processSelectedItems = async () => {
    if (selectedItems.size === 0) return;
    
    setLoading(true);
    setProcessingProgress(0);
    
    try {
      const itemsToProcess = Array.from(selectedItems).map(index => matchedItems[index]);
      const processed: ProcessedItem[] = [];
      const total = itemsToProcess.length;

      // Save processing records to database
      const { data: { user } } = await supabase.auth.getUser();
      
      for (let i = 0; i < itemsToProcess.length; i++) {
        const match = itemsToProcess[i];
        if (!match.inventoryMatch || !match.inventoryType) continue;
        
        // Update progress
        const progress = Math.floor(((i + 1) / total) * 100);  
        setProcessingProgress(progress);
        
        const previousQuantity = match.inventoryMatch.quantity;
        const quantityChange = -match.orderItem.itemQuantity;
        const newQuantity = Math.max(0, previousQuantity + quantityChange);
        
        if (match.inventoryType === 'asin') {
          await updateAsinQuantity(match.inventoryMatch.id, newQuantity, `Order processing: Removed ${Math.abs(quantityChange)} units`);
        } else {
          await updateSkuQuantity(match.inventoryMatch.id, newQuantity, `Order processing: Removed ${Math.abs(quantityChange)} units`);
        }

        // Save to processed_orders table
        if (user) {
          await supabase.from('processed_orders').insert({
            user_id: user.id,
            order_number: match.orderItem.orderId,
            asin: match.orderItem.asin,
            sku: match.orderItem.sku,
            item_title: match.orderItem.itemTitle,
            inventory_type: match.inventoryType,
            match_type: match.matchType || 'unknown',
            quantity_processed: match.orderItem.itemQuantity,
            source_file: fileName,
            previous_stock: previousQuantity,
            new_stock: newQuantity,
            inventory_id: match.inventoryMatch.id,
            processed_at: new Date().toISOString()
          });
        }

        const processedItem: ProcessedItem = {
          ...match,
          processedAt: new Date().toISOString(),
          action: 'subtract',
          quantityChanged: Math.abs(quantityChange),
          previousQuantity,
          newQuantity
        };

        processed.push(processedItem);
      }

      setProcessedItems(prev => [...prev, ...processed]);
      setSelectedItems(new Set());
      setSelectAll(false);
      setProcessingProgress(100);

      // Refresh processed orders from database
      const { data: refreshedProcessed } = await supabase
        .from('processed_orders')
        .select('*')
        .order('processed_at', { ascending: false });
      
      if (refreshedProcessed) {
        setDbResults(refreshedProcessed);
      }

      toast({
        title: "Orders Processed",
        description: `Successfully processed ${processed.length} orders and updated inventory.`
      });
    } catch (error) {
      console.error('Error processing orders:', error);
      toast({
        title: "Processing Error",
        description: "Failed to process selected orders.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setTimeout(() => setProcessingProgress(0), 2000);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv']
    },
    multiple: false
  });

  
  // Filter logic for search in Process Orders tab
  const filteredMatches = useMemo(() => {
    if (!searchTerm) return matchedItems.filter(m => m.inventoryMatch);
    
    return matchedItems.filter(match => {
      if (!match.inventoryMatch) return false;
      
      const searchLower = searchTerm.toLowerCase();
      return (
        match.orderItem.orderId.toLowerCase().includes(searchLower) ||
        match.orderItem.asin?.toLowerCase().includes(searchLower) ||
        match.orderItem.sku?.toLowerCase().includes(searchLower) ||
        match.orderItem.itemTitle?.toLowerCase().includes(searchLower)
      );
    });
  }, [matchedItems, searchTerm]);

  // Filter logic for all orders
  const filteredAllOrders = useMemo(() => {
    let filtered = allOrders;
    
    // Apply search filter
    if (allOrdersSearchTerm) {
      const searchLower = allOrdersSearchTerm.toLowerCase();
      filtered = filtered.filter(order => 
        order.orderId.toLowerCase().includes(searchLower) ||
        order.asin?.toLowerCase().includes(searchLower) ||
        order.sku?.toLowerCase().includes(searchLower) ||
        order.itemTitle?.toLowerCase().includes(searchLower) ||
        order.orderStatus?.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply order date filter
    if (orderDateFilter) {
      filtered = filtered.filter(order => {
        if (!order.orderPlaceDate) return false;
        const orderDate = new Date(order.orderPlaceDate).toISOString().split('T')[0];
        return orderDate === orderDateFilter;
      });
    }
    
    // Apply upload date filter (from database created_at)
    if (uploadDateFilter) {
      filtered = filtered.filter(order => {
        return order.uploadDate === uploadDateFilter;
      });
    }
    
    // Apply status filter
    if (orderStatusFilter !== 'all') {
      filtered = filtered.filter(order => order.orderStatus === orderStatusFilter);
    }
    
    return filtered;
  }, [allOrders, allOrdersSearchTerm, orderDateFilter, uploadDateFilter, orderStatusFilter]);

  // Clear all filters
  const clearFilters = () => {
    setAllOrdersSearchTerm('');
    setOrderDateFilter('');
    setUploadDateFilter('');
    setOrderStatusFilter('all');
  };

  // Get unique statuses for the filter dropdown
  const uniqueStatuses = useMemo(() => {
    const statuses = [...new Set(allOrders.map(order => order.orderStatus).filter(Boolean))];
    return statuses.sort();
  }, [allOrders]);

  // Get matched orders (orders with inventory matches) filtered to same day only
  const matchedOrders = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format
    const matched = matchedItems
      .filter(m => m.inventoryMatch)
      .map(m => m.orderItem)
      .filter(order => {
        // Filter to show only orders that were uploaded/matched today
        if (order.uploadDate) {
          return order.uploadDate === today;
        }
        // Fallback: if no upload date, don't show the order
        return false;
      });
    
    // Sort by order place date, then by order ID
    return matched.sort((a, b) => {
      const dateA = new Date(a.orderPlaceDate || '1970-01-01');
      const dateB = new Date(b.orderPlaceDate || '1970-01-01');
      if (dateA.getTime() !== dateB.getTime()) {
        return dateB.getTime() - dateA.getTime(); // Newest first
      }
      return a.orderId.localeCompare(b.orderId);
    });
  }, [matchedItems]);

  // Get unmatched orders (orders without inventory matches) grouped by date
  const unmatchedOrders = useMemo(() => {
    const unmatched = matchedItems.filter(m => !m.inventoryMatch).map(m => m.orderItem);
    // Sort by order place date, then by order ID
    return unmatched.sort((a, b) => {
      const dateA = new Date(a.orderPlaceDate || '1970-01-01');
      const dateB = new Date(b.orderPlaceDate || '1970-01-01');
      if (dateA.getTime() !== dateB.getTime()) {
        return dateB.getTime() - dateA.getTime(); // Newest first
      }
      return a.orderId.localeCompare(b.orderId);
    });
  }, [matchedItems]);

  // Get processed orders from DB
  const processedOrders = useMemo(() => {
    return dbResults;
  }, [dbResults]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredMatches.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedMatches = filteredMatches.slice(startIndex, startIndex + itemsPerPage);

  const analytics = useMemo(() => {
    const latestOrderDate = allOrders.length > 0 
      ? allOrders.reduce((latest, order) => {
          const orderDate = new Date(order.orderPlaceDate);
          const latestDate = new Date(latest);
          return orderDate > latestDate ? order.orderPlaceDate : latest;
        }, allOrders[0].orderPlaceDate)
      : '';
    
    return {
      totalOrders: allOrders.length,
      matchedOrdersCount: matchedOrders.length,
      unmatchedOrdersCount: unmatchedOrders.length,
      processedOrdersCount: processedOrders.length,
      totalValue: allOrders.reduce((sum, order) => sum + (parseFloat(order.itemCost) || 0), 0),
      latestOrderDate: latestOrderDate ? new Date(latestOrderDate).toLocaleDateString() : ''
    };
  }, [allOrders, matchedOrders, unmatchedOrders, processedOrders]);

  return (
    <div className="space-y-6">
      {/* Enhanced Card with Primary Theme */}
      <Card className="border-primary/20 shadow-glow/10 bg-card/95 backdrop-blur-sm">
        <div className="p-6 space-y-6">
          {/* Enhanced Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-primary">
                <Package className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  Order Processing Hub
                </h3>
                <p className="text-sm text-muted-foreground">
                  Manage and process customer orders efficiently
                </p>
              </div>
            </div>
            
            {/* Analytics Cards */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="text-primary font-medium">{analytics.totalOrders} Total</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-success/10 border border-success/20">
                <CheckSquare className="w-4 h-4 text-success" />
                <span className="text-success font-medium">{analytics.processedOrdersCount} Processed</span>
              </div>
            </div>
          </div>
          
          {/* Enhanced Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4 bg-muted/50 p-1 rounded-lg">
              <TabsTrigger 
                value="process"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm font-medium transition-all duration-300"
              >
                <Package className="w-4 h-4 mr-2" />
                Process Orders
              </TabsTrigger>
              <TabsTrigger 
                value="all-orders"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm font-medium transition-all duration-300 text-xs"
              >
                <Clock className="w-4 h-4 mr-1" />
                All Orders ({filteredAllOrders.length}) {analytics.latestOrderDate && `- ${analytics.latestOrderDate}`}
              </TabsTrigger>
              <TabsTrigger 
                value="matched-orders"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm font-medium transition-all duration-300"
              >
                <Tag className="w-4 h-4 mr-2" />
                Matched ({analytics.matchedOrdersCount})
              </TabsTrigger>
              <TabsTrigger 
                value="processed"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm font-medium transition-all duration-300"
              >
                <CheckSquare className="w-4 h-4 mr-2" />
                Processed ({analytics.processedOrdersCount})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="process" className="space-y-4">
              <div className="space-y-4">
                <div {...getRootProps()} className={`upload-zone ${isDragActive ? 'drag-over' : ''} bg-gradient-to-br from-primary/5 via-card to-primary/5 border-primary/30 hover:border-primary hover:shadow-glow/20`}>
                  <input {...getInputProps()} />
                  <div className="flex flex-col items-center space-y-4">
                    <div className="p-4 rounded-2xl bg-gradient-primary shadow-glow/30">
                      <FileSpreadsheet className="w-8 h-8 text-primary-foreground" />
                    </div>
                    <div className="text-center space-y-2">
                      <h4 className="text-lg font-semibold text-foreground">Upload Order File</h4>
                      <p className="text-muted-foreground">
                        Drop your Excel or CSV file here, or click to browse
                      </p>
                      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <FileSpreadsheet className="w-3 h-3" />
                          .xlsx
                        </span>
                        <span className="flex items-center gap-1">
                          <FileSpreadsheet className="w-3 h-3" />
                          .csv
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {(loading || processingProgress > 0) && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{processingProgress > 0 ? 'Processing orders...' : 'Loading...'}</span>
                      {processingProgress > 0 && <span>{processingProgress}%</span>}
                    </div>
                    <Progress value={processingProgress > 0 ? processingProgress : undefined} className="w-full" />
                    {processingProgress > 0 && (
                      <p className="text-xs text-center text-muted-foreground">
                        Updating inventory and saving records...
                      </p>
                    )}
                  </div>
                )}

              </div>
            </TabsContent>

            <TabsContent value="all-orders" className="space-y-4">
              {/* Enhanced Search and Filter Section */}
              <Card className="p-4 bg-gradient-to-r from-primary/5 via-card to-accent/5 border-primary/20">
                <div className="flex items-center gap-2 mb-4">
                  <Search className="w-4 h-4 text-primary" />
                  <h4 className="font-semibold text-foreground">Search & Filter Orders</h4>
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {filteredAllOrders.length} results
                  </Badge>
                </div>
                
                {/* Search Bar */}
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by Order ID, ASIN, SKU, Title, or Status..."
                      value={allOrdersSearchTerm}
                      onChange={(e) => setAllOrdersSearchTerm(e.target.value)}
                      className="pl-10 bg-background/80 border-primary/20 focus:border-primary"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      Order Date
                    </Label>
                    <Input 
                      type="date" 
                      value={orderDateFilter}
                      onChange={(e) => setOrderDateFilter(e.target.value)}
                      className="bg-background/80 border-primary/20 focus:border-primary"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <FileSpreadsheet className="w-3 h-3" />
                      Upload Date
                    </Label>
                    <Input 
                      type="date" 
                      value={uploadDateFilter}
                      onChange={(e) => setUploadDateFilter(e.target.value)}
                      className="bg-background/80 border-primary/20 focus:border-primary"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Tag className="w-3 h-3" />
                      Status
                    </Label>
                    <Select value={orderStatusFilter} onValueChange={setOrderStatusFilter}>
                      <SelectTrigger className="bg-background/80 border-primary/20 focus:border-primary">
                        <SelectValue placeholder="All Statuses" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border-primary/20 z-50">
                        <SelectItem value="all">All Statuses</SelectItem>
                        {uniqueStatuses.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-end">
                    <Button 
                      variant="outline" 
                      onClick={clearFilters}
                      className="w-full border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300"
                    >
                      <Minus className="w-4 h-4 mr-2" />
                      Clear All
                    </Button>
                  </div>
                </div>
              </Card>

              {allOrders.length > 0 ? (
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Serial #</TableHead>
                        <TableHead>Order ID</TableHead>
                        <TableHead>Order Date</TableHead>
                        <TableHead>ASIN/SKU</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                     <TableBody>
                      {filteredAllOrders.slice(0, 50).map((order, index) => {
                        const matchedItem = matchedItems.find(m => m.orderItem.orderId === order.orderId);
                        let inventorySerialNumber = 'N/A';
                        
                        if (matchedItem?.inventoryMatch) {
                          if (matchedItem.inventoryType === 'asin') {
                            inventorySerialNumber = (matchedItem.inventoryMatch as AsinInventoryItem).serialNumber;
                          } else if (matchedItem.inventoryType === 'sku') {
                            inventorySerialNumber = (matchedItem.inventoryMatch as SkuInventoryItem).binSerialNumber;
                          }
                        }
                        
                        return (
                          <TableRow key={`${order.orderId}-${index}`}>
                            <TableCell className="text-xs font-medium text-muted-foreground">
                              {inventorySerialNumber}
                            </TableCell>
                          <TableCell className="font-mono text-xs">{order.orderId}</TableCell>
                          <TableCell className="text-xs">
                            {order.orderPlaceDate ? (
                              <div className="text-muted-foreground">
                                {new Date(order.orderPlaceDate).toLocaleDateString()}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">N/A</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {order.asin && (
                                <div className="text-xs text-blue-600 dark:text-blue-400">
                                  ASIN: {order.asin}
                                </div>
                              )}
                              {order.sku && (
                                <div className="text-xs text-green-600 dark:text-green-400">
                                  SKU: {order.sku}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">{order.itemTitle}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {order.itemQuantity}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">
                              {order.orderStatus}
                            </Badge>
                          </TableCell>
                        </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                   {filteredAllOrders.length > 50 && (
                     <div className="p-4 text-center text-sm text-muted-foreground border-t">
                       Showing first 50 records out of {filteredAllOrders.length} total
                     </div>
                   )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No orders uploaded yet.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="matched-orders" className="space-y-4">
              {matchedOrders.length > 0 ? (
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                     <TableHeader>
                       <TableRow>
                         <TableHead className="w-16">Serial #</TableHead>
                         <TableHead>Order ID</TableHead>
                         <TableHead>Order Date</TableHead>
                         <TableHead>ASIN/SKU</TableHead>
                         <TableHead>Title</TableHead>
                         <TableHead>Quantity</TableHead>
                         <TableHead>Match Status</TableHead>
                       </TableRow>
                     </TableHeader>
                      <TableBody>
                        {matchedOrders.slice(0, 50).map((order, index) => {
                          const matchedItem = matchedItems.find(m => m.orderItem.orderId === order.orderId);
                          let inventorySerialNumber = 'N/A';
                          
                          if (matchedItem?.inventoryMatch) {
                            if (matchedItem.inventoryType === 'asin') {
                              inventorySerialNumber = (matchedItem.inventoryMatch as AsinInventoryItem).serialNumber;
                            } else if (matchedItem.inventoryType === 'sku') {
                              inventorySerialNumber = (matchedItem.inventoryMatch as SkuInventoryItem).binSerialNumber;
                            }
                          }
                          
                          return (
                            <TableRow key={`${order.orderId}-${index}`}>
                              <TableCell className="text-xs font-medium text-muted-foreground">
                                {inventorySerialNumber}
                              </TableCell>
                           <TableCell className="font-mono text-xs">{order.orderId}</TableCell>
                           <TableCell className="text-xs">
                             {order.orderPlaceDate ? (
                               <div className="text-muted-foreground">
                                 {new Date(order.orderPlaceDate).toLocaleDateString()}
                               </div>
                             ) : (
                               <span className="text-muted-foreground">N/A</span>
                             )}
                           </TableCell>
                           <TableCell>
                             <div className="space-y-1">
                               {order.asin && (
                                 <div className="text-xs text-blue-600 dark:text-blue-400">
                                   ASIN: {order.asin}
                                 </div>
                               )}
                               {order.sku && (
                                 <div className="text-xs text-green-600 dark:text-green-400">
                                   SKU: {order.sku}
                                 </div>
                               )}
                             </div>
                           </TableCell>
                           <TableCell className="max-w-xs truncate">{order.itemTitle}</TableCell>
                           <TableCell>
                             <Badge variant="outline" className="text-xs">
                               {order.itemQuantity}
                             </Badge>
                           </TableCell>
                           <TableCell>
                             <Badge variant="default" className="text-xs">
                               Matched
                             </Badge>
                            </TableCell>
                          </TableRow>
                          );
                        })}
                     </TableBody>
                  </Table>
                  {matchedOrders.length > 50 && (
                    <div className="p-4 text-center text-sm text-muted-foreground border-t">
                      Showing first 50 records out of {matchedOrders.length} total
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No matched orders yet.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="processed" className="space-y-4">
              {processedOrders.length > 0 ? (
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Serial #</TableHead>
                        <TableHead>Order Number</TableHead>
                        <TableHead>ASIN/SKU</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Quantity Processed</TableHead>
                        <TableHead>Stock Change</TableHead>
                        <TableHead>Processed At</TableHead>
                      </TableRow>
                    </TableHeader>
                     <TableBody>
                      {processedOrders.slice(0, 50).map((order, index) => {
                        // Find inventory item by inventory_id if available
                        let inventorySerialNumber = 'N/A';
                        
                        if (order.inventory_id) {
                          const asinItem = asinInventory.find(item => item.id === order.inventory_id);
                          if (asinItem) {
                            inventorySerialNumber = asinItem.serialNumber;
                          } else {
                            const skuItem = skuInventory.find(item => item.id === order.inventory_id);
                            if (skuItem) {
                              inventorySerialNumber = skuItem.binSerialNumber;
                            }
                          }
                        }
                        
                        return (
                          <TableRow key={`${order.order_number}-${index}`}>
                            <TableCell className="text-xs font-medium text-muted-foreground">
                              {inventorySerialNumber}
                            </TableCell>
                          <TableCell className="font-mono text-xs">{order.order_number}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {order.asin && (
                                <div className="text-xs text-blue-600 dark:text-blue-400">
                                  ASIN: {order.asin}
                                </div>
                              )}
                              {order.sku && (
                                <div className="text-xs text-green-600 dark:text-green-400">
                                  SKU: {order.sku}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">{order.item_title}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {order.quantity_processed}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-xs">
                              {order.previous_stock} → {order.new_stock}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-xs text-muted-foreground">
                              {new Date(order.processed_at).toLocaleString()}
                            </div>
                          </TableCell>
                        </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  {processedOrders.length > 50 && (
                    <div className="p-4 text-center text-sm text-muted-foreground border-t">
                      Showing first 50 records out of {processedOrders.length} total
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No processed orders yet.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </Card>
    </div>
  );
}