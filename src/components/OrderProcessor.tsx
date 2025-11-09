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
import { Dialog, DialogContent } from './ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from './ui/tooltip';
import { FileSpreadsheet, Search, Minus, Download, Package, AlertTriangle, Clock, Printer, CheckSquare, Square, Tag, FileUp, Zap, ArrowRight, Eye } from 'lucide-react';
import { AnalyticsDashboard } from './order-processing/AnalyticsDashboard';
import { SearchBar } from './order-processing/SearchBar';
import { FilterChips } from './order-processing/FilterChips';
import { SortableTableHeader } from './order-processing/SortableTableHeader';
import { TablePagination } from './order-processing/TablePagination';
import { BulkActionsToolbar } from './order-processing/BulkActionsToolbar';
import { TableViewToggle } from './order-processing/TableViewToggle';
import { useDropzone } from 'react-dropzone';
import { useAsinInventory, AsinInventoryItem } from '@/hooks/useAsinInventory';
import { useSkuInventory, SkuInventoryItem } from '@/hooks/useSkuInventory';
import { useToast } from '@/hooks/use-toast';
import { useProductImages } from '@/hooks/useProductImages';
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
  uploadDate?: string;
  sunskyMatch?: {
    sku_code: string;
    title?: string;
    cost?: number;
    product_data?: any;
  };
}

interface MatchedItem {
  orderItem: OrderItem;
  inventoryMatch?: AsinInventoryItem | SkuInventoryItem;
  inventoryType?: 'asin' | 'sku';
  matchType?: 'asin' | 'sku';
  sunskyMatchSource?: 'catalog' | 'imported';
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
  const [processedSearchTerm, setProcessedSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [fileName, setFileName] = useState<string>('');
  const [dbResults, setDbResults] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('upload');
  const [processingProgress, setProcessingProgress] = useState(0);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  
  // Sort state
  const [sortColumn, setSortColumn] = useState('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // View mode state
  const [viewMode, setViewMode] = useState<'compact' | 'comfortable'>('comfortable');
  
  // Filter state
  const [orderDateFilter, setOrderDateFilter] = useState('');
  const [uploadDateFilter, setUploadDateFilter] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  
  // Matched orders filters
  const [matchedOrderDateFilter, setMatchedOrderDateFilter] = useState('');
  const [matchedUploadDateFilter, setMatchedUploadDateFilter] = useState('');
  const [matchedOrderStatusFilter, setMatchedOrderStatusFilter] = useState('all');
  const [matchedSearchTerm, setMatchedSearchTerm] = useState('');
  const [matchedInventoryTypeFilter, setMatchedInventoryTypeFilter] = useState('all');
  const [matchedMatchTypeFilter, setMatchedMatchTypeFilter] = useState('all');
  
  // Matched orders pagination
  const [matchedCurrentPage, setMatchedCurrentPage] = useState(1);
  const [matchedItemsPerPage] = useState(100);
  
  // Selection for matched orders
  const [selectedMatchedItems, setSelectedMatchedItems] = useState<Set<string>>(new Set());
  const [selectAllMatched, setSelectAllMatched] = useState(false);
  const [showDeductDialog, setShowDeductDialog] = useState(false);
  const [uploadedMatches, setUploadedMatches] = useState<MatchedItem[]>([]);

  const {
    inventory: asinInventory,
    updateQuantity: updateAsinQuantity
  } = useAsinInventory();
  
  const {
    inventory: skuInventory,
    updateQuantity: updateSkuQuantity
  } = useSkuInventory();
  
  const { getImageByAsin, isLoading: imagesLoading, productImages } = useProductImages();
  
  const { toast } = useToast();

  // Debug: Log inventory changes
  useEffect(() => {
    console.log('ASIN Inventory loaded:', {
      count: asinInventory.length,
      firstFew: asinInventory.slice(0, 2).map(item => ({ asin: item.asin, sku: item.sku }))
    });
  }, [asinInventory]);

  useEffect(() => {
    console.log('SKU Inventory loaded:', {
      count: skuInventory.length,
      firstFew: skuInventory.slice(0, 2).map(item => ({ skuNumber: item.skuNumber }))
    });
  }, [skuInventory]);

  // Load all imported orders from database, ordered by date
  useEffect(() => {
    const loadAllOrders = async () => {
      console.log('Loading orders from database...');
      setLoading(true);
      
      // Fetch all orders without limit (paginate if needed)
      let allData: any[] = [];
      let from = 0;
      const batchSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('order_imports')
          .select('*', { count: 'exact' })
          .order('order_place_date', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false })
          .range(from, from + batchSize - 1);

        if (error) {
          console.error('Error loading imported orders:', error);
          setLoading(false);
          return;
        }

        if (data && data.length > 0) {
          allData = [...allData, ...data];
          from += batchSize;
          hasMore = data.length === batchSize;
        } else {
          hasMore = false;
        }
      }

      const data = allData;
      
      console.log(`Loaded ${data?.length || 0} orders from database`);
      console.log('First few orders:', data?.slice(0, 3)); // Debug: show first few orders
      console.log('Last few orders:', data?.slice(-3)); // Debug: show last few orders
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
        setLoading(false);
        console.log('Orders loading complete');
    };
    
    loadAllOrders();
  }, []);

  // Re-match orders when inventory data is loaded
  useEffect(() => {
    if (allOrders.length > 0 && (asinInventory.length > 0 || skuInventory.length > 0)) {
      console.log('Inventory loaded, re-matching orders with inventory...');
      matchOrdersWithInventory(allOrders);
    }
  }, [allOrders, asinInventory, skuInventory]);

  // Load processed orders from database
  useEffect(() => {
    const loadProcessedOrders = async () => {
      const { data, error } = await supabase
        .from('processed_orders')
        .select('*')
        .order('processed_at', { ascending: false }); // Remove range limit
      
      if (error) {
        console.error('Error loading processed orders:', error);
      } else {
        setDbResults(data || []);
      }
    };
    
    loadProcessedOrders();
  }, []);

  // ProductImage component for displaying product images with preview
  const ProductImage = ({ asin }: { asin: string }) => {
    const [imageError, setImageError] = useState(false);
    const productImage = getImageByAsin(asin);
    
    if (imagesLoading) {
      return (
        <div className="w-16 h-16 rounded-lg border border-dashed border-border/30 flex items-center justify-center bg-muted/20 animate-pulse">
          <div className="w-3 h-3 bg-muted-foreground/30 rounded animate-spin border-2 border-transparent border-t-muted-foreground/30"></div>
        </div>
      );
    }
    
    if (!productImage || imageError) {
      return (
        <div className="w-16 h-16 rounded-lg border border-dashed border-border/30 flex items-center justify-center bg-gradient-to-br from-muted/20 to-muted/40">
          <div className="text-center">
            <Eye className="h-4 w-4 text-muted-foreground/50 mx-auto mb-0.5" />
            <div className="text-[10px] text-muted-foreground/70 font-medium">No Image</div>
          </div>
        </div>
      );
    }

    return (
      <Popover>
        <PopoverTrigger asChild>
          <div className="w-16 h-16 rounded-lg border border-border/30 overflow-hidden cursor-pointer hover:border-primary/50 hover:shadow-soft transition-all duration-300 bg-background/80 flex-shrink-0">
            <img 
              src={productImage.image_url} 
              alt={`Product ${asin}`}
              className="w-full h-full object-contain"
              onError={() => setImageError(true)}
            />
          </div>
        </PopoverTrigger>
        <PopoverContent side="left" className="w-80 p-3 bg-popover/95 backdrop-blur-sm border-border/50 shadow-strong">
          <div className="w-full h-64 rounded-xl overflow-hidden bg-background/50 border border-border/30">
            <img 
              src={productImage.image_url} 
              alt={`Product preview ${asin}`}
              className="w-full h-full object-contain"
            />
          </div>
          <div className="flex items-center justify-center gap-2 mt-3 p-2 bg-muted/30 rounded-lg">
            <div className="w-2 h-2 bg-primary rounded-full"></div>
            <span className="text-xs font-mono text-muted-foreground">ASIN: {asin}</span>
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  // SunskyMatchBadge component for displaying Sunsky catalog matches
  const SunskyMatchBadge = ({ orderItem }: { orderItem: OrderItem }) => {
    if (!orderItem.sunskyMatch) return null;
    
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className="text-xs bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 cursor-help"
          >
            <Package className="w-3 h-3 mr-1" />
            Sunsky Match
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-1 text-xs">
            <p className="font-semibold">Matched in Sunsky Catalog</p>
            <p className="text-muted-foreground">
              SKU: {orderItem.sunskyMatch.sku_code}
            </p>
            {orderItem.sunskyMatch.title && (
              <p className="text-muted-foreground truncate">
                {orderItem.sunskyMatch.title}
              </p>
            )}
            {orderItem.sunskyMatch.cost && (
              <p className="text-muted-foreground">
                Cost: ${orderItem.sunskyMatch.cost}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    );
  };

  // Match orders with Sunsky catalog
  const matchOrdersWithSunsky = async (orders: OrderItem[]) => {
    console.log(`🌞 Starting Sunsky catalog matching for ${orders.length} orders...`);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return orders;
    
    try {
      // Get all Sunsky SKUs for the user (batch loading to handle large datasets)
      let allSunskySKUs: any[] = [];
      let from = 0;
      const batchSize = 1000;
      let hasMore = true;
      
      while (hasMore) {
        const { data: batch, error } = await supabase
          .from('sunsky_skus')
          .select('sku_code, title, cost, product_data')
          .eq('user_id', user.id)
          .range(from, from + batchSize - 1);
        
        if (error) {
          console.error('Error fetching Sunsky SKUs:', error);
          break;
        }
        
        if (batch && batch.length > 0) {
          allSunskySKUs = [...allSunskySKUs, ...batch];
          hasMore = batch.length === batchSize;
          from += batchSize;
          console.log(`🌞 Loaded ${allSunskySKUs.length} Sunsky SKUs so far...`);
        } else {
          hasMore = false;
        }
      }
      
      console.log(`🌞 Total Sunsky SKUs loaded: ${allSunskySKUs.length}`);
      
      // Create lookup maps for fast matching
      const sunskyBySKU = new Map();
      const sunskyByASIN = new Map();
      
      allSunskySKUs.forEach(sku => {
        sunskyBySKU.set(sku.sku_code.toLowerCase(), sku);
        // Some Sunsky SKUs might also be stored as ASINs
        if (sku.product_data?.asin) {
          sunskyByASIN.set(sku.product_data.asin.toLowerCase(), sku);
        }
      });
      
      // Match each order
      const ordersWithSunskyMatches = orders.map(order => {
        let sunskyMatch = undefined;
        
        // Try to match by SKU first
        if (order.sku && order.sku.trim()) {
          sunskyMatch = sunskyBySKU.get(order.sku.toLowerCase().trim());
        }
        
        // If no SKU match, try ASIN
        if (!sunskyMatch && order.asin && order.asin.trim()) {
          sunskyMatch = sunskyByASIN.get(order.asin.toLowerCase().trim());
        }
        
        if (sunskyMatch) {
          console.log('🌞 Found Sunsky match:', {
            orderId: order.orderId,
            sku: order.sku,
            asin: order.asin,
            sunskySKU: sunskyMatch.sku_code,
            sunskyTitle: sunskyMatch.title?.substring(0, 50)
          });
        }
        
        return {
          ...order,
          sunskyMatch: sunskyMatch ? {
            sku_code: sunskyMatch.sku_code,
            title: sunskyMatch.title,
            cost: sunskyMatch.cost,
            product_data: sunskyMatch.product_data
          } : undefined
        };
      });
      
      const matchedCount = ordersWithSunskyMatches.filter(o => o.sunskyMatch).length;
      console.log(`🌞 Sunsky matching complete: ${matchedCount}/${orders.length} matches found`);
      
      return ordersWithSunskyMatches;
      
    } catch (error) {
      console.error('Error during Sunsky matching:', error);
      return orders;
    }
  };

  // Save all orders to database during file upload with duplicate prevention
  const saveOrdersToDatabase = async (orders: OrderItem[], fileName: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Check for existing order IDs to prevent duplicates
    const orderIds = orders.map(order => order.orderId).filter(id => id);
    const { data: existingOrders } = await supabase
      .from('order_imports')
      .select('order_id')
      .eq('user_id', user.id as any)
      .in('order_id', orderIds as any);

    const existingOrderIds = new Set(((existingOrders as any) || []).map((o: any) => 'order_id' in o ? o.order_id : null).filter(Boolean));
    
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
      .insert(orderRecords as any);
    
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

      // Match with Sunsky catalog first
      const ordersWithSunskyMatches = await matchOrdersWithSunsky(formattedOrders);
      
      setOrderData(ordersWithSunskyMatches);
      setAllOrders(ordersWithSunskyMatches);
      setFileName(file.name);
      
      // Save all orders to database first with duplicate prevention
      const saveResult = await saveOrdersToDatabase(ordersWithSunskyMatches, file.name);
      
      const matches = await matchOrdersWithInventory(ordersWithSunskyMatches);
      
      // Add Sunsky match indicator to matched items
      const matchesWithSunskySource = matches.map(match => ({
        ...match,
        sunskyMatchSource: match.orderItem.sunskyMatch ? 'catalog' as const : undefined
      }));
      
      setMatchedItems(matchesWithSunskySource);

      const matchedCount = matchesWithSunskySource.filter(m => m.inventoryMatch).length;
      const sunskyMatchedCount = ordersWithSunskyMatches.filter(o => o.sunskyMatch).length;
      
      // Show deduction dialog if there are matches
      if (matchedCount > 0) {
        setUploadedMatches(matchesWithSunskySource.filter(m => m.inventoryMatch));
        setActiveTab('pending'); // Auto-switch to pending tab
      }
      
      toast({
        title: "Orders Upload Complete",
        description: saveResult 
          ? `Added ${saveResult.newCount} new orders (${saveResult.duplicateCount} duplicates skipped). Found ${matchedCount} inventory matches and ${sunskyMatchedCount} Sunsky catalog matches.`
          : `Processed ${formattedOrders.length} orders. Found ${matchedCount} inventory matches and ${sunskyMatchedCount} Sunsky catalog matches.`
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
    console.log(`ASIN Inventory items: ${asinInventory.length}`);
    console.log(`SKU Inventory items: ${skuInventory.length}`);
    
    // Debug: Show first few inventory items
    if (asinInventory.length > 0) {
      console.log('Sample ASIN inventory items:', asinInventory.slice(0, 3).map(item => ({ 
        asin: item.asin, 
        sku: item.sku, 
        title: item.title?.substring(0, 50) 
      })));
    }
    if (skuInventory.length > 0) {
      console.log('Sample SKU inventory items:', skuInventory.slice(0, 3).map(item => ({ 
        skuNumber: item.skuNumber, 
        title: item.title?.substring(0, 50) 
      })));
    }
    
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
      
      // Debug: Log when we find a match
      if (inventoryMatch) {
        console.log('Found match:', {
          orderId: order.orderId,
          asin: order.asin,
          sku: order.sku,
          inventoryType,
          matchType,
          inventoryTitle: inventoryMatch.title?.substring(0, 50)
        });
      }
    }
    
    console.log(`Found ${matches.filter(m => m.inventoryMatch).length} matches out of ${matches.length} orders`);
    setMatchedItems(matches);
    console.log('Updated matchedItems state with', matches.length, 'items,', matches.filter(m => m.inventoryMatch).length, 'with matches');
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
          } as any);
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

      // Refresh processed orders from database (fetch all in batches)
      let allProcessed: any[] = [];
      let from = 0;
      const batchSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data } = await supabase
          .from('processed_orders')
          .select('*')
          .order('processed_at', { ascending: false })
          .range(from, from + batchSize - 1);

        if (data && data.length > 0) {
          allProcessed = [...allProcessed, ...data];
          from += batchSize;
          hasMore = data.length === batchSize;
        } else {
          hasMore = false;
        }
      }
      
      setDbResults(allProcessed);

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

  const processUploadedMatches = async () => {
    if (selectedMatchedItems.size === 0) {
      toast({
        title: "No Items Selected",
        description: "Please select orders to deduct from inventory.",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);
    setProcessingProgress(0);
    
    try {
      const itemsToProcess = uploadedMatches.filter(match => 
        selectedMatchedItems.has(match.orderItem.orderId)
      );
      
      const processed: ProcessedItem[] = [];
      const total = itemsToProcess.length;

      const { data: { user } } = await supabase.auth.getUser();
      
      for (let i = 0; i < itemsToProcess.length; i++) {
        const match = itemsToProcess[i];
        if (!match.inventoryMatch || !match.inventoryType) continue;
        
        const progress = Math.floor(((i + 1) / total) * 100);  
        setProcessingProgress(progress);
        
        const previousQuantity = match.inventoryMatch.quantity;
        const quantityChange = -match.orderItem.itemQuantity;
        const newQuantity = Math.max(0, previousQuantity + quantityChange);
        
        if (match.inventoryType === 'asin') {
          await updateAsinQuantity(match.inventoryMatch.id, newQuantity, `Order upload deduction: Removed ${Math.abs(quantityChange)} units`);
        } else {
          await updateSkuQuantity(match.inventoryMatch.id, newQuantity, `Order upload deduction: Removed ${Math.abs(quantityChange)} units`);
        }

        if (user) {
          // Get serial number from inventory match
          let serialNumber = 'N/A';
          if (match.inventoryType === 'asin') {
            serialNumber = (match.inventoryMatch as AsinInventoryItem).serialNumber;
          } else if (match.inventoryType === 'sku') {
            serialNumber = (match.inventoryMatch as SkuInventoryItem).binSerialNumber;
          }
          
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
            serial_number: serialNumber,
            processed_at: new Date().toISOString()
          } as any);
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
      setSelectedMatchedItems(new Set());
      setSelectAllMatched(false);
      setProcessingProgress(100);
      setShowDeductDialog(false);
      setUploadedMatches([]);

      // Fetch all processed orders in batches
      let allProcessed: any[] = [];
      let from = 0;
      const batchSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data } = await supabase
          .from('processed_orders')
          .select('*')
          .order('processed_at', { ascending: false })
          .range(from, from + batchSize - 1);

        if (data && data.length > 0) {
          allProcessed = [...allProcessed, ...data];
          from += batchSize;
          hasMore = data.length === batchSize;
        } else {
          hasMore = false;
        }
      }
      
      setDbResults(allProcessed);

      toast({
        title: "Stock Deducted",
        description: `Successfully deducted stock for ${processed.length} orders from inventory.`
      });
    } catch (error) {
      console.error('Error deducting stock:', error);
      toast({
        title: "Deduction Error",
        description: "Failed to deduct stock from inventory.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setTimeout(() => setProcessingProgress(0), 2000);
    }
  };

  const handleMatchedItemSelect = (orderId: string) => {
    setSelectedMatchedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const handleSelectAllUploadedMatches = () => {
    if (selectAllMatched) {
      setSelectedMatchedItems(new Set());
      setSelectAllMatched(false);
    } else {
      const allIds = new Set(uploadedMatches.map(match => match.orderItem.orderId));
      setSelectedMatchedItems(allIds);
      setSelectAllMatched(true);
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

  // Get matched orders (orders with inventory matches) with filters applied
  const matchedOrders = useMemo(() => {
    console.log('Computing matchedOrders:', {
      matchedItemsCount: matchedItems.length,
      matchedItemsWithInventory: matchedItems.filter(m => m.inventoryMatch).length,
      filters: {
        matchedSearchTerm,
        matchedOrderDateFilter,
        matchedUploadDateFilter,
        matchedOrderStatusFilter,
        matchedInventoryTypeFilter,
        matchedMatchTypeFilter
      }
    });
    
    let matched = matchedItems
      .filter(m => m.inventoryMatch)
      .map(m => ({ ...m.orderItem, matchedItem: m })); // Include match details
    
    console.log('After basic filter - matched count:', matched.length);
      
    // Apply search filter
    if (matchedSearchTerm) {
      const searchLower = matchedSearchTerm.toLowerCase();
      matched = matched.filter(order => 
        order.orderId.toLowerCase().includes(searchLower) ||
        order.asin?.toLowerCase().includes(searchLower) ||
        order.sku?.toLowerCase().includes(searchLower) ||
        order.itemTitle?.toLowerCase().includes(searchLower) ||
        order.orderStatus?.toLowerCase().includes(searchLower)
      );
      console.log('After search filter - matched count:', matched.length);
    }
      
    // Apply matched orders filters
    if (matchedOrderDateFilter) {
      matched = matched.filter(order => {
        const orderDate = order.orderPlaceDate ? new Date(order.orderPlaceDate).toISOString().split('T')[0] : '';
        return orderDate === matchedOrderDateFilter;
      });
      console.log('After date filter - matched count:', matched.length);
    }
    
    if (matchedUploadDateFilter) {
      matched = matched.filter(order => {
        const uploadDate = order.uploadDate || '';
        return uploadDate === matchedUploadDateFilter;
      });
      console.log('After upload date filter - matched count:', matched.length);
    }
    
    if (matchedOrderStatusFilter && matchedOrderStatusFilter !== 'all') {
      matched = matched.filter(order => 
        order.orderStatus?.toLowerCase().includes(matchedOrderStatusFilter.toLowerCase())
      );
      console.log('After status filter - matched count:', matched.length);
    }
    
    if (matchedInventoryTypeFilter && matchedInventoryTypeFilter !== 'all') {
      matched = matched.filter(order => 
        order.matchedItem?.inventoryType === matchedInventoryTypeFilter
      );
      console.log('After inventory type filter - matched count:', matched.length);
    }
    
    if (matchedMatchTypeFilter && matchedMatchTypeFilter !== 'all') {
      matched = matched.filter(order => 
        order.matchedItem?.matchType === matchedMatchTypeFilter
      );
      console.log('After match type filter - matched count:', matched.length);
    }
    
    // Sort by order place date, then by order ID
    const result = matched.sort((a, b) => {
      const dateA = new Date(a.orderPlaceDate || '1970-01-01');
      const dateB = new Date(b.orderPlaceDate || '1970-01-01');
      if (dateA.getTime() !== dateB.getTime()) {
        return dateB.getTime() - dateA.getTime(); // Newest first
      }
      return a.orderId.localeCompare(b.orderId);
    });
    
    console.log('Final matched orders count:', result.length);
    return result;
  }, [matchedItems, matchedOrderDateFilter, matchedUploadDateFilter, matchedOrderStatusFilter, matchedSearchTerm, matchedInventoryTypeFilter, matchedMatchTypeFilter]);

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

  // Matched orders pagination
  const matchedTotalPages = Math.ceil(matchedOrders.length / matchedItemsPerPage);
  const matchedStartIndex = (matchedCurrentPage - 1) * matchedItemsPerPage;
  const paginatedMatchedOrders = matchedOrders.slice(matchedStartIndex, matchedStartIndex + matchedItemsPerPage);
  
  // Clear matched orders filters
  const clearMatchedFilters = () => {
    setMatchedSearchTerm('');
    setMatchedOrderDateFilter('');
    setMatchedUploadDateFilter('');
    setMatchedOrderStatusFilter('all');
    setMatchedInventoryTypeFilter('all');
    setMatchedMatchTypeFilter('all');
    setMatchedCurrentPage(1);
  };

  const analytics = useMemo(() => {
    const latestOrderDate = allOrders.length > 0 
      ? allOrders.reduce((latest, order) => {
          const orderDate = new Date(order.orderPlaceDate);
          const latestDate = new Date(latest);
          return orderDate > latestDate ? order.orderPlaceDate : latest;
        }, allOrders[0].orderPlaceDate)
      : '';
    
    const sunskyMatchedOrders = allOrders.filter(order => order.sunskyMatch).length;
    
    return {
      totalOrders: allOrders.length,
      matchedOrdersCount: matchedOrders.length,
      unmatchedOrdersCount: unmatchedOrders.length,
      processedOrdersCount: processedOrders.length,
      totalValue: allOrders.reduce((sum, order) => sum + (parseFloat(order.itemCost) || 0), 0),
      latestOrderDate: latestOrderDate ? new Date(latestOrderDate).toLocaleDateString() : '',
      sunskyMatchedOrders
    };
  }, [allOrders, matchedOrders, unmatchedOrders, processedOrders]);

  // Filter processed orders
  const filteredProcessedOrders = useMemo(() => {
    if (!processedSearchTerm) return processedOrders;
    
    const searchLower = processedSearchTerm.toLowerCase();
    return processedOrders.filter((order: any) => 
      order.order_number?.toLowerCase().includes(searchLower) ||
      order.asin?.toLowerCase().includes(searchLower) ||
      order.sku?.toLowerCase().includes(searchLower) ||
      order.item_title?.toLowerCase().includes(searchLower)
    );
  }, [processedOrders, processedSearchTerm]);

  // Get active filter chips
  const getActiveFilterChips = () => {
    const chips: { label: string; value: string; onRemove: () => void }[] = [];
    if (allOrdersSearchTerm) chips.push({ label: 'Search', value: allOrdersSearchTerm, onRemove: () => setAllOrdersSearchTerm('') });
    if (orderDateFilter) chips.push({ label: 'Order Date', value: orderDateFilter, onRemove: () => setOrderDateFilter('') });
    if (uploadDateFilter) chips.push({ label: 'Upload Date', value: uploadDateFilter, onRemove: () => setUploadDateFilter('') });
    if (orderStatusFilter !== 'all') chips.push({ label: 'Status', value: orderStatusFilter, onRemove: () => setOrderStatusFilter('all') });
    return chips;
  };

  const getMatchedFilterChips = () => {
    const chips: { label: string; value: string; onRemove: () => void }[] = [];
    if (matchedSearchTerm) chips.push({ label: 'Search', value: matchedSearchTerm, onRemove: () => setMatchedSearchTerm('') });
    if (matchedOrderDateFilter) chips.push({ label: 'Order Date', value: matchedOrderDateFilter, onRemove: () => setMatchedOrderDateFilter('') });
    if (matchedUploadDateFilter) chips.push({ label: 'Upload Date', value: matchedUploadDateFilter, onRemove: () => setMatchedUploadDateFilter('') });
    if (matchedOrderStatusFilter !== 'all') chips.push({ label: 'Order Status', value: matchedOrderStatusFilter, onRemove: () => setMatchedOrderStatusFilter('all') });
    if (matchedInventoryTypeFilter !== 'all') chips.push({ label: 'Inventory Type', value: matchedInventoryTypeFilter, onRemove: () => setMatchedInventoryTypeFilter('all') });
    if (matchedMatchTypeFilter !== 'all') chips.push({ label: 'Match Type', value: matchedMatchTypeFilter, onRemove: () => setMatchedMatchTypeFilter('all') });
    return chips;
  };

  // Handle sorting
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Apply sorting to orders
  const sortOrders = <T extends OrderItem>(orders: T[]): T[] => {
    if (!sortColumn) return orders;

    return [...orders].sort((a, b) => {
      let aVal: any = a[sortColumn as keyof T];
      let bVal: any = b[sortColumn as keyof T];

      // Handle special cases
      if (sortColumn === 'orderPlaceDate' || sortColumn === 'uploadDate') {
        aVal = new Date(aVal || 0).getTime();
        bVal = new Date(bVal || 0).getTime();
      } else if (sortColumn === 'itemQuantity') {
        aVal = Number(aVal) || 0;
        bVal = Number(bVal) || 0;
      } else {
        aVal = String(aVal || '').toLowerCase();
        bVal = String(bVal || '').toLowerCase();
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  };

  return (
    <div className="space-y-6">
      {/* Analytics Dashboard */}
      <TooltipProvider>
        <AnalyticsDashboard
          totalOrders={analytics.totalOrders}
          matchedOrdersCount={analytics.matchedOrdersCount}
          unmatchedOrdersCount={analytics.unmatchedOrdersCount}
          processedOrdersCount={analytics.processedOrdersCount}
          pendingDeductionCount={uploadedMatches.length}
          currentStep={activeTab as 'upload' | 'pending' | 'matched' | 'processed'}
          latestOrderDate={analytics.latestOrderDate}
          sunskyMatchedCount={analytics.sunskyMatchedOrders}
        />
      </TooltipProvider>

      {/* Enhanced Card with Primary Theme */}
      <Card className="border-primary/20 shadow-glow/10 bg-card/95 backdrop-blur-sm">
        <div className="p-6 space-y-6">
          {/* Enhanced Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5 bg-muted/50 p-1 rounded-lg">
              <TabsTrigger 
                value="upload"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm font-medium transition-all duration-300"
              >
                <FileUp className="w-4 h-4 mr-2" />
                Upload
              </TabsTrigger>
              <TabsTrigger 
                value="pending"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm font-medium transition-all duration-300 relative"
                disabled={uploadedMatches.length === 0}
              >
                <Zap className="w-4 h-4 mr-2" />
                Pending ({uploadedMatches.length})
                {uploadedMatches.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-warning rounded-full animate-pulse" />
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="all-orders"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm font-medium transition-all duration-300"
              >
                <Clock className="w-4 h-4 mr-2" />
                All ({filteredAllOrders.length})
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

            <TabsContent value="upload" className="space-y-4">
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
                 
                 {/* Filter Chips */}
                 <FilterChips filters={getActiveFilterChips()} onClearAll={clearFilters} />

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

            {/* Pending Deduction Tab - New intermediate step */}
            <TabsContent value="pending" className="space-y-4">
              {uploadedMatches.length > 0 ? (
                <>
                  {/* Action Prompt Card */}
                  <Card className="p-4 bg-gradient-to-r from-warning/10 via-warning/5 to-card border-warning/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-warning/20">
                          <Zap className="w-5 h-5 text-warning" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-foreground">Ready for Stock Deduction</h4>
                          <p className="text-sm text-muted-foreground">
                            {selectedMatchedItems.size} of {uploadedMatches.length} items selected
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={processUploadedMatches}
                        disabled={selectedMatchedItems.size === 0 || loading}
                        className="gap-2 bg-gradient-primary hover:shadow-glow/30"
                      >
                        <Zap className="w-4 h-4" />
                        Deduct Stock ({selectedMatchedItems.size})
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>

                  {/* Progress indicator */}
                  {(loading || processingProgress > 0) && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Deducting stock from inventory...</span>
                        <span>{processingProgress}%</span>
                      </div>
                      <Progress value={processingProgress} className="w-full" />
                    </div>
                  )}

                  {/* Pending Items Table with Enhanced UI */}
                  <div>
                    <BulkActionsToolbar
                      selectedCount={selectedMatchedItems.size}
                      onProcessSelected={processUploadedMatches}
                      onClearSelection={() => {
                        setSelectedMatchedItems(new Set());
                        setSelectAllMatched(false);
                      }}
                      isProcessing={loading}
                    />

                    <div className="border border-primary/20 rounded-lg overflow-hidden shadow-soft bg-card">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader className="bg-gradient-to-r from-muted/80 to-muted/60 sticky top-0 z-10 border-b-2 border-primary/20">
                            <TableRow className="hover:bg-transparent">
                              <TableHead className="w-12 font-semibold">
                                <Checkbox
                                  checked={selectAllMatched}
                                  onCheckedChange={handleSelectAllUploadedMatches}
                                  className="border-2"
                                />
                              </TableHead>
                              <TableHead className="font-semibold text-foreground">Serial #</TableHead>
                              <TableHead className="font-semibold text-foreground w-20">Image</TableHead>
                              <TableHead className="font-semibold text-foreground">Order ID</TableHead>
                              <TableHead className="min-w-[300px] font-semibold text-foreground">Product Details</TableHead>
                              <TableHead className="font-semibold text-foreground">Qty</TableHead>
                              <TableHead className="font-semibold text-foreground">Current</TableHead>
                              <TableHead className="font-semibold text-foreground">After</TableHead>
                              <TableHead className="font-semibold text-foreground">Match</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {uploadedMatches.map((match, index) => {
                              const isSelected = selectedMatchedItems.has(match.orderItem.orderId);
                              let inventorySerialNumber = 'N/A';
                              
                              if (match.inventoryMatch) {
                                if (match.inventoryType === 'asin') {
                                  inventorySerialNumber = (match.inventoryMatch as AsinInventoryItem).serialNumber;
                                } else if (match.inventoryType === 'sku') {
                                  inventorySerialNumber = (match.inventoryMatch as SkuInventoryItem).binSerialNumber;
                                }
                              }

                              const currentStock = match.inventoryMatch?.quantity || 0;
                              const afterDeduction = Math.max(0, currentStock - match.orderItem.itemQuantity);
                              const rowClass = viewMode === 'compact' ? 'h-10' : 'h-14';
                              
                              return (
                                <TableRow 
                                  key={`pending-${match.orderItem.orderId}-${index}`}
                                  className={`
                                    ${rowClass}
                                    ${index % 2 === 0 ? 'bg-background' : 'bg-muted/20'}
                                    ${isSelected ? 'bg-primary/10 hover:bg-primary/15 border-l-4 border-l-primary' : 'hover:bg-muted/40'}
                                    ${afterDeduction === 0 ? 'border-r-4 border-r-warning' : ''}
                                    transition-all duration-150 cursor-pointer
                                  `}
                                  onClick={() => handleMatchedItemSelect(match.orderItem.orderId)}
                                >
                                  <TableCell onClick={(e) => e.stopPropagation()}>
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={() => handleMatchedItemSelect(match.orderItem.orderId)}
                                    />
                                  </TableCell>
                                  <TableCell className="text-xs font-mono text-muted-foreground font-medium">
                                    {inventorySerialNumber}
                                  </TableCell>
                                  <TableCell>
                                    <ProductImage asin={match.orderItem.asin} />
                                  </TableCell>
                                  <TableCell className="font-mono text-xs font-semibold">{match.orderItem.orderId}</TableCell>
                                  <TableCell>
                                    <div className="space-y-1.5 max-w-md">
                                      <div className="font-medium text-sm text-foreground truncate">
                                        {match.orderItem.itemTitle}
                                      </div>
                                      <div className="flex flex-wrap gap-1">
                                        {match.orderItem.asin && (
                                          <Badge variant="outline" className="text-xs bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20">
                                            ASIN: {match.orderItem.asin}
                                          </Badge>
                                        )}
                                        {match.orderItem.sku && (
                                          <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                                            SKU: {match.orderItem.sku}
                                          </Badge>
                                        )}
                                        <SunskyMatchBadge orderItem={match.orderItem} />
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="font-semibold">
                                      {match.orderItem.itemQuantity}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="secondary" className="font-semibold">
                                      {currentStock}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Badge 
                                      variant={afterDeduction === 0 ? 'destructive' : 'default'}
                                      className="font-semibold gap-1"
                                    >
                                      {afterDeduction}
                                      {afterDeduction === 0 && (
                                        <AlertTriangle className="w-3 h-3" />
                                      )}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-1">
                                      <Badge variant="outline" className="text-xs font-medium">
                                        {match.matchType?.toUpperCase()}
                                      </Badge>
                                      <Badge 
                                        variant="secondary" 
                                        className={`text-xs font-medium ${
                                          match.inventoryType === 'asin' ? 'bg-sky/10 text-sky' : 'bg-emerald/10 text-emerald'
                                        }`}
                                      >
                                        {match.inventoryType}
                                      </Badge>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Zap className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <h4 className="text-lg font-semibold mb-2">No Pending Orders</h4>
                  <p className="text-sm">Upload orders in the "Upload" tab to see them here for bulk deduction.</p>
                </div>
              )}
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

              {/* Filter Chips */}
              <FilterChips filters={getActiveFilterChips()} onClearAll={clearFilters} />

              {allOrders.length > 0 ? (
                <div className="space-y-4">
                  {/* Table Controls */}
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Showing {sortOrders(filteredAllOrders).length} orders
                    </div>
                    <TableViewToggle view={viewMode} onViewChange={setViewMode} />
                  </div>

                  {/* Enhanced Table */}
                  <div className="border border-primary/20 rounded-lg overflow-hidden shadow-soft bg-card">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader className="bg-gradient-to-r from-muted/80 to-muted/60 sticky top-0 z-10 border-b-2 border-primary/20">
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="font-semibold text-foreground">Serial #</TableHead>
                            <TableHead className="font-semibold text-foreground w-20">Image</TableHead>
                            <SortableTableHeader
                              label="Order ID"
                              sortKey="orderId"
                              currentSort={sortColumn}
                              currentDirection={sortDirection}
                              onSort={handleSort}
                            />
                            <SortableTableHeader
                              label="Order Date"
                              sortKey="orderPlaceDate"
                              currentSort={sortColumn}
                              currentDirection={sortDirection}
                              onSort={handleSort}
                            />
                            <TableHead className="min-w-[300px] font-semibold text-foreground">Product Details</TableHead>
                            <SortableTableHeader
                              label="Quantity"
                              sortKey="itemQuantity"
                              currentSort={sortColumn}
                              currentDirection={sortDirection}
                              onSort={handleSort}
                            />
                            <SortableTableHeader
                              label="Status"
                              sortKey="orderStatus"
                              currentSort={sortColumn}
                              currentDirection={sortDirection}
                              onSort={handleSort}
                            />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sortOrders(filteredAllOrders)
                            .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                            .map((order, index) => {
                              const matchedItem = matchedItems.find(m => m.orderItem.orderId === order.orderId);
                              let inventorySerialNumber = 'N/A';
                              
                              if (matchedItem?.inventoryMatch) {
                                if (matchedItem.inventoryType === 'asin') {
                                  inventorySerialNumber = (matchedItem.inventoryMatch as AsinInventoryItem).serialNumber;
                                } else if (matchedItem.inventoryType === 'sku') {
                                  inventorySerialNumber = (matchedItem.inventoryMatch as SkuInventoryItem).binSerialNumber;
                                }
                              }

                              const rowClass = viewMode === 'compact' ? 'h-10' : 'h-14';
                              const globalIndex = (currentPage - 1) * itemsPerPage + index;
                              
                              return (
                                <TableRow 
                                  key={`${order.orderId}-${index}`}
                                  className={`
                                    ${rowClass}
                                    ${globalIndex % 2 === 0 ? 'bg-background' : 'bg-muted/20'}
                                    hover:bg-primary/5 hover:shadow-sm transition-all duration-150
                                  `}
                                >
                                  <TableCell className="text-xs font-mono text-muted-foreground font-medium">
                                    {inventorySerialNumber}
                                  </TableCell>
                                  <TableCell>
                                    <ProductImage asin={order.asin} />
                                  </TableCell>
                                  <TableCell className="font-mono text-xs font-semibold">{order.orderId}</TableCell>
                                  <TableCell className="text-xs">
                                    {order.orderPlaceDate ? (
                                      <div className="text-muted-foreground font-medium">
                                        {new Date(order.orderPlaceDate).toLocaleDateString()}
                                      </div>
                                    ) : (
                                      <span className="text-muted-foreground">N/A</span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <div className="space-y-1.5 max-w-md">
                                      <div className="font-medium text-sm text-foreground truncate">
                                        {order.itemTitle}
                                      </div>
                                      <div className="flex flex-wrap gap-1">
                                        {order.asin && (
                                          <Badge variant="outline" className="text-xs bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20">
                                            ASIN: {order.asin}
                                          </Badge>
                                        )}
                                        {order.sku && (
                                          <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                                            SKU: {order.sku}
                                          </Badge>
                                        )}
                                        <SunskyMatchBadge orderItem={order} />
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="font-semibold">
                                      {order.itemQuantity}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="secondary" className="font-semibold">
                                      {order.orderStatus}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                        </TableBody>
                      </Table>
                    </div>
                    
                    <TablePagination
                      currentPage={currentPage}
                      totalItems={sortOrders(filteredAllOrders).length}
                      itemsPerPage={itemsPerPage}
                      onPageChange={setCurrentPage}
                      onItemsPerPageChange={setItemsPerPage}
                    />
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No orders uploaded yet.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="matched-orders" className="space-y-4">
              {/* Enhanced Search and Filter Section for Matched Orders */}
              <Card className="p-4 bg-gradient-to-r from-primary/5 via-card to-accent/5 border-primary/20">
                <div className="flex items-center gap-2 mb-4">
                  <Search className="w-4 h-4 text-primary" />
                  <h4 className="font-semibold text-foreground">Search & Filter Matched Orders</h4>
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {matchedOrders.length} matched orders
                  </Badge>
                </div>
                
                {/* Search Bar */}
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by Order ID, ASIN, SKU, Title, or Status..."
                      value={matchedSearchTerm}
                      onChange={(e) => setMatchedSearchTerm(e.target.value)}
                      className="pl-10 bg-background/80 border-primary/20 focus:border-primary"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      Order Date
                    </Label>
                    <Input 
                      type="date" 
                      value={matchedOrderDateFilter}
                      onChange={(e) => setMatchedOrderDateFilter(e.target.value)}
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
                      value={matchedUploadDateFilter}
                      onChange={(e) => setMatchedUploadDateFilter(e.target.value)}
                      className="bg-background/80 border-primary/20 focus:border-primary"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Tag className="w-3 h-3" />
                      Order Status
                    </Label>
                    <Select value={matchedOrderStatusFilter} onValueChange={setMatchedOrderStatusFilter}>
                      <SelectTrigger className="bg-background/80 border-primary/20 focus:border-primary">
                        <SelectValue placeholder="All Statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        {uniqueStatuses.map(status => (
                          <SelectItem key={status} value={status}>{status}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Package className="w-3 h-3" />
                      Inventory Type
                    </Label>
                    <Select value={matchedInventoryTypeFilter} onValueChange={setMatchedInventoryTypeFilter}>
                      <SelectTrigger className="bg-background/80 border-primary/20 focus:border-primary">
                        <SelectValue placeholder="All Types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="asin">ASIN Inventory</SelectItem>
                        <SelectItem value="sku">SKU Inventory</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Tag className="w-3 h-3" />
                      Match Type
                    </Label>
                    <Select value={matchedMatchTypeFilter} onValueChange={setMatchedMatchTypeFilter}>
                      <SelectTrigger className="bg-background/80 border-primary/20 focus:border-primary">
                        <SelectValue placeholder="All Matches" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Matches</SelectItem>
                        <SelectItem value="asin">Matched by ASIN</SelectItem>
                        <SelectItem value="sku">Matched by SKU</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {(matchedSearchTerm || matchedOrderDateFilter || matchedUploadDateFilter || matchedOrderStatusFilter !== 'all' || matchedInventoryTypeFilter !== 'all' || matchedMatchTypeFilter !== 'all') && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      Showing {paginatedMatchedOrders.length} of {matchedOrders.length} matched orders
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={clearMatchedFilters}
                      className="text-xs border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground"
                    >
                      <Minus className="w-4 h-4 mr-2" />
                      Clear All Filters
                    </Button>
                   </div>
                 )}
                 
                 {/* Filter Chips */}
                 <FilterChips filters={getMatchedFilterChips()} onClearAll={clearMatchedFilters} />
               </Card>

              {matchedOrders.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-muted-foreground">
                      Showing {paginatedMatchedOrders.length} of {matchedOrders.length} matched orders
                    </div>
                    <TableViewToggle view={viewMode} onViewChange={setViewMode} />
                  </div>

                  <div className="border border-primary/20 rounded-lg overflow-hidden shadow-soft bg-card">
            <Table>
              <TableHeader className="bg-gradient-to-r from-muted/80 to-muted/60 sticky top-0 z-10 border-b-2 border-primary/20">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-semibold text-foreground w-20">Image</TableHead>
                  <SortableTableHeader
                    label="Order ID"
                    sortKey="orderId"
                    currentSort={sortColumn}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                    className="font-semibold text-foreground"
                  />
                  <TableHead className="min-w-[300px] font-semibold text-foreground">Product Details</TableHead>
                  <SortableTableHeader
                    label="Order Qty"
                    sortKey="itemQuantity"
                    currentSort={sortColumn}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                    className="font-semibold text-foreground"
                  />
                  <SortableTableHeader
                    label="Order Date"
                    sortKey="orderPlaceDate"
                    currentSort={sortColumn}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                    className="font-semibold text-foreground"
                  />
                  <TableHead className="font-semibold text-foreground">Matched With</TableHead>
                  <TableHead className="font-semibold text-foreground">Available Stock</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortOrders(paginatedMatchedOrders).map((order, index) => {
                  const matchedItem = order.matchedItem;
                  let availableStock = 0;
                  
                  if (matchedItem?.inventoryMatch) {
                    availableStock = matchedItem.inventoryMatch.quantity;
                  }
                  
                  return (
                    <TableRow 
                      key={`${order.orderId}-${index}`}
                      className={`
                        ${viewMode === 'compact' ? 'h-10' : 'h-14'}
                        ${index % 2 === 0 ? 'bg-background' : 'bg-muted/20'}
                        hover:bg-primary/5 hover:shadow-sm transition-all duration-150
                      `}
                    >
                      <TableCell className="font-mono text-xs">{order.orderId}</TableCell>
                      <TableCell>
                        <ProductImage asin={order.asin} />
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1.5 max-w-md">
                          <div className="font-medium text-sm text-foreground truncate">
                            {order.itemTitle}
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {order.asin && (
                              <Badge variant="outline" className="text-xs bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20">
                                ASIN: {order.asin}
                              </Badge>
                            )}
                            {order.sku && (
                              <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                                SKU: {order.sku}
                              </Badge>
                            )}
                            <SunskyMatchBadge orderItem={order} />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">{order.itemQuantity}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {order.orderPlaceDate ? new Date(order.orderPlaceDate).toLocaleDateString() : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20">
                          {matchedItem?.matchType?.toUpperCase() || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={availableStock >= order.itemQuantity ? 'default' : 'destructive'}
                          className={`text-xs ${
                            availableStock >= order.itemQuantity
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                              : ''
                          }`}
                        >
                          {availableStock}
                        </Badge>
                        {availableStock < order.itemQuantity && (
                          <div className="text-xs text-destructive mt-1">
                            Insufficient!
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <TablePagination
            currentPage={matchedCurrentPage}
            totalItems={matchedOrders.length}
            itemsPerPage={matchedItemsPerPage}
            onPageChange={setMatchedCurrentPage}
            onItemsPerPageChange={(value) => {
              setMatchedCurrentPage(1);
            }}
          />
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>{matchedItems.length === 0 ? 'No matched orders yet.' : 'No orders match the current filters.'}</p>
                  {matchedItems.length > 0 && (
                    <Button 
                      variant="outline" 
                      onClick={clearMatchedFilters}
                      className="mt-2 text-xs"
                    >
                      Clear Filters
                    </Button>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="processed" className="space-y-4">
              {/* Search Bar for Processed Orders */}
              <Card className="p-4 bg-gradient-to-r from-primary/5 via-card to-accent/5 border-primary/20">
                <div className="flex items-center gap-2 mb-4">
                  <Search className="w-4 h-4 text-primary" />
                  <h4 className="font-semibold text-foreground">Search Processed Orders</h4>
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {filteredProcessedOrders.length} results
                  </Badge>
                </div>
                
                <SearchBar
                  value={processedSearchTerm}
                  onChange={setProcessedSearchTerm}
                  placeholder="Search by Order Number, ASIN, SKU, or Title..."
                />
              </Card>

              {filteredProcessedOrders.length > 0 ? (
                <div className="space-y-4">
                  {/* Table Controls */}
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Showing {filteredProcessedOrders.length} processed orders
                    </div>
                    <TableViewToggle view={viewMode} onViewChange={setViewMode} />
                  </div>

                  {/* Enhanced Table */}
                  <div className="border border-primary/20 rounded-lg overflow-hidden shadow-soft bg-card">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader className="bg-gradient-to-r from-muted/80 to-muted/60 sticky top-0 z-10 border-b-2 border-primary/20">
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="font-semibold text-foreground">Serial #</TableHead>
                            <TableHead className="font-semibold text-foreground w-20">Image</TableHead>
                            <TableHead className="font-semibold text-foreground">Order Number</TableHead>
                            <TableHead className="min-w-[300px] font-semibold text-foreground">Product Details</TableHead>
                            <TableHead className="font-semibold text-foreground">Qty Processed</TableHead>
                            <TableHead className="font-semibold text-foreground">Stock Change</TableHead>
                            <TableHead className="font-semibold text-foreground">Processed At</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredProcessedOrders
                            .slice(0, itemsPerPage)
                            .map((order, index) => {
                              // Get serial number from processed order record
                              let inventorySerialNumber = order.serial_number || 'N/A';
                              
                              // Fallback: Find inventory item by inventory_id if serial_number not stored
                              if (inventorySerialNumber === 'N/A' && order.inventory_id) {
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

                              const rowClass = viewMode === 'compact' ? 'h-10' : 'h-14';
                              
                              return (
                                <TableRow 
                                  key={`${order.order_number}-${index}`}
                                  className={`
                                    ${rowClass}
                                    ${index % 2 === 0 ? 'bg-background' : 'bg-muted/20'}
                                    hover:bg-primary/5 hover:shadow-sm transition-all duration-150
                                  `}
                                >
                                  <TableCell className="text-xs font-mono text-muted-foreground font-medium">
                                    {inventorySerialNumber}
                                  </TableCell>
                                  <TableCell>
                                    <ProductImage asin={order.asin} />
                                  </TableCell>
                                  <TableCell className="font-mono text-xs font-semibold">{order.order_number}</TableCell>
                                  <TableCell>
                                    <div className="space-y-1.5 max-w-md">
                                      <div className="font-medium text-sm text-foreground truncate">
                                        {order.item_title}
                                      </div>
                                      <div className="flex flex-wrap gap-1">
                                        {order.asin && (
                                          <Badge variant="outline" className="text-xs bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20">
                                            ASIN: {order.asin}
                                          </Badge>
                                        )}
                                        {order.sku && (
                                          <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                                            SKU: {order.sku}
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <span className="font-bold text-lg tabular-nums">
                                      {order.quantity_processed}
                                    </span>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-lg tabular-nums text-gray-600 dark:text-gray-400">
                                        {order.previous_stock}
                                      </span>
                                      <span className="text-muted-foreground">→</span>
                                      <span className="font-bold text-lg tabular-nums text-success">
                                        {order.new_stock}
                                      </span>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="space-y-1">
                                      <div className="text-xs font-medium">
                                        {new Date(order.processed_at).toLocaleString()}
                                      </div>
                                      <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/30">
                                        <CheckSquare className="w-3 h-3 mr-1" />
                                        Completed
                                      </Badge>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                        </TableBody>
                      </Table>
                    </div>
                    
                    {filteredProcessedOrders.length > itemsPerPage && (
                      <div className="p-3 text-center text-sm text-muted-foreground border-t bg-muted/20">
                        Showing first {itemsPerPage} records out of {filteredProcessedOrders.length} total
                      </div>
                    )}
                  </div>
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