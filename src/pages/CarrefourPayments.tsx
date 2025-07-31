import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, DollarSign, TrendingUp, Package, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CarrefourPaymentForm } from "@/components/carrefour/CarrefourPaymentForm";
import { CarrefourPaymentsTable } from "@/components/carrefour/CarrefourPaymentsTable";
import { CarrefourPayment } from "@/types/carrefour";
import { supabase } from "@/integrations/supabase/client";
import { useCountry } from "@/contexts/CountryContext";
import { useToast } from "@/hooks/use-toast";

export default function CarrefourPayments() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [payments, setPayments] = useState<CarrefourPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { selectedCountry } = useCountry();
  const { toast } = useToast();

  useEffect(() => {
    fetchPayments();
  }, [selectedCountry]);

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

  const handleSuccess = () => {
    setDialogOpen(false);
    setRefreshKey(prev => prev + 1);
    fetchPayments();
  };

  // Filter payments based on search term
  const filteredPayments = useMemo(() => {
    if (!searchTerm.trim()) return payments;
    
    return payments.filter(payment => 
      payment.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.sku_number.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [payments, searchTerm]);

  // Calculate metrics
  const metrics = useMemo(() => {
    const totalRevenue = payments.reduce((sum, p) => sum + p.sale_value, 0);
    const totalCosts = payments.reduce((sum, p) => sum + p.cost, 0);
    const totalProfit = payments.reduce((sum, p) => sum + p.profit, 0);
    const totalPending = payments.reduce((sum, p) => sum + p.pending_amount, 0);
    const totalFees = payments.reduce((sum, p) => sum + p.seller_fees, 0);
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    return {
      totalRevenue,
      totalCosts,
      totalProfit,
      totalPending,
      totalFees,
      profitMargin,
      totalOrders: payments.length,
      profitableOrders: payments.filter(p => p.profit > 0).length
    };
  }, [payments]);

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Package className="h-8 w-8 text-primary" />
            Carrefour Payments
          </h1>
          <p className="text-muted-foreground">
            Manage and track your Carrefour payment records for {selectedCountry}
          </p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Payment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Carrefour Payment</DialogTitle>
            </DialogHeader>
            <CarrefourPaymentForm onSuccess={handleSuccess} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by order number or SKU number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => {}}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${metrics.totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              From {metrics.totalOrders} orders
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => {}}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">${metrics.totalProfit.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.profitMargin.toFixed(1)}% margin
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => {}}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Amount</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">${metrics.totalPending.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting payment
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => {}}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profitable Orders</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{metrics.profitableOrders}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.totalOrders > 0 ? ((metrics.profitableOrders / metrics.totalOrders) * 100).toFixed(1) : 0}% of total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Costs</p>
                <p className="text-2xl font-bold text-red-600">${metrics.totalCosts.toFixed(2)}</p>
              </div>
              <Badge variant="secondary">Costs</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Seller Fees</p>
                <p className="text-2xl font-bold text-yellow-600">${metrics.totalFees.toFixed(2)}</p>
              </div>
              <Badge variant="secondary">Fees</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Search Results</p>
                <p className="text-2xl font-bold">{filteredPayments.length}</p>
              </div>
              <Badge variant="outline">
                {searchTerm ? "Filtered" : "All"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Payment Records
            {searchTerm && (
              <Badge variant="secondary" className="ml-2">
                {filteredPayments.length} of {payments.length}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            {searchTerm 
              ? `Showing filtered results for "${searchTerm}"`
              : "All your Carrefour payment transactions and their details"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CarrefourPaymentsTable refresh={refreshKey} filteredData={filteredPayments} />
        </CardContent>
      </Card>
    </div>
  );
}