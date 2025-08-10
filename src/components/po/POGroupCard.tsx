import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Progress } from '@/components/ui/progress';
import { ChevronDown, ChevronRight, Eye } from 'lucide-react';
import type { POOrder } from '@/hooks/usePOOrders';

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
  closed: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
} as const;

export const POGroupCard: React.FC<POGroupCardProps> = ({
  poNumber,
  orders,
  onUpdateStatus,
  onUpdateTracking,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();

  // Filter only matched orders (orders with sunsky_sku) AND exclude closed POs
  const matchedOrders = orders.filter(order => order.sunsky_sku !== null && order.sunsky_sku !== undefined && order.status !== 'closed');
  
  // If no matched orders (or all are closed), don't render this card
  if (matchedOrders.length === 0) {
    return null;
  }

  // Calculate summary data for display (only for matched orders)
  const totalItems = matchedOrders.length;
  const totalCost = matchedOrders.reduce((sum, order) => sum + (order.total_cost || 0), 0);
  const currency = matchedOrders[0]?.currency || 'AED';
  const shipToLocation = matchedOrders[0]?.ship_to_location || 'Not specified';
  
  // Count unique statuses (only for matched orders)
  const statusCounts = matchedOrders.reduce((acc, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Calculate progress metrics
  const pendingCount = statusCounts.pending || 0;
  const orderedCount = statusCounts.ordered || 0;
  const shippedCount = statusCounts.shipped || 0;
  const deliveredCount = statusCounts.delivered || 0;
  
  const progressPercentage = totalItems > 0 
    ? ((deliveredCount + shippedCount) / totalItems) * 100 
    : 0;

  // Determine overall status
  const allStatuses = Object.keys(statusCounts);
  const overallStatus = 
    allStatuses.length === 1 ? allStatuses[0] :
    allStatuses.includes('pending') ? 'mixed' :
    allStatuses.includes('ordered') ? 'mixed' :
    allStatuses.includes('shipped') ? 'mixed' :
    'delivered';

  return (
    <Card className="mb-4 shadow-sm hover:shadow-md transition-all duration-200">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-primary">
                PO: {poNumber}
              </h3>
              <Badge 
                className={`${
                  overallStatus === 'delivered' ? statusColors.delivered :
                  overallStatus === 'shipped' ? statusColors.shipped :
                  overallStatus === 'ordered' ? statusColors.ordered :
                  overallStatus === 'pending' ? statusColors.pending :
                  'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300'
                }`}
              >
                {overallStatus === 'mixed' ? 'Mixed Status' : overallStatus}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/po-details/${poNumber}`)}
                className="text-xs"
              >
                <Eye className="h-3 w-3 mr-1" />
                View Details
              </Button>
              <span className="text-sm text-muted-foreground">
                {totalItems} matched items • {totalCost.toFixed(2)} {currency}
              </span>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Progress: {progressPercentage.toFixed(0)}%</span>
              <span>Ship to: {shipToLocation}</span>
            </div>
            <Progress 
              value={progressPercentage} 
              className="h-2 bg-muted"
            />
          </div>

          {/* Status Summary */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex gap-3">
              {pendingCount > 0 && (
                <span className="text-yellow-600 font-medium">
                  {pendingCount} pending
                </span>
              )}
              {orderedCount > 0 && (
                <span className="text-blue-600 font-medium">
                  {orderedCount} ordered
                </span>
              )}
              {shippedCount > 0 && (
                <span className="text-purple-600 font-medium">
                  {shippedCount} shipped
                </span>
              )}
              {deliveredCount > 0 && (
                <span className="text-green-600 font-medium">
                  {deliveredCount} delivered
                </span>
              )}
            </div>
            <CollapsibleTrigger className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
              <span className="text-xs">
                {isExpanded ? 'Collapse' : 'Expand'}
              </span>
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </CollapsibleTrigger>
          </div>
        </div>

        <CollapsibleContent>
          <div className="px-4 pb-4">
            <div className="border-t pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ASIN</TableHead>
                    <TableHead>Model Number</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead className="text-center">Qty</TableHead>
                    <TableHead className="text-center">Match Status</TableHead>
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
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
                          Matched
                        </Badge>
                        {order.sunsky_sku && (
                          <div className="text-xs text-green-600 font-medium mt-1">
                            SKU: {order.sunsky_sku.sku_code}
                          </div>
                        )}
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
                          {order.status === 'delivered' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onUpdateStatus(order.id, 'closed')}
                              className="text-xs"
                            >
                              Close PO
                            </Button>
                          )}
                          {order.tracking_url && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => window.open(order.tracking_url, '_blank')}
                              className="text-xs"
                            >
                              Track
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
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};