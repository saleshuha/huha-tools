import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Search, 
  Package, 
  Clock, 
  CheckCircle2, 
  Truck, 
  AlertCircle,
  ExternalLink,
  Edit,
  MoreHorizontal
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { POOrder } from "@/hooks/usePOOrders";
import { formatDistanceToNow, format } from "date-fns";

interface POOrdersTableProps {
  orders: POOrder[];
  onUpdateStatus: (orderId: string, status: POOrder['status']) => void;
  onUpdateTracking: (orderId: string, data: { supplier_order_number?: string; tracking_number?: string; tracking_url?: string }) => void;
  isLoading?: boolean;
  showPOGroups?: boolean;
}

export const POOrdersTable = ({ 
  orders, 
  onUpdateStatus, 
  onUpdateTracking, 
  isLoading = false,
  showPOGroups = true 
}: POOrdersTableProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editingTracking, setEditingTracking] = useState<string | null>(null);

  // Group orders by PO number if showPOGroups is true
  const processedOrders = useMemo(() => {
    const filtered = orders.filter(order => {
      const matchesSearch = !searchTerm || 
        order.po_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.sku_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.model_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.title?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

      return matchesSearch && matchesStatus;
    });

    if (!showPOGroups) {
      return filtered.map(order => ({ ...order, isGroup: false }));
    }

    // Group by PO number
    const grouped = filtered.reduce((acc, order) => {
      const key = order.po_number;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(order);
      return acc;
    }, {} as Record<string, POOrder[]>);

    // Flatten back to array with group indicators
    const result: (POOrder & { isGroup?: boolean; groupCount?: number })[] = [];
    
    Object.entries(grouped).forEach(([poNumber, poOrders]) => {
      if (poOrders.length > 1) {
        // Add group header
        result.push({
          ...poOrders[0],
          isGroup: true,
          groupCount: poOrders.length,
          quantity: poOrders.reduce((sum, o) => sum + o.quantity, 0)
        });
        // Add individual orders
        poOrders.forEach(order => {
          result.push({ ...order, isGroup: false });
        });
      } else {
        result.push({ ...poOrders[0], isGroup: false });
      }
    });

    return result;
  }, [orders, searchTerm, statusFilter, showPOGroups]);

  const getStatusBadge = (status: POOrder['status']) => {
    const variants = {
      'pending': { variant: 'secondary' as const, icon: Clock, color: 'text-yellow-500' },
      'ordered': { variant: 'default' as const, icon: CheckCircle2, color: 'text-blue-500' },
      'shipped': { variant: 'outline' as const, icon: Truck, color: 'text-green-500' },
      'delivered': { variant: 'outline' as const, icon: Package, color: 'text-green-700' },
      'cancelled': { variant: 'destructive' as const, icon: AlertCircle, color: 'text-red-500' },
      'closed': { variant: 'outline' as const, icon: CheckCircle2, color: 'text-gray-500' }
    };

    const config = variants[status] || variants.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className={`h-3 w-3 ${config.color}`} />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const uniqueStatuses = [...new Set(orders.map(o => o.status))];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search PO number, SKU, model number, or title..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {uniqueStatuses.map(status => (
                  <SelectItem key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Purchase Orders ({processedOrders.filter(o => !o.isGroup).length})</span>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {isLoading && "Loading..."}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Product Info</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ship To</TableHead>
                  <TableHead>Tracking</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processedOrders.map((order, index) => {
                  if (order.isGroup) {
                    return (
                      <TableRow key={`group-${order.po_number}`} className="bg-muted/30">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4" />
                            {order.po_number}
                            <Badge variant="outline" className="text-xs">
                              {order.groupCount} items
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          Group Summary
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{order.quantity} total</Badge>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(order.status)}
                        </TableCell>
                        <TableCell colSpan={4} className="text-muted-foreground">
                          Multiple locations
                        </TableCell>
                      </TableRow>
                    );
                  }

                  return (
                    <TableRow key={order.id} className={showPOGroups ? "ml-4" : ""}>
                      <TableCell className="font-medium">
                        {showPOGroups ? (
                          <span className="text-muted-foreground text-sm">└─ {order.po_number}</span>
                        ) : (
                          order.po_number
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium text-sm">{order.title || 'No title'}</div>
                          <div className="text-xs text-muted-foreground">
                            Model: {order.model_number || 'N/A'}
                          </div>
                          {order.asin && (
                            <div className="text-xs text-muted-foreground">
                              ASIN: {order.asin}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{order.quantity}</Badge>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(order.status)}
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate">
                        {order.ship_to_location || 'Not specified'}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {order.tracking_number ? (
                            <div className="flex items-center gap-1">
                              <Badge variant="outline" className="text-xs">
                                {order.tracking_number}
                              </Badge>
                              {order.tracking_url && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => window.open(order.tracking_url, '_blank')}
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">Not available</span>
                          )}
                          {order.supplier_order_number && (
                            <div className="text-xs text-muted-foreground">
                              Supplier: {order.supplier_order_number}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(order.created_at))} ago
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {order.status === 'pending' && (
                              <DropdownMenuItem onClick={() => onUpdateStatus(order.id, 'ordered')}>
                                Mark as Ordered
                              </DropdownMenuItem>
                            )}
                            {order.status === 'ordered' && (
                              <DropdownMenuItem onClick={() => onUpdateStatus(order.id, 'shipped')}>
                                Mark as Shipped
                              </DropdownMenuItem>
                            )}
                            {order.status === 'shipped' && (
                              <DropdownMenuItem onClick={() => onUpdateStatus(order.id, 'delivered')}>
                                Mark as Delivered
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => setEditingTracking(order.id)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Tracking
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
                
                {processedOrders.length === 0 && !isLoading && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No orders found matching your filters
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};