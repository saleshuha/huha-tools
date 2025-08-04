import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CalendarDays, Search, FileText, Package, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ProcessedOrder {
  id: string;
  order_id: string;
  asin: string | null;
  sku: string | null;
  processed_quantity: number;
  processed_at: string;
  inventory_type: string | null;
  match_type: string | null;
  file_name: string | null;
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
      
      // Fetch all order processing results that have been processed
      const { data, error } = await supabase
        .from('order_processing_results')
        .select('*')
        .not('processed_at', 'is', null)  // Show orders that have a processed_at timestamp
        .order('processed_at', { ascending: false });

      if (error) throw error;

      console.log('Fetched processed orders:', data);
      setProcessedOrders(data || []);
      
      if (!data || data.length === 0) {
        toast({
          title: "No Data",
          description: "No processed orders found in the database",
          variant: "default",
        });
      }
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
    order.order_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (order.asin && order.asin.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (order.sku && order.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

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
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary-variant bg-clip-text text-transparent">
              Processed Orders
            </h1>
          </div>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            View and track all successfully processed orders with their details and processing history.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="p-4 glass-container border-0 shadow-elegant">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Processed</p>
                <p className="text-2xl font-bold text-green-600">{processedOrders.length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 glass-container border-0 shadow-elegant">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Quantity</p>
                <p className="text-2xl font-bold text-blue-600">
                  {processedOrders.reduce((sum, order) => sum + (order.processed_quantity || 0), 0)}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4 glass-container border-0 shadow-elegant">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Recent Activity</p>
                <p className="text-2xl font-bold text-purple-600">
                  {processedOrders.filter(order => {
                    const processedDate = new Date(order.processed_at);
                    const dayAgo = new Date();
                    dayAgo.setDate(dayAgo.getDate() - 1);
                    return processedDate > dayAgo;
                  }).length}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Search */}
        <Card className="p-6 glass-container border-0 shadow-elegant">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search by Order ID, ASIN, or SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button onClick={fetchProcessedOrders} variant="outline">
                Refresh
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
                  {searchTerm ? 'No orders found matching your search.' : 'No processed orders found.'}
                </p>
              </div>
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order Number</TableHead>
                      <TableHead>ASIN/SKU</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Process Date</TableHead>
                      <TableHead>Source File</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell>
                          <div className="font-mono text-sm">{order.order_id}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-mono text-sm">
                            {order.asin || order.sku || '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          {order.inventory_type && (
                            <Badge variant="outline" className="text-xs">
                              {order.inventory_type.toUpperCase()} Inventory
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{order.processed_quantity}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <CalendarDays className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">{formatDate(order.processed_at)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {order.file_name || '-'}
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