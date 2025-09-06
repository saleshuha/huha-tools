import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Search, Package, Trash2, FileText } from 'lucide-react';

interface ProcessingOrder {
  id: string;
  order_nr: string;
  order_status: string;
  quantity: number;
  purchase_item_nr: string;
  sku: string;
  title: string;
  order_country_code: string;
  file_name: string;
  created_at: string;
}

export function NoonProcessingOrdersTable() {
  const [orders, setOrders] = useState<ProcessingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('noon_processing_orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching processing orders:', error);
      toast({
        title: "Error",
        description: "Failed to fetch processing orders",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const filteredOrders = orders.filter(order =>
    order.order_nr.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.purchase_item_nr.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (order.sku && order.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (order.title && order.title.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const clearAllOrders = async () => {
    try {
      const { error } = await supabase
        .from('noon_processing_orders')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all user's orders

      if (error) throw error;
      
      setOrders([]);
      toast({
        title: "Success",
        description: "All processing orders cleared",
      });
    } catch (error) {
      console.error('Error clearing orders:', error);
      toast({
        title: "Error",
        description: "Failed to clear orders",
        variant: "destructive"
      });
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'secondary';
      case 'processing':
        return 'default';
      case 'shipped':
        return 'default';
      case 'delivered':
        return 'default';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Processing Orders ({orders.length})
          </CardTitle>
          {orders.length > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={clearAllOrders}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search orders by number, item, SKU, or title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {filteredOrders.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {orders.length === 0 ? (
              <div className="space-y-2">
                <FileText className="h-12 w-12 mx-auto opacity-50" />
                <p>No processing orders uploaded yet</p>
                <p className="text-sm">Upload a file above to see orders here</p>
              </div>
            ) : (
              <p>No orders found matching your search</p>
            )}
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 text-sm font-medium">Order Nr</th>
                    <th className="text-left p-3 text-sm font-medium">Item Nr</th>
                    <th className="text-left p-3 text-sm font-medium">SKU</th>
                    <th className="text-left p-3 text-sm font-medium">Title</th>
                    <th className="text-left p-3 text-sm font-medium">Qty</th>
                    <th className="text-left p-3 text-sm font-medium">Status</th>
                    <th className="text-left p-3 text-sm font-medium">Country</th>
                    <th className="text-left p-3 text-sm font-medium">Uploaded</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order, index) => (
                    <tr key={order.id} className={`border-b ${index % 2 === 0 ? 'bg-background' : 'bg-muted/25'}`}>
                      <td className="p-3 text-sm font-mono">{order.order_nr}</td>
                      <td className="p-3 text-sm font-mono text-muted-foreground">{order.purchase_item_nr}</td>
                      <td className="p-3 text-sm font-mono">{order.sku || 'N/A'}</td>
                      <td className="p-3 text-sm max-w-[200px] truncate" title={order.title}>
                        {order.title || 'N/A'}
                      </td>
                      <td className="p-3 text-sm">{order.quantity}</td>
                      <td className="p-3 text-sm">
                        <Badge variant={getStatusBadgeVariant(order.order_status)}>
                          {order.order_status || 'Unknown'}
                        </Badge>
                      </td>
                      <td className="p-3 text-sm uppercase">{order.order_country_code}</td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}