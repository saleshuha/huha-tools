import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CalendarDays, Search, FileText, Package, Clock, TrendingUp, Printer, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ProcessedOrder {
  id: string;
  order_number: string;
  asin: string | null;
  sku: string | null;
  item_title: string | null;
  quantity_processed: number;
  inventory_type: string;
  match_type: string;
  inventory_id: string | null;
  previous_stock: number | null;
  new_stock: number | null;
  processed_at: string;
  source_file: string | null;
  notes: string | null;
}

export function ProcessedOrdersView() {
  const [processedOrders, setProcessedOrders] = useState<ProcessedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchProcessedOrders();
  }, []);

  const fetchProcessedOrders = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('processed_orders')
        .select('*')
        .order('processed_at', { ascending: false });

      if (error) throw error;

      setProcessedOrders(data || []);
      
    } catch (error) {
      console.error('Error fetching processed orders:', error);
      toast({
        title: "Error",
        description: "Failed to fetch processed orders",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = processedOrders.filter(order =>
    order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (order.asin && order.asin.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (order.sku && order.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (order.item_title && order.item_title.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const printReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = `
      <html>
        <head>
          <title>Processed Orders Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; text-align: center; }
            .summary { background: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .print-date { text-align: right; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <h1>Processed Orders Report</h1>
          <div class="print-date">
            <strong>Generated:</strong> ${new Date().toLocaleString()}
          </div>
          <div class="summary">
            <strong>Summary:</strong><br>
            Total Processed Orders: ${filteredOrders.length}<br>
            Total Quantity: ${filteredOrders.reduce((sum, order) => sum + order.quantity_processed, 0)}<br>
            ASIN Orders: ${filteredOrders.filter(order => order.inventory_type === 'asin').length}<br>
            SKU Orders: ${filteredOrders.filter(order => order.inventory_type === 'sku').length}<br>
            Recent Orders (Last 7 days): ${filteredOrders.filter(order => 
              new Date(order.processed_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            ).length}
          </div>
          <table>
            <thead>
              <tr>
                <th>Order Number</th>
                <th>ASIN/SKU</th>
                <th>Item Title</th>
                <th>Type</th>
                <th>Quantity</th>
                <th>Stock Change</th>
                <th>Process Date</th>
                <th>Source File</th>
              </tr>
            </thead>
            <tbody>
              ${filteredOrders.map(order => `
                <tr>
                  <td>${order.order_number}</td>
                  <td>${order.asin || order.sku || '-'}</td>
                  <td>${order.item_title || '-'}</td>
                  <td>${order.inventory_type.toUpperCase()}</td>
                  <td>${order.quantity_processed}</td>
                  <td>${order.previous_stock || '-'} → ${order.new_stock || '-'}</td>
                  <td>${formatDate(order.processed_at)}</td>
                  <td>${order.source_file || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  // Calculate statistics
  const totalQuantity = processedOrders.reduce((sum, order) => sum + order.quantity_processed, 0);
  const asinOrders = processedOrders.filter(order => order.inventory_type === 'asin').length;
  const skuOrders = processedOrders.filter(order => order.inventory_type === 'sku').length;
  const recentOrders = processedOrders.filter(order => 
    new Date(order.processed_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  ).length;

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Orders</p>
              <p className="text-2xl font-bold">{processedOrders.length}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center space-x-2">
            <Package className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Quantity</p>
              <p className="text-2xl font-bold">{totalQuantity}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-orange-600" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">ASIN Orders</p>
              <p className="text-2xl font-bold">{asinOrders}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-purple-600" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Recent (7 days)</p>
              <p className="text-2xl font-bold">{recentOrders}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search and Actions */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2 flex-1">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by order number, ASIN, SKU, or item title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={fetchProcessedOrders} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" onClick={printReport}>
              <Printer className="h-4 w-4 mr-2" />
              Print Report
            </Button>
          </div>
        </div>

        {/* Orders Table */}
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="text-muted-foreground">Loading processed orders...</div>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-semibold">No processed orders found</p>
            <p className="text-sm">Orders will appear here once they've been processed</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order Number</TableHead>
                  <TableHead>ASIN/SKU</TableHead>
                  <TableHead>Item Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Stock Change</TableHead>
                  <TableHead>Process Date</TableHead>
                  <TableHead>Source File</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.order_number}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {order.asin && (
                          <div>
                            <span className="text-muted-foreground">ASIN:</span> {order.asin}
                          </div>
                        )}
                        {order.sku && (
                          <div>
                            <span className="text-muted-foreground">SKU:</span> {order.sku}
                          </div>
                        )}
                        {!order.asin && !order.sku && '-'}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {order.item_title || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={order.inventory_type === 'asin' ? 'default' : 'secondary'}>
                        {order.inventory_type.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>{order.quantity_processed}</TableCell>
                    <TableCell>
                      {order.previous_stock !== null && order.new_stock !== null 
                        ? `${order.previous_stock} → ${order.new_stock}`
                        : '-'
                      }
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(order.processed_at)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {order.source_file || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}