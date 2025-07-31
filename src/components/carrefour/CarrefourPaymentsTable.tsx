import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CarrefourPayment } from "@/types/carrefour";
import { useCountry } from "@/contexts/CountryContext";

interface CarrefourPaymentsTableProps {
  refresh: number;
}

export function CarrefourPaymentsTable({ refresh }: CarrefourPaymentsTableProps) {
  const [payments, setPayments] = useState<CarrefourPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { selectedCountry } = useCountry();

  useEffect(() => {
    fetchPayments();
  }, [refresh, selectedCountry]);

  const fetchPayments = async () => {
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

  if (isLoading) {
    return <div className="text-center py-4">Loading payments...</div>;
  }

  if (payments.length === 0) {
    return <div className="text-center py-4">No payment records found</div>;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order Number</TableHead>
            <TableHead>SKU Number</TableHead>
            <TableHead>Sale Value</TableHead>
            <TableHead>Seller Fees</TableHead>
            <TableHead>Pending Amount</TableHead>
            <TableHead>Cost</TableHead>
            <TableHead>Profit</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((payment) => (
            <TableRow key={payment.id}>
              <TableCell>{payment.order_number}</TableCell>
              <TableCell>{payment.sku_number}</TableCell>
              <TableCell>${payment.sale_value.toFixed(2)}</TableCell>
              <TableCell>${payment.seller_fees.toFixed(2)}</TableCell>
              <TableCell>${payment.pending_amount.toFixed(2)}</TableCell>
              <TableCell>${payment.cost.toFixed(2)}</TableCell>
              <TableCell className={payment.profit >= 0 ? "text-green-600" : "text-red-600"}>
                ${payment.profit.toFixed(2)}
              </TableCell>
              <TableCell>
                {new Date(payment.created_at).toLocaleDateString()}
              </TableCell>
              <TableCell>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleDelete(payment.id)}
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
  );
}