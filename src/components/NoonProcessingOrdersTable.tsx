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
  partner_sku: string;
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
  { key: 'partner_sku', label: 'Partner SKU', default: true },
  { key: 'title', label: 'Title', default: true },
  { key: 'quantity', label: 'Qty', default: true },
  { key: 'order_status', label: 'Status', default: true },
  { key: 'order_country_code', label: 'Country', default: true },
  { key: 'order_received_at', label: 'Order Date', default: true },
  { key: 'file_upload_date', label: 'File Upload', default: false },
  { key: 'created_at', label: 'Created', default: false },
  { key: 'file_name', label: 'File Name', default: false },
];

export function NoonProcessingOrdersTable({ selectedStoreId }: { selectedStoreId?: string }) {
  const [orders, setOrders] = useState<ProcessingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    ALL_COLUMNS.filter(col => col.default).map(col => col.key)
  );
  const { toast } = useToast();

  const fetchOrders = async (storeId?: string) => {
    try {
      setLoading(true);
      let query = supabase
        .from('noon_processing_orders')
        .select('id, order_nr, order_status, quantity, purchase_item_nr, sku, partner_sku, title, order_country_code, file_name, file_upload_date, order_received_at, created_at')
        .order('created_at', { ascending: false });
      
      // Filter by store if selectedStoreId is provided
      if (storeId) {
        query = query.eq('selected_store_id', storeId);
      }

      const { data, error } = await query;

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
    fetchOrders(selectedStoreId);
  }, [selectedStoreId]);

  const filteredOrders = orders.filter(order =>
    order.order_nr.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.purchase_item_nr.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (order.sku && order.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (order.title && order.title.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const clearAllOrders = async () => {
    try {
      let query = supabase
        .from('noon_processing_orders')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all user's orders
      
      // Filter by store if selectedStoreId is provided
      if (selectedStoreId) {
        query = query.eq('selected_store_id', selectedStoreId);
      }

      const { error } = await query;

      if (error) throw error;
      
      setOrders([]);
      toast({
        title: "Success",
        description: selectedStoreId 
          ? "All processing orders for selected store cleared" 
          : "All processing orders cleared",
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
    <Card className="border-0 shadow-lg bg-gradient-to-br from-card via-card/95 to-card backdrop-blur-sm">
      <CardHeader className="border-b border-border/50 bg-gradient-to-r from-muted/30 to-muted/10">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-lg font-semibold text-foreground">
                Processing Orders ({orders.length})
              </div>
              <div className="text-sm text-muted-foreground">
                Manage and track your uploaded Noon orders
              </div>
            </div>
          </CardTitle>
          <div className="flex items-center gap-3">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="shadow-sm border-border/60 hover:bg-muted/50">
                  <Settings2 className="h-4 w-4 mr-2" />
                  Columns
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 bg-card/95 backdrop-blur-sm border-border/60 shadow-xl z-50">
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-foreground">Toggle Columns</h4>
                  <div className="space-y-2">
                    {ALL_COLUMNS.map((column) => (
                      <div key={column.key} className="flex items-center space-x-2">
                        <Checkbox
                          id={column.key}
                          checked={visibleColumns.includes(column.key)}
                          onCheckedChange={() => toggleColumn(column.key)}
                          className="border-border/60"
                        />
                        <label
                          htmlFor={column.key}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground"
                        >
                          {column.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            {orders.length > 0 && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={clearAllOrders}
                className="text-destructive hover:text-destructive border-destructive/20 hover:bg-destructive/5 shadow-sm"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {/* Enhanced Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search orders by number, item, SKU, or title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 border-border/60 bg-background/50 focus:bg-background transition-colors"
          />
        </div>

        {filteredOrders.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {orders.length === 0 ? (
              <div className="space-y-4">
                <div className="p-6 rounded-full bg-gradient-to-br from-muted/30 to-muted/10 w-24 h-24 mx-auto flex items-center justify-center">
                  <FileText className="h-12 w-12 text-muted-foreground/60" />
                </div>
                <div>
                  <p className="text-lg font-medium text-foreground">No processing orders uploaded yet</p>
                  <p className="text-sm">Upload a file above to see orders here</p>
                </div>
              </div>
            ) : (
              <p>No orders found matching your search</p>
            )}
          </div>
        ) : (
          <div className="border border-border/60 rounded-lg overflow-hidden bg-card/50 backdrop-blur-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/40 bg-gradient-to-r from-muted/40 to-muted/20">
                    {visibleColumns.map((columnKey) => {
                      const column = ALL_COLUMNS.find(col => col.key === columnKey);
                      return (
                        <th key={columnKey} className="text-left p-4 text-sm font-semibold text-foreground">
                          {column?.label}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order, index) => (
                    <tr key={order.id} className={`border-b border-border/30 transition-colors hover:bg-muted/20 ${index % 2 === 0 ? 'bg-background/30' : 'bg-muted/10'}`}>
                      {visibleColumns.map((columnKey) => (
                        <td key={columnKey} className="p-4 text-sm">
                          {(() => {
                            switch (columnKey) {
                              case 'order_nr':
                                return <span className="font-mono font-medium text-foreground">{order.order_nr}</span>;
                              case 'purchase_item_nr':
                                return <span className="font-mono text-muted-foreground">{order.purchase_item_nr}</span>;
                              case 'sku':
                                return <span className="font-mono text-foreground">{order.sku || 'N/A'}</span>;
                              case 'partner_sku':
                                return <span className="font-mono text-muted-foreground">{order.partner_sku || 'N/A'}</span>;
                              case 'title':
                                return (
                                  <span className="max-w-[200px] truncate block text-foreground" title={order.title}>
                                    {order.title || 'N/A'}
                                  </span>
                                );
                              case 'quantity':
                                return <span className="font-medium">{order.quantity}</span>;
                              case 'order_status':
                                return (
                                  <Badge variant={getStatusBadgeVariant(order.order_status)} className="shadow-sm">
                                    {order.order_status || 'Unknown'}
                                  </Badge>
                                );
                              case 'order_country_code':
                                return <span className="uppercase font-medium">{order.order_country_code}</span>;
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