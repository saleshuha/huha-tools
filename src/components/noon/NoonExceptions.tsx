import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  AlertTriangle, 
  Edit, 
  RefreshCw, 
  CheckCircle, 
  ExternalLink,
  Package,
  Eye
} from 'lucide-react';
import { NoonOrder } from '@/hooks/useNoonOrders';

interface NoonExceptionsProps {
  orders: NoonOrder[];
  onOrderView: (order: NoonOrder) => void;
  onFixOrder?: (order: NoonOrder) => void;
  onRetryOrder?: (order: NoonOrder) => void;
}

export function NoonExceptions({ 
  orders, 
  onOrderView, 
  onFixOrder,
  onRetryOrder 
}: NoonExceptionsProps) {
  const getExceptionReason = (order: NoonOrder): string => {
    if (!order.partner_sku) return 'Missing Partner SKU';
    if (order.quantity <= 0) return 'Invalid Quantity';
    if (order.sunsky_error_message) return 'Sunsky API Error';
    return 'Unknown Issue';
  };

  const getExceptionSeverity = (reason: string): 'high' | 'medium' | 'low' => {
    if (reason.includes('API Error')) return 'high';
    if (reason.includes('Missing')) return 'medium';
    return 'low';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'medium': return 'bg-warning/10 text-warning border-warning/20';
      case 'low': return 'bg-muted text-muted-foreground border-muted';
      default: return 'bg-muted text-muted-foreground border-muted';
    }
  };

  const canAutoFix = (reason: string): boolean => {
    return reason.includes('API Error');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Exception Queue
            <Badge variant="destructive" className="ml-2">
              {orders.length}
            </Badge>
          </CardTitle>
          <CardDescription>
            Orders that require manual attention before they can proceed through the pipeline
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Exceptions Table */}
      {orders.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/4">Order & Product</TableHead>
                  <TableHead className="w-1/4">Exception Reason</TableHead>
                  <TableHead className="w-1/4">Details</TableHead>
                  <TableHead className="w-1/4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => {
                  const reason = getExceptionReason(order);
                  const severity = getExceptionSeverity(reason);
                  
                  return (
                    <TableRow key={order.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {order.image_key && (
                            <div className="flex-shrink-0">
                              <img
                                src={`https://f.nooncdn.com/p/${order.image_key}.jpg`}
                                alt={order.title || "Product"}
                                className="w-12 h-12 object-cover rounded border"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="font-mono text-sm font-medium truncate">
                              {order.order_nr}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {order.title || 'N/A'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Qty: {order.quantity}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="space-y-1">
                          <Badge className={getSeverityColor(severity)}>
                            {reason}
                          </Badge>
                          <p className="text-xs text-muted-foreground capitalize">
                            {severity} priority
                          </p>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="space-y-1 text-xs">
                          <div>
                            <span className="text-muted-foreground">Partner SKU:</span>{' '}
                            {order.partner_sku || <span className="text-destructive">Missing</span>}
                          </div>
                          <div>
                            <span className="text-muted-foreground">SKU:</span>{' '}
                            {order.sku || 'N/A'}
                          </div>
                          {order.sunsky_error_message && (
                            <div className="text-destructive">
                              <span className="text-muted-foreground">Error:</span>{' '}
                              {order.sunsky_error_message}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onOrderView(order)}
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          
                          {onFixOrder && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onFixOrder(order)}
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Fix
                            </Button>
                          )}
                          
                          {canAutoFix(reason) && onRetryOrder && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onRetryOrder(order)}
                            >
                              <RefreshCw className="h-3 w-3 mr-1" />
                              Retry
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <CheckCircle className="h-12 w-12 text-success mx-auto mb-4" />
            <h3 className="text-lg font-medium text-success mb-2">
              No Exceptions
            </h3>
            <p className="text-sm text-muted-foreground">
              All orders are processing normally through the pipeline
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}