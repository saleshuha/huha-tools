import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, ShoppingCart, TrendingUp, Package, Calculator, BarChart3, Receipt } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CarrefourSalesOrdersTable } from "@/components/carrefour/CarrefourSalesOrdersTable";
import { CarrefourSalesOrder } from "@/types/carrefour";
import { supabase } from "@/integrations/supabase/client";
import { useCountry } from "@/contexts/CountryContext";
import { useToast } from "@/hooks/use-toast";
export default function CarrefourSalesTracker() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [salesOrders, setSalesOrders] = useState<CarrefourSalesOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const {
    selectedCountry
  } = useCountry();
  const {
    toast
  } = useToast();
  useEffect(() => {
    fetchSalesOrders();
  }, [selectedCountry]);
  const fetchSalesOrders = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from("carrefour_payments").select("*").eq("country", selectedCountry).order("created_at", {
        ascending: false
      });
      if (error) throw error;
      setSalesOrders((data || []) as CarrefourSalesOrder[]);
    } catch (error) {
      console.error("Error fetching sales orders:", error);
      toast({
        title: "Error",
        description: "Failed to fetch sales order records",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    fetchSalesOrders();
  };

  // Filter sales orders based on search term
  const filteredOrders = useMemo(() => {
    if (!searchTerm.trim()) return salesOrders;
    return salesOrders.filter(order => order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) || order.status.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [salesOrders, searchTerm]);

  // Calculate metrics
  const metrics = useMemo(() => {
    const totalRevenue = salesOrders.reduce((sum, o) => sum + o.sale_value, 0);
    const totalCosts = salesOrders.reduce((sum, o) => sum + o.cost, 0);
    const totalProfit = salesOrders.reduce((sum, o) => sum + o.profit, 0);
    const totalPendingPayments = salesOrders.filter(o => o.payment_status === 'Pending').length;
    const totalFees = salesOrders.reduce((sum, o) => sum + o.seller_fees, 0);
    const profitMargin = totalRevenue > 0 ? totalProfit / totalRevenue * 100 : 0;
    
    // Status-based metrics
    const deliveredOrders = salesOrders.filter(o => o.status === 'Delivered');
    const returnedOrders = salesOrders.filter(o => o.status === 'Returned');
    const cancelledOrders = salesOrders.filter(o => o.status === 'Cancelled');
    const shippedOrders = salesOrders.filter(o => o.status === 'Shipped');
    const otherOrders = salesOrders.filter(o => o.status === 'Other');
    
    return {
      totalRevenue,
      totalCosts,
      totalProfit,
      totalPendingPayments,
      totalFees,
      profitMargin,
      totalOrders: salesOrders.length,
      profitableOrders: salesOrders.filter(o => o.profit > 0).length,
      deliveredItems: deliveredOrders.length,
      deliveredValue: deliveredOrders.reduce((sum, o) => sum + o.sale_value, 0),
      returnedItems: returnedOrders.length,
      returnedValue: returnedOrders.reduce((sum, o) => sum + o.sale_value, 0),
      cancelledItems: cancelledOrders.length,
      cancelledValue: cancelledOrders.reduce((sum, o) => sum + o.sale_value, 0),
      shippedItems: shippedOrders.length,
      shippedValue: shippedOrders.reduce((sum, o) => sum + o.sale_value, 0),
      otherItems: otherOrders.length,
      otherValue: otherOrders.reduce((sum, o) => sum + o.sale_value, 0)
    };
  }, [salesOrders]);
  return <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <ShoppingCart className="h-8 w-8 text-primary" />
            Carrefour Sales Tracker
            <Badge variant="secondary" className="text-xs">
              Profit Analysis
            </Badge>
          </h1>
          <p className="text-muted-foreground mt-1">
            Track sales orders, analyze costs, and calculate profit margins for {selectedCountry}
          </p>
        </div>
        
        
      </div>

      {/* Search Bar */}
      <Card className="border-emerald-200">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by order number or status..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 h-12 border-emerald-200 focus:border-emerald-400" />
          </div>
        </CardContent>
      </Card>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="cursor-pointer hover:shadow-lg transition-all border-emerald-200 hover:border-emerald-300" onClick={() => {}}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-emerald-700">Total Sales Revenue</CardTitle>
            <ShoppingCart className="h-5 w-5 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{metrics.totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              From {metrics.totalOrders} orders
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-all border-blue-200 hover:border-blue-300" onClick={() => {}}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-blue-700">Net Profit</CardTitle>
            <TrendingUp className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{metrics.totalProfit.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.profitMargin.toFixed(1)}% margin
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-all border-orange-200 hover:border-orange-300" onClick={() => {}}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-orange-700">Pending Payments</CardTitle>
            <Calculator className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{metrics.totalPendingPayments}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting payment
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-all border-purple-200 hover:border-purple-300" onClick={() => {}}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-purple-700">Profitable Orders</CardTitle>
            <BarChart3 className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{metrics.profitableOrders}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.totalOrders > 0 ? (metrics.profitableOrders / metrics.totalOrders * 100).toFixed(1) : 0}% success rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Status-based Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-green-700">Delivered Orders</p>
                <p className="text-2xl font-bold text-green-600">{metrics.deliveredItems}</p>
                <p className="text-xs text-muted-foreground">
                  Value: {metrics.deliveredValue.toFixed(2)}
                </p>
              </div>
              <Badge variant="secondary" className="bg-green-100 text-green-800">Delivered</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-red-700">Returned Orders</p>
                <p className="text-2xl font-bold text-red-600">{metrics.returnedItems}</p>
                <p className="text-xs text-muted-foreground">
                  Value: {metrics.returnedValue.toFixed(2)}
                </p>
              </div>
              <Badge variant="destructive">Returned</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-700">Cancelled Orders</p>
                <p className="text-2xl font-bold text-gray-600">{metrics.cancelledItems}</p>
                <p className="text-xs text-muted-foreground">
                  Value: {metrics.cancelledValue.toFixed(2)}
                </p>
              </div>
              <Badge variant="outline" className="border-gray-300">Cancelled</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-cyan-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-cyan-700">Shipped Orders</p>
                <p className="text-2xl font-bold text-cyan-600">{metrics.shippedItems}</p>
                <p className="text-xs text-muted-foreground">
                  Value: {metrics.shippedValue.toFixed(2)}
                </p>
              </div>
              <Badge variant="secondary" className="bg-cyan-100 text-cyan-800">Shipped</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-indigo-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-indigo-700">Other Orders</p>
                <p className="text-2xl font-bold text-indigo-600">{metrics.otherItems}</p>
                <p className="text-xs text-muted-foreground">
                  Value: {metrics.otherValue.toFixed(2)}
                </p>
              </div>
              <Badge variant="secondary" className="bg-indigo-100 text-indigo-800">Other</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sales Orders Table */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-emerald-600" />
            Sales Orders & Profit Analysis
            {searchTerm && <Badge variant="secondary" className="ml-2">
                {filteredOrders.length} of {salesOrders.length}
              </Badge>}
          </CardTitle>
          <CardDescription>
            {searchTerm ? `Showing filtered results for "${searchTerm}"` : "Complete overview of your Carrefour sales orders with profit calculations"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CarrefourSalesOrdersTable refresh={refreshKey} filteredData={filteredOrders} onRefresh={handleRefresh} />
        </CardContent>
      </Card>
    </div>;
}