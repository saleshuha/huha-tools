import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ArrowLeft, Package, Truck, CheckCircle, Clock, AlertTriangle, Plus, Save, ExternalLink, Upload, Edit, PackageCheck, PackageX, Trash2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePOOrders } from '@/hooks/usePOOrders';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { SunskyOrderDialog } from '@/components/SunskyOrderDialog';

// Cache busting comment - Fixed poDetails issue - v2

interface StatusProgress {
  pending: number;
  ordered: number;
  total: number;
}

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
  ordered: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
  shipped: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300',
  delivered: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
};

export default function PODetailsPage() {
  const { poNumber } = useParams<{ poNumber: string }>();
  const navigate = useNavigate();
  const { poOrders, fetchPOOrders, updateOrderStatus, updateTrackingInfo } = usePOOrders();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [inventoryData, setInventoryData] = useState<{asinInventory: any[], skuInventory: any[]}>({
    asinInventory: [],
    skuInventory: []
  });
  
  // Bulk operations state
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [selectionType, setSelectionType] = useState<'instock' | 'outstock' | null>(null);
  const [bulkTrackingInfo, setBulkTrackingInfo] = useState({
    supplier_order_number: '',
    tracking_number: '',
    tracking_url: ''
  });
  
  // Individual tracking dialog state
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [individualTrackingData, setIndividualTrackingData] = useState({
    supplier_order_number: '',
    tracking_number: '',
    tracking_url: ''
  });
  
  // Bulk tracking dialog state
  const [bulkTrackingData, setBulkTrackingData] = useState({
    supplier_order_number: '',
    tracking_number: '',
    tracking_url: ''
  });

  // Sunsky order dialog state
  const [sunskyOrderDialogOpen, setSunskyOrderDialogOpen] = useState(false);
  const [hasSunskyCredentials, setHasSunskyCredentials] = useState(false);

  console.log('PODetailsPage: Rendering with poNumber:', poNumber);
  console.log('PODetailsPage: poOrders:', poOrders);

  useEffect(() => {
    const loadData = async () => {
      console.log('PODetailsPage: Loading data...');
      setLoading(true);
      await Promise.all([
        fetchPOOrders(),
        fetchInventoryData(),
        checkSunskyCredentials()
      ]);
      setLoading(false);
      console.log('PODetailsPage: Data loaded');
    };
    loadData();
  }, [fetchPOOrders]);

  // Fetch inventory data to match with PO ASINs
  const fetchInventoryData = async () => {
    try {
      const user = await supabase.auth.getUser();
      const userId = user.data.user?.id;
      
      if (!userId) {
        console.error('No user ID found');
        return;
      }

      console.log('🔄 Fetching inventory data for user:', userId);

      const [asinResult, skuResult] = await Promise.all([
        supabase
          .from('asin_inventory')
          .select('asin, quantity, status, sku, serial_number, country')
          .eq('user_id', userId),
        supabase
          .from('sku_inventory')
          .select('sku_number, quantity, status, bin_serial_number, country')
          .eq('user_id', userId)
      ]);

      if (asinResult.error) {
        console.error('ASIN inventory error:', asinResult.error);
        throw asinResult.error;
      }
      if (skuResult.error) {
        console.error('SKU inventory error:', skuResult.error);
        throw skuResult.error;
      }

      console.log('📊 ASIN Inventory Data:', asinResult.data);
      console.log('📊 SKU Inventory Data:', skuResult.data);
      console.log('📊 SKU Inventory ASINs found:', skuResult.data?.filter(item => item.sku_number?.startsWith('B0')));
      
      // Specific debug for B0FHDWY5FF
      const targetAsin = 'B0FHDWY5FF';
      const asinInAsinInventory = asinResult.data?.find(item => item.asin === targetAsin);
      const asinInSkuInventory = skuResult.data?.find(item => item.sku_number === targetAsin);
      console.log(`🎯 Debug for ${targetAsin}:`, {
        inAsinInventory: !!asinInAsinInventory,
        asinInventoryData: asinInAsinInventory,
        inSkuInventory: !!asinInSkuInventory,
        skuInventoryData: asinInSkuInventory
      });

      setInventoryData({
        asinInventory: asinResult.data || [],
        skuInventory: skuResult.data || []
      });
    } catch (error) {
      console.error('Error fetching inventory data:', error);
    }
  };

  // Function to find inventory match for an ASIN - Enhanced to match ASINs and SKUs
  const findInventoryMatch = (asin: string, sunskySku?: string, poSku?: string, modelNumber?: string) => {
    console.log(`\n🔍 Finding inventory match for:`, { asin, sunskySku, poSku, modelNumber });
    console.log(`📦 Available inventory:`, { 
      asinInventoryCount: inventoryData.asinInventory.length,
      skuInventoryCount: inventoryData.skuInventory.length 
    });
    
    // First check ASIN inventory
    if (asin) {
      console.log(`🎯 Checking ASIN inventory for: ${asin}`);
      const asinMatch = inventoryData.asinInventory.find(item => item.asin === asin);
      if (asinMatch) {
        console.log(`✅ Found ASIN match:`, asinMatch);
        return {
          type: 'ASIN',
          status: asinMatch.status,
          quantity: asinMatch.quantity,
          identifier: asinMatch.asin,
          serialNumber: asinMatch.serial_number
        };
      } else {
        console.log(`❌ No ASIN match found in asin_inventory`);
      }
    }

    // Then check SKU inventory with multiple possible SKU values
    const skusToCheck = [sunskySku, poSku, modelNumber].filter(Boolean);
    console.log(`🔑 Checking SKU inventory for SKUs:`, skusToCheck);
    
    for (const sku of skusToCheck) {
      const skuMatch = inventoryData.skuInventory.find(item => item.sku_number === sku);
      if (skuMatch) {
        console.log(`✅ Found SKU match for ${sku}:`, skuMatch);
        return {
          type: 'SKU',
          status: skuMatch.status,
          quantity: skuMatch.quantity,
          identifier: skuMatch.sku_number,
          serialNumber: skuMatch.bin_serial_number
        };
      } else {
        console.log(`❌ No SKU match found for: ${sku}`);
      }
    }

    // Also check SKU inventory for ASIN matches (since SKU inventory can contain ASIN-like identifiers)
    if (asin) {
      console.log(`🎯 Checking SKU inventory for ASIN: ${asin}`);
      console.log(`📋 Available SKU numbers:`, inventoryData.skuInventory.map(item => item.sku_number));
      
      const skuAsinMatch = inventoryData.skuInventory.find(item => item.sku_number === asin);
      if (skuAsinMatch) {
        console.log(`✅ Found SKU-ASIN match:`, skuAsinMatch);
        return {
          type: 'SKU-ASIN',
          status: skuAsinMatch.status,
          quantity: skuAsinMatch.quantity,
          identifier: skuAsinMatch.sku_number,
          serialNumber: skuAsinMatch.bin_serial_number
        };
      } else {
        console.log(`❌ No SKU-ASIN match found for: ${asin}`);
      }
    }

    console.log(`❌ No inventory match found for any identifier`);
    return null;
  };

  if (!poNumber) {
    return <div>PO Number not provided</div>;
  }

  // Filter orders for this specific PO
  const poOrdersForThisPO = poOrders.filter(order => order.po_number === poNumber);
  
  // Only show matched items (items with sunsky_sku populated from database)
  const matchedOrders = poOrdersForThisPO.filter(order => order.sunsky_sku !== null);

  // Calculate status progress
  const statusProgress: StatusProgress = matchedOrders.reduce((acc, order) => {
    if (order.status === 'pending' || order.status === 'ordered') {
      acc[order.status as keyof Omit<StatusProgress, 'total'>]++;
    }
    acc.total++;
    return acc;
  }, { pending: 0, ordered: 0, total: 0 });

  // Calculate progress percentage
  const progressPercentage = statusProgress.total > 0 
    ? (statusProgress.ordered / statusProgress.total) * 100 
    : 0;

  // Get PO summary data
  const totalCost = matchedOrders.reduce((sum, order) => sum + (order.total_cost || 0), 0);
  const currency = matchedOrders[0]?.currency || 'AED';
  const shipToLocation = matchedOrders[0]?.ship_to_location || 'N/A';

  // Export functionality
  const handleExportPO = () => {
    try {
      // Prepare comprehensive export data with all possible columns
      const exportData = matchedOrders.map((order) => {
        const inventoryMatch = findInventoryMatch(order.asin, order.sunsky_sku?.sku_code, order.sku_code, order.model_number);
        
        return {
          // Basic Order Information
          'PO Number': order.po_number,
          'Order ID': order.id,
          'Status': order.status,
          'Order Date': order.order_date ? new Date(order.order_date).toLocaleDateString() : '',
          'Expected Delivery': order.expected_delivery ? new Date(order.expected_delivery).toLocaleDateString() : '',
          'Created At': new Date(order.created_at).toLocaleDateString(),
          'Updated At': new Date(order.updated_at).toLocaleDateString(),
          
          // Product Information
          'ASIN': order.asin || '',
          'SKU Code': order.sku_code || '',
          'Model Number': order.model_number || '',
          'Title': order.title || '',
          'External ID': order.external_id || '',
          'External ID Type': order.external_id_type || '',
          
          // Quantity and Cost
          'Quantity': order.quantity,
          'Unit Cost': order.unit_cost || '',
          'Total Cost': order.total_cost || '',
          'Currency': order.currency || '',
          'Country': order.country || '',
          
          // Shipping Information
          'Ship To Location': order.ship_to_location || '',
          'Supplier Order Number': order.supplier_order_number || '',
          'Tracking Number': order.tracking_number || '',
          'Tracking URL': order.tracking_url || '',
          
          // Sunsky SKU Information
          'Sunsky SKU Code': order.sunsky_sku?.sku_code || '',
          'Sunsky Title': order.sunsky_sku?.title || '',
          'Sunsky Cost': order.sunsky_sku?.cost || '',
          'Sunsky Weight': order.sunsky_sku?.weight || '',
          'Sunsky Currency': order.sunsky_sku?.currency || '',
          'Sunsky Country': order.sunsky_sku?.country || '',
          
          // Inventory Information
          'Inventory Match Type': inventoryMatch?.type || 'No Match',
          'Inventory Status': inventoryMatch?.status || 'Not in Inventory',
          'Inventory Quantity': inventoryMatch?.quantity || 0,
          'Inventory Identifier': inventoryMatch?.identifier || '',
          'Inventory Serial/Bin Number': inventoryMatch?.serialNumber || '',
          
          // Additional Information
          'Notes': order.notes || '',
          'File Name': order.file_name || '',
          'User ID': order.user_id
        };
      });

      // Convert to CSV
      if (exportData.length === 0) {
        toast({
          title: "No Data to Export",
          description: "There are no items to export",
          variant: "destructive"
        });
        return;
      }

      const headers = Object.keys(exportData[0]);
      const csvContent = [
        headers.join(','),
        ...exportData.map(row => 
          headers.map(header => {
            const value = row[header as keyof typeof row];
            // Handle values that might contain commas or quotes
            const stringValue = String(value);
            if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
              return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
          }).join(',')
        )
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `PO_${poNumber}_Details_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);

      toast({
        title: "Export Successful",
        description: `Exported ${exportData.length} items to CSV file`
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export PO details",
        variant: "destructive"
      });
    }
  };

  // Handle bulk mark as ordered from inventory
  const handleBulkMarkFromInventory = async () => {
    if (selectedItems.size === 0) return;
    
    setIsUpdating(true);
    try {
      const updatePromises = Array.from(selectedItems).map(async (orderId) => {
        const order = matchedOrders.find(o => o.id === orderId);
        if (order) {
          return markAsOrderedFromInventory(order);
        }
      });
      
      await Promise.all(updatePromises);
      
      toast({
        title: "Bulk Marked from Inventory",
        description: `Marked ${selectedItems.size} items as ordered and deducted from inventory`
      });
      setSelectedItems(new Set());
      setSelectionType(null);
    } catch (error) {
      toast({
        title: "Bulk Update Failed",
        description: "Failed to mark some items as ordered from inventory",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle bulk mark as ordered from supplier
  const handleBulkMarkFromSupplier = async () => {
    if (selectedItems.size === 0) return;
    
    setIsUpdating(true);
    try {
      const updatePromises = Array.from(selectedItems).map(orderId => 
        updateOrderStatus(orderId, 'ordered')
      );
      
      await Promise.all(updatePromises);
      
      toast({
        title: "Bulk Marked from Supplier",
        description: `Marked ${selectedItems.size} items as ordered from supplier`
      });
      setSelectedItems(new Set());
      setSelectionType(null);
    } catch (error) {
      toast({
        title: "Bulk Update Failed",
        description: "Failed to mark some items as ordered from supplier",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle bulk tracking update for selected items
  const handleBulkTrackingUpdateSelected = async () => {
    if (selectedItems.size === 0) return;
    
    setIsUpdating(true);
    try {
      const updatePromises = Array.from(selectedItems).map(orderId => 
        updateTrackingInfo(orderId, bulkTrackingInfo)
      );
      
      await Promise.all(updatePromises);
      
      toast({
        title: "Bulk Tracking Updated",
        description: `Updated tracking information for ${selectedItems.size} items`
      });
      setSelectedItems(new Set());
      setBulkTrackingInfo({ supplier_order_number: '', tracking_number: '', tracking_url: '' });
    } catch (error) {
      toast({
        title: "Bulk Update Failed",
        description: "Failed to update tracking information for some items",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle select all/none with smart logic
  const handleSelectAll = () => {
    if (selectedItems.size === matchedOrders.length) {
      // Deselect all
      setSelectedItems(new Set());
      setSelectionType(null);
    } else {
      // Select all available items (first check what type we can select)
      if (selectionType === null) {
        // No current selection, select all items  
        setSelectedItems(new Set(matchedOrders.map(order => order.id)));
        // Don't set a specific type for select all
      } else {
        // Already have a selection type, only select items of the same type
        const compatibleItems = matchedOrders.filter(order => {
          const inventoryMatch = findInventoryMatch(order.asin, order.sunsky_sku?.sku_code, order.sku_code, order.model_number);
          const hasStock = inventoryMatch && inventoryMatch.quantity > 0;
          const itemType = hasStock ? 'instock' : 'outstock';
          return itemType === selectionType;
        });
        setSelectedItems(new Set(compatibleItems.map(order => order.id)));
      }
    }
  };

  // Handle individual item selection with smart logic
  const handleItemSelect = (orderId: string) => {
    const order = matchedOrders.find(o => o.id === orderId);
    if (!order) return;
    
    const inventoryMatch = findInventoryMatch(order.asin, order.sunsky_sku?.sku_code, order.sku_code, order.model_number);
    const hasStock = inventoryMatch && inventoryMatch.quantity > 0;
    const currentItemType = hasStock ? 'instock' : 'outstock';
    
    const newSelected = new Set(selectedItems);
    
    if (newSelected.has(orderId)) {
      // Deselecting item
      newSelected.delete(orderId);
      
      // If no items selected, reset selection type
      if (newSelected.size === 0) {
        setSelectionType(null);
      }
    } else {
      // Selecting item
      if (selectionType === null) {
        // First selection sets the type
        newSelected.add(orderId);
        setSelectionType(currentItemType);
      } else if (selectionType === currentItemType) {
        // Same type, allow selection
        newSelected.add(orderId);
      } else {
        // Different type, show warning and don't select
        toast({
          title: "Selection Restricted",
          description: `Cannot mix ${selectionType === 'instock' ? 'in-stock' : 'out-of-stock'} items with ${currentItemType === 'instock' ? 'in-stock' : 'out-of-stock'} items`,
          variant: "destructive"
        });
        return;
      }
    }
    
    setSelectedItems(newSelected);
  };

  // Handle individual tracking update
  const handleIndividualTrackingUpdate = async () => {
    if (!selectedOrder) return;
    
    setIsUpdating(true);
    try {
      await updateTrackingInfo(selectedOrder.id, individualTrackingData);
      toast({
        title: "Tracking Updated",
        description: "Individual tracking information has been updated successfully"
      });
      setSelectedOrder(null);
      setIndividualTrackingData({ supplier_order_number: '', tracking_number: '', tracking_url: '' });
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to update tracking information",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle bulk tracking update
  const handleBulkTrackingUpdate = async () => {
    setIsUpdating(true);
    try {
      const updatePromises = matchedOrders.map(order => 
        updateTrackingInfo(order.id, bulkTrackingData)
      );
      
      await Promise.all(updatePromises);
      
      toast({
        title: "Bulk Tracking Updated",
        description: `Updated tracking information for ${matchedOrders.length} items`
      });
      setBulkTrackingData({ supplier_order_number: '', tracking_number: '', tracking_url: '' });
    } catch (error) {
      toast({
        title: "Bulk Update Failed",
        description: "Failed to update tracking information for some items",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Open individual tracking dialog
  const openIndividualTrackingDialog = (order: any) => {
    setSelectedOrder(order);
    setIndividualTrackingData({
      supplier_order_number: order.supplier_order_number || '',
      tracking_number: order.tracking_number || '',
      tracking_url: order.tracking_url || ''
    });
  };

  // Mark item as ordered and reduce inventory stock
  const markAsOrderedFromInventory = async (order: any) => {
    setIsUpdating(true);
    try {
      const inventoryMatch = findInventoryMatch(order.asin, order.sunsky_sku?.sku_code, order.sku_code, order.model_number);
      
      if (!inventoryMatch || inventoryMatch.quantity <= 0) {
        toast({
          title: "Cannot Mark as Ordered",
          description: "Item has no stock available in inventory",
          variant: "destructive"
        });
        return;
      }

      // Check if order quantity exceeds available stock
      if (order.quantity > inventoryMatch.quantity) {
        toast({
          title: "Insufficient Stock",
          description: `Order quantity (${order.quantity}) exceeds available stock (${inventoryMatch.quantity})`,
          variant: "destructive"
        });
        return;
      }

      // Update inventory quantity
      const newQuantity = inventoryMatch.quantity - order.quantity;
      
      let inventoryError: any = null;
      
      if (inventoryMatch.type === 'ASIN') {
        const { error } = await supabase
          .from('asin_inventory')
          .update({ quantity: newQuantity })
          .eq('asin', inventoryMatch.identifier)
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id);
        inventoryError = error;
      } else {
        const { error } = await supabase
          .from('sku_inventory')
          .update({ quantity: newQuantity })
          .eq('sku_number', inventoryMatch.identifier)
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id);
        inventoryError = error;
      }

      if (inventoryError) {
        throw new Error(`Failed to update inventory: ${inventoryError.message}`);
      }

      // Update order status to 'ordered'
      await updateOrderStatus(order.id, 'ordered');

      // Refresh inventory data
      await fetchInventoryData();

      toast({
        title: "Item Marked as Ordered",
        description: `Order marked as placed and ${order.quantity} units deducted from inventory (${inventoryMatch.quantity} → ${newQuantity})`
      });

    } catch (error) {
      console.error('Error marking item as ordered from inventory:', error);
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update item and inventory",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Check if user has Sunsky credentials
  const checkSunskyCredentials = async () => {
    try {
      const response = await supabase.functions.invoke('sunsky-api', {
        body: { action: 'getCredentialsStatus' }
      });

      if (response.data?.result === 'success') {
        setHasSunskyCredentials(response.data.hasCredentials);
      }
    } catch (error) {
      console.error('Error checking Sunsky credentials:', error);
    }
  };

  // Handle Sunsky order success
  const handleSunskyOrderSuccess = async (orderNumber: string, selectedOrderIds: string[]) => {
    try {
      // Update the selected PO orders with the Sunsky order number
      const updatePromises = selectedOrderIds.map(orderId => 
        updateTrackingInfo(orderId, {
          supplier_order_number: orderNumber,
          tracking_number: '',
          tracking_url: `https://sunsky-online.com/order/view/${orderNumber}`
        })
      );

      // Also update the status to 'ordered' and set order_date
      const statusUpdatePromises = selectedOrderIds.map(orderId => 
        updateOrderStatus(orderId, 'ordered')
      );

      await Promise.all([
        ...updatePromises,
        ...statusUpdatePromises
      ]);

      toast({
        title: "Order Placed Successfully",
        description: `Sunsky order #${orderNumber} created and PO items updated`,
      });

      // Clear selection
      setSelectedItems(new Set());
      setSelectionType(null);
    } catch (error) {
      toast({
        title: "Failed to Update PO Items",
        description: "Sunsky order was created but failed to update PO items",
        variant: "destructive"
      });
    }
  };

  // Handle opening Sunsky order dialog
  const handleOpenSunskyOrder = () => {
    if (!hasSunskyCredentials) {
      toast({
        title: "Sunsky Credentials Required",
        description: "Please configure your Sunsky API credentials in the SKU Importer first",
        variant: "destructive"
      });
      return;
    }

    if (selectedItems.size === 0) {
      toast({
        title: "No Items Selected",
        description: "Please select items to order from Sunsky",
        variant: "destructive"
      });
      return;
    }

    // Check if selected items have Sunsky SKUs
    const selectedOrdersData = matchedOrders.filter(order => selectedItems.has(order.id));
    const itemsWithSunskyData = selectedOrdersData.filter(order => 
      order.sunsky_sku?.sku_code || order.sku_code
    );

    if (itemsWithSunskyData.length === 0) {
      toast({
        title: "No Sunsky Data",
        description: "Selected items don't have Sunsky SKU information",
        variant: "destructive"
      });
      return;
    }

    if (itemsWithSunskyData.length < selectedOrdersData.length) {
      toast({
        title: "Some Items Missing Sunsky Data",
        description: `Only ${itemsWithSunskyData.length} of ${selectedOrdersData.length} selected items have Sunsky data`,
      });
    }

    setSunskyOrderDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-surface">
        <div className="glass-container mx-6 my-4 p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-24 bg-muted rounded"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (matchedOrders.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-surface">
        <div className="glass-container mx-6 my-4 p-8">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="outline" onClick={() => navigate('/po-tracker')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to PO Tracker
            </Button>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              PO {poNumber} - No Matched Items
            </h1>
          </div>
          <Card>
            <CardContent className="p-8 text-center">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg text-muted-foreground">
                No matched items found for this Purchase Order.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-surface">
      <div className="glass-container mx-6 my-4 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate('/po-tracker')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to PO Tracker
            </Button>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              PO {poNumber} Details
            </h1>
          </div>
          <Button 
            onClick={handleExportPO} 
            className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
          >
            <Download className="h-4 w-4" />
            Export PO Details
          </Button>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 mb-6">
          {/* Instructions */}
          {selectedItems.size === 0 && (
            <div className="w-full p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                💡 Select items using the checkboxes to access bulk operations including "Order at Sunsky"
              </p>
            </div>
          )}
          {/* Bulk Operations */}
          {selectedItems.size > 0 && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <Badge variant="secondary">{selectedItems.size} selected</Badge>
              
              {selectionType === 'instock' && (
                <Button 
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={handleBulkMarkFromInventory}
                  disabled={isUpdating}
                >
                  Mark From Stock
                </Button>
              )}
              
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleBulkMarkFromSupplier}
                disabled={isUpdating}
              >
                Mark From Supplier
              </Button>
              
              <Button 
                size="sm" 
                className="bg-orange-600 hover:bg-orange-700 text-white"
                onClick={handleOpenSunskyOrder}
                disabled={isUpdating}
              >
                Order at Sunsky
              </Button>
              
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    Update Tracking
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Bulk Update Tracking</DialogTitle>
                    <DialogDescription>
                      Update tracking information for {selectedItems.size} selected items
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="bulk-selected-supplier-order">Supplier Order Number</Label>
                      <Input
                        id="bulk-selected-supplier-order"
                        value={bulkTrackingInfo.supplier_order_number}
                        onChange={(e) => setBulkTrackingInfo({...bulkTrackingInfo, supplier_order_number: e.target.value})}
                        placeholder="Enter supplier order number"
                      />
                    </div>
                    <div>
                      <Label htmlFor="bulk-selected-tracking-number">Tracking Number</Label>
                      <Input
                        id="bulk-selected-tracking-number"
                        value={bulkTrackingInfo.tracking_number}
                        onChange={(e) => setBulkTrackingInfo({...bulkTrackingInfo, tracking_number: e.target.value})}
                        placeholder="Enter tracking number"
                      />
                    </div>
                    <div>
                      <Label htmlFor="bulk-selected-tracking-url">Tracking URL</Label>
                      <Input
                        id="bulk-selected-tracking-url"
                        value={bulkTrackingInfo.tracking_url}
                        onChange={(e) => setBulkTrackingInfo({...bulkTrackingInfo, tracking_url: e.target.value})}
                        placeholder="Enter tracking URL"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleBulkTrackingUpdateSelected} disabled={isUpdating}>
                      {isUpdating ? 'Updating...' : 'Update Selected Items'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => {
                  setSelectedItems(new Set());
                  setSelectionType(null);
                }}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Clear
              </Button>
            </div>
          )}
          
          {/* Original Bulk Update All Button */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Upload className="h-4 w-4" />
                Bulk Update All Tracking
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Bulk Update Tracking</DialogTitle>
                <DialogDescription>
                  Update tracking information for all {matchedOrders.length} items in this PO
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="bulk-supplier-order">Supplier Order Number</Label>
                  <Input
                    id="bulk-supplier-order"
                    value={bulkTrackingData.supplier_order_number}
                    onChange={(e) => setBulkTrackingData({...bulkTrackingData, supplier_order_number: e.target.value})}
                    placeholder="Enter supplier order number"
                  />
                </div>
                <div>
                  <Label htmlFor="bulk-tracking-number">Tracking Number</Label>
                  <Input
                    id="bulk-tracking-number"
                    value={bulkTrackingData.tracking_number}
                    onChange={(e) => setBulkTrackingData({...bulkTrackingData, tracking_number: e.target.value})}
                    placeholder="Enter tracking number"
                  />
                </div>
                <div>
                  <Label htmlFor="bulk-tracking-url">Tracking URL</Label>
                  <Input
                    id="bulk-tracking-url"
                    value={bulkTrackingData.tracking_url}
                    onChange={(e) => setBulkTrackingData({...bulkTrackingData, tracking_url: e.target.value})}
                    placeholder="Enter tracking URL"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleBulkTrackingUpdate} disabled={isUpdating}>
                  {isUpdating ? 'Updating...' : 'Update All Items'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>


        {/* Items Table */}
        <Card>
          <CardHeader>
            <CardTitle>Order Items ({matchedOrders.length} matched items)</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedItems.size === matchedOrders.length && matchedOrders.length > 0}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all items"
                    />
                  </TableHead>
                  <TableHead>Item Details</TableHead>
                  <TableHead>Inventory Status</TableHead>
                  <TableHead>Tracking Info</TableHead>
                  <TableHead className="text-center">Qty</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {matchedOrders.map((order) => {
                  const inventoryMatch = findInventoryMatch(order.asin, order.sunsky_sku?.sku_code, order.sku_code, order.model_number);
                  const hasStock = inventoryMatch && inventoryMatch.quantity > 0;
                  const itemType = hasStock ? 'instock' : 'outstock';
                  const isDisabled = selectionType !== null && selectionType !== itemType;
                  
                  return (
                    <TableRow 
                      key={order.id} 
                      className={`
                        ${selectedItems.has(order.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''} 
                        ${isDisabled ? 'opacity-50' : ''}
                      `}
                    >
                    <TableCell>
                      <Checkbox
                        checked={selectedItems.has(order.id)}
                        onCheckedChange={() => handleItemSelect(order.id)}
                        aria-label={`Select item ${order.asin}`}
                        disabled={isDisabled}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-mono text-sm font-medium">
                          ASIN: {order.asin}
                        </div>
                        {order.model_number && (
                          <div className="font-mono text-xs text-muted-foreground">
                            Model: {order.model_number}
                          </div>
                        )}
                        <div className="text-sm font-medium max-w-xs truncate" title={order.title}>
                          {order.title}
                        </div>
                        {order.sunsky_sku && (
                          <div className="text-xs text-green-600 font-medium">
                            SKU: {order.sunsky_sku.sku_code}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const inventoryMatch = findInventoryMatch(order.asin, order.sunsky_sku?.sku_code, order.sku_code, order.model_number);
                         if (inventoryMatch) {
                           return (
                             <div className="space-y-1">
                               <div className="flex items-center gap-2">
                                 <div className="flex items-center gap-1">
                                   <PackageCheck className="h-4 w-4 text-green-600" />
                                   <Badge 
                                     variant={inventoryMatch.status === 'in-stock' ? 'default' : 'secondary'}
                                     className={inventoryMatch.status === 'in-stock' ? 'bg-green-100 text-green-800' : ''}
                                   >
                                     {inventoryMatch.status}
                                   </Badge>
                                 </div>
                                 <div className="text-sm font-medium">
                                   Qty: {inventoryMatch.quantity}
                                 </div>
                                 <div className="text-xs text-muted-foreground">
                                   ({inventoryMatch.type})
                                 </div>
                               </div>
                               {inventoryMatch.serialNumber && (
                                 <div className="text-xs text-muted-foreground">
                                   {inventoryMatch.type === 'ASIN' ? 'Serial' : 'Bin'}: {inventoryMatch.serialNumber}
                                 </div>
                               )}
                             </div>
                           );
                        } else {
                          return (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <PackageX className="h-4 w-4" />
                              <span className="text-sm">Not in inventory</span>
                            </div>
                          );
                        }
                      })()}
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <div className="space-y-1 text-xs">
                        {order.supplier_order_number && (
                          <div>
                            <span className="font-medium">Supplier Order:</span> {order.supplier_order_number}
                          </div>
                        )}
                        {order.tracking_number && (
                          <div>
                            <span className="font-medium">Tracking:</span> {order.tracking_number}
                          </div>
                        )}
                        {order.tracking_url && (
                          <div>
                            <a 
                              href={order.tracking_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline flex items-center gap-1"
                            >
                              Track Package <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                         )}
                         {!order.supplier_order_number && !order.tracking_number && !order.tracking_url && (
                           <div className="text-muted-foreground">No tracking info</div>
                         )}
                       </div>
                    </TableCell>
                    <TableCell className="text-center font-semibold">
                      {order.quantity}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={statusColors[order.status as keyof typeof statusColors] || statusColors.pending}>
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col gap-1">
                        <div className="flex gap-1 justify-center">
                           {(() => {
                             const inventoryMatch = findInventoryMatch(order.asin, order.sunsky_sku?.sku_code, order.sku_code, order.model_number);
                             const hasStock = inventoryMatch && inventoryMatch.quantity > 0;
                             
                             if (order.status !== 'ordered' && order.status !== 'shipped' && order.status !== 'delivered') {
                               if (hasStock) {
                                 // Show both buttons for in-stock items
                                 return (
                                   <div className="flex flex-col gap-1">
                                     <Button
                                       size="sm"
                                       variant="default"
                                       onClick={() => markAsOrderedFromInventory(order)}
                                       className="text-xs bg-green-600 hover:bg-green-700"
                                     >
                                       From Stock
                                     </Button>
                                     <Button
                                       size="sm"
                                       variant="outline"
                                       onClick={() => updateOrderStatus(order.id, 'ordered')}
                                       className="text-xs"
                                     >
                                       From Supplier
                                     </Button>
                                   </div>
                                 );
                               } else {
                                 // Show only supplier button for out-of-stock items
                                 return (
                                   <Button
                                     size="sm"
                                     variant="outline"
                                     onClick={() => updateOrderStatus(order.id, 'ordered')}
                                     className="text-xs"
                                   >
                                     Mark Ordered (From Supplier)
                                   </Button>
                                 );
                               }
                             }
                             return null;
                           })()}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openIndividualTrackingDialog(order)}
                          className="text-xs gap-1"
                        >
                          <Edit className="h-3 w-3" />
                          Edit Tracking
                        </Button>
                      </div>
                    </TableCell>
                   </TableRow>
                   );
                 })}
               </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Individual Tracking Dialog */}
        <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Update Tracking Information</DialogTitle>
              <DialogDescription>
                Update tracking details for individual item
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="individual-supplier-order">Supplier Order Number</Label>
                <Input
                  id="individual-supplier-order"
                  value={individualTrackingData.supplier_order_number}
                  onChange={(e) => setIndividualTrackingData({...individualTrackingData, supplier_order_number: e.target.value})}
                  placeholder="Enter supplier order number"
                />
              </div>
              <div>
                <Label htmlFor="individual-tracking-number">Tracking Number</Label>
                <Input
                  id="individual-tracking-number"
                  value={individualTrackingData.tracking_number}
                  onChange={(e) => setIndividualTrackingData({...individualTrackingData, tracking_number: e.target.value})}
                  placeholder="Enter tracking number"
                />
              </div>
              <div>
                <Label htmlFor="individual-tracking-url">Tracking URL</Label>
                <Input
                  id="individual-tracking-url"
                  value={individualTrackingData.tracking_url}
                  onChange={(e) => setIndividualTrackingData({...individualTrackingData, tracking_url: e.target.value})}
                  placeholder="Enter tracking URL"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedOrder(null)}>
                Cancel
              </Button>
              <Button onClick={handleIndividualTrackingUpdate} disabled={isUpdating}>
                {isUpdating ? 'Updating...' : 'Update Tracking'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Sunsky Order Dialog */}
        <SunskyOrderDialog
          open={sunskyOrderDialogOpen}
          onOpenChange={setSunskyOrderDialogOpen}
          selectedOrders={matchedOrders.filter(order => selectedItems.has(order.id))}
          onOrderSuccess={handleSunskyOrderSuccess}
        />
      </div>
    </div>
  );
}