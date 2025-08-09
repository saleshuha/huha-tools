import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ArrowLeft, Package, Truck, CheckCircle, Clock, AlertTriangle, Plus, Save, ExternalLink, Upload, Edit } from 'lucide-react';
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
import { usePOOrders } from '@/hooks/usePOOrders';
import { useToast } from '@/hooks/use-toast';

// Cache busting comment - Fixed poDetails issue - v2

interface StatusProgress {
  pending: number;
  ordered: number;
  shipped: number;
  delivered: number;
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
      await fetchPOOrders();
      setLoading(false);
      console.log('PODetailsPage: Data loaded');
    };
    loadData();
  }, [fetchPOOrders]);

  if (!poNumber) {
    return <div>PO Number not provided</div>;
  }

  // Filter orders for this specific PO
  const poOrdersForThisPO = poOrders.filter(order => order.po_number === poNumber);
  
  // Only show matched items (items with sunsky_sku populated from database)
  const matchedOrders = poOrdersForThisPO.filter(order => order.sunsky_sku !== null);

  // Calculate status progress
  const statusProgress: StatusProgress = matchedOrders.reduce((acc, order) => {
    acc[order.status as keyof Omit<StatusProgress, 'total'>]++;
    acc.total++;
    return acc;
  }, { pending: 0, ordered: 0, shipped: 0, delivered: 0, total: 0 });

  // Calculate progress percentage
  const progressPercentage = statusProgress.total > 0 
    ? ((statusProgress.delivered + statusProgress.shipped) / statusProgress.total) * 100 
    : 0;

  // Get PO summary data
  const totalCost = matchedOrders.reduce((sum, order) => sum + (order.total_cost || 0), 0);
  const currency = matchedOrders[0]?.currency || 'AED';
  const shipToLocation = matchedOrders[0]?.ship_to_location || 'N/A';

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
        <div className="flex gap-4 mb-6">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Upload className="h-4 w-4" />
                Bulk Update Tracking
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

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Items</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{statusProgress.total}</div>
              <p className="text-xs text-muted-foreground">Matched items only</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{totalCost.toFixed(2)} {currency}</div>
              <p className="text-xs text-muted-foreground">All matched items</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ship To</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold text-foreground">{shipToLocation}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Progress</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{progressPercentage.toFixed(0)}%</div>
              <Progress value={progressPercentage} className="mt-2" />
            </CardContent>
          </Card>
        </div>

        {/* Status Overview */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Status Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">{statusProgress.pending}</div>
                <div className="text-sm text-yellow-600">Pending</div>
              </div>
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{statusProgress.ordered}</div>
                <div className="text-sm text-blue-600">Ordered</div>
              </div>
              <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/10 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{statusProgress.shipped}</div>
                <div className="text-sm text-purple-600">Shipped</div>
              </div>
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/10 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{statusProgress.delivered}</div>
                <div className="text-sm text-green-600">Delivered</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Items Table */}
        <Card>
          <CardHeader>
            <CardTitle>Order Items ({matchedOrders.length} matched items)</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Details</TableHead>
                  <TableHead>Tracking Info</TableHead>
                  <TableHead className="text-center">Qty</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {matchedOrders.map((order) => (
                  <TableRow key={order.id}>
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
                    <TableCell className="text-right">
                      <div className="space-y-1">
                        {order.unit_cost && (
                          <div className="text-sm">{order.unit_cost.toFixed(2)} {currency}</div>
                        )}
                        {order.total_cost && (
                          <div className="font-semibold">{order.total_cost.toFixed(2)} {currency}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col gap-1">
                        <div className="flex gap-1 justify-center">
                          {order.status === 'pending' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateOrderStatus(order.id, 'ordered')}
                              className="text-xs"
                            >
                              Mark Ordered
                            </Button>
                          )}
                          {order.status === 'ordered' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateOrderStatus(order.id, 'shipped')}
                              className="text-xs"
                            >
                              Mark Shipped
                            </Button>
                          )}
                          {order.status === 'shipped' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateOrderStatus(order.id, 'delivered')}
                              className="text-xs"
                            >
                              Mark Delivered
                            </Button>
                          )}
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