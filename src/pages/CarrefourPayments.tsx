import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, ShoppingCart, TrendingUp, Package, Calculator, BarChart3, Receipt, Download, X } from "lucide-react";
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
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
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

  // Filter sales orders based on search term and active filter
  const filteredOrders = useMemo(() => {
    let filtered = salesOrders;
    
    // Apply active filter first
    if (activeFilter) {
      switch (activeFilter) {
        case 'delivered':
          filtered = filtered.filter(o => o.status === 'Delivered');
          break;
        case 'shipped':
          filtered = filtered.filter(o => o.status === 'Shipped');
          break;
        case 'returned':
          filtered = filtered.filter(o => o.status === 'Returned');
          break;
        case 'cancelled':
          filtered = filtered.filter(o => o.status === 'Cancelled');
          break;
        case 'other':
          filtered = filtered.filter(o => o.status === 'Other');
          break;
        case 'pending':
          filtered = filtered.filter(o => o.payment_status === 'Pending');
          break;
        case 'profitable':
          filtered = filtered.filter(o => o.profit > 0);
          break;
      }
    }
    
    // Apply search term
    if (searchTerm.trim()) {
      filtered = filtered.filter(order => 
        order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) || 
        order.status.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered;
  }, [salesOrders, searchTerm, activeFilter]);

  // Calculate metrics
  const metrics = useMemo(() => {
    const totalRevenue = salesOrders.reduce((sum, o) => sum + o.sale_value, 0);
    const totalCosts = salesOrders.reduce((sum, o) => sum + o.cost, 0);
    const totalProfit = salesOrders.reduce((sum, o) => sum + o.profit, 0);
    const totalPendingPayments = salesOrders.filter(o => o.payment_status === 'Pending').length;
    const totalPendingAmount = salesOrders.filter(o => o.payment_status === 'Pending').reduce((sum, o) => sum + o.sale_value, 0);
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
      totalPendingAmount,
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

  // Currency helper function
  const getCurrency = () => {
    return selectedCountry === 'KSA' ? 'SAR' : 'AED';
  };

  const formatCurrency = (amount: number) => {
    const currency = getCurrency();
    return `${amount.toFixed(2)} ${currency}`;
  };

  // Export functionality
  const exportToCSV = (data: CarrefourSalesOrder[], filename: string) => {
    const headers = ['Order Number', 'Sale Value', 'Seller Fees', 'Cost', 'Profit', 'Status', 'Payment Status', 'Country', 'Created At'];
    const csvContent = [
      headers.join(','),
      ...data.map(order => [
        order.order_number,
        order.sale_value,
        order.seller_fees,
        order.cost,
        order.profit,
        order.status,
        order.payment_status,
        order.country,
        new Date(order.created_at).toLocaleDateString()
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCardClick = (filterType: string) => {
    if (activeFilter === filterType) {
      setActiveFilter(null); // Remove filter if same card clicked
    } else {
      setActiveFilter(filterType);
    }
  };

  const handleExport = (filterType: string, filename: string) => {
    let dataToExport = salesOrders;
    
    switch (filterType) {
      case 'all':
        dataToExport = salesOrders;
        break;
      case 'delivered':
        dataToExport = salesOrders.filter(o => o.status === 'Delivered');
        break;
      case 'shipped':
        dataToExport = salesOrders.filter(o => o.status === 'Shipped');
        break;
      case 'returned':
        dataToExport = salesOrders.filter(o => o.status === 'Returned');
        break;
      case 'cancelled':
        dataToExport = salesOrders.filter(o => o.status === 'Cancelled');
        break;
      case 'other':
        dataToExport = salesOrders.filter(o => o.status === 'Other');
        break;
      case 'pending':
        dataToExport = salesOrders.filter(o => o.payment_status === 'Pending');
        break;
      case 'profitable':
        dataToExport = salesOrders.filter(o => o.profit > 0);
        break;
    }
    
    exportToCSV(dataToExport, filename);
  };
  return <div className="w-full max-w-none px-6 py-6 space-y-6 ml-0">
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

      {/* Active Filter Display */}
      {activeFilter && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  Active Filter: {activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Showing {filteredOrders.length} of {salesOrders.length} orders
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveFilter(null)}
                className="h-8 w-8 p-0 hover:bg-primary/10"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
        <Card 
          className={`cursor-pointer hover:shadow-lg transition-all border-emerald-200 hover:border-emerald-300 ${activeFilter === 'revenue' ? 'ring-2 ring-emerald-500' : ''}`} 
          onClick={() => handleCardClick('revenue')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-emerald-700">Total Sales Revenue</CardTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleExport('all', 'total-sales-revenue');
                }}
                className="h-6 w-6 p-0 hover:bg-emerald-100"
              >
                <Download className="h-3 w-3" />
              </Button>
              <ShoppingCart className="h-5 w-5 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{formatCurrency(metrics.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              From {metrics.totalOrders} orders
            </p>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer hover:shadow-lg transition-all border-blue-200 hover:border-blue-300 ${activeFilter === 'profitable' ? 'ring-2 ring-blue-500' : ''}`} 
          onClick={() => handleCardClick('profitable')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-blue-700">Net Profit</CardTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleExport('profitable', 'profitable-orders');
                }}
                className="h-6 w-6 p-0 hover:bg-blue-100"
              >
                <Download className="h-3 w-3" />
              </Button>
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(metrics.totalProfit)}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.profitMargin.toFixed(1)}% margin
            </p>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer hover:shadow-lg transition-all border-orange-200 hover:border-orange-300 ${activeFilter === 'pending' ? 'ring-2 ring-orange-500' : ''}`} 
          onClick={() => handleCardClick('pending')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-orange-700">Pending Payments</CardTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleExport('pending', 'pending-payments');
                }}
                className="h-6 w-6 p-0 hover:bg-orange-100"
              >
                <Download className="h-3 w-3" />
              </Button>
              <Calculator className="h-5 w-5 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(metrics.totalPendingAmount)}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.totalPendingPayments} orders awaiting payment
            </p>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer hover:shadow-lg transition-all border-purple-200 hover:border-purple-300 ${activeFilter === 'profitable' ? 'ring-2 ring-purple-500' : ''}`} 
          onClick={() => handleCardClick('profitable')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-purple-700">Profitable Orders</CardTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleExport('profitable', 'profitable-orders');
                }}
                className="h-6 w-6 p-0 hover:bg-purple-100"
              >
                <Download className="h-3 w-3" />
              </Button>
              <BarChart3 className="h-5 w-5 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{metrics.profitableOrders}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.totalOrders > 0 ? (metrics.profitableOrders / metrics.totalOrders * 100).toFixed(1) : 0}% success rate
            </p>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer hover:shadow-lg transition-all border-red-200 hover:border-red-300 ${activeFilter === 'costs' ? 'ring-2 ring-red-500' : ''}`} 
          onClick={() => handleCardClick('costs')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-red-700">Total Costs</CardTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleExport('all', 'total-costs');
                }}
                className="h-6 w-6 p-0 hover:bg-red-100"
              >
                <Download className="h-3 w-3" />
              </Button>
              <Calculator className="h-5 w-5 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(metrics.totalCosts)}</div>
            <p className="text-xs text-muted-foreground">
              Cost of goods sold
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Status-based Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card 
          className={`cursor-pointer hover:shadow-lg transition-all border-green-200 hover:border-green-300 ${activeFilter === 'delivered' ? 'ring-2 ring-green-500' : ''}`}
          onClick={() => handleCardClick('delivered')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-green-700">Delivered Orders</p>
                <p className="text-2xl font-bold text-green-600">{metrics.deliveredItems}</p>
                <p className="text-xs text-muted-foreground">
                  Value: {formatCurrency(metrics.deliveredValue)}
                </p>
              </div>
              <div className="flex flex-col items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleExport('delivered', 'delivered-orders');
                  }}
                  className="h-6 w-6 p-0 hover:bg-green-100"
                >
                  <Download className="h-3 w-3" />
                </Button>
                <Badge variant="secondary" className="bg-green-100 text-green-800">Delivered</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer hover:shadow-lg transition-all border-cyan-200 hover:border-cyan-300 ${activeFilter === 'shipped' ? 'ring-2 ring-cyan-500' : ''}`}
          onClick={() => handleCardClick('shipped')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-cyan-700">Shipped Orders</p>
                <p className="text-2xl font-bold text-cyan-600">{metrics.shippedItems}</p>
                <p className="text-xs text-muted-foreground">
                  Value: {formatCurrency(metrics.shippedValue)}
                </p>
              </div>
              <div className="flex flex-col items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleExport('shipped', 'shipped-orders');
                  }}
                  className="h-6 w-6 p-0 hover:bg-cyan-100"
                >
                  <Download className="h-3 w-3" />
                </Button>
                <Badge variant="secondary" className="bg-cyan-100 text-cyan-800">Shipped</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer hover:shadow-lg transition-all border-red-200 hover:border-red-300 ${activeFilter === 'returned' ? 'ring-2 ring-red-500' : ''}`}
          onClick={() => handleCardClick('returned')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-red-700">Returned Orders</p>
                <p className="text-2xl font-bold text-red-600">{metrics.returnedItems}</p>
                <p className="text-xs text-muted-foreground">
                  Value: {formatCurrency(metrics.returnedValue)}
                </p>
              </div>
              <div className="flex flex-col items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleExport('returned', 'returned-orders');
                  }}
                  className="h-6 w-6 p-0 hover:bg-red-100"
                >
                  <Download className="h-3 w-3" />
                </Button>
                <Badge variant="destructive">Returned</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer hover:shadow-lg transition-all border-gray-200 hover:border-gray-300 ${activeFilter === 'cancelled' ? 'ring-2 ring-gray-500' : ''}`}
          onClick={() => handleCardClick('cancelled')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-700">Cancelled Orders</p>
                <p className="text-2xl font-bold text-gray-600">{metrics.cancelledItems}</p>
                <p className="text-xs text-muted-foreground">
                  Value: {formatCurrency(metrics.cancelledValue)}
                </p>
              </div>
              <div className="flex flex-col items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleExport('cancelled', 'cancelled-orders');
                  }}
                  className="h-6 w-6 p-0 hover:bg-gray-100"
                >
                  <Download className="h-3 w-3" />
                </Button>
                <Badge variant="outline" className="border-gray-300">Cancelled</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer hover:shadow-lg transition-all border-indigo-200 hover:border-indigo-300 ${activeFilter === 'other' ? 'ring-2 ring-indigo-500' : ''}`}
          onClick={() => handleCardClick('other')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-indigo-700">Other Orders</p>
                <p className="text-2xl font-bold text-indigo-600">{metrics.otherItems}</p>
                <p className="text-xs text-muted-foreground">
                  Value: {formatCurrency(metrics.otherValue)}
                </p>
              </div>
              <div className="flex flex-col items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleExport('other', 'other-orders');
                  }}
                  className="h-6 w-6 p-0 hover:bg-indigo-100"
                >
                  <Download className="h-3 w-3" />
                </Button>
                <Badge variant="secondary" className="bg-indigo-100 text-indigo-800">Other</Badge>
              </div>
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