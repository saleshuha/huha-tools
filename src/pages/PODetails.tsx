import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ArrowLeft, Package, Truck, CheckCircle, Clock, AlertTriangle, Plus, Save, ExternalLink, Upload, Edit, PackageCheck, PackageX, Trash2, Download, Printer, Eye, Info, ShoppingCart, X, Search, Settings, RotateCcw, Undo } from 'lucide-react';
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
  closed: number;
  total: number;
}

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
  placed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
  received: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300',
  closed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
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
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [selectedPrintColumns, setSelectedPrintColumns] = useState<Set<string>>(new Set([
    'asin', 'title', 'model_number', 'sku_code', 'quantity', 'status', 'tracking_number'
  ]));
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
  
  // Track items marked from stock
  const [itemsMarkedFromStock, setItemsMarkedFromStock] = useState<Set<string>>(new Set());
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');

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

  // Initialize itemsMarkedFromStock based on existing ordered items
  useEffect(() => {
    if (poOrders.length > 0) {
      // Debug: Show ALL orders for this PO first
      const allPOOrders = poOrders.filter(order => order.po_number === poNumber);
      console.log('🔍 ALL Orders in PO 4KI4G5JN:', {
        totalCount: allPOOrders.length,
        orders: allPOOrders.map(order => ({
          id: order.id,
          asin: order.asin,
          sku: order.sku_code,
          quantity: order.quantity,
          status: order.status,
          notes: order.notes,
          hasSunskySku: !!order.sunsky_sku,
          hasPartialNote: order.notes?.includes('Partial fulfillment from stock'),
          created_at: order.created_at
        }))
      });

      // Look for orders that have been fulfilled from stock (partial or complete)
      const fulfilledFromStockItems = poOrders.filter(order => 
        order.po_number === poNumber && 
        (
          // Complete fulfillment: status closed and quantity 0
          (order.status === 'closed' && order.quantity === 0) ||
          // Fulfilled from stock with new note pattern
          (order.notes?.includes('Fulfilled from stock:')) ||
          // Partial fulfillment: has partial fulfillment notes
          (order.notes?.includes('Partial fulfillment from stock')) ||
          // Also check for other partial fulfillment patterns
          (order.notes?.includes('partial fulfillment')) ||
          (order.notes?.includes('Partial Fulfillment')) ||
          (order.notes?.includes('fulfilled from stock'))
        ) &&
        order.sunsky_sku !== null
      );
      
      console.log('🎯 Fulfilled from stock items found:', {
        count: fulfilledFromStockItems.length,
        items: fulfilledFromStockItems.map(item => ({
          id: item.id,
          asin: item.asin,
          sku: item.sku_code,
          quantity: item.quantity,
          status: item.status,
          notes: item.notes,
          isPartial: item.notes?.includes('Partial fulfillment from stock')
        }))
      });

      if (fulfilledFromStockItems.length > 0) {
        const fulfilledItemIds = new Set(fulfilledFromStockItems.map(item => item.id));
        console.log('✅ Setting itemsMarkedFromStock with IDs:', Array.from(fulfilledItemIds));
        setItemsMarkedFromStock(fulfilledItemIds);
      } else {
        console.log('❌ No fulfilled from stock items found - checking why...');
        // Show items that might be partial fulfillments but not detected
        const possiblePartials = allPOOrders.filter(order => 
          order.notes && 
          (order.notes.toLowerCase().includes('partial') || 
           order.notes.toLowerCase().includes('stock') ||
           order.notes.toLowerCase().includes('fulfill'))
        );
        console.log('🤔 Possible partial fulfillments not detected:', possiblePartials.map(order => ({
          id: order.id,
          asin: order.asin,
          notes: order.notes,
          hasSunskySku: !!order.sunsky_sku
        })));
      }
    }
  }, [poOrders, poNumber]);

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
    
    // First check ASIN inventory - aggregate all matching records
    if (asin) {
      console.log(`🎯 Checking ASIN inventory for: ${asin}`);
      const asinMatches = inventoryData.asinInventory.filter(item => item.asin === asin);
      if (asinMatches.length > 0) {
        console.log(`✅ Found ${asinMatches.length} ASIN match(es):`, asinMatches);
        
        // Aggregate quantities from all matching records
        const totalQuantity = asinMatches.reduce((sum, item) => sum + item.quantity, 0);
        const firstMatch = asinMatches[0];
        
        console.log(`📊 Total aggregated quantity for ${asin}: ${totalQuantity}`);
        console.log(`🔍 Breakdown for ${asin}:`, asinMatches.map(item => 
          `${item.serial_number}: ${item.quantity} units`
        ).join(', '));
        
        return {
          type: 'ASIN',
          status: totalQuantity > 0 ? 'in-stock' : firstMatch.status,
          quantity: totalQuantity,
          identifier: firstMatch.asin,
          serialNumber: asinMatches.map(item => `${item.serial_number}(${item.quantity})`).join(', ')
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
  
  // Only show items that have actual inventory matches (either ASIN or SKU matches)
  const allMatchedOrders = poOrdersForThisPO.filter(order => {
    const inventoryMatch = findInventoryMatch(
      order.asin, 
      order.sunsky_sku?.sku_code, 
      order.sku_code, 
      order.model_number
    );
    return inventoryMatch !== null;
  });
  
  // Group orders by ASIN to prevent duplicates in the table
  // Each ASIN should appear only once per PO, even with partial fulfillments
  const matchedOrdersMap = new Map<string, any>();
  
  allMatchedOrders.forEach(order => {
    const asin = order.asin;
    if (!matchedOrdersMap.has(asin)) {
      matchedOrdersMap.set(asin, order);
    } else {
      // If we already have this ASIN, update with the most recent or pending order
      const existing = matchedOrdersMap.get(asin);
      
      // Prefer pending orders over closed/partial-fulfilled for display
      if (order.status === 'pending' && existing.status !== 'pending') {
        matchedOrdersMap.set(asin, order);
      }
      // If both are same status, prefer the more recent one
      else if (order.status === existing.status && new Date(order.created_at) > new Date(existing.created_at)) {
        matchedOrdersMap.set(asin, order);
      }
    }
  });
  
  const matchedOrders = Array.from(matchedOrdersMap.values()).sort((a, b) => {
    // Get inventory matches for both orders
    const inventoryMatchA = findInventoryMatch(a.asin, a.sunsky_sku?.sku_code, a.sku_code, a.model_number);
    const inventoryMatchB = findInventoryMatch(b.asin, b.sunsky_sku?.sku_code, b.sku_code, b.model_number);
    
    // Check if items have stock
    const hasStockA = inventoryMatchA && inventoryMatchA.quantity > 0;
    const hasStockB = inventoryMatchB && inventoryMatchB.quantity > 0;
    
    // Sort: in-stock items first (true sorts before false)
    return hasStockB ? (hasStockA ? 0 : 1) : (hasStockA ? -1 : 0);
  });

  // Filter orders based on search term
  const filteredOrders = matchedOrders.filter(order => {
    if (!searchTerm.trim()) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      order.asin?.toLowerCase().includes(searchLower) ||
      order.title?.toLowerCase().includes(searchLower) ||
      order.sku_code?.toLowerCase().includes(searchLower) ||
      order.model_number?.toLowerCase().includes(searchLower) ||
      order.sunsky_sku?.sku_code?.toLowerCase().includes(searchLower)
    );
  });

  // Calculate status progress
  const statusProgress: StatusProgress = matchedOrders.reduce((acc, order) => {
    if (order.status === 'pending' || order.status === 'closed') {
      acc[order.status as keyof Omit<StatusProgress, 'total'>]++;
    }
    acc.total++;
    return acc;
  }, { pending: 0, closed: 0, total: 0 });

  // Calculate progress percentage
  const progressPercentage = statusProgress.total > 0 
    ? (statusProgress.closed / statusProgress.total) * 100 
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

  // Print from stock details functionality
  const handlePrintFromStockDetails = () => {
    try {
      // Get items that were marked from stock
      const fromStockItems = matchedOrders.filter(order => itemsMarkedFromStock.has(order.id));
      
      if (fromStockItems.length === 0) {
        toast({
          title: "No From Stock Items",
          description: "No items have been marked as ordered from stock yet",
          variant: "destructive"
        });
        return;
      }

      // Create print window content
      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>PO ${poNumber} - From Stock Items</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px; 
              color: #333;
            }
            .header { 
              text-align: center; 
              margin-bottom: 30px; 
              border-bottom: 2px solid #ddd; 
              padding-bottom: 20px;
            }
            .summary { 
              background: #f8f9fa; 
              padding: 15px; 
              margin-bottom: 20px; 
              border-radius: 5px;
            }
            .item { 
              border: 1px solid #ddd; 
              margin-bottom: 15px; 
              border-radius: 5px; 
              padding: 15px;
              background: white;
            }
            .item-header { 
              font-weight: bold; 
              font-size: 16px; 
              margin-bottom: 10px;
              color: #2563eb;
            }
            .item-details { 
              display: grid; 
              grid-template-columns: 1fr 1fr; 
              gap: 20px;
            }
            .detail-section h4 { 
              margin: 0 0 8px 0; 
              font-size: 14px; 
              color: #666; 
              border-bottom: 1px solid #eee; 
              padding-bottom: 3px;
            }
            .detail-row { 
              margin-bottom: 5px; 
              font-size: 13px;
            }
            .detail-row strong { 
              color: #333; 
            }
            @media print {
              body { margin: 0; }
              .header { page-break-after: avoid; }
              .item { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>PO ${poNumber} - From Stock Items Report</h1>
            <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
          </div>
          
          <div class="summary">
            <h3>Summary</h3>
            <p><strong>Total From Stock Items:</strong> ${fromStockItems.length}</p>
            <p><strong>PO Number:</strong> ${poNumber}</p>
            <p><strong>Total Cost:</strong> ${currency} ${fromStockItems.reduce((sum, order) => sum + (order.total_cost || 0), 0).toFixed(2)}</p>
          </div>
          
          ${fromStockItems.map((order) => {
            const inventoryMatch = findInventoryMatch(order.asin, order.sunsky_sku?.sku_code, order.sku_code, order.model_number);
            const originalQuantity = order.quantity === 0 ? 'Completely Fulfilled' : order.quantity;
            
            return `
              <div class="item">
                <div class="item-header">${order.title || order.asin}</div>
                <div class="item-details">
                  <div class="detail-section">
                    <h4>Product Information</h4>
                    <div class="detail-row"><strong>ASIN:</strong> ${order.asin || 'N/A'}</div>
                    <div class="detail-row"><strong>SKU Code:</strong> ${order.sku_code || 'N/A'}</div>
                    <div class="detail-row"><strong>Model Number:</strong> ${order.model_number || 'N/A'}</div>
                    <div class="detail-row"><strong>Unit Cost:</strong> ${order.currency || ''} ${order.unit_cost || 'N/A'}</div>
                    <div class="detail-row"><strong>Total Cost:</strong> ${order.currency || ''} ${order.total_cost || 'N/A'}</div>
                  </div>
                  <div class="detail-section">
                    <h4>Stock Fulfillment Details</h4>
                    <div class="detail-row"><strong>Fulfillment Status:</strong> ${originalQuantity}</div>
                    <div class="detail-row"><strong>Current PO Quantity:</strong> ${order.quantity}</div>
                    <div class="detail-row"><strong>Current Inventory:</strong> ${inventoryMatch?.quantity || 0}</div>
                    <div class="detail-row"><strong>Inventory Type:</strong> ${inventoryMatch?.type || 'Not Found'}</div>
                    <div class="detail-row"><strong>Order Status:</strong> ${order.status}</div>
                    <div class="detail-row"><strong>Serial/Bin Number:</strong> ${inventoryMatch?.serialNumber || 'N/A'}</div>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </body>
        </html>
      `;

      // Open print window
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
      }

      toast({
        title: "Print Initiated",
        description: `Print dialog opened for ${fromStockItems.length} from stock items`
      });
    } catch (error) {
      console.error('Print error:', error);
      toast({
        title: "Print Failed",
        description: "Failed to print from stock details",
        variant: "destructive"
      });
    }
  };

  // Export from stock details functionality
  const handleExportFromStockDetails = () => {
    try {
      // Get items that were marked from stock
      const fromStockItems = matchedOrders.filter(order => itemsMarkedFromStock.has(order.id));
      
      if (fromStockItems.length === 0) {
        toast({
          title: "No From Stock Items",
          description: "No items have been marked as ordered from stock yet",
          variant: "destructive"
        });
        return;
      }

      // Prepare export data with stock deduction details
      const exportData = fromStockItems.map((order) => {
        const inventoryMatch = findInventoryMatch(order.asin, order.sunsky_sku?.sku_code, order.sku_code, order.model_number);
        // Calculate what the original quantity was before fulfillment
        const originalQuantity = order.quantity === 0 ? 'Fulfilled from Stock' : order.quantity;
        
        return {
          // Basic Order Information
          'PO Number': order.po_number,
          'Order ID': order.id,
          'ASIN': order.asin || '',
          'SKU Code': order.sku_code || '',
          'Model Number': order.model_number || '',
          'Title': order.title || '',
          
          // Stock Deduction Details
          'Original Order Quantity': originalQuantity,
          'Current PO Quantity': order.quantity,
          'Fulfillment Status': order.quantity === 0 ? 'Completely Fulfilled' : 'Partially Fulfilled',
          'Previous Inventory Stock': inventoryMatch ? `${inventoryMatch.quantity} (current)` : 'Unknown',
          'Inventory Type': inventoryMatch?.type || 'Not Found',
          'Inventory Identifier': inventoryMatch?.identifier || '',
          'Serial/Bin Number': inventoryMatch?.serialNumber || '',
          
          // Order Details
          'Unit Cost': order.unit_cost || '',
          'Total Cost': order.total_cost || '',
          'Currency': order.currency || '',
          'Status': order.status,
          'Order Date': order.order_date ? new Date(order.order_date).toLocaleDateString() : '',
          'Expected Delivery': order.expected_delivery ? new Date(order.expected_delivery).toLocaleDateString() : '',
          'Updated At': new Date(order.updated_at).toLocaleDateString(),
          
          // Sunsky Information
          'Sunsky SKU': order.sunsky_sku?.sku_code || '',
          'Sunsky Title': order.sunsky_sku?.title || '',
          'Sunsky Cost': order.sunsky_sku?.cost || '',
          
          // Additional Information
          'Notes': order.notes || '',
          'Ship To Location': order.ship_to_location || '',
          'File Name': order.file_name || ''
        };
      });

      // Convert to CSV
      const headers = Object.keys(exportData[0]);
      const csvContent = [
        headers.join(','),
        ...exportData.map(row => 
          headers.map(header => {
            const value = row[header as keyof typeof row];
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
      link.download = `PO_${poNumber}_FromStock_Details_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);

      toast({
        title: "Export Successful",
        description: `Exported ${exportData.length} from-stock items with stock deduction details`
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export from stock details",
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
        updateOrderStatus(orderId, 'closed')
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
    if (selectedItems.size === filteredOrders.length) {
      // Deselect all
      setSelectedItems(new Set());
      setSelectionType(null);
    } else {
      // Select all available items (first check what type we can select)
      if (selectionType === null) {
        // No current selection, select all items  
        setSelectedItems(new Set(filteredOrders.map(order => order.id)));
        // Don't set a specific type for select all
      } else {
        // Already have a selection type, only select items of the same type
        const compatibleItems = filteredOrders.filter(order => {
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

  // Handle partial fulfillment - split order between stock and supplier
  const handlePartialFulfillment = async (order: any, stockQuantity: number, remainingQuantity: number) => {
    console.log('🔄 Starting partial fulfillment:', {
      orderId: order.id,
      sku: order.sku_code,
      stockQuantity,
      remainingQuantity,
      totalQuantity: order.quantity
    });
    
    try {
      const inventoryMatch = findInventoryMatch(order.asin, order.sunsky_sku?.sku_code, order.sku_code, order.model_number);
      if (!inventoryMatch) {
        throw new Error('No inventory match found for partial fulfillment');
      }
      
      console.log('📦 Found inventory match for partial fulfillment:', inventoryMatch);
      
      // Get user ID once at the beginning
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Update inventory quantity by fetching individual records
      let inventoryError: any = null;
      
      if (inventoryMatch.type === 'ASIN') {
        // Get all ASIN inventory records for this ASIN
        const { data: asinRecords, error: fetchError } = await supabase
          .from('asin_inventory')
          .select('*')
          .eq('asin', inventoryMatch.identifier)
          .eq('user_id', userId)
          .gt('quantity', 0)
          .order('quantity', { ascending: false }); // Start with highest quantities
        
        if (fetchError) {
          throw new Error(`Failed to fetch ASIN inventory: ${fetchError.message}`);
        }
        
        if (!asinRecords || asinRecords.length === 0) {
          throw new Error(`No ASIN inventory records found for ${inventoryMatch.identifier}`);
        }
        
        // Deduct quantities from available records
        let remainingToDeduct = stockQuantity;
        const updatePromises = [];
        
        for (const record of asinRecords) {
          if (remainingToDeduct <= 0) break;
          
          const deductFromThis = Math.min(remainingToDeduct, record.quantity);
          const newQuantity = record.quantity - deductFromThis;
          
          updatePromises.push(
            supabase
              .from('asin_inventory')
              .update({ quantity: newQuantity })
              .eq('id', record.id)
              .eq('user_id', userId)
          );
          
          console.log(`📦 Partial fulfillment - Updating ASIN inventory: ${record.asin} (${record.serial_number}) from ${record.quantity} to ${newQuantity}`);
          remainingToDeduct -= deductFromThis;
        }
        
        if (remainingToDeduct > 0) {
          throw new Error(`Insufficient stock: tried to deduct ${stockQuantity} but only ${stockQuantity - remainingToDeduct} available`);
        }
        
        // Execute all updates
        const results = await Promise.all(updatePromises);
        const hasError = results.find(result => result.error);
        if (hasError) {
          inventoryError = hasError.error;
        }
      } else {
        // Handle SKU inventory update
        const { data: skuRecords, error: fetchError } = await supabase
          .from('sku_inventory')
          .select('*')
          .eq('sku_number', inventoryMatch.identifier)
          .eq('user_id', userId)
          .gt('quantity', 0)
          .order('quantity', { ascending: false });
        
        if (fetchError) {
          throw new Error(`Failed to fetch SKU inventory: ${fetchError.message}`);
        }
        
        if (!skuRecords || skuRecords.length === 0) {
          throw new Error(`No SKU inventory records found for ${inventoryMatch.identifier}`);
        }
        
        // Deduct quantities from available records
        let remainingToDeduct = stockQuantity;
        const updatePromises = [];
        
        for (const record of skuRecords) {
          if (remainingToDeduct <= 0) break;
          
          const deductFromThis = Math.min(remainingToDeduct, record.quantity);
          const newQuantity = record.quantity - deductFromThis;
          
          updatePromises.push(
            supabase
              .from('sku_inventory')
              .update({ quantity: newQuantity })
              .eq('id', record.id)
              .eq('user_id', userId)
          );
          
          console.log(`📦 Partial fulfillment - Updating SKU inventory: ${record.sku_number} (${record.bin_serial_number}) from ${record.quantity} to ${newQuantity}`);
          remainingToDeduct -= deductFromThis;
        }
        
        if (remainingToDeduct > 0) {
          throw new Error(`Insufficient stock: tried to deduct ${stockQuantity} but only ${stockQuantity - remainingToDeduct} available`);
        }
        
        // Execute all updates
        const results = await Promise.all(updatePromises);
        const hasError = results.find(result => result.error);
        if (hasError) {
          inventoryError = hasError.error;
        }
      }

      if (inventoryError) {
        console.error('Inventory update error:', inventoryError);
        toast({
          title: "Inventory Update Failed",
          description: `Failed to update inventory: ${inventoryError.message || 'Unknown error'}`,
          variant: "destructive"
        });
        return;
      }

      // Update the original order to show it was fulfilled from stock (but keep it visible)
      const { error: orderError } = await supabase
        .from('po_orders')
        .update({ 
          status: 'closed',
          quantity: stockQuantity,
          notes: `Fulfilled from stock: ${stockQuantity} pcs. Original quantity: ${order.quantity} pcs. Remaining ${remainingQuantity} pcs created as new pending order.`
        })
        .eq('id', order.id)
        .eq('user_id', userId);

      if (orderError) {
        console.error('Order update error:', orderError);
        toast({
          title: "Order Update Failed",
          description: "Failed to update order status",
          variant: "destructive"
        });
        return;
      }

      // Create a new order for the remaining quantity that needs to be ordered from supplier
      const timestamp = Date.now();
      const newOrderData = {
        user_id: order.user_id,
        sku_user_id: order.sku_user_id,
        po_number: `${order.po_number}_REMAIN_${timestamp}`,
        sku_code: `${order.sku_code}_REMAIN_${timestamp}`,
        file_name: `${order.file_name || 'partial'}_remaining_${timestamp}`,
        asin: order.asin,
        model_number: order.model_number,
        title: order.title,
        quantity: remainingQuantity,
        unit_cost: order.unit_cost,
        total_cost: order.unit_cost ? (order.unit_cost * remainingQuantity) : null,
        currency: order.currency,
        country: order.country,
        ship_to_location: order.ship_to_location,
        status: 'pending',
        external_id: `${order.external_id || order.id}_remaining_${Date.now()}`,
        external_id_type: order.external_id_type || 'partial_fulfillment',
        order_date: order.order_date,
        expected_delivery: order.expected_delivery,
        notes: `Remaining quantity from partial fulfillment. Original order quantity: ${order.quantity} pcs, fulfilled from stock: ${stockQuantity} pcs.`
      };
      
      console.log('📦 Creating new pending order:', newOrderData);
      
      const { data: newOrderData_result, error: newOrderError } = await supabase
        .from('po_orders')
        .insert(newOrderData)
        .select();

      if (newOrderError) {
        console.error('❌ New order creation failed:', {
          error: newOrderError,
          message: newOrderError.message,
          details: newOrderError.details,
          hint: newOrderError.hint,
          code: newOrderError.code,
          orderData: newOrderData
        });
        toast({
          title: "New Order Creation Failed",
          description: `Database error: ${newOrderError.message || 'Unknown error'}. Check console for details.`,
          variant: "destructive"
        });
        return;
      }
      
      console.log('✅ New pending order created successfully:', newOrderData_result);

      // Track this item as marked from stock
      setItemsMarkedFromStock(prev => {
        const newSet = new Set([...prev, order.id]);
        console.log('🏷️ Tracking partial fulfillment for order:', {
          orderId: order.id,
          sku: order.sku_code,
          originalQuantity: order.quantity,
          stockQuantity,
          remainingQuantity,
          currentTrackedItems: Array.from(newSet)
        });
        return newSet;
      });

      // Refresh data immediately to show the new pending order
      console.log('🔄 Refreshing PO data to show new pending order...');
      await fetchPOOrders();
      
      // Small delay to ensure state updates
      setTimeout(async () => {
        await fetchPOOrders();
        console.log('🔄 Second data refresh completed');
      }, 500);

      toast({
        title: "Partial Fulfillment Complete",
        description: `Fulfilled ${stockQuantity} pcs from stock, ${remainingQuantity} pcs remains pending for supplier order`
      });

    } catch (error) {
      console.error('Partial fulfillment error:', error);
      toast({
        title: "Partial Fulfillment Failed",
        description: "Failed to process partial fulfillment",
        variant: "destructive"
      });
    }
  };

  // Fix existing partial fulfillments that might not have created pending orders
  const handleFixExistingPartialFulfillments = async () => {
    try {
      console.log('🔧 Checking for existing partial fulfillments without pending orders...');
      
      // Find all fulfilled from stock orders
      const fulfilledOrders = poOrders.filter(order => 
        order.po_number === poNumber && 
        (order.notes?.includes('Fulfilled from stock:') || order.notes?.includes('Partial fulfillment from stock:'))
      );
      
      if (fulfilledOrders.length === 0) {
        toast({
          title: "No Partial Fulfillments",
          description: "No existing partial fulfillments found to fix",
        });
        return;
      }
      
      console.log('🔍 Found fulfilled orders:', fulfilledOrders);
      
      let createdCount = 0;
      
      for (const fulfilledOrder of fulfilledOrders) {
        // Extract original quantity and fulfilled quantity from notes
        const originalQtyMatch = fulfilledOrder.notes?.match(/Original quantity: (\d+) pcs/) || 
                               fulfilledOrder.notes?.match(/Original order quantity: (\d+) pcs/);
        const fulfilledQtyMatch = fulfilledOrder.notes?.match(/Fulfilled from stock: (\d+) pcs/) ||
                                 fulfilledOrder.notes?.match(/Partial fulfillment from stock: (\d+) pcs/);
        
        if (!originalQtyMatch || !fulfilledQtyMatch) {
          console.log(`⚠️ Could not extract quantities from notes for order ${fulfilledOrder.id}`);
          continue;
        }
        
        const originalQuantity = parseInt(originalQtyMatch[1]);
        const fulfilledQuantity = parseInt(fulfilledQtyMatch[1]);
        const remainingQuantity = originalQuantity - fulfilledQuantity;
        
        if (remainingQuantity <= 0) {
          console.log(`✅ No remaining quantity for order ${fulfilledOrder.id}`);
          continue;
        }
        
        // Check if pending order already exists
        const existingPendingOrder = poOrders.find(order =>
          order.po_number === poNumber &&
          order.sku_code === fulfilledOrder.sku_code &&
          order.asin === fulfilledOrder.asin &&
          order.status === 'pending' &&
          order.notes?.includes('Remaining quantity from partial fulfillment')
        );
        
        if (existingPendingOrder) {
          console.log(`✅ Pending order already exists for ${fulfilledOrder.sku_code}`);
          continue;
        }
        
        // Create the missing pending order
        const fixTimestamp = Date.now();
        const newOrderData = {
          user_id: fulfilledOrder.user_id,
          sku_user_id: fulfilledOrder.sku_user_id,
          po_number: `${fulfilledOrder.po_number}_FIX_${fixTimestamp}`,
          sku_code: `${fulfilledOrder.sku_code}_FIX_${fixTimestamp}`,
          file_name: `${fulfilledOrder.file_name || 'partial'}_remaining_fix_${fixTimestamp}`,
          asin: fulfilledOrder.asin,
          model_number: fulfilledOrder.model_number,
          title: fulfilledOrder.title,
          quantity: remainingQuantity,
          unit_cost: fulfilledOrder.unit_cost,
          total_cost: fulfilledOrder.unit_cost ? (fulfilledOrder.unit_cost * remainingQuantity) : null,
          currency: fulfilledOrder.currency,
          country: fulfilledOrder.country,
          ship_to_location: fulfilledOrder.ship_to_location,
          status: 'pending',
          external_id: `${fulfilledOrder.external_id || fulfilledOrder.id}_remaining_fix_${Date.now()}`,
          external_id_type: fulfilledOrder.external_id_type || 'partial_fulfillment_fix',
          order_date: fulfilledOrder.order_date,
          expected_delivery: fulfilledOrder.expected_delivery,
          notes: `Remaining quantity from partial fulfillment (FIXED). Original order quantity: ${originalQuantity} pcs, fulfilled from stock: ${fulfilledQuantity} pcs.`
        };
        
        console.log(`📦 Creating missing pending order for ${fulfilledOrder.sku_code}:`, newOrderData);
        
        const { data: newOrderResult, error: newOrderError } = await supabase
          .from('po_orders')
          .insert(newOrderData)
          .select();
          
        if (newOrderError) {
          console.error(`❌ Failed to create pending order for ${fulfilledOrder.sku_code}:`, newOrderError);
        } else {
          console.log(`✅ Created pending order for ${fulfilledOrder.sku_code}:`, newOrderResult);
          createdCount++;
        }
      }
      
      if (createdCount > 0) {
        // Refresh data to show new orders
        await fetchPOOrders();
        
        toast({
          title: "Fixed Partial Fulfillments",
          description: `Created ${createdCount} missing pending order(s) for existing partial fulfillments`
        });
      } else {
        toast({
          title: "All Good",
          description: "All existing partial fulfillments already have pending orders"
        });
      }
      
    } catch (error) {
      console.error('Error fixing existing partial fulfillments:', error);
      toast({
        title: "Fix Failed",
        description: "Failed to fix existing partial fulfillments",
        variant: "destructive"
      });
    }
  };

  // Reset partial fulfillments for testing
  const handleResetPartialFulfillments = async () => {
    try {
      console.log('🔄 Resetting partial fulfillments for items:', Array.from(itemsMarkedFromStock));
      
      // Get all orders that were marked from stock
      const ordersToReset = matchedOrders.filter(order => itemsMarkedFromStock.has(order.id));
      
      if (ordersToReset.length === 0) {
        toast({
          title: "No Partial Fulfillments",
          description: "No partial fulfillments to reset",
          variant: "default"
        });
        return;
      }

      const confirmed = window.confirm(
        `Are you sure you want to reset ${ordersToReset.length} partial fulfillment(s)?\n\n` +
        `This will:\n` +
        `• Remove fulfillment notes from orders\n` +
        `• Clear the tracking of items marked from stock\n` +
        `• Allow you to test the partial fulfillment process again\n\n` +
        `Note: This won't restore inventory quantities or delete created orders.`
      );
      
      if (!confirmed) {
        return;
      }

      // Remove fulfillment notes from each order
      for (const order of ordersToReset) {
        const originalNotes = order.notes || '';
        const updatedNotes = originalNotes
          .split('\n')
          .filter(line => 
            !line.includes('Partial fulfillment from stock:') && 
            !line.includes('Remaining quantity from partial fulfillment')
          )
          .join('\n')
          .trim();

        const { error } = await supabase
          .from('po_orders')
          .update({ 
            notes: updatedNotes || null
          })
          .eq('id', order.id);

        if (error) {
          console.error('Error resetting order notes:', error);
          toast({
            title: "Reset Failed",
            description: `Failed to reset notes for order ${order.sku_code}`,
            variant: "destructive"
          });
          return;
        }
      }

      // Clear the tracked items
      setItemsMarkedFromStock(new Set());
      
      // Refresh data
      await fetchPOOrders();
      
      toast({
        title: "Reset Complete",
        description: `Reset ${ordersToReset.length} partial fulfillment(s). You can now test the process again.`
      });
    } catch (error) {
      console.error('Error resetting partial fulfillments:', error);
      toast({
        title: "Reset Failed",
        description: "Failed to reset partial fulfillments",
        variant: "destructive"
      });
    }
  };

  // Reverse ASIN inventory deductions made from partial fulfillments
  const handleReverseInventoryDeductions = async () => {
    try {
      console.log('🔄 Starting inventory reversal process...');
      
      // Get all orders that were marked from stock today
      const ordersToReverse = matchedOrders.filter(order => {
        const isTracked = itemsMarkedFromStock.has(order.id);
        const hasPartialNote = order.notes?.includes('Partial fulfillment from stock');
        return isTracked && hasPartialNote;
      });
      
      if (ordersToReverse.length === 0) {
        toast({
          title: "No Items to Reverse",
          description: "No partial fulfillments found to reverse inventory for",
          variant: "default"
        });
        return;
      }

      console.log('📦 Orders to reverse inventory for:', ordersToReverse.map(o => ({
        id: o.id,
        asin: o.asin,
        sku: o.sku_code,
        quantity: o.quantity,
        notes: o.notes
      })));

      const confirmed = window.confirm(
        `Are you sure you want to reverse inventory deductions for ${ordersToReverse.length} item(s)?\n\n` +
        `This will:\n` +
        `• Add back the quantities that were deducted from ASIN inventory\n` +
        `• Restore inventory levels to before partial fulfillment\n` +
        `• Clear the partial fulfillment tracking\n\n` +
        `This action cannot be easily undone.`
      );
      
      if (!confirmed) {
        return;
      }

      let reversedCount = 0;
      let errors = [];

      for (const order of ordersToReverse) {
        try {
          // Parse how much was fulfilled from stock from the notes
          const fulfilledFromStockQty = order.quantity; // This is the quantity that was fulfilled from stock
          
          if (!order.asin || fulfilledFromStockQty <= 0) {
            console.log(`⚠️ Skipping ${order.sku_code}: No ASIN or invalid quantity`);
            continue;
          }

          console.log(`🔄 Reversing ${fulfilledFromStockQty} units for ASIN ${order.asin}`);

          // Find current ASIN inventory
          const { data: currentInventory, error: fetchError } = await supabase
            .from('asin_inventory')
            .select('id, quantity, asin, serial_number')
            .eq('asin', order.asin)
            .eq('user_id', (await supabase.auth.getUser()).data.user?.id);

          if (fetchError) {
            throw new Error(`Failed to fetch inventory for ${order.asin}: ${fetchError.message}`);
          }

          if (!currentInventory || currentInventory.length === 0) {
            errors.push(`No inventory record found for ASIN ${order.asin}`);
            continue;
          }

          // Update the first inventory record found (add back the quantity)
          const inventoryRecord = currentInventory[0];
          const newQuantity = inventoryRecord.quantity + fulfilledFromStockQty;

          const { error: updateError } = await supabase
            .from('asin_inventory')
            .update({ 
              quantity: newQuantity,
              status: newQuantity > 0 ? 'in-stock' : 'sold'
            })
            .eq('id', inventoryRecord.id);

          if (updateError) {
            throw new Error(`Failed to update inventory for ${order.asin}: ${updateError.message}`);
          }

          console.log(`✅ Successfully restored ${fulfilledFromStockQty} units to ASIN ${order.asin} (${inventoryRecord.quantity} → ${newQuantity})`);
          reversedCount++;

        } catch (error) {
          console.error(`❌ Error reversing inventory for order ${order.id}:`, error);
          errors.push(`${order.sku_code}: ${error.message}`);
        }
      }

      // Clear the tracked items after successful reversal
      if (reversedCount > 0) {
        setItemsMarkedFromStock(new Set());
        
        // Refresh inventory and PO data
        await Promise.all([
          fetchInventoryData(),
          fetchPOOrders()
        ]);
      }

      // Show results
      if (reversedCount > 0) {
        toast({
          title: "Inventory Reversal Complete",
          description: `Successfully reversed inventory deductions for ${reversedCount} item(s)${errors.length > 0 ? `. ${errors.length} errors occurred.` : ''}`
        });
      }

      if (errors.length > 0) {
        console.error('❌ Reversal errors:', errors);
        toast({
          title: "Some Reversals Failed",
          description: `${errors.length} items failed to reverse. Check console for details.`,
          variant: "destructive"
        });
      }

    } catch (error) {
      console.error('❌ Error in inventory reversal process:', error);
      toast({
        title: "Reversal Failed",
        description: "Failed to reverse inventory deductions",
        variant: "destructive"
      });
    }
  };

  // Mark item as ordered and reduce inventory stock
  const markAsOrderedFromInventory = async (order: any, partialQuantity?: number) => {
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

      const quantityToUse = partialQuantity || order.quantity;

      // Check if order quantity exceeds available stock - offer partial fulfillment
      if (order.quantity > inventoryMatch.quantity && !partialQuantity) {
        const availableStock = inventoryMatch.quantity;
        const remainingNeeded = order.quantity - availableStock;
        
        // Show confirmation dialog for partial fulfillment
        const confirmed = window.confirm(
          `Insufficient stock!\n\n` +
          `Needed: ${order.quantity} pcs\n` +
          `Available in stock: ${availableStock} pcs\n` +
          `Remaining needed: ${remainingNeeded} pcs\n\n` +
          `Would you like to:\n` +
          `• Use ${availableStock} pcs from stock\n` +
          `• Leave ${remainingNeeded} pcs as pending for Sunsky order\n\n` +
          `Click OK to proceed with partial fulfillment, Cancel to abort.`
        );
        
        if (!confirmed) {
          return;
        }
        
        // Use available stock and create partial fulfillment
        await handlePartialFulfillment(order, availableStock, remainingNeeded);
        return;
      }

      // Validate that we don't try to deduct more than available
      if (quantityToUse > inventoryMatch.quantity) {
        throw new Error(`Cannot deduct ${quantityToUse} units - only ${inventoryMatch.quantity} available in stock`);
      }

      // Get user ID once at the beginning
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Get the actual inventory records to update them properly
      let inventoryError: any = null;
      let deductedSerialNumbers = [];
      
      if (inventoryMatch.type === 'ASIN') {
        // Get all ASIN inventory records for this ASIN
        const { data: asinRecords, error: fetchError } = await supabase
          .from('asin_inventory')
          .select('*')
          .eq('asin', inventoryMatch.identifier)
          .eq('user_id', userId)
          .gt('quantity', 0)
          .order('quantity', { ascending: false }); // Start with highest quantities
        
        if (fetchError) {
          throw new Error(`Failed to fetch ASIN inventory: ${fetchError.message}`);
        }
        
        if (!asinRecords || asinRecords.length === 0) {
          throw new Error(`No ASIN inventory records found for ${inventoryMatch.identifier}`);
        }
        
        // Deduct quantities from available records
        let remainingToDeduct = quantityToUse;
        const updatePromises = [];
        const deductedSerialNumbers = [];
        
        for (const record of asinRecords) {
          if (remainingToDeduct <= 0) break;
          
          const deductFromThis = Math.min(remainingToDeduct, record.quantity);
          const newQuantity = record.quantity - deductFromThis;
          
          // Collect serial numbers for the notes
          if (record.serial_number) {
            for (let i = 0; i < deductFromThis; i++) {
              deductedSerialNumbers.push(record.serial_number);
            }
          }
          
          updatePromises.push(
            supabase
              .from('asin_inventory')
              .update({ quantity: newQuantity })
              .eq('id', record.id)
              .eq('user_id', userId)
          );
          
          console.log(`📦 Updating ASIN inventory: ${record.asin} (${record.serial_number}) from ${record.quantity} to ${newQuantity}`);
          remainingToDeduct -= deductFromThis;
        }
        
        if (remainingToDeduct > 0) {
          throw new Error(`Insufficient stock: tried to deduct ${quantityToUse} but only ${quantityToUse - remainingToDeduct} available`);
        }
        
        // Execute all updates
        const results = await Promise.all(updatePromises);
        const hasError = results.find(result => result.error);
        if (hasError) {
          inventoryError = hasError.error;
        }
      } else {
        // Handle SKU inventory update
        const { data: skuRecords, error: fetchError } = await supabase
          .from('sku_inventory')
          .select('*')
          .eq('sku_number', inventoryMatch.identifier)
          .eq('user_id', userId)
          .gt('quantity', 0)
          .order('quantity', { ascending: false });
        
        if (fetchError) {
          throw new Error(`Failed to fetch SKU inventory: ${fetchError.message}`);
        }
        
        if (!skuRecords || skuRecords.length === 0) {
          throw new Error(`No SKU inventory records found for ${inventoryMatch.identifier}`);
        }
        
        // Deduct quantities from available records
        let remainingToDeduct = quantityToUse;
        const updatePromises = [];
        const deductedSerialNumbers = [];
        
        for (const record of skuRecords) {
          if (remainingToDeduct <= 0) break;
          
          const deductFromThis = Math.min(remainingToDeduct, record.quantity);
          const newQuantity = record.quantity - deductFromThis;
          
          // Collect serial numbers for the notes
          if (record.bin_serial_number) {
            for (let i = 0; i < deductFromThis; i++) {
              deductedSerialNumbers.push(record.bin_serial_number);
            }
          }
          
          updatePromises.push(
            supabase
              .from('sku_inventory')
              .update({ quantity: newQuantity })
              .eq('id', record.id)
              .eq('user_id', userId)
          );
          
          console.log(`📦 Updating SKU inventory: ${record.sku_number} (${record.bin_serial_number}) from ${record.quantity} to ${newQuantity}`);
          remainingToDeduct -= deductFromThis;
        }
        
        if (remainingToDeduct > 0) {
          throw new Error(`Insufficient stock: tried to deduct ${quantityToUse} but only ${quantityToUse - remainingToDeduct} available`);
        }
        
        // Execute all updates
        const results = await Promise.all(updatePromises);
        const hasError = results.find(result => result.error);
        if (hasError) {
          inventoryError = hasError.error;
        }
      }

      if (inventoryError) {
        console.error('Inventory update error:', inventoryError);
        throw new Error(`Failed to update inventory: ${inventoryError.message || 'Unknown error'}`);
      }

      // Update PO order quantity to 0 and status to 'closed' (fulfilled from stock)
      console.log('🔄 Updating PO order:', {
        orderId: order.id,
        userId: userId,
        quantityToUse,
        inventoryType: inventoryMatch.type,
        identifier: inventoryMatch.identifier
      });

      // Create notes with serial numbers
      const serialNumbersText = deductedSerialNumbers.length > 0 
        ? `/${deductedSerialNumbers.join(',')}`
        : '';
      
      const { error: poError } = await supabase
        .from('po_orders')
        .update({ 
          quantity: 0,
          status: 'closed',
          notes: `Fulfilled from stock: ${quantityToUse} units deducted from ${inventoryMatch.type} inventory (${inventoryMatch.identifier}${serialNumbersText})`
        })
        .eq('id', order.id)
        .eq('user_id', userId);

      if (poError) {
        console.error('PO order update error:', poError);
        throw new Error(`Failed to update PO order: ${poError.message || 'Unknown error'}`);
      }

      console.log('✅ PO order updated successfully');

      // Add to items marked from stock - IMPORTANT: Add this before any async operations
      console.log('Adding item to itemsMarkedFromStock:', order.id, order.sku_code);
      setItemsMarkedFromStock(prev => {
        const newSet = new Set(prev);
        newSet.add(order.id);
        console.log('Updated itemsMarkedFromStock size:', newSet.size);
        return newSet;
      });

      // Refresh data
      await Promise.all([fetchInventoryData(), fetchPOOrders()]);

      toast({
        title: "Item Marked as Ordered",
        description: `Order fulfilled from stock: ${quantityToUse} units deducted from inventory. PO quantity set to 0.`
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

      // Also update the status to 'closed' and set order_date
      const statusUpdatePromises = selectedOrderIds.map(orderId => 
        updateOrderStatus(orderId, 'closed')
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

    // Check if selected items have Sunsky SKUs and filter out 0-quantity items
    const selectedOrdersData = matchedOrders.filter(order => selectedItems.has(order.id));
    
    // First filter out items with 0 quantity (complete fulfillments)
    const itemsWithQuantity = selectedOrdersData.filter(order => order.quantity > 0);
    
    if (itemsWithQuantity.length === 0) {
      toast({
        title: "No Valid Items",
        description: "All selected items have been completely fulfilled (0 quantity). No items to order from Sunsky.",
        variant: "destructive"
      });
      return;
    }

    if (itemsWithQuantity.length < selectedOrdersData.length) {
      toast({
        title: "Some Items Excluded",
        description: `${selectedOrdersData.length - itemsWithQuantity.length} item(s) excluded as they have 0 quantity (completely fulfilled)`,
      });
    }
    
    // Filter items that have valid Sunsky SKU matches
    const itemsWithSunskyData = itemsWithQuantity.filter(order => 
      order.sunsky_sku // sunsky_sku is now a string (the matched SKU) or null
    );

    if (itemsWithSunskyData.length === 0) {
      toast({
        title: "No Sunsky Data",
        description: "Selected items don't have Sunsky SKU information",
        variant: "destructive"
      });
      return;
    }

    if (itemsWithSunskyData.length < itemsWithQuantity.length) {
      toast({
        title: "Some Items Missing Sunsky Data",
        description: `Only ${itemsWithSunskyData.length} of ${selectedOrdersData.length} selected items have Sunsky data`,
      });
    }

    setSunskyOrderDialogOpen(true);
  };

  // Handle print functionality
  const handlePrint = () => {
    const printColumns = Array.from(selectedPrintColumns);
    if (printColumns.length === 0) {
      toast({
        title: "No Columns Selected",
        description: "Please select at least one column to print",
        variant: "destructive"
      });
      return;
    }

    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: "Popup Blocked",
        description: "Please allow popups for this site to enable printing",
        variant: "destructive"
      });
      return;
    }

    // Generate HTML content for printing
    const printContent = generatePrintHTML(matchedOrders, printColumns);
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Auto-focus and print
    printWindow.focus();
    printWindow.print();
  };

  // Generate HTML for printing
  const generatePrintHTML = (orders: any[], columns: string[]) => {
    const columnLabels: { [key: string]: string } = {
      'asin': 'ASIN',
      'title': 'Product Title',
      'model_number': 'Model Number',
      'sku_code': 'SKU Code',
      'quantity': 'Quantity',
      'unit_cost': 'Unit Cost',
      'total_cost': 'Total Cost',
      'status': 'Status',
      'tracking_number': 'Tracking Number',
      'supplier_order_number': 'Supplier Order#',
      'inventory_status': 'Inventory Status',
      'expected_delivery': 'Expected Delivery'
    };

    const headers = columns.map(col => columnLabels[col] || col).join('</th><th>');
    
    const rows = orders.map(order => {
      const inventoryMatch = findInventoryMatch(order.asin, order.sunsky_sku?.sku_code, order.sku_code, order.model_number);
      const inventoryStatus = inventoryMatch ? 
        `${inventoryMatch.status} (Qty: ${inventoryMatch.quantity})` : 
        'Not in inventory';

      const cellData = columns.map(col => {
        switch (col) {
          case 'asin': return order.asin || '-';
          case 'title': return order.title || '-';
          case 'model_number': return order.model_number || '-';
          case 'sku_code': return order.sunsky_sku?.sku_code || order.sku_code || '-';
          case 'quantity': return order.quantity || '0';
          case 'unit_cost': return order.unit_cost ? `$${order.unit_cost}` : '-';
          case 'total_cost': return order.total_cost ? `$${order.total_cost}` : '-';
          case 'status': return order.status || '-';
          case 'tracking_number': return order.tracking_number || '-';
          case 'supplier_order_number': return order.supplier_order_number || '-';
          case 'inventory_status': return inventoryStatus;
          case 'expected_delivery': return order.expected_delivery ? 
            new Date(order.expected_delivery).toLocaleDateString() : '-';
          default: return '-';
        }
      });
      
      return `<tr><td>${cellData.join('</td><td>')}</td></tr>`;
    }).join('');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>PO ${poNumber} - Print Report</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px; 
              color: #333;
            }
            h1 { 
              color: #2563eb; 
              border-bottom: 2px solid #e5e7eb; 
              padding-bottom: 10px;
              margin-bottom: 20px;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-top: 20px;
              box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            }
            th, td { 
              border: 1px solid #d1d5db; 
              padding: 8px 12px; 
              text-align: left;
              font-size: 12px;
            }
            th { 
              background-color: #f3f4f6; 
              font-weight: bold;
              color: #374151;
            }
            tr:nth-child(even) { 
              background-color: #f9fafb; 
            }
            .summary {
              background-color: #eff6ff;
              padding: 15px;
              border-radius: 8px;
              margin-bottom: 20px;
              border-left: 4px solid #2563eb;
            }
            @media print {
              body { margin: 0; }
              .summary { break-inside: avoid; }
              table { font-size: 10px; }
              th, td { padding: 6px 8px; }
            }
          </style>
        </head>
        <body>
          <h1>Purchase Order ${poNumber} - Detailed Report</h1>
          <div class="summary">
            <strong>Print Date:</strong> ${new Date().toLocaleString()}<br>
            <strong>Total Items:</strong> ${orders.length}<br>
            <strong>Selected Columns:</strong> ${columns.length}
          </div>
          <table>
            <thead>
              <tr><th>${headers}</th></tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </body>
      </html>
    `;
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
      <div className="glass-container mx-6 my-4 p-8 animate-fade-in">
        {/* Header Section */}
        <div className="flex items-center justify-between mb-8 pb-6 border-b border-gradient">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={() => navigate('/po-tracker')}
              className="hover-scale transition-all duration-200 bg-white/50 hover:bg-white/70 border-primary/20"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to PO Tracker
            </Button>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              PO {poNumber} Details
            </h1>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={async () => {
                setLoading(true);
                try {
                  await Promise.all([
                    fetchPOOrders(),
                    fetchInventoryData()
                  ]);
                  toast({
                    title: "Success",
                    description: "PO data refreshed with latest SKU matches",
                  });
                } catch (error) {
                  console.error('Error refreshing PO data:', error);
                  toast({
                    title: "Error",
                    description: "Failed to refresh PO data",
                    variant: "destructive",
                  });
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
              className="gap-2 hover-scale transition-all duration-200 bg-white/50 hover:bg-white/70 border-primary/20"
              title="Refresh to show newly imported SKU matches"
            >
              <RotateCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            
            {/* Print Dialog */}
            <Dialog open={printDialogOpen} onOpenChange={setPrintDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Printer className="h-4 w-4" />
                  Print
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Print Options</DialogTitle>
                  <DialogDescription>
                    Select which columns to include in the printout
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3">
                    {[
                      { key: 'asin', label: 'ASIN' },
                      { key: 'title', label: 'Product Title' },
                      { key: 'model_number', label: 'Model Number' },
                      { key: 'sku_code', label: 'SKU Code' },
                      { key: 'quantity', label: 'Quantity' },
                      { key: 'unit_cost', label: 'Unit Cost' },
                      { key: 'total_cost', label: 'Total Cost' },
                      { key: 'status', label: 'Status' },
                      { key: 'tracking_number', label: 'Tracking Number' },
                      { key: 'supplier_order_number', label: 'Supplier Order#' },
                      { key: 'inventory_status', label: 'Inventory Status' },
                      { key: 'expected_delivery', label: 'Expected Delivery' }
                    ].map(column => (
                      <div key={column.key} className="flex items-center space-x-2">
                        <Checkbox
                          id={column.key}
                          checked={selectedPrintColumns.has(column.key)}
                          onCheckedChange={(checked) => {
                            const newColumns = new Set(selectedPrintColumns);
                            if (checked) {
                              newColumns.add(column.key);
                            } else {
                              newColumns.delete(column.key);
                            }
                            setSelectedPrintColumns(newColumns);
                          }}
                        />
                        <Label htmlFor={column.key} className="text-sm font-medium">
                          {column.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setPrintDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => {
                    handlePrint();
                    setPrintDialogOpen(false);
                  }}>
                    Print
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
            <Dialog>
              <DialogTrigger asChild>
                <Button 
                  variant="outline"
                  className="gap-2"
                  disabled={itemsMarkedFromStock.size === 0}
                >
                  <Package className="h-4 w-4" />
                  {(() => {
                    const fromStockItems = matchedOrders.filter(order => itemsMarkedFromStock.has(order.id));
                    const partialFulfillments = fromStockItems.filter(order => 
                      order.notes?.includes('Partial fulfillment from stock')
                    );
                    const completeFulfillments = fromStockItems.filter(order => 
                      !order.notes?.includes('Partial fulfillment from stock')
                    );
                    
                    if (partialFulfillments.length > 0 && completeFulfillments.length > 0) {
                      return `Preview From Stock (${itemsMarkedFromStock.size}: ${completeFulfillments.length} complete, ${partialFulfillments.length} partial)`;
                    } else if (partialFulfillments.length > 0) {
                      return `Preview From Stock (${itemsMarkedFromStock.size} partial fulfillments)`;
                    } else {
                      return `Preview From Stock (${itemsMarkedFromStock.size} complete)`;
                    }
                  })()}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Items Fulfilled From Stock - All Deductions</DialogTitle>
                  <DialogDescription>
                    All items where inventory was deducted from stock (both partial and complete fulfillments)
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {(() => {
                    // Show ALL items that are tracked, not just partial fulfillments
                    const fromStockItems = matchedOrders.filter(order => {
                      const isTracked = itemsMarkedFromStock.has(order.id);
                      // Show all tracked items, both partial and complete fulfillments
                      return isTracked;
                    });
                    
                    // Debug specific ASINs that user mentioned
                    const specificAsins = ['B0DYGGNWP5', 'B0DYG4TT9H'];
                    const asinOrders = matchedOrders.filter(order => 
                      specificAsins.includes(order.asin)
                    );
                    
                    console.log('🔍 Preview From Stock Debug (All Tracked Items):', {
                      totalOrders: matchedOrders.length,
                      itemsMarkedFromStockSet: Array.from(itemsMarkedFromStock),
                      fromStockItemsFound: fromStockItems.length,
                      fromStockItems: fromStockItems.map(o => ({
                        id: o.id,
                        asin: o.asin,
                        sku: o.sku_code,
                        quantity: o.quantity,
                        status: o.status,
                        notes: o.notes?.substring(0, 100),
                        isPartial: o.notes?.includes('Partial fulfillment from stock')
                      }))
                    });
                    
                    console.log('🎯 Specific ASINs Debug:', {
                      searchingFor: specificAsins,
                      foundOrders: asinOrders.map(o => ({
                        id: o.id,
                        asin: o.asin,
                        sku: o.sku_code,
                        quantity: o.quantity,
                        status: o.status,
                        notes: o.notes,
                        isTracked: itemsMarkedFromStock.has(o.id),
                        inFromStockItems: fromStockItems.some(item => item.id === o.id)
                      }))
                    });
                    
                    // Also log all orders that contain EDA006069619A for debugging
                    const edaOrders = matchedOrders.filter(o => 
                      o.sku_code?.includes('EDA006069619A') || 
                      o.sunsky_sku?.sku_code?.includes('EDA006069619A') ||
                      o.model_number?.includes('EDA006069619A')
                    );
                    if (edaOrders.length > 0) {
                      console.log('📦 EDA006069619A Orders Found:', edaOrders.map(o => ({
                        id: o.id,
                        sku: o.sku_code,
                        quantity: o.quantity,
                        status: o.status,
                        notes: o.notes,
                        isMarkedFromStock: itemsMarkedFromStock.has(o.id),
                        isPartialFulfillment: o.notes?.includes('Partial fulfillment from stock')
                      })));
                    }
                    
                     if (fromStockItems.length === 0) {
                      return (
                        <div className="text-center py-8">
                          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                          <p className="text-muted-foreground">No items fulfilled from stock found</p>
                          <p className="text-sm text-muted-foreground mt-2">
                            Items that have been marked as fulfilled from stock will appear here
                          </p>
                        </div>
                      );
                     }
                     
                     // Return the mapped items as an array
                     return fromStockItems.map((order) => {
                       const inventoryMatch = findInventoryMatch(order.asin, order.sunsky_sku?.sku_code, order.sku_code, order.model_number);
                    
                    // Parse fulfillment info from notes
                    const isPartialFulfillment = order.notes?.includes('Partial fulfillment from stock');
                    const originalQtyMatch = order.notes?.match(/Original quantity: (\d+) pcs/);
                    const originalQuantity = originalQtyMatch ? parseInt(originalQtyMatch[1]) : order.quantity;
                    const fulfilledFromStock = order.quantity; // Current quantity is what was fulfilled from stock
                    const remainingQuantity = originalQuantity - fulfilledFromStock;
                    
                    return (
                      <Card key={order.id}>
                        <CardContent className="p-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <h4 className="font-semibold text-sm">Product Details</h4>
                              <div className="text-xs space-y-1 mt-2">
                                <div><strong>ASIN:</strong> {order.asin}</div>
                                <div><strong>Title:</strong> {order.title}</div>
                                <div><strong>SKU:</strong> {order.sku_code}</div>
                                {order.model_number && <div><strong>Model:</strong> {order.model_number}</div>}
                              </div>
                            </div>
                            <div>
                              <h4 className="font-semibold text-sm">Stock Fulfillment Details</h4>
                              <div className="text-xs space-y-1 mt-2">
                                {isPartialFulfillment ? (
                                  <>
                                    <div className="bg-blue-50 p-2 rounded border-l-4 border-blue-400">
                                      <div className="font-semibold text-blue-800">Partial Fulfillment</div>
                                      <div><strong>Total Original:</strong> {originalQuantity} pcs</div>
                                      <div className="text-green-700"><strong>✓ From Stock:</strong> {fulfilledFromStock} pcs</div>
                                      <div className="text-orange-600"><strong>⏳ Pending:</strong> {remainingQuantity} pcs</div>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div className="bg-green-50 p-2 rounded border-l-4 border-green-400">
                                      <div className="font-semibold text-green-800">Complete Fulfillment</div>
                                      <div><strong>✓ From Stock:</strong> {fulfilledFromStock} pcs</div>
                                    </div>
                                   </>
                                 )}
                                 <div><strong>Current Inventory:</strong> {inventoryMatch?.quantity || 0}</div>
                                 <div><strong>Inventory Type:</strong> {inventoryMatch?.type || 'Not Found'}</div>
                                 <div><strong>Status:</strong> {order.status}</div>
                               </div>
                             </div>
                           </div>
                         </CardContent>
                       </Card>
                     );
                   });
                 })()}
                </div>
                <DialogFooter className="gap-2">
                  <Button onClick={handlePrintFromStockDetails} variant="outline" className="gap-2">
                    <Printer className="h-4 w-4" />
                    Print
                  </Button>
                  <Button onClick={handleExportFromStockDetails} className="gap-2">
                    <Download className="h-4 w-4" />
                    Export CSV
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button 
              onClick={handleExportPO} 
              className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
            >
              <Download className="h-4 w-4" />
              Export PO Details
            </Button>
          </div>
         </div>

         {/* Debug & Fix Tools */}
         <div className="p-4 bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 rounded-xl border border-orange-200 dark:border-orange-800 shadow-sm mb-6">
           <div className="flex items-center justify-between mb-3">
             <div className="flex items-center gap-3">
               <div className="p-2 bg-orange-100 dark:bg-orange-800 rounded-lg">
                 <Settings className="h-5 w-5 text-orange-600 dark:text-orange-300" />
               </div>
               <div>
                 <p className="text-sm font-medium text-orange-800 dark:text-orange-200">Debug & Fix Tools</p>
                 <p className="text-xs text-orange-600 dark:text-orange-400">Fix existing partial fulfillments and debug issues</p>
               </div>
             </div>
           </div>
           <div className="flex gap-2">
             <Button 
               onClick={handleFixExistingPartialFulfillments}
               variant="outline" 
               size="sm" 
               className="border-orange-300 text-orange-700 hover:bg-orange-50 gap-2"
             >
               <Package className="h-4 w-4" />
               Fix Missing Pending Orders
             </Button>
             <Button 
               onClick={handleResetPartialFulfillments}
               variant="outline" 
               size="sm" 
               className="border-orange-300 text-orange-700 hover:bg-orange-50 gap-2"
               disabled={itemsMarkedFromStock.size === 0}
             >
               <RotateCcw className="h-4 w-4" />
               Reset Partial Fulfillments
             </Button>
             <Button 
               onClick={handleReverseInventoryDeductions}
               variant="outline" 
               size="sm" 
               className="border-orange-300 text-orange-700 hover:bg-orange-50 gap-2"
               disabled={itemsMarkedFromStock.size === 0}
             >
               <Undo className="h-4 w-4" />
               Reverse Inventory Deductions
             </Button>
           </div>
         </div>

         {/* Action Control Center */}
         <div className="space-y-6 mb-8">
          {/* Instructions */}
          {selectedItems.size === 0 && (
            <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl border border-blue-200 dark:border-blue-800 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg">
                  <Info className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Getting Started</p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    Select items using checkboxes to unlock bulk operations and ordering capabilities
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Selection Status */}
          {selectedItems.size > 0 && (
            <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-100 dark:bg-emerald-800 rounded-full">
                  <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
                </div>
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-800 dark:text-emerald-100">
                  {selectedItems.size} items selected
                </Badge>
              </div>
              <div className="text-xs text-emerald-700 dark:text-emerald-300">
                {selectionType === 'instock' ? '📦 In-stock items selected' : 
                 selectionType === 'outstock' ? '🔄 Out-of-stock items selected' : 
                 '📋 Mixed selection'}
              </div>
            </div>
          )}

          {/* Action Button Groups */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            
            {/* 1. Inventory Management */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-green-100 dark:bg-green-800 rounded-lg">
                  <Package className="h-4 w-4 text-green-600 dark:text-green-300" />
                </div>
                <h3 className="text-sm font-semibold text-green-800 dark:text-green-200">Inventory</h3>
              </div>
              
              {/* Enhanced Bulk From Stock - with confirmation dialog */}
              {selectionType === 'instock' && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      size="sm"
                      className="w-full bg-green-600 hover:bg-green-700 text-white disabled:bg-green-300 disabled:cursor-not-allowed transition-all duration-200 hover-scale"
                      disabled={isUpdating || selectedItems.size === 0}
                    >
                      <PackageCheck className="h-4 w-4 mr-2" />
                      Bulk From Stock ({selectedItems.size})
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Bulk From Stock Fulfillment</DialogTitle>
                      <DialogDescription>
                        Fulfill {selectedItems.size} selected items from inventory stock. This will:
                        <br />• Deduct quantities from your inventory
                        <br />• Mark items as fulfilled from stock
                        <br />• Update order status accordingly
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                        <h4 className="font-semibold text-green-800 dark:text-green-200 mb-3">
                          Items to fulfill from stock:
                        </h4>
                        <div className="space-y-2">
                          {Array.from(selectedItems).map((orderId) => {
                            const order = matchedOrders.find(o => o.id === orderId);
                            if (!order) return null;
                            
                            const inventoryMatch = findInventoryMatch(
                              order.asin, 
                              order.sunsky_sku?.sku_code, 
                              order.sku_code, 
                              order.model_number
                            );
                            const availableStock = inventoryMatch?.quantity || 0;
                            const fulfillQuantity = Math.min(order.quantity, availableStock);
                            
                            return (
                              <div key={orderId} className="flex items-center justify-between text-sm">
                                <div>
                                  <span className="font-mono font-medium">{order.asin}</span>
                                  {order.title && (
                                    <span className="text-muted-foreground ml-2">
                                      {order.title.substring(0, 50)}...
                                    </span>
                                  )}
                                </div>
                                <div className="text-right">
                                  <div className="font-semibold text-green-700 dark:text-green-300">
                                    {fulfillQuantity} of {order.quantity} units
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    Stock: {availableStock} available
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      
                      <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg">
                        <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="text-sm font-medium">Important:</span>
                        </div>
                        <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                          This action will immediately deduct inventory quantities and cannot be easily undone. 
                          Please verify the items and quantities before proceeding.
                        </p>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline">
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleBulkMarkFromInventory}
                        disabled={isUpdating}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {isUpdating ? (
                          <>
                            <Clock className="h-4 w-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <PackageCheck className="h-4 w-4 mr-2" />
                            Fulfill from Stock
                          </>
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
              
              <Button 
                size="sm" 
                variant="outline"
                className="w-full border-green-200 hover:bg-green-50 hover:border-green-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
                onClick={handleBulkMarkFromSupplier}
                disabled={isUpdating || selectedItems.size === 0}
              >
                <Truck className="h-4 w-4 mr-2" />
                Mark From Supplier
              </Button>
            </div>

            {/* 2. Supplier Operations */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-orange-100 dark:bg-orange-800 rounded-lg">
                  <ShoppingCart className="h-4 w-4 text-orange-600 dark:text-orange-300" />
                </div>
                <h3 className="text-sm font-semibold text-orange-800 dark:text-orange-200">Supplier</h3>
              </div>
              
              <Button 
                size="sm" 
                className="w-full bg-orange-600 hover:bg-orange-700 text-white disabled:bg-orange-300 disabled:cursor-not-allowed transition-all duration-200 hover-scale"
                onClick={handleOpenSunskyOrder}
                disabled={isUpdating || selectedItems.size === 0 || 
                  !matchedOrders.filter(order => selectedItems.has(order.id) && order.sunsky_sku).length}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Order at Sunsky
              </Button>
            </div>

            {/* 3. Tracking & Updates */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-blue-100 dark:bg-blue-800 rounded-lg">
                  <Clock className="h-4 w-4 text-blue-600 dark:text-blue-300" />
                </div>
                <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-200">Tracking</h3>
              </div>
              
              <Dialog>
                <DialogTrigger asChild>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="w-full border-blue-200 hover:bg-blue-50 hover:border-blue-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
                    disabled={selectedItems.size === 0}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Update Selected
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md bg-background border shadow-lg">
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
              
              <Dialog>
                <DialogTrigger asChild>
                  <Button 
                    size="sm"
                    variant="outline" 
                    className="w-full border-blue-200 hover:bg-blue-50 hover:border-blue-300 transition-all duration-200"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Update All Items
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

            {/* 4. Utilities */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <Edit className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                </div>
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Utilities</h3>
              </div>
              
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full border-red-200 hover:bg-red-50 hover:border-red-300 hover:text-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
                onClick={() => {
                  setSelectedItems(new Set());
                  setSelectionType(null);
                }}
                disabled={selectedItems.size === 0}
              >
                <X className="h-4 w-4 mr-2" />
                Clear Selection
              </Button>
            </div>
          </div>
        </div>


        {/* Items Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Order Items ({filteredOrders.length} of {matchedOrders.length} items)</CardTitle>
              <div className="relative w-80">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search by ASIN, title, SKU, or model number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                     <Checkbox
                       checked={selectedItems.size === filteredOrders.length && filteredOrders.length > 0}
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
                 {filteredOrders.map((order) => {
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
                           {(() => {
                             // Check for different partial fulfillment scenarios
                             const isFromStock = order.notes?.includes("Fulfilled from stock:");
                             const isPartialFulfillment = order.notes?.includes("Partial fulfillment from stock");
                             const isRemainingQuantity = order.notes?.includes("Remaining quantity from partial fulfillment");
                             
                             console.log("🔍 Quantity Display Debug:", {
                               orderId: order.id,
                               sku: order.sku_code,
                               orderQuantity: order.quantity,
                               notes: order.notes,
                               isFromStock,
                               isPartialFulfillment,
                               isRemainingQuantity
                             });
                             
                              if (isFromStock) {
                                // For new format, the order.quantity contains the fulfilled quantity
                                // But also try to parse from notes as backup
                                const fulfilledMatch = order.notes?.match(/Fulfilled from stock: (\d+) pcs/);
                                let fulfilledQuantity = fulfilledMatch ? parseInt(fulfilledMatch[1]) : order.quantity;
                                
                                // If still 0 or invalid, try to parse original quantity and calculate
                                if (!fulfilledQuantity || fulfilledQuantity <= 0) {
                                  const originalMatch = order.notes?.match(/Original quantity: (\d+) pcs/);
                                  if (originalMatch) {
                                    fulfilledQuantity = parseInt(originalMatch[1]);
                                  }
                                }
                                
                                // Ensure we have a valid number
                                fulfilledQuantity = fulfilledQuantity || 1;
                                
                                console.log("📦 From Stock Display:", { 
                                  notes: order.notes, 
                                  fulfilledMatch, 
                                  fulfilledQuantity, 
                                  orderQuantity: order.quantity 
                                });
                                
                                return (
                                  <div className="space-y-1">
                                    <div className="text-sm font-semibold text-green-700 flex items-center gap-1">
                                      ✓ {fulfilledQuantity} fulfilled from stock
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      Status: Completed
                                    </div>
                                  </div>
                                );
                              } else if (isPartialFulfillment) {
                                // Legacy partial fulfillment format - quantity is 0, need to parse from notes
                                const fulfilledMatch = order.notes?.match(/Partial fulfillment from stock: (\d+) pcs/);
                                let fulfilledQuantity = fulfilledMatch ? parseInt(fulfilledMatch[1]) : 0;
                                
                                // If no match, try other patterns
                                if (!fulfilledQuantity) {
                                  const altMatch = order.notes?.match(/(\d+) pcs/);
                                  fulfilledQuantity = altMatch ? parseInt(altMatch[1]) : 1;
                                }
                                
                                console.log("🔄 Legacy Partial Display:", { 
                                  notes: order.notes, 
                                  fulfilledMatch, 
                                  fulfilledQuantity, 
                                  orderQuantity: order.quantity 
                                });
                                
                                return (
                                  <div className="space-y-1">
                                    <div className="text-sm font-semibold text-green-700 flex items-center gap-1">
                                      ✓ {fulfilledQuantity} fulfilled from stock
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      Status: Completed
                                    </div>
                                  </div>
                                );
                             } else if (isRemainingQuantity) {
                               // This is the remaining portion - show as pending
                               const originalQtyMatch = order.notes?.match(/Original order quantity: (\d+) pcs/);
                               const fulfilledQtyMatch = order.notes?.match(/fulfilled from stock: (\d+) pcs/);
                               const originalQuantity = originalQtyMatch ? parseInt(originalQtyMatch[1]) : 0;
                               const fulfilledQuantity = fulfilledQtyMatch ? parseInt(fulfilledQtyMatch[1]) : 0;
                               
                               console.log("⏳ Remaining Display:", { originalQtyMatch, fulfilledQtyMatch, originalQuantity, fulfilledQuantity, orderQuantity: order.quantity });
                               
                               return (
                                 <div className="space-y-1">
                                   <div className="text-sm font-semibold text-orange-600 flex items-center gap-1">
                                     ⏳ {order.quantity} pending for Sunsky
                                   </div>
                                   <div className="text-xs text-gray-500">
                                     Original: {originalQuantity} | Fulfilled: {fulfilledQuantity}
                                   </div>
                                 </div>
                               );
                             } else {
                               // Regular order quantity
                               return <span>{order.quantity}</span>;
                             }
                           })()}
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
                               const isMarkedFromStock = itemsMarkedFromStock.has(order.id);
                               const orderQuantity = order.quantity;
                               // Calculate the actual quantity that can be fulfilled from stock
                               const availableFromStock = hasStock ? Math.min(orderQuantity, inventoryMatch.quantity) : 0;
                              
                               if (order.status !== 'shipped' && order.status !== 'delivered') {
                                 if (orderQuantity === 0 && order.status === 'closed') {
                                   // Show disabled button for items that were fulfilled from stock (quantity = 0)
                                   return (
                                     <div className="flex flex-col gap-1">
                                       <Button
                                         size="sm"
                                         variant="default"
                                         disabled
                                         className="text-xs bg-green-600/50 text-white"
                                       >
                                         ✓ Fulfilled from Stock
                                       </Button>
                                       <span className="text-xs text-blue-600 font-medium">
                                         Quantity fulfilled: {orderQuantity === 0 ? 'Complete' : orderQuantity}
                                       </span>
                                     </div>
                                   );
                                 } else if (availableFromStock > 0) {
                                   // Show From Stock button only when there's actually stock available to fulfill
                                   return (
                                     <Button
                                       size="sm"
                                       variant="default"
                                       onClick={() => markAsOrderedFromInventory(order)}
                                       className="text-xs bg-green-600 hover:bg-green-700"
                                     >
                                       From Stock ({availableFromStock})
                                     </Button>
                                   );
                                 } else {
                                   // No button for out-of-stock items or completed orders
                                   return (
                                     <span className="text-xs text-muted-foreground">
                                       {orderQuantity === 0 ? 'Complete' : 'No stock available'}
                                     </span>
                                   );
                                 }
                              }
                              return null;
                            })()}
                         </div>
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