import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, TrendingUp, TrendingDown, Package, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CarrefourSalesOrder } from "@/types/carrefour";
import { useCountry } from "@/contexts/CountryContext";

interface CarrefourSalesOrdersTableProps {
  refresh: number;
  filteredData?: CarrefourSalesOrder[];
}

export function CarrefourSalesOrdersTable({ refresh, filteredData }: CarrefourSalesOrdersTableProps) {
  const [salesOrders, setSalesOrders] = useState<CarrefourSalesOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { selectedCountry } = useCountry();

  // Use filtered data if provided, otherwise use all sales orders
  const displayData = filteredData || salesOrders;

  useEffect(() => {
    fetchSalesOrders();
  }, [refresh, selectedCountry]);

  const fetchSalesOrders = async () => {
    // Only fetch if no filtered data is provided
    if (filteredData) {
      setIsLoading(false);
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from("carrefour_payments")
        .select("*")
        .eq("country", selectedCountry)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSalesOrders(data || []);
    } catch (error) {
      console.error("Error fetching sales orders:", error);
      toast({
        title: "Error",
        description: "Failed to fetch sales order records",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("carrefour_payments")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Sales order record deleted successfully",
      });

      fetchSalesOrders();
    } catch (error) {
      console.error("Error deleting sales order:", error);
      toast({
        title: "Error",
        description: "Failed to delete sales order record",
        variant: "destructive",
      });
    }
  };

  if (isLoading && !filteredData) {
    return <div className="text-center py-8">Loading sales orders...</div>;
  }

  if (displayData.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-muted-foreground mb-2">No Sales Orders Found</h3>
        <p className="text-sm text-muted-foreground">Start by adding your first sales order to track profit.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border overflow-hidden bg-background">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/40">
            <TableHead className="font-semibold text-emerald-700">Order Details</TableHead>
            <TableHead className="font-semibold text-emerald-700">SKU</TableHead>
            <TableHead className="font-semibold text-emerald-700">Sale Value</TableHead>
            <TableHead className="font-semibold text-red-700">Cost</TableHead>
            <TableHead className="font-semibold text-yellow-700">Platform Fees</TableHead>
            <TableHead className="font-semibold text-blue-700">Net Profit</TableHead>
            <TableHead className="font-semibold text-orange-700">Outstanding</TableHead>
            <TableHead className="font-semibold">Date</TableHead>
            <TableHead className="font-semibold text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayData.map((order, index) => {
            const profitMargin = order.sale_value > 0 ? (order.profit / order.sale_value) * 100 : 0;
            
            return (
              <TableRow 
                key={order.id} 
                className={`hover:bg-muted/20 transition-colors ${
                  index % 2 === 0 ? "bg-background" : "bg-muted/5"
                }`}
              >
                <TableCell>
                  <div className="space-y-1">
                    <Badge variant="outline" className="font-mono text-xs bg-emerald-50 border-emerald-200">
                      {order.order_number}
                    </Badge>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Package className="h-3 w-3" />
                      Order ID
                    </div>
                  </div>
                </TableCell>
                
                <TableCell>
                  <Badge variant="secondary" className="font-mono text-xs bg-slate-50 border-slate-200">
                    {order.sku_number}
                  </Badge>
                </TableCell>
                
                <TableCell>
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3 text-emerald-500" />
                    <span className="font-semibold text-emerald-600">
                      {order.sale_value.toFixed(2)}
                    </span>
                  </div>
                </TableCell>
                
                <TableCell>
                  <span className="font-medium text-red-600">
                    {order.cost.toFixed(2)}
                  </span>
                </TableCell>
                
                <TableCell>
                  <span className="font-medium text-yellow-600">
                    {order.seller_fees.toFixed(2)}
                  </span>
                </TableCell>
                
                <TableCell>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      {order.profit >= 0 ? (
                        <TrendingUp className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-red-500" />
                      )}
                      <span className={`font-bold ${
                        order.profit >= 0 ? "text-emerald-600" : "text-red-600"
                      }`}>
                        {order.profit.toFixed(2)}
                      </span>
                    </div>
                    <Badge 
                      variant={order.profit >= 0 ? "secondary" : "destructive"}
                      className="text-xs"
                    >
                      {profitMargin.toFixed(1)}% margin
                    </Badge>
                  </div>
                </TableCell>
                
                <TableCell>
                  <Badge 
                    variant={order.pending_amount > 0 ? "destructive" : "secondary"}
                    className="text-xs"
                  >
                    {order.pending_amount.toFixed(2)}
                  </Badge>
                </TableCell>
                
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(order.created_at).toLocaleDateString()}
                </TableCell>
                
                <TableCell>
                  <div className="flex justify-center space-x-1">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-blue-50">
                      <Edit className="h-3 w-3 text-blue-600" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDelete(order.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}