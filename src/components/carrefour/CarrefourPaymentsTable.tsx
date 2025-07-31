import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, TrendingUp, TrendingDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CarrefourPayment } from "@/types/carrefour";
import { useCountry } from "@/contexts/CountryContext";

interface CarrefourPaymentsTableProps {
  refresh: number;
  filteredData?: CarrefourPayment[];
}

export function CarrefourPaymentsTable({ refresh, filteredData }: CarrefourPaymentsTableProps) {
  const [payments, setPayments] = useState<CarrefourPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { selectedCountry } = useCountry();

  // Use filtered data if provided, otherwise use all payments
  const displayData = filteredData || payments;

  useEffect(() => {
    fetchPayments();
  }, [refresh, selectedCountry]);

  const fetchPayments = async () => {
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
      setPayments(data || []);
    } catch (error) {
      console.error("Error fetching payments:", error);
      toast({
        title: "Error",
        description: "Failed to fetch payment records",
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
        description: "Payment record deleted successfully",
      });

      fetchPayments();
    } catch (error) {
      console.error("Error deleting payment:", error);
      toast({
        title: "Error",
        description: "Failed to delete payment record",
        variant: "destructive",
      });
    }
  };

  if (isLoading && !filteredData) {
    return <div className="text-center py-4">Loading payments...</div>;
  }

  if (displayData.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">No payment records found</div>;
  }

  return (
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="font-semibold">Order #</TableHead>
            <TableHead className="font-semibold">SKU</TableHead>
            <TableHead className="font-semibold">Sale Value</TableHead>
            <TableHead className="font-semibold">Fees</TableHead>
            <TableHead className="font-semibold">Cost</TableHead>
            <TableHead className="font-semibold">Profit</TableHead>
            <TableHead className="font-semibold">Pending</TableHead>
            <TableHead className="font-semibold">Date</TableHead>
            <TableHead className="font-semibold text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayData.map((payment, index) => (
            <TableRow 
              key={payment.id} 
              className={`hover:bg-muted/30 transition-colors ${
                index % 2 === 0 ? "bg-background" : "bg-muted/10"
              }`}
            >
              <TableCell className="font-medium">
                <Badge variant="outline" className="font-mono text-xs">
                  {payment.order_number}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant="secondary" className="font-mono text-xs">
                  {payment.sku_number}
                </Badge>
              </TableCell>
              <TableCell>
                <span className="font-semibold text-green-600">
                  {payment.sale_value.toFixed(2)}
                </span>
              </TableCell>
              <TableCell>
                <span className="text-orange-600">
                  {payment.seller_fees.toFixed(2)}
                </span>
              </TableCell>
              <TableCell>
                <span className="text-red-600">
                  {payment.cost.toFixed(2)}
                </span>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  {payment.profit >= 0 ? (
                    <TrendingUp className="h-3 w-3 text-green-500" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-500" />
                  )}
                  <span className={`font-semibold ${
                    payment.profit >= 0 ? "text-green-600" : "text-red-600"
                  }`}>
                    {payment.profit.toFixed(2)}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <Badge 
                  variant={payment.pending_amount > 0 ? "destructive" : "secondary"}
                  className="text-xs"
                >
                  {payment.pending_amount.toFixed(2)}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {new Date(payment.created_at).toLocaleDateString()}
              </TableCell>
              <TableCell>
                <div className="flex justify-center space-x-1">
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleDelete(payment.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}