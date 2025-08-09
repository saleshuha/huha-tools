import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ArrowLeft, Package, Truck, CheckCircle, Clock, AlertTriangle, Plus, Save, ExternalLink, Upload, Edit, PackageCheck, PackageX, Trash2 } from 'lucide-react';
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
  const [bulkStatus, setBulkStatus] = useState('');
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

  console.log('PODetailsPage: Rendering with poNumber:', poNumber);
  console.log('PODetailsPage: poOrders:', poOrders);

  useEffect(() => {
    const loadData = async () => {
      console.log('PODetailsPage: Loading data...');
      setLoading(true);
      await Promise.all([
        fetchPOOrders(),
        fetchInventoryData()
      ]);
      setLoading(false);
      console.log('PODetailsPage: Data loaded');
    };
    loadData();
  }, [fetchPOOrders]);

  // Fetch inventory data to match with PO ASINs
  const fetchInventoryData = async () => {
    try {
      const [asinResult, skuResult] = await Promise.all([
        supabase
          .from('asin_inventory')
          .select('asin, quantity, status, sku')
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id),
        supabase
          .from('sku_inventory')
          .select('sku_number, quantity, status')
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
      ]);

      if (asinResult.error) throw asinResult.error;
      if (skuResult.error) throw skuResult.error;

      setInventoryData({
        asinInventory: asinResult.data || [],
        skuInventory: skuResult.data || []
      });
    } catch (error) {
      console.error('Error fetching inventory data:', error);
    }
  };

  // Function to find inventory match for an ASIN
  const findInventoryMatch = (asin: string, sku?: string) => {
    // First check ASIN inventory
    const asinMatch = inventoryData.asinInventory.find(item => item.asin === asin);
    if (asinMatch) {
      return {
        type: 'ASIN',
        status: asinMatch.status,
        quantity: asinMatch.quantity,
        identifier: asinMatch.asin
      };
    }

    // Then check SKU inventory if SKU is available
    if (sku) {
      const skuMatch = inventoryData.skuInventory.find(item => item.sku_number === sku);
      if (skuMatch) {
        return {
          type: 'SKU',
          status: skuMatch.status,
          quantity: skuMatch.quantity,
          identifier: skuMatch.sku_number
        };
      }
    }

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

  // Handle bulk status update
  const handleBulkStatusUpdate = async () => {
    if (selectedItems.size === 0 || !bulkStatus) return;
    
    setIsUpdating(true);
    try {
      const updatePromises = Array.from(selectedItems).map(orderId => 
        updateOrderStatus(orderId, bulkStatus as "pending" | "ordered" | "shipped" | "delivered" | "cancelled")
      );
      
      await Promise.all(updatePromises);
      
      toast({
        title: "Bulk Status Updated",
        description: `Updated status to ${bulkStatus} for ${selectedItems.size} items`
      });
      setSelectedItems(new Set());
      setBulkStatus('');
    } catch (error) {
      toast({
        title: "Bulk Update Failed",
        description: "Failed to update status for some items",
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

  // Handle select all/none
  const handleSelectAll = () => {
    if (selectedItems.size === matchedOrders.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(matchedOrders.map(order => order.id)));
    }
  };

  // Handle individual item selection
  const handleItemSelect = (orderId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId);
    } else {
      newSelected.add(orderId);
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
      const inventoryMatch = findInventoryMatch(order.asin, order.sunsky_sku?.sku_code);
      
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
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" onClick={() => navigate('/po-tracker')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to PO Tracker
          </Button>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            PO {poNumber} Details
          </h1>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 mb-6">
          {/* Bulk Operations */}
          {selectedItems.size > 0 && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <Badge variant="secondary">{selectedItems.size} selected</Badge>
              
              <Select value={bulkStatus} onValueChange={setBulkStatus}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="ordered">Ordered</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                </SelectContent>
              </Select>
              
              <Button 
                size="sm" 
                onClick={handleBulkStatusUpdate}
                disabled={!bulkStatus || isUpdating}
              >
                Update Status
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
                onClick={() => setSelectedItems(new Set())}
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
                {matchedOrders.map((order) => (
                  <TableRow key={order.id} className={selectedItems.has(order.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}>
                    <TableCell>
                      <Checkbox
                        checked={selectedItems.has(order.id)}
                        onCheckedChange={() => handleItemSelect(order.id)}
                        aria-label={`Select item ${order.asin}`}
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
                        const inventoryMatch = findInventoryMatch(order.asin, order.sunsky_sku?.sku_code);
                        if (inventoryMatch) {
                          return (
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
                            const inventoryMatch = findInventoryMatch(order.asin, order.sunsky_sku?.sku_code);
                            const hasStock = inventoryMatch && inventoryMatch.quantity > 0;
                            
                            // Show "Mark Ordered (From Stock)" button for all in-stock items (not just pending)
                            if (hasStock && order.status !== 'ordered' && order.status !== 'shipped' && order.status !== 'delivered') {
                              return (
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => markAsOrderedFromInventory(order)}
                                  className="text-xs bg-green-600 hover:bg-green-700"
                                >
                                  Mark Ordered (From Stock)
                                </Button>
                              );
                            } else if (order.status === 'pending') {
                              return (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateOrderStatus(order.id, 'ordered')}
                                  className="text-xs"
                                >
                                  Mark Ordered
                                </Button>
                              );
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
                ))}
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
      </div>
    </div>
  );
}