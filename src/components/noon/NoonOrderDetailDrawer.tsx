import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Package, 
  ExternalLink, 
  MapPin, 
  Calendar, 
  Truck,
  Clock,
  AlertCircle,
  RefreshCw,
  Link as LinkIcon,
  Eye,
  Printer,
  Edit
} from 'lucide-react';
import { NoonOrder } from '@/hooks/useNoonOrders';
import { useNoonOrderEvents } from '@/hooks/useNoonOrderEvents';
import { formatDistanceToNow } from 'date-fns';

interface NoonOrderDetailDrawerProps {
  order: NoonOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLinkSunskyOrder?: (orderId: string) => void;
  onSyncOrder?: (orderId: string) => void;
}

export function NoonOrderDetailDrawer({
  order,
  open,
  onOpenChange,
  onLinkSunskyOrder,
  onSyncOrder,
}: NoonOrderDetailDrawerProps) {
  const { events, loading: eventsLoading } = useNoonOrderEvents(order?.id);

  if (!order) return null;

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'delivered': return 'bg-success/10 text-success border-success/20';
      case 'shipped': return 'bg-primary/10 text-primary border-primary/20';
      case 'placed': return 'bg-cyan/10 text-cyan border-cyan/20';
      case 'ready_for_sunsky': return 'bg-sky/10 text-sky border-sky/20';
      case 'validated': return 'bg-emerald/10 text-emerald border-emerald/20';
      case 'exception': return 'bg-destructive/10 text-destructive border-destructive/20';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    } catch {
      return 'Invalid date';
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-hidden flex flex-col">
        <SheetHeader className="flex-shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <SheetTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Order Details
              </SheetTitle>
              <SheetDescription className="font-mono">
                {order.order_nr}
              </SheetDescription>
            </div>
            <div className="flex gap-2">
              <Badge className={getStatusColor(order.order_status)}>
                {order.order_status || 'uploaded'}
              </Badge>
            </div>
          </div>
        </SheetHeader>

        <Separator className="my-4" />

        <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-4 flex-shrink-0">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="sunsky">Sunsky</TabsTrigger>
            <TabsTrigger value="tracking">Tracking</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-4">
            <TabsContent value="overview" className="space-y-4 mt-0">
              {/* Product Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Package className="h-4 w-4" />
                    Product Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {order.image_key && (
                    <div className="flex justify-center">
                      <img
                        src={`https://f.nooncdn.com/p/${order.image_key}.jpg`}
                        alt={order.title || "Product"}
                        className="w-32 h-32 object-cover rounded border"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  <div className="grid grid-cols-1 gap-2 text-sm">
                    <div><span className="font-medium">Title:</span> {order.title || 'N/A'}</div>
                    <div><span className="font-medium">Partner SKU:</span> {order.partner_sku || 'N/A'}</div>
                    <div><span className="font-medium">SKU:</span> {order.sku || 'N/A'}</div>
                    <div><span className="font-medium">Brand:</span> {order.brand_code || 'N/A'}</div>
                    <div><span className="font-medium">Quantity:</span> {order.quantity}</div>
                    <div><span className="font-medium">Size:</span> {order.size || 'N/A'}</div>
                  </div>
                </CardContent>
              </Card>

              {/* Order Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4" />
                    Order Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div><span className="font-medium">Order Number:</span> {order.order_nr}</div>
                  <div><span className="font-medium">Purchase Item:</span> {order.purchase_item_nr}</div>
                  <div><span className="font-medium">Country:</span> {order.order_country_code}</div>
                  <div><span className="font-medium">Received:</span> {formatDate(order.order_received_at)}</div>
                  <div><span className="font-medium">Target Ready:</span> {formatDate(order.target_ready_at)}</div>
                  <div><span className="font-medium">Fulfillment:</span> {formatDate(order.fulfillment_timestamp)}</div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sunsky" className="space-y-4 mt-0">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <ExternalLink className="h-4 w-4" />
                    Sunsky Integration
                  </CardTitle>
                  <div className="flex gap-2">
                    {!order.sunsky_order_number && onLinkSunskyOrder && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => onLinkSunskyOrder(order.id)}
                      >
                        <LinkIcon className="h-3 w-3 mr-1" />
                        Link Order
                      </Button>
                    )}
                    {order.sunsky_order_number && onSyncOrder && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => onSyncOrder(order.id)}
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Sync
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {order.sunsky_order_number ? (
                    <>
                      <div className="grid grid-cols-1 gap-2 text-sm">
                        <div><span className="font-medium">Sunsky Order:</span> {order.sunsky_order_number}</div>
                        <div><span className="font-medium">Status:</span> {order.sunsky_order_status || 'Unknown'}</div>
                        <div><span className="font-medium">Last Sync:</span> {formatDate(order.sunsky_last_sync)}</div>
                        <div><span className="font-medium">Tracking:</span> {order.sunsky_tracking_number || 'N/A'}</div>
                      </div>
                      {order.sunsky_error_message && (
                        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-destructive">Error</p>
                              <p className="text-xs text-destructive/80">{order.sunsky_error_message}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      <ExternalLink className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Not linked to Sunsky order</p>
                      <p className="text-xs">Click "Link Order" to connect</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tracking" className="space-y-4 mt-0">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Truck className="h-4 w-4" />
                    Shipment Tracking
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {order.sunsky_tracking_number ? (
                    <div className="space-y-2 text-sm">
                      <div><span className="font-medium">Tracking Number:</span> {order.sunsky_tracking_number}</div>
                      <div><span className="font-medium">Shipment Created:</span> {formatDate(order.shipment_created_at)}</div>
                      <div><span className="font-medium">Shipment Number:</span> {order.shipment_nr || 'N/A'}</div>
                      <div><span className="font-medium">Manifest:</span> {order.manifest_nr || 'N/A'}</div>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      <Truck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No tracking information</p>
                      <p className="text-xs">Available after shipment</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="timeline" className="space-y-4 mt-0">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4" />
                    Event Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {eventsLoading ? (
                    <div className="text-center py-6 text-muted-foreground">
                      <div className="animate-pulse">Loading events...</div>
                    </div>
                  ) : events.length > 0 ? (
                    <div className="space-y-3">
                      {events.map((event) => (
                        <div key={event.id} className="flex gap-3 pb-3 border-b last:border-0">
                          <div className="flex-shrink-0 w-2 h-2 bg-primary rounded-full mt-2" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{event.event_message}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(event.created_at))} ago
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(event.created_at)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No events recorded</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}