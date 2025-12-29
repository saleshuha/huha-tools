import { useState, useMemo, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from './ui/tooltip';
import { Download, Package, Eye, RefreshCw } from 'lucide-react';
import { OrderDashboard } from './order-processing/OrderDashboard';
import { UploadButton } from './order-processing/UploadButton';
import { PendingReviewCard } from './order-processing/PendingReviewCard';
import { UnifiedOrderTable } from './order-processing/UnifiedOrderTable';
import { LiveApiCheckProgress } from './order-processing/LiveApiCheckProgress';
import { LiveSunskyCheckDialog } from './order-processing/LiveSunskyCheckDialog';
import { useAsinInventory, AsinInventoryItem } from '@/hooks/useAsinInventory';
import { useSkuInventory, SkuInventoryItem } from '@/hooks/useSkuInventory';
import { useToast } from '@/hooks/use-toast';
import { useProductImages } from '@/hooks/useProductImages';
import { useSunskyCredentials } from '@/hooks/useSunskyCredentials';
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
}

export function OrderProcessorNew() {
  const [allOrders, setAllOrders] = useState<OrderItem[]>([]);
  const [matchedItems, setMatchedItems] = useState<MatchedItem[]>([]);
  const [pendingItems, setPendingItems] = useState<MatchedItem[]>([]);
  const [processedOrders, setProcessedOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [selectedPendingItems, setSelectedPendingItems] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'all' | 'matched' | 'unmatched' | 'processed'>('all');
  const [currentStep, setCurrentStep] = useState<'upload' | 'pending' | 'matched' | 'processed'>('upload');
  const [apiCheckProgress, setApiCheckProgress] = useState({ current: 0, total: 0, checking: false });
  const [liveApiCheckResults, setLiveApiCheckResults] = useState<any>({ totalChecked: 0, foundInSunsky: 0, notFoundInSunsky: 0, apiErrors: 0, matchDetails: [] });
  const [showLiveCheckDialog, setShowLiveCheckDialog] = useState(false);

  const { inventory: asinInventory, updateQuantity: updateAsinQuantity } = useAsinInventory();
  const { inventory: skuInventory, updateQuantity: updateSkuQuantity } = useSkuInventory();
  const { getImageByAsin, isLoading: imagesLoading } = useProductImages();
  const { toast } = useToast();
  const { credentials } = useSunskyCredentials();

  // Load orders from database
  useEffect(() => {
    loadAllOrders();
    loadProcessedOrders();
  }, []);

  // Re-match when inventory loads
  useEffect(() => {
    if (allOrders.length > 0 && (asinInventory.length > 0 || skuInventory.length > 0)) {
      matchOrdersWithInventory(allOrders);
    }
  }, [allOrders, asinInventory, skuInventory]);

  const loadAllOrders = async () => {
    setLoading(true);
    let allData: any[] = [];
    let from = 0;
    const batchSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('order_imports')
        .select('*')
        .order('order_place_date', { ascending: false })
        .range(from, from + batchSize - 1);

      if (error || !data || data.length === 0) {
        hasMore = false;
      } else {
        allData = [...allData, ...data];
        from += batchSize;
        hasMore = data.length === batchSize;
      }
    }

    const formattedOrders: OrderItem[] = allData.map((order: any) => ({
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

    setAllOrders(formattedOrders);
    setLoading(false);
  };

  const loadProcessedOrders = async () => {
    const { data } = await supabase
      .from('processed_orders')
      .select('*')
      .order('processed_at', { ascending: false });
    setProcessedOrders(data || []);
  };

  const matchOrdersWithInventory = async (orders: OrderItem[]) => {
    const matches: MatchedItem[] = [];

    for (const order of orders) {
      let inventoryMatch: AsinInventoryItem | SkuInventoryItem | undefined;
      let inventoryType: 'asin' | 'sku' | undefined;
      let matchType: 'asin' | 'sku' | undefined;

      if (order.asin?.trim()) {
        const asinMatch = asinInventory.find(item => item.asin.toLowerCase() === order.asin.toLowerCase().trim());
        if (asinMatch) {
          inventoryMatch = asinMatch;
          inventoryType = 'asin';
          matchType = 'asin';
        }
      }

      if (!inventoryMatch && order.sku?.trim()) {
        const asinSkuMatch = asinInventory.find(item => item.sku?.toLowerCase() === order.sku.toLowerCase().trim());
        if (asinSkuMatch) {
          inventoryMatch = asinSkuMatch;
          inventoryType = 'asin';
          matchType = 'sku';
        }
      }

      if (!inventoryMatch && order.sku?.trim()) {
        const skuMatch = skuInventory.find(item => item.skuNumber.toLowerCase() === order.sku.toLowerCase().trim());
        if (skuMatch) {
          inventoryMatch = skuMatch;
          inventoryType = 'sku';
          matchType = 'sku';
        }
      }

      matches.push({ orderItem: order, inventoryMatch, inventoryType, matchType });
    }

    setMatchedItems(matches);
    return matches;
  };

  const handleFileUpload = async (file: File) => {
    setLoading(true);
    setUploadProgress(10);

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

      setUploadProgress(40);

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

      setUploadProgress(60);

      // Save to database
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const orderIds = formattedOrders.map(o => o.orderId).filter(Boolean);
        const { data: existing } = await supabase
          .from('order_imports')
          .select('order_id')
          .eq('user_id', user.id)
          .in('order_id', orderIds);

        const existingIds = new Set((existing || []).map((o: any) => o.order_id));
        const newOrders = formattedOrders.filter(o => !existingIds.has(o.orderId));

        if (newOrders.length > 0) {
          const records = newOrders.map(order => ({
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
            source_file: file.name
          }));

          await supabase.from('order_imports').insert(records);
        }
      }

      setUploadProgress(80);

      // Match with inventory
      const matches = await matchOrdersWithInventory(formattedOrders);
      const matchedWithInventory = matches.filter(m => m.inventoryMatch);

      setPendingItems(matchedWithInventory);
      setSelectedPendingItems(new Set(matchedWithInventory.map(m => m.orderItem.orderId)));
      setAllOrders(prev => [...formattedOrders, ...prev]);

      setUploadProgress(100);

      if (matchedWithInventory.length > 0) {
        setCurrentStep('pending');
      }

      toast({
        title: "Upload Complete",
        description: `Added ${formattedOrders.length} orders. ${matchedWithInventory.length} matched with inventory.`
      });

    } catch (error) {
      console.error('Upload error:', error);
      toast({ title: "Upload Error", description: "Failed to process file.", variant: "destructive" });
    } finally {
      setLoading(false);
      setTimeout(() => setUploadProgress(0), 2000);
    }
  };

  const processSelectedItems = async () => {
    if (selectedPendingItems.size === 0) return;

    setLoading(true);
    setProcessingProgress(0);

    try {
      const itemsToProcess = pendingItems.filter(m => selectedPendingItems.has(m.orderItem.orderId));
      const { data: { user } } = await supabase.auth.getUser();

      for (let i = 0; i < itemsToProcess.length; i++) {
        const match = itemsToProcess[i];
        if (!match.inventoryMatch || !match.inventoryType) continue;

        setProcessingProgress(Math.floor(((i + 1) / itemsToProcess.length) * 100));

        const previousQuantity = match.inventoryMatch.quantity;
        const newQuantity = Math.max(0, previousQuantity - match.orderItem.itemQuantity);

        if (match.inventoryType === 'asin') {
          await updateAsinQuantity(match.inventoryMatch.id, newQuantity, `Order deduction: ${match.orderItem.orderId}`);
        } else {
          await updateSkuQuantity(match.inventoryMatch.id, newQuantity, `Order deduction: ${match.orderItem.orderId}`);
        }

        if (user) {
          let serialNumber = 'N/A';
          if (match.inventoryType === 'asin') {
            serialNumber = (match.inventoryMatch as AsinInventoryItem).serialNumber;
          } else {
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
            previous_stock: previousQuantity,
            new_stock: newQuantity,
            inventory_id: match.inventoryMatch.id,
            serial_number: serialNumber,
            processed_at: new Date().toISOString()
          });
        }
      }

      setPendingItems([]);
      setSelectedPendingItems(new Set());
      setCurrentStep('processed');
      await loadProcessedOrders();

      toast({
        title: "Processing Complete",
        description: `Deducted stock for ${itemsToProcess.length} orders.`
      });

    } catch (error) {
      console.error('Processing error:', error);
      toast({ title: "Processing Error", description: "Failed to process orders.", variant: "destructive" });
    } finally {
      setLoading(false);
      setTimeout(() => setProcessingProgress(0), 2000);
    }
  };

  // Computed values
  const matchedCount = matchedItems.filter(m => m.inventoryMatch).length;
  const unmatchedCount = matchedItems.filter(m => !m.inventoryMatch).length;
  const matchRate = allOrders.length > 0 ? (matchedCount / allOrders.length) * 100 : 0;

  const pendingItemsForCard = pendingItems.map(m => ({
    orderId: m.orderItem.orderId,
    asin: m.orderItem.asin,
    sku: m.orderItem.sku,
    itemTitle: m.orderItem.itemTitle,
    itemQuantity: m.orderItem.itemQuantity,
    currentStock: m.inventoryMatch?.quantity || 0,
    afterDeduction: Math.max(0, (m.inventoryMatch?.quantity || 0) - m.orderItem.itemQuantity),
    matchType: m.matchType,
    inventoryType: m.inventoryType,
    serialNumber: m.inventoryType === 'asin' 
      ? (m.inventoryMatch as AsinInventoryItem)?.serialNumber 
      : (m.inventoryMatch as SkuInventoryItem)?.binSerialNumber
  }));

  const tableOrders = allOrders.map(order => {
    const match = matchedItems.find(m => m.orderItem.orderId === order.orderId);
    const isProcessed = processedOrders.some(p => p.order_number === order.orderId);
    return {
      orderId: order.orderId,
      asin: order.asin,
      sku: order.sku,
      itemTitle: order.itemTitle,
      itemQuantity: order.itemQuantity,
      orderStatus: order.orderStatus,
      orderPlaceDate: order.orderPlaceDate,
      isMatched: !!match?.inventoryMatch,
      isProcessed,
      matchType: match?.matchType,
      inventoryType: match?.inventoryType,
      availableStock: match?.inventoryMatch?.quantity
    };
  });

  const ProductImage = ({ asin }: { asin: string }) => {
    const [imageError, setImageError] = useState(false);
    const productImage = getImageByAsin(asin);

    if (!productImage || imageError) {
      return (
        <div className="w-14 h-14 rounded-lg border border-dashed border-border/30 flex items-center justify-center bg-muted/20">
          <Eye className="h-4 w-4 text-muted-foreground/50" />
        </div>
      );
    }

    return (
      <div className="w-14 h-14 rounded-lg border border-border/30 overflow-hidden bg-background/80">
        <img 
          src={productImage.image_url} 
          alt={`Product ${asin}`}
          className="w-full h-full object-contain"
          onError={() => setImageError(true)}
        />
      </div>
    );
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <UploadButton
              onUpload={handleFileUpload}
              isUploading={loading && uploadProgress > 0}
              progress={uploadProgress}
              disabled={loading}
            />
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadAllOrders}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>

        {/* Live API Check Progress */}
        <LiveApiCheckProgress 
          current={apiCheckProgress.current} 
          total={apiCheckProgress.total} 
          checking={apiCheckProgress.checking} 
        />

        {/* Dashboard with Metrics & Pipeline */}
        <OrderDashboard
          totalOrders={allOrders.length}
          matchedCount={matchedCount}
          pendingCount={pendingItems.length}
          processedCount={processedOrders.length}
          unmatchedCount={unmatchedCount}
          currentStep={currentStep}
          onStepClick={(step) => setCurrentStep(step as typeof currentStep)}
          matchRate={matchRate}
        />

        {/* Pending Review Section */}
        {(pendingItems.length > 0 || currentStep === 'pending') && (
          <PendingReviewCard
            items={pendingItemsForCard}
            selectedItems={selectedPendingItems}
            onSelectItem={(orderId) => {
              setSelectedPendingItems(prev => {
                const next = new Set(prev);
                if (next.has(orderId)) next.delete(orderId);
                else next.add(orderId);
                return next;
              });
            }}
            onSelectAll={() => {
              if (selectedPendingItems.size === pendingItems.length) {
                setSelectedPendingItems(new Set());
              } else {
                setSelectedPendingItems(new Set(pendingItems.map(m => m.orderItem.orderId)));
              }
            }}
            onProcess={processSelectedItems}
            onClear={() => {
              setPendingItems([]);
              setSelectedPendingItems(new Set());
            }}
            isProcessing={loading && processingProgress > 0}
            progress={processingProgress}
          />
        )}

        {/* Unified Order Table */}
        <UnifiedOrderTable
          orders={tableOrders}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isLoading={loading && uploadProgress === 0 && processingProgress === 0}
          renderProductImage={(asin) => <ProductImage asin={asin} />}
        />

        {/* Live Check Dialog */}
        <LiveSunskyCheckDialog
          open={showLiveCheckDialog}
          onOpenChange={setShowLiveCheckDialog}
          results={liveApiCheckResults}
        />
      </div>
    </TooltipProvider>
  );
}
