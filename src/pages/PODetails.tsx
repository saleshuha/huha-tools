import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Edit, ExternalLink, Package2, Clock, CheckCircle, XCircle } from 'lucide-react';
import { usePOTracker, POOrder } from '@/hooks/usePOTracker';

export default function PODetailsPage() {
  const { poNumber } = useParams<{ poNumber: string }>();
  const navigate = useNavigate();
  const { poOrders, updateOrderStatus, updateTrackingInfo, isLoading } = usePOTracker();
  
  const [editingTracking, setEditingTracking] = useState<string | null>(null);
  const [trackingForm, setTrackingForm] = useState({
    supplier_order_number: '',
    tracking_number: '',
    tracking_url: ''
  });

  // Filter orders for this specific PO
  const poDetails = poOrders.filter(order => order.po_number === poNumber);
  
  // Calculate totals
  const totalItems = poDetails.reduce((sum, order) => sum + order.quantity, 0);
  const totalCost = poDetails.reduce((sum, order) => sum + (order.total_cost || 0), 0);
  const currency = poDetails[0]?.currency || 'AED';
  
  // Determine overall status
  const getOverallStatus = () => {
    const statuses = poDetails.map(o => o.status);
    if (statuses.every(s => s === 'delivered')) return 'delivered';
    if (statuses.some(s => s === 'cancelled')) return 'cancelled';
    if (statuses.some(s => s === 'shipped')) return 'shipped';
    if (statuses.some(s => s === 'ordered')) return 'ordered';
    return 'pending';
  };

  const handleEditTracking = (order: POOrder) => {
    setEditingTracking(order.id);
    setTrackingForm({
      supplier_order_number: order.supplier_order_number || '',
      tracking_number: order.tracking_number || '',
      tracking_url: order.tracking_url || ''
    });
  };

  const handleSaveTracking = async () => {
    if (editingTracking) {
      await updateTrackingInfo(editingTracking, trackingForm);
      setEditingTracking(null);
    }
  };

  const handleTrackingClick = (url: string) => {
    if (url) {
      window.open(url.startsWith('http') ? url : `https://${url}`, '_blank');
    }
  };

  const getStatusIcon = (status: POOrder['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'ordered':
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case 'delivered':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Package2 className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusVariant = (status: POOrder['status']) => {
    switch (status) {
      case 'pending':
        return 'secondary';
      case 'ordered':
        return 'default';
      case 'delivered':
        return 'default';
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  if (!poNumber) {
    return <div>PO Number not found</div>;
  }

  if (poDetails.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-surface">
        <div className="glass-container mx-6 my-4 p-8 animate-fade-in">
          <div className="flex items-center mb-6">
            <Button variant="ghost" onClick={() => navigate('/po-tracker')} className="mr-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to PO Tracker
            </Button>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              PO Not Found
            </h1>
          </div>
          <p className="text-muted-foreground">
            The requested purchase order "{poNumber}" was not found.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-surface">
      <div className="glass-container mx-6 my-4 p-8 animate-fade-in">
        {/* Header */}
        <div className="flex items-center mb-6">
          <Button variant="ghost" onClick={() => navigate('/po-tracker')} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to PO Tracker
          </Button>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
              Purchase Order Details
            </h1>
            <p className="text-muted-foreground text-lg">
              Detailed view for PO: {poNumber}
            </p>
          </div>
        </div>

        {/* PO Summary */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="font-mono text-lg px-3 py-1">
                  {poNumber}
                </Badge>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(getOverallStatus() as POOrder['status'])}
                  <Badge variant={getStatusVariant(getOverallStatus() as POOrder['status'])}>
                    {getOverallStatus().charAt(0).toUpperCase() + getOverallStatus().slice(1)}
                  </Badge>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Total Items: {totalItems}</div>
                <div className="text-lg font-semibold">{totalCost.toFixed(2)} {currency}</div>
              </div>
            </CardTitle>
          </CardHeader>
        </Card>

        {/* Items Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Package2 className="h-5 w-5 mr-2" />
              Items in this PO ({poDetails.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Unit Cost</TableHead>
                  <TableHead>Total Cost</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Supplier Order</TableHead>
                  <TableHead>Tracking</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {poDetails.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono">
                        {order.sku_code}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {order.sunsky_sku ? (
                        <div>
                          <div className="font-medium">{order.sunsky_sku.title}</div>
                          <div className="text-sm text-muted-foreground">
                            {order.sunsky_sku.description}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {order.quantity}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {order.unit_cost ? (
                        <Badge variant="secondary">
                          {order.unit_cost} {order.currency || 'AED'}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {order.total_cost ? (
                        <Badge variant="default">
                          {order.total_cost} {order.currency || 'AED'}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={order.status}
                        onValueChange={(value: POOrder['status']) => updateOrderStatus(order.id, value)}
                      >
                        <SelectTrigger className="w-[120px] h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="ordered">Ordered</SelectItem>
                          <SelectItem value="shipped">Shipped</SelectItem>
                          <SelectItem value="delivered">Delivered</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {order.supplier_order_number ? (
                        <Badge variant="outline">
                          {order.supplier_order_number}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {order.tracking_number ? (
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">
                            {order.tracking_number}
                          </Badge>
                          {order.tracking_url && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleTrackingClick(order.tracking_url!)}
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditTracking(order)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit Tracking Information</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="supplier_order">Supplier Order Number</Label>
                              <Input
                                id="supplier_order"
                                placeholder="Enter supplier order number"
                                value={trackingForm.supplier_order_number}
                                onChange={(e) => setTrackingForm(prev => ({
                                  ...prev,
                                  supplier_order_number: e.target.value
                                }))}
                              />
                            </div>
                            <div>
                              <Label htmlFor="tracking_number">Tracking Number</Label>
                              <Input
                                id="tracking_number"
                                placeholder="Enter tracking number"
                                value={trackingForm.tracking_number}
                                onChange={(e) => setTrackingForm(prev => ({
                                  ...prev,
                                  tracking_number: e.target.value
                                }))}
                              />
                            </div>
                            <div>
                              <Label htmlFor="tracking_url">Tracking URL</Label>
                              <Input
                                id="tracking_url"
                                placeholder="Enter tracking URL or website"
                                value={trackingForm.tracking_url}
                                onChange={(e) => setTrackingForm(prev => ({
                                  ...prev,
                                  tracking_url: e.target.value
                                }))}
                              />
                            </div>
                            <Button 
                              onClick={handleSaveTracking}
                              className="w-full"
                            >
                              Save Tracking Info
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}