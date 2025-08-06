import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ShoppingCart, Calendar, Search, Package2, Clock, CheckCircle, XCircle, ChevronRight } from 'lucide-react';
import { POOrder } from '@/hooks/usePOTracker';

interface POOrderTrackingProps {
  orders: POOrder[];
  onUpdateStatus: (orderId: string, status: POOrder['status']) => void;
  onUpdateTracking: (orderId: string, trackingData: { supplier_order_number?: string; tracking_number?: string; tracking_url?: string }) => void;
  isLoading: boolean;
}

interface POGroup {
  po_number: string;
  orders: POOrder[];
  totalItems: number;
  totalCost: number;
  currency: string;
  status: string; // Overall status of the PO
}

export function POOrderTracking({ orders, onUpdateStatus, onUpdateTracking, isLoading }: POOrderTrackingProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const navigate = useNavigate();

  // Group orders by PO number
  const groupedPOs = orders.reduce((acc, order) => {
    const existingGroup = acc.find(group => group.po_number === order.po_number);
    
    if (existingGroup) {
      existingGroup.orders.push(order);
      existingGroup.totalItems += order.quantity;
      existingGroup.totalCost += order.total_cost || 0;
    } else {
      acc.push({
        po_number: order.po_number,
        orders: [order],
        totalItems: order.quantity,
        totalCost: order.total_cost || 0,
        currency: order.currency || 'AED',
        status: order.status
      });
    }
    
    return acc;
  }, [] as POGroup[]);

  // Update overall status for each PO group
  groupedPOs.forEach(group => {
    const statuses = group.orders.map(o => o.status);
    if (statuses.every(s => s === 'delivered')) {
      group.status = 'delivered';
    } else if (statuses.some(s => s === 'cancelled')) {
      group.status = 'cancelled';
    } else if (statuses.some(s => s === 'shipped')) {
      group.status = 'shipped';
    } else if (statuses.some(s => s === 'ordered')) {
      group.status = 'ordered';
    } else {
      group.status = 'pending';
    }
  });

  const filteredPOs = groupedPOs.filter(group => {
    const matchesSearch = 
      group.po_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.orders.some(order => order.sku_code.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || group.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const navigateToPODetails = (poNumber: string) => {
    navigate(`/po-details/${encodeURIComponent(poNumber)}`);
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

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center space-x-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <ShoppingCart className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No PO Orders Found</h3>
          <p className="text-muted-foreground max-w-sm">
            Upload PO files to start tracking purchase orders and their status.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search PO number or SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="ordered">Ordered</SelectItem>
            <SelectItem value="shipped">Shipped</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* PO Groups */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <ShoppingCart className="h-5 w-5 mr-2" />
            Purchase Orders ({filteredPOs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredPOs.map((group) => (
              <div key={group.po_number} className="border rounded-lg">
                {/* PO Header */}
                <div 
                  className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => navigateToPODetails(group.po_number)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <ChevronRight className="h-4 w-4" />
                      <Badge variant="outline" className="font-mono">
                        {group.po_number}
                      </Badge>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(group.status as POOrder['status'])}
                        <Badge variant={getStatusVariant(group.status as POOrder['status'])}>
                          {group.status.charAt(0).toUpperCase() + group.status.slice(1)}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{group.totalItems} items</span>
                      <span>{group.totalCost.toFixed(2)} {group.currency}</span>
                    </div>
                  </div>
                </div>

              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}