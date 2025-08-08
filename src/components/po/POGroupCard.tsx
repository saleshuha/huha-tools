import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Package, MapPin, FileText, ExternalLink } from 'lucide-react';
import { POOrder } from '@/hooks/usePOTracker';

interface POGroupCardProps {
  poNumber: string;
  orders: POOrder[];
  onUpdateStatus: (orderId: string, status: POOrder['status']) => void;
  onUpdateTracking: (orderId: string, trackingData: any) => void;
}

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
  ordered: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
  shipped: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300',
  delivered: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
};

export function POGroupCard({ poNumber, orders, onUpdateStatus, onUpdateTracking }: POGroupCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();

  // Filter to only show orders with matched SKUs
  const matchedOrders = orders.filter(order => order.sunsky_sku !== null && order.sunsky_sku !== undefined);
  const hasMatchedItems = matchedOrders.length > 0;

  // Calculate summary data based on matched orders only
  const totalItems = matchedOrders.reduce((sum, order) => sum + order.quantity, 0);
  const totalCost = matchedOrders.reduce((sum, order) => sum + (order.total_cost || 0), 0);
  const uniqueStatuses = [...new Set(matchedOrders.map(order => order.status))];
  const shipToLocation = orders[0]?.ship_to_location || 'Not specified';
  const currency = orders[0]?.currency || 'AED';
  const fileName = orders[0]?.file_name || 'Unknown';

  // Determine overall status
  const getOverallStatus = () => {
    if (uniqueStatuses.every(status => status === 'delivered')) return 'delivered';
    if (uniqueStatuses.some(status => status === 'cancelled')) return 'partial';
    if (uniqueStatuses.some(status => status === 'shipped')) return 'shipped';
    if (uniqueStatuses.some(status => status === 'ordered')) return 'ordered';
    return 'pending';
  };

  const overallStatus = getOverallStatus();

  // Handle PO click - only navigate if there are matched items
  const handlePOClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (hasMatchedItems) {
      navigate(`/po-details/${poNumber}`, { state: { orders: matchedOrders } });
    }
  };

  // If no matched items, show just PO number without click functionality
  if (!hasMatchedItems) {
    return (
      <Card className="w-full opacity-50">
        <CardHeader className="transition-colors">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-semibold text-muted-foreground">PO: {poNumber}</span>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span>{shipToLocation}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm text-muted-foreground">No SKU Matches</div>
                <div className="text-lg font-semibold text-muted-foreground">0 items</div>
              </div>
              <Badge className="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                No Match
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className="relative">
          {/* Clickable PO header area */}
          <div 
            className="absolute inset-0 cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg z-10"
            onClick={handlePOClick}
            title="Click to view PO details in a new page"
          />
          
          {/* Collapsible trigger for dropdown */}
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors relative z-20">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <Package className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-lg font-semibold">PO: {poNumber}</span>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span>{shipToLocation}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Matched Items</div>
                    <div className="text-lg font-semibold">{totalItems}</div>
                  </div>
                  {totalCost > 0 && (
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Total Cost</div>
                      <div className="text-lg font-semibold">{totalCost.toFixed(2)} {currency}</div>
                    </div>
                  )}
                  <Badge 
                    className={`${statusColors[overallStatus as keyof typeof statusColors] || statusColors.pending}`}
                  >
                    {overallStatus === 'partial' ? 'Mixed Status' : overallStatus}
                  </Badge>
                </div>
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="space-y-4">
              {/* PO Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Source File:</span>
                  <span className="text-sm font-medium">{fileName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Matched Items:</span>
                  <span className="text-sm font-medium">{matchedOrders.length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Status Breakdown:</span>
                  <div className="flex gap-1">
                    {uniqueStatuses.map(status => (
                      <Badge 
                        key={status}
                        variant="outline" 
                        className="text-xs"
                      >
                        {status} ({matchedOrders.filter(o => o.status === status).length})
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              {/* Items Table - Only showing matched items */}
              <div className="border rounded-md">
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
                        </TableCell>
                        <TableCell className="text-center font-semibold">
                          {order.quantity}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge 
                            className={`${statusColors[order.status]} text-xs`}
                          >
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
                                onClick={() => onUpdateStatus(order.id, 'ordered')}
                                className="text-xs"
                              >
                                Mark Ordered
                              </Button>
                            )}
                            {order.status === 'ordered' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onUpdateStatus(order.id, 'shipped')}
                                className="text-xs"
                              >
                                Mark Shipped
                              </Button>
                            )}
                            {order.status === 'shipped' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onUpdateStatus(order.id, 'delivered')}
                                className="text-xs"
                              >
                                Mark Delivered
                              </Button>
                            )}
                            {order.tracking_url && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => window.open(order.tracking_url, '_blank')}
                                className="text-xs"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}