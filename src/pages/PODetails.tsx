import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ArrowLeft, Package, Truck, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { usePOOrders } from '@/hooks/usePOOrders';

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchPOOrders();
      setLoading(false);
    };
    loadData();
  }, [fetchPOOrders]);

  if (!poNumber) {
    return <div>PO Number not provided</div>;
  }

  // Filter orders for this specific PO
  const poOrdersForThisPO = poOrders.filter(order => order.po_number === poNumber);
  
  // Only show matched items (items with sunsky_sku)
  const matchedOrders = poOrdersForThisPO.filter(order => order.sunsky_sku);

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
                  <TableHead>ASIN</TableHead>
                  <TableHead>Model Number</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead className="text-center">Qty</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Unit Cost</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {matchedOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-xs">
                      {order.asin}
                      {order.external_id && (
                        <div className="text-xs text-muted-foreground">
                          {order.external_id_type}: {order.external_id}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {order.model_number}
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <div className="truncate" title={order.title}>
                        {order.title}
                      </div>
                      {order.sunsky_sku && (
                        <div className="text-xs text-green-600 font-medium">
                          SKU: {order.sunsky_sku.sku_code}
                        </div>
                      )}
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
                      {order.unit_cost ? `${order.unit_cost.toFixed(2)} ${currency}` : '-'}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {order.total_cost ? `${order.total_cost.toFixed(2)} ${currency}` : '-'}
                    </TableCell>
                    <TableCell className="text-center">
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