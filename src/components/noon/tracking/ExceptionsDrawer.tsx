import React from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  AlertTriangle, 
  XCircle, 
  Clock, 
  RefreshCw,
  ExternalLink,
  MessageSquare,
  Package
} from 'lucide-react';
import { NoonOrder } from '@/hooks/useNoonOrders';
import { cn } from '@/lib/utils';

interface ExceptionsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exceptions: NoonOrder[];
  onResolveException: (orderId: string) => void;
  onViewOrder: (order: NoonOrder) => void;
}

const getExceptionType = (order: NoonOrder) => {
  if (order.order_status === 'exception') return 'status_error';
  if (!order.partner_sku) return 'missing_sku';
  if (order.quantity <= 0) return 'invalid_quantity';
  if (order.sunsky_error_message) return 'sunsky_error';
  return 'unknown';
};

const getExceptionIcon = (type: string) => {
  switch (type) {
    case 'status_error':
      return XCircle;
    case 'missing_sku':
      return Package;
    case 'invalid_quantity':
      return AlertTriangle;
    case 'sunsky_error':
      return MessageSquare;
    default:
      return AlertTriangle;
  }
};

const getExceptionColor = (type: string) => {
  switch (type) {
    case 'status_error':
      return 'text-destructive';
    case 'missing_sku':
      return 'text-warning';
    case 'invalid_quantity':
      return 'text-warning';
    case 'sunsky_error':
      return 'text-destructive';
    default:
      return 'text-muted-foreground';
  }
};

const getExceptionDescription = (order: NoonOrder, type: string) => {
  switch (type) {
    case 'status_error':
      return 'Order marked as exception in system';
    case 'missing_sku':
      return 'Partner SKU is missing or invalid';
    case 'invalid_quantity':
      return `Invalid quantity: ${order.quantity}`;
    case 'sunsky_error':
      return order.sunsky_error_message || 'Sunsky integration error';
    default:
      return 'Unknown exception type';
  }
};

export function ExceptionsDrawer({ 
  open, 
  onOpenChange, 
  exceptions, 
  onResolveException, 
  onViewOrder 
}: ExceptionsDrawerProps) {
  const groupedExceptions = React.useMemo(() => {
    const groups: Record<string, NoonOrder[]> = {};
    exceptions.forEach(order => {
      const type = getExceptionType(order);
      if (!groups[type]) groups[type] = [];
      groups[type].push(order);
    });
    return groups;
  }, [exceptions]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl bg-background border-border">
        <SheetHeader className="pb-6">
          <SheetTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Order Exceptions
            <Badge variant="destructive" className="ml-2">
              {exceptions.length}
            </Badge>
          </SheetTitle>
          <SheetDescription>
            Review and resolve order processing issues
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)]">
          <div className="space-y-6">
            {Object.entries(groupedExceptions).map(([type, orders]) => {
              const Icon = getExceptionIcon(type);
              const color = getExceptionColor(type);
              
              return (
                <Card key={type} className="border-border/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Icon className={cn("h-5 w-5", color)} />
                      {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      <Badge variant="outline" className="ml-2">
                        {orders.length}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {orders.map((order) => (
                      <div 
                        key={order.id}
                        className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors border border-border/30"
                      >
                        <div className={cn("p-1 rounded", color.replace('text-', 'bg-').replace('destructive', 'destructive/20').replace('warning', 'warning/20'))}>
                          <Icon className={cn("h-4 w-4", color)} />
                        </div>
                        
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-medium text-sm text-foreground truncate">
                                {order.title || 'Untitled Order'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Order: {order.order_nr} • SKU: {order.partner_sku || 'Missing'}
                              </p>
                            </div>
                            <Badge 
                              variant={type === 'sunsky_error' ? 'destructive' : 'secondary'} 
                              className="text-xs shrink-0"
                            >
                              {order.order_status || 'Unknown'}
                            </Badge>
                          </div>
                          
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {getExceptionDescription(order, type)}
                          </p>
                          
                          <div className="flex items-center gap-2 pt-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onViewOrder(order)}
                              className="h-7 px-2 text-xs"
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              View
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onResolveException(order.id)}
                              className="h-7 px-2 text-xs"
                            >
                              <RefreshCw className="h-3 w-3 mr-1" />
                              Resolve
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              );
            })}
            
            {exceptions.length === 0 && (
              <Card className="border-border/50">
                <CardContent className="py-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="p-3 rounded-full bg-success/20">
                      <Clock className="h-6 w-6 text-success" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">All Clear!</h3>
                      <p className="text-sm text-muted-foreground">
                        No exceptions found in your orders
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}