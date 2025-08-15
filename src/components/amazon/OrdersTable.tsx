import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Download, Eye, Edit, Trash2 } from 'lucide-react';
import { Order } from '@/types/amazon-fulfillment';
import { useCurrencyConverter } from '@/hooks/useCurrencyConverter';
import { useCountry } from '@/contexts/CountryContext';
import * as XLSX from 'xlsx';

interface OrdersTableProps {
  orders: Order[];
  onUpdateOrder: (id: string, updates: Partial<Order>) => void;
  onDeleteOrder: (id: string) => void;
}

export const OrdersTable = ({ orders, onUpdateOrder, onDeleteOrder }: OrdersTableProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const { formatCurrency, convertCurrency } = useCurrencyConverter();
  const { selectedCountry } = useCountry();
  
  const itemsPerPage = 100;
  const countryCurrency = selectedCountry === 'UAE' ? 'AED' : 'SAR';

  // Filter orders
  const filteredOrders = orders.filter(order => {
    const matchesSearch = searchTerm === '' || 
      order.order_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.item_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.asin?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.sku?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesPaymentStatus = paymentStatusFilter === 'all' || order.payment_status === paymentStatusFilter;
    
    return matchesSearch && matchesStatus && matchesPaymentStatus;
  });

  // Paginate orders
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedOrders = filteredOrders.slice(startIndex, startIndex + itemsPerPage);

  const getStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return 'default';
      case 'rejected':
        return 'destructive';
      case 'paid':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getPaymentStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'default';
      case 'overdue':
        return 'destructive';
      case 'due_soon':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const exportToExcel = () => {
    const exportData = filteredOrders.map(order => ({
      'Order ID': order.order_id,
      'Invoice ID': order.invoice_id || '',
      'ASIN': order.asin || '',
      'SKU': order.sku || '',
      'Item Title': order.item_title || '',
      'Quantity': order.quantity,
      'Item Cost': order.item_cost,
      'Currency': order.currency,
      'Status': order.status,
      'Payment Status': order.payment_status,
      'Shipment Date': order.shipment_date || '',
      'Payment Due Date': order.payment_due_date || '',
      'Country': order.country,
      'Created At': new Date(order.created_at).toLocaleDateString(),
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Orders');
    XLSX.writeFile(wb, `amazon-orders-${selectedCountry}-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-4">
      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full sm:w-64"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Non Submitted">Non Submitted</SelectItem>
              <SelectItem value="Approved">Approved</SelectItem>
              <SelectItem value="Rejected">Rejected</SelectItem>
              <SelectItem value="Paid">Paid</SelectItem>
            </SelectContent>
          </Select>

          <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Payment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Payments</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="due_soon">Due Soon</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={exportToExcel} variant="outline" className="w-full sm:w-auto">
          <Download className="h-4 w-4 mr-2" />
          Export Excel
        </Button>
      </div>

      {/* Results summary */}
      <div className="text-sm text-muted-foreground">
        Showing {paginatedOrders.length} of {filteredOrders.length} orders
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Item Details</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">
                    <div>
                      <div className="font-semibold">{order.order_id}</div>
                      {order.invoice_id && (
                        <div className="text-xs text-muted-foreground">INV: {order.invoice_id}</div>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium text-sm">{order.item_title || 'No title'}</div>
                      {order.asin && (
                        <div className="text-xs text-muted-foreground">ASIN: {order.asin}</div>
                      )}
                      {order.sku && (
                        <div className="text-xs text-muted-foreground">SKU: {order.sku}</div>
                      )}
                      <div className="text-xs">Qty: {order.quantity}</div>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">
                        {formatCurrency(
                          convertCurrency(order.item_cost, order.currency, countryCurrency),
                          countryCurrency
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Original: {formatCurrency(order.item_cost, order.currency)}
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <Badge variant={getStatusVariant(order.status)}>
                      {order.status}
                    </Badge>
                  </TableCell>
                  
                  <TableCell>
                    <div className="space-y-1">
                      <Badge variant={getPaymentStatusVariant(order.payment_status)}>
                        {order.payment_status.replace('_', ' ')}
                      </Badge>
                      {order.payment_due_date && (
                        <div className="text-xs text-muted-foreground">
                          Due: {new Date(order.payment_due_date).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="text-xs space-y-1">
                      {order.shipment_date && (
                        <div>Ship: {new Date(order.shipment_date).toLocaleDateString()}</div>
                      )}
                      {order.invoice_date && (
                        <div>Inv: {new Date(order.invoice_date).toLocaleDateString()}</div>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => onDeleteOrder(order.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};