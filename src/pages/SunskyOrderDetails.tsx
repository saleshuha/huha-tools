import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSunskyOrders } from '@/hooks/useSunskyOrders';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowLeft, Package, Truck, Calendar, DollarSign, ExternalLink,
  Clock, CheckCircle, AlertTriangle, Copy, RefreshCw
} from 'lucide-react';
import { calculateOrderProgress, getOrderSteps, calculateItemsProgress } from '@/utils/sunsky-progress';
import { useToast } from '@/components/ui/use-toast';

export default function SunskyOrderDetails() {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orderLabels, setOrderLabels] = useState<any[]>([]);

  const {
    orders,
    getOrderDetails,
    getOrderLabels,
  } = useSunskyOrders();

  const order = orders.find(o => o.number === orderNumber);

  useEffect(() => {
    if (orderNumber && (!order || !order.items || order.items.length === 0)) {
      loadOrderDetails();
    } else {
      setLoading(false);
    }
  }, [orderNumber, order]);

  const loadOrderDetails = async () => {
    if (!orderNumber) return;
    
    setLoading(true);
    try {
      await getOrderDetails(orderNumber, false, order?.sunsky_credentials_id);
    } catch (error) {
      console.error('Failed to load order details:', error);
      toast({
        title: "Error",
        description: "Failed to load order details. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!orderNumber) return;
    
    setRefreshing(true);
    try {
      await getOrderDetails(orderNumber, false, order?.sunsky_credentials_id);
      toast({
        title: "Refreshed",
        description: "Order details have been updated.",
      });
    } catch (error) {
      console.error('Failed to refresh order:', error);
      toast({
        title: "Error",
        description: "Failed to refresh order details.",
        variant: "destructive"
      });
    } finally {
      setRefreshing(false);
    }
  };

  const handleGetLabels = async () => {
    if (!orderNumber) return;
    
    try {
      const labels = await getOrderLabels(orderNumber);
      setOrderLabels(labels || []);
      if (labels && labels.length > 0) {
        toast({
          title: "Labels Retrieved",
          description: `Found ${labels.length} shipping labels for this order.`,
        });
      } else {
        toast({
          title: "No Labels",
          description: "No shipping labels found for this order.",
        });
      }
    } catch (error) {
      console.error('Failed to fetch labels:', error);
      toast({
        title: "Error",
        description: "Failed to fetch shipping labels.",
        variant: "destructive"
      });
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: `${label} copied to clipboard.`,
    });
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-surface">
        <div className="glass-container my-4 p-8">
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="h-8 w-8 animate-spin mr-3 text-primary" />
            <span className="text-lg text-muted-foreground">Loading order details...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gradient-surface">
        <div className="glass-container my-4 p-8">
          <div className="text-center py-20">
            <AlertTriangle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Order Not Found</h2>
            <p className="text-muted-foreground mb-6">
              The order #{orderNumber} could not be found.
            </p>
            <Button onClick={() => navigate('/sunsky-order-tracking')} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Orders
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const orderProgress = calculateOrderProgress(order.status);
  const itemsProgress = calculateItemsProgress(order.items || []);
  const steps = getOrderSteps();

  return (
    <div className="min-h-screen bg-gradient-surface">
      <div className="glass-container my-4 p-8 animate-fade-in">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button
                onClick={() => navigate('/sunsky-order-tracking')}
                variant="outline"
                size="sm"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Orders
              </Button>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  Order #{order.number}
                </h1>
                <p className="text-muted-foreground">
                  Created on {formatDate(order.gmt_created)}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleRefresh}
                disabled={refreshing}
                variant="outline"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                onClick={handleGetLabels}
                variant="outline"
              >
                <Package className="h-4 w-4 mr-2" />
                Get Labels
              </Button>
            </div>
          </div>

          {/* Order Progress */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Order Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Badge className={`${orderProgress.statusColor} text-white`}>
                    {orderProgress.statusLabel}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {orderProgress.percentage}% Complete
                  </span>
                </div>
                <Progress value={orderProgress.percentage} className="h-3" />
                
                {/* Step indicators */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 mt-6">
                  {steps.map((step) => (
                    <div
                      key={step.id}
                      className={`text-center p-3 rounded-lg border ${
                        step.id <= orderProgress.currentStep
                          ? 'bg-primary/10 border-primary text-primary'
                          : 'bg-muted border-border text-muted-foreground'
                      }`}
                    >
                      <div className="text-xs font-medium">{step.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Order Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Order Number</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm">{order.number}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(order.number, 'Order number')}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Site Number</span>
                <span className="font-mono text-sm">{order.site_number || 'N/A'}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Value</span>
                <span className="font-semibold">
                  {formatCurrency(order.total || 0, order.currency || 'USD')}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Items</span>
                <span className="font-semibold">{order.items?.length || 0}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Shipping Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Shipping Company</span>
                <span className="text-sm">{order.shipping_company || 'N/A'}</span>
              </div>
              
              {order.tracking_number && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Tracking Number</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm">{order.tracking_number}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(order.tracking_number!, 'Tracking number')}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
              
              {order.tracking_url && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Track Package</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(order.tracking_url!, '_blank')}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Track
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Order Created</span>
                <span className="text-sm">{formatDate(order.gmt_created)}</span>
              </div>
              
              {order.gmt_paid && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Payment Date</span>
                  <span className="text-sm">{formatDate(order.gmt_paid)}</span>
                </div>
              )}
              
              {order.gmt_shipped && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Shipped Date</span>
                  <span className="text-sm">{formatDate(order.gmt_shipped)}</span>
                </div>
              )}
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Last Updated</span>
                <span className="text-sm">{formatDate(order.updated_at)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Items Progress */}
        {order.items && order.items.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Items Progress ({itemsProgress.completedItems}/{itemsProgress.totalItems} completed)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={itemsProgress.percentage} className="h-2 mb-4" />
              <div className="text-sm text-muted-foreground">
                {itemsProgress.percentage}% of items shipped or delivered
              </div>
            </CardContent>
          </Card>
        )}

        {/* Order Items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Order Items ({order.items?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!order.items || order.items.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No items found for this order</p>
                <Button
                  onClick={loadOrderDetails}
                  variant="outline"
                  className="mt-4"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reload Items
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {order.items.map((item, index) => {
                  const itemProgress = calculateOrderProgress(item.item_status || 'pending');
                  
                  return (
                    <div
                      key={item.id || index}
                      className="border border-border rounded-lg p-4 hover:shadow-medium transition-all duration-200"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-foreground mb-1">
                            {item.title || item.sku_code || 'Unknown Item'}
                          </h4>
                          {item.model_number && (
                            <p className="text-sm text-muted-foreground">
                              Model: {item.model_number}
                            </p>
                          )}
                          {item.sku_code && (
                            <p className="text-sm text-muted-foreground font-mono">
                              SKU: {item.sku_code}
                            </p>
                          )}
                          {item.asin && (
                            <p className="text-sm text-muted-foreground font-mono">
                              ASIN: {item.asin}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <Badge className={`${itemProgress.statusColor} text-white mb-2`}>
                            {itemProgress.statusLabel}
                          </Badge>
                          <div className="text-sm text-muted-foreground">
                            Qty: {item.quantity || 1}
                          </div>
                          {item.unit_price && (
                            <div className="text-sm font-semibold">
                              {formatCurrency(item.unit_price, item.currency || 'USD')}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span>Progress</span>
                          <span>{itemProgress.percentage}%</span>
                        </div>
                        <Progress value={itemProgress.percentage} className="h-1" />
                      </div>
                      
                      {item.expected_ship_date && (
                        <div className="mt-3 text-sm text-muted-foreground flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Expected ship date: {formatDate(item.expected_ship_date)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Shipping Labels */}
        {orderLabels.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Shipping Labels ({orderLabels.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {orderLabels.map((label, index) => (
                  <div
                    key={index}
                    className="border border-border rounded-lg p-4 hover:shadow-medium transition-all duration-200"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Label {index + 1}</span>
                      {label.url && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(label.url, '_blank')}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          View
                        </Button>
                      )}
                    </div>
                    {label.tracking_number && (
                      <p className="text-xs text-muted-foreground font-mono">
                        {label.tracking_number}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}