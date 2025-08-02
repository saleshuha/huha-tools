import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, ShoppingCart, TrendingUp, TrendingDown, Package, Calculator, BarChart3, Receipt, Download, X, ArrowLeft, Store as StoreIcon } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CarrefourSalesOrdersTable } from "@/components/carrefour/CarrefourSalesOrdersTable";
import { CarrefourSalesOrder } from "@/types/carrefour";
import { Store } from "@/types/store";
import { supabase } from "@/integrations/supabase/client";
import { useCountry } from "@/contexts/CountryContext";
import { useToast } from "@/hooks/use-toast";

export default function CarrefourSalesTracker() {
  const { storeId } = useParams();
  const navigate = useNavigate();
  const [currentStore, setCurrentStore] = useState<Store | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [salesOrders, setSalesOrders] = useState<CarrefourSalesOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogData, setDialogData] = useState<{
    isOpen: boolean;
    title: string;
    data: CarrefourSalesOrder[];
    searchTerm: string;
  }>({
    isOpen: false,
    title: '',
    data: [],
    searchTerm: ''
  });
  const {
    selectedCountry
  } = useCountry();
  const {
    toast
  } = useToast();
  useEffect(() => {
    if (storeId) {
      fetchCurrentStore();
    }
  }, [storeId]);

  useEffect(() => {
    if (currentStore && storeId) {
      fetchSalesOrders();
    }
  }, [currentStore, storeId]);

  const fetchCurrentStore = async () => {
    if (!storeId) return;
    
    try {
      const { data, error } = await supabase
        .from("stores")
        .select("*")
        .eq("id", storeId)
        .single();

      if (error) throw error;
      setCurrentStore(data as Store);
    } catch (error) {
      console.error("Error fetching store:", error);
      toast({
        title: "Error",
        description: "Failed to fetch store information",
        variant: "destructive",
      });
      navigate("/stores");
    }
  };

  const fetchSalesOrders = async () => {
    if (!storeId || !currentStore) return;
    
    try {
      const { data, error } = await supabase
        .from("carrefour_payments")
        .select("*")
        .eq("store_id", storeId)
        .eq("country", currentStore.country) // Filter by store's country
        .order("created_at", { ascending: false });

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
    return salesOrders.filter(order => 
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) || 
      order.status.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [salesOrders, searchTerm]);

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
      totalInvestment: totalProfit + totalCosts,
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
    return currentStore?.currency || 'AED';
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

  const handleCardClick = (filterType: string, title: string) => {
    let dataToShow = salesOrders;
    
    switch (filterType) {
      case 'all':
        dataToShow = salesOrders;
        break;
      case 'delivered':
        dataToShow = salesOrders.filter(o => o.status === 'Delivered');
        break;
      case 'shipped':
        dataToShow = salesOrders.filter(o => o.status === 'Shipped');
        break;
      case 'returned':
        dataToShow = salesOrders.filter(o => o.status === 'Returned');
        break;
      case 'cancelled':
        dataToShow = salesOrders.filter(o => o.status === 'Cancelled');
        break;
      case 'other':
        dataToShow = salesOrders.filter(o => o.status === 'Other');
        break;
      case 'pending':
        dataToShow = salesOrders.filter(o => o.payment_status === 'Pending');
        break;
      case 'profitable':
        dataToShow = salesOrders.filter(o => o.profit > 0);
        break;
    }
    
    setDialogData({
      isOpen: true,
      title,
      data: dataToShow,
      searchTerm: ''
    });
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

  // Filter dialog data based on search term
  const filteredDialogData = useMemo(() => {
    if (!dialogData.searchTerm.trim()) return dialogData.data;
    return dialogData.data.filter(order => 
      order.order_number.toLowerCase().includes(dialogData.searchTerm.toLowerCase()) || 
      order.status.toLowerCase().includes(dialogData.searchTerm.toLowerCase()) ||
      order.payment_status.toLowerCase().includes(dialogData.searchTerm.toLowerCase())
    );
  }, [dialogData.data, dialogData.searchTerm]);
  return <div className="w-full max-w-none px-6 py-6 space-y-6 ml-0">
      {/* Header with Back Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => navigate("/stores")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Stores
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <ShoppingCart className="h-8 w-8 text-primary" />
              {currentStore?.name || 'Store'} - Sales Tracker
              <Badge variant="secondary" className="text-xs">
                Profit Analysis
              </Badge>
            </h1>
            <p className="text-muted-foreground mt-1 flex items-center gap-2">
              <StoreIcon className="h-4 w-4" />
              Track sales orders, analyze costs, and calculate profit margins
              {currentStore?.location && (
                <span>• {currentStore.location}</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Enhanced Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="shadow-lg border-0 bg-gradient-to-br from-emerald-50 to-emerald-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-600/10 rounded-full -translate-y-12 translate-x-12"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-emerald-900">Total Sales Revenue</CardTitle>
            <ShoppingCart className="h-5 w-5 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-900 mb-2">{formatCurrency(metrics.totalRevenue)}</div>
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              <span className="text-emerald-700">From {metrics.totalOrders} orders</span>
            </div>
            <p className="text-xs text-emerald-600 mt-2">
              Across all store operations
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 bg-gradient-to-br from-cyan-50 to-cyan-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-600/10 rounded-full -translate-y-12 translate-x-12"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-cyan-900">Shipped Revenue</CardTitle>
            <TrendingUp className="h-5 w-5 text-cyan-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-cyan-900 mb-2">{formatCurrency(metrics.shippedValue)}</div>
            <div className="flex items-center gap-2 text-sm">
              <Calculator className="h-4 w-4 text-cyan-600" />
              <span className="text-cyan-700">{metrics.shippedItems} shipped orders</span>
            </div>
            <p className="text-xs text-cyan-600 mt-2">
              Orders currently in transit
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 bg-gradient-to-br from-green-50 to-green-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-green-600/10 rounded-full -translate-y-12 translate-x-12"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-900">Delivered Revenue</CardTitle>
            <BarChart3 className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-900 mb-2">{formatCurrency(metrics.deliveredValue)}</div>
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-green-700">{metrics.deliveredItems} completed</span>
            </div>
            <p className="text-xs text-green-600 mt-2">
              Successfully delivered orders
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 bg-gradient-to-br from-indigo-50 to-indigo-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-600/10 rounded-full -translate-y-12 translate-x-12"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-indigo-900">Total Investment</CardTitle>
            <Calculator className="h-5 w-5 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-indigo-900 mb-2">{formatCurrency(metrics.totalInvestment)}</div>
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4 text-indigo-600" />
              <span className="text-indigo-700">Profit + Cost combined</span>
            </div>
            <p className="text-xs text-indigo-600 mt-2">
              Total financial commitment
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-50 to-blue-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-600/10 rounded-full -translate-y-12 translate-x-12"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-900">Net Profit</CardTitle>
            <TrendingUp className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900 mb-2">{formatCurrency(metrics.totalProfit)}</div>
            <div className="flex items-center gap-2 text-sm">
              <Calculator className="h-4 w-4 text-blue-600" />
              <span className="text-blue-700">{metrics.profitMargin.toFixed(1)}% margin</span>
            </div>
            <p className="text-xs text-blue-600 mt-2">
              Profit after all costs
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 bg-gradient-to-br from-orange-50 to-orange-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-orange-600/10 rounded-full -translate-y-12 translate-x-12"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-900">Pending Payments</CardTitle>
            <Calculator className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-900 mb-2">{formatCurrency(metrics.totalPendingAmount)}</div>
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4 text-orange-600" />
              <span className="text-orange-700">{metrics.totalPendingPayments} orders</span>
            </div>
            <p className="text-xs text-orange-600 mt-2">
              Awaiting payment processing
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 bg-gradient-to-br from-purple-50 to-purple-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-600/10 rounded-full -translate-y-12 translate-x-12"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-900">Profitable Orders</CardTitle>
            <BarChart3 className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-900 mb-2">{metrics.profitableOrders}</div>
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              <span className="text-purple-700">{metrics.totalOrders > 0 ? (metrics.profitableOrders / metrics.totalOrders * 100).toFixed(1) : 0}% success rate</span>
            </div>
            <p className="text-xs text-purple-600 mt-2">
              Orders generating profit
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 bg-gradient-to-br from-red-50 to-red-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-600/10 rounded-full -translate-y-12 translate-x-12"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-900">Total Costs</CardTitle>
            <Calculator className="h-5 w-5 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-900 mb-2">{formatCurrency(metrics.totalCosts)}</div>
            <div className="flex items-center gap-2 text-sm">
              <TrendingDown className="h-4 w-4 text-red-600" />
              <span className="text-red-700">Cost of goods sold</span>
            </div>
            <p className="text-xs text-red-600 mt-2">
              All operational costs
            </p>
          </CardContent>
        </Card>
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

      {/* Status-based Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <Card 
          className="cursor-pointer hover:shadow-lg transition-all border-green-200 hover:border-green-300"
          onClick={() => handleCardClick('delivered', 'Delivered Orders')}
        >
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-green-700">Delivered Orders</p>
                <p className="text-lg font-bold text-green-600">{metrics.deliveredItems}</p>
                <p className="text-xs text-muted-foreground">
                  Value: {formatCurrency(metrics.deliveredValue)}
                </p>
              </div>
              <Package className="h-4 w-4 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-all border-cyan-200 hover:border-cyan-300"
          onClick={() => handleCardClick('shipped', 'Shipped Orders')}
        >
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-cyan-700">Shipped Orders</p>
                <p className="text-lg font-bold text-cyan-600">{metrics.shippedItems}</p>
                <p className="text-xs text-muted-foreground">
                  Value: {formatCurrency(metrics.shippedValue)}
                </p>
              </div>
              <Package className="h-4 w-4 text-cyan-600" />
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-all border-red-200 hover:border-red-300"
          onClick={() => handleCardClick('returned', 'Returned Orders')}
        >
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-red-700">Returned Orders</p>
                <p className="text-lg font-bold text-red-600">{metrics.returnedItems}</p>
                <p className="text-xs text-muted-foreground">
                  Value: {formatCurrency(metrics.returnedValue)}
                </p>
              </div>
              <Package className="h-4 w-4 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-all border-gray-200 hover:border-gray-300"
          onClick={() => handleCardClick('cancelled', 'Cancelled Orders')}
        >
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-700">Cancelled Orders</p>
                <p className="text-lg font-bold text-gray-600">{metrics.cancelledItems}</p>
                <p className="text-xs text-muted-foreground">
                  Value: {formatCurrency(metrics.cancelledValue)}
                </p>
              </div>
              <Package className="h-4 w-4 text-gray-600" />
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-all border-indigo-200 hover:border-indigo-300"
          onClick={() => handleCardClick('other', 'Other Orders')}
        >
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-indigo-700">Other Orders</p>
                <p className="text-lg font-bold text-indigo-600">{metrics.otherItems}</p>
                <p className="text-xs text-muted-foreground">
                  Value: {formatCurrency(metrics.otherValue)}
                </p>
              </div>
              <Package className="h-4 w-4 text-indigo-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialog for showing filtered data */}
      <Dialog open={dialogData.isOpen} onOpenChange={(open) => setDialogData(prev => ({ ...prev, isOpen: open }))}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{dialogData.title}</span>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => exportToCSV(filteredDialogData, dialogData.title.toLowerCase().replace(/\s+/g, '-'))}
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                  size="sm"
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </Button>
              </div>
            </DialogTitle>
            <DialogDescription>
              Showing {filteredDialogData.length} orders
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Search within dialog */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search orders..." 
                value={dialogData.searchTerm} 
                onChange={e => setDialogData(prev => ({ ...prev, searchTerm: e.target.value }))}
                className="pl-10" 
              />
            </div>

            {/* Table */}
            <div className="border rounded-lg overflow-auto max-h-[50vh]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order Number</TableHead>
                    <TableHead>Sale Value</TableHead>
                    <TableHead>Seller Fees</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Profit</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment Status</TableHead>
                    <TableHead>Created At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDialogData.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.order_number}</TableCell>
                      <TableCell>{formatCurrency(order.sale_value)}</TableCell>
                      <TableCell>{formatCurrency(order.seller_fees)}</TableCell>
                      <TableCell>{formatCurrency(order.cost)}</TableCell>
                      <TableCell className={order.profit > 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatCurrency(order.profit)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          order.status === 'Delivered' ? 'default' :
                          order.status === 'Shipped' ? 'secondary' :
                          order.status === 'Returned' ? 'destructive' :
                          'outline'
                        }>
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={order.payment_status === 'Received' ? 'default' : 'secondary'}>
                          {order.payment_status}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
          <CarrefourSalesOrdersTable refresh={refreshKey} filteredData={filteredOrders} onRefresh={handleRefresh} storeId={storeId} />
        </CardContent>
      </Card>
    </div>;
}