import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Search, Package, Trash2, FileText, Settings2 } from 'lucide-react';

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
  file_upload_date?: string;
  order_received_at?: string;
  created_at: string;
}

const ALL_COLUMNS = [
  { key: 'order_nr', label: 'Order Nr', default: true },
  { key: 'purchase_item_nr', label: 'Item Nr', default: true },
  { key: 'sku', label: 'SKU', default: true },
  { key: 'title', label: 'Title', default: true },
  { key: 'quantity', label: 'Qty', default: true },
  { key: 'order_status', label: 'Status', default: true },
  { key: 'order_country_code', label: 'Country', default: true },
  { key: 'order_received_at', label: 'Order Date', default: true },
  { key: 'file_upload_date', label: 'File Upload', default: false },
  { key: 'created_at', label: 'Created', default: false },
  { key: 'file_name', label: 'File Name', default: false },
];

export function NoonProcessingOrdersTable() {
  const [orders, setOrders] = useState<ProcessingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    ALL_COLUMNS.filter(col => col.default).map(col => col.key)
  );
  const { toast } = useToast();

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('noon_processing_orders')
        .select('id, order_nr, order_status, quantity, purchase_item_nr, sku, title, order_country_code, file_name, file_upload_date, order_received_at, created_at')
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

  const toggleColumn = (columnKey: string) => {
    setVisibleColumns(prev => 
      prev.includes(columnKey) 
        ? prev.filter(key => key !== columnKey)
        : [...prev, columnKey]
    );
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
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
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings2 className="h-4 w-4 mr-2" />
                  Columns
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Toggle Columns</h4>
                  {ALL_COLUMNS.map((column) => (
                    <div key={column.key} className="flex items-center space-x-2">
                      <Checkbox
                        id={column.key}
                        checked={visibleColumns.includes(column.key)}
                        onCheckedChange={() => toggleColumn(column.key)}
                      />
                      <label
                        htmlFor={column.key}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {column.label}
                      </label>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
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
                    {visibleColumns.map((columnKey) => {
                      const column = ALL_COLUMNS.find(col => col.key === columnKey);
                      return (
                        <th key={columnKey} className="text-left p-3 text-sm font-medium">
                          {column?.label}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order, index) => (
                    <tr key={order.id} className={`border-b ${index % 2 === 0 ? 'bg-background' : 'bg-muted/25'}`}>
                      {visibleColumns.map((columnKey) => (
                        <td key={columnKey} className="p-3 text-sm">
                          {(() => {
                            switch (columnKey) {
                              case 'order_nr':
                                return <span className="font-mono">{order.order_nr}</span>;
                              case 'purchase_item_nr':
                                return <span className="font-mono text-muted-foreground">{order.purchase_item_nr}</span>;
                              case 'sku':
                                return <span className="font-mono">{order.sku || 'N/A'}</span>;
                              case 'title':
                                return (
                                  <span className="max-w-[200px] truncate block" title={order.title}>
                                    {order.title || 'N/A'}
                                  </span>
                                );
                              case 'quantity':
                                return order.quantity;
                              case 'order_status':
                                return (
                                  <Badge variant={getStatusBadgeVariant(order.order_status)}>
                                    {order.order_status || 'Unknown'}
                                  </Badge>
                                );
                              case 'order_country_code':
                                return <span className="uppercase">{order.order_country_code}</span>;
                              case 'order_received_at':
                                return <span className="text-muted-foreground">{formatDateTime(order.order_received_at)}</span>;
                              case 'file_upload_date':
                                return <span className="text-muted-foreground">{formatDate(order.file_upload_date)}</span>;
                              case 'created_at':
                                return <span className="text-muted-foreground">{formatDate(order.created_at)}</span>;
                              case 'file_name':
                                return <span className="text-muted-foreground text-xs">{order.file_name}</span>;
                              default:
                                return 'N/A';
                            }
                          })()}
                        </td>
                      ))}
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