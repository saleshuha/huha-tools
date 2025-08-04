import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CalendarDays, Search, FileText, Package, Clock, TrendingUp, Printer } from 'lucide-react';
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

export default function ProcessedOrders() {
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

      console.log('Fetched processed orders:', data);
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
            Total Quantity Processed: ${filteredOrders.reduce((sum, order) => sum + order.quantity_processed, 0)}<br>
            ASIN Orders: ${filteredOrders.filter(o => o.inventory_type === 'asin').length}<br>
            SKU Orders: ${filteredOrders.filter(o => o.inventory_type === 'sku').length}
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
                  <td>${order.previous_stock !== null && order.new_stock !== null ? 
                    `${order.previous_stock} → ${order.new_stock}` : '-'}</td>
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
    printWindow.focus();
    printWindow.print();
  };

  // Calculate statistics
  const totalQuantity = processedOrders.reduce((sum, order) => sum + order.quantity_processed, 0);
  const asinOrders = processedOrders.filter(o => o.inventory_type === 'asin').length;
  const skuOrders = processedOrders.filter(o => o.inventory_type === 'sku').length;
  const recentOrders = processedOrders.filter(order => {
    const processedDate = new Date(order.processed_at);
    const dayAgo = new Date();
    dayAgo.setDate(dayAgo.getDate() - 1);
    return processedDate > dayAgo;
  }).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Enhanced Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-blue-400/10 to-indigo-400/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-br from-purple-400/10 to-blue-400/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 rounded-full bg-gradient-primary">
              <FileText className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-primary">
              Processed Orders
            </h1>
          </div>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Track and manage all successfully processed orders with complete processing history and analytics.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="p-4 glass-container border-0 shadow-elegant">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold text-green-600">{processedOrders.length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 glass-container border-0 shadow-elegant">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Quantity</p>
                <p className="text-2xl font-bold text-blue-600">{totalQuantity}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 glass-container border-0 shadow-elegant">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">ASIN/SKU Split</p>
                <p className="text-2xl font-bold text-purple-600">{asinOrders}/{skuOrders}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 glass-container border-0 shadow-elegant">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-red-600">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Last 24h</p>
                <p className="text-2xl font-bold text-orange-600">{recentOrders}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Search and Actions */}
        <Card className="p-6 glass-container border-0 shadow-elegant">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search by Order Number, ASIN, SKU, or Item Title..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button onClick={fetchProcessedOrders} variant="outline">
                Refresh
              </Button>
              <Button onClick={printReport} variant="outline" disabled={filteredOrders.length === 0}>
                <Printer className="w-4 h-4 mr-2" />
                Print Report
              </Button>
            </div>
          </div>
        </Card>

        {/* Processed Orders Table */}
        <Card className="glass-container border-0 shadow-elegant">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                Processed Orders ({filteredOrders.length})
              </h3>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-muted-foreground">Loading processed orders...</p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-8">
                <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {searchTerm ? 'No orders found matching your search.' : 'No processed orders found. Process some orders to see them here.'}
                </p>
              </div>
            ) : (
              <div className="rounded-lg border overflow-hidden">
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
                        <TableCell>
                          <div className="font-mono text-sm font-medium">{order.order_number}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-mono text-sm">
                            {order.asin || order.sku || '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[200px] truncate text-sm" title={order.item_title || ''}>
                            {order.item_title || '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge variant="outline" className="text-xs w-fit">
                              {order.inventory_type.toUpperCase()} Inventory
                            </Badge>
                            <Badge variant="secondary" className="text-xs w-fit">
                              Found by {order.match_type.toUpperCase()}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-blue-600">{order.quantity_processed}</span>
                        </TableCell>
                        <TableCell>
                          {order.previous_stock !== null && order.new_stock !== null ? (
                            <div className="text-sm">
                              <span className="text-muted-foreground">{order.previous_stock}</span>
                              {' → '}
                              <span className="font-medium">{order.new_stock}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <CalendarDays className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">{formatDate(order.processed_at)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground truncate max-w-[150px] block" title={order.source_file || ''}>
                            {order.source_file || '-'}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}