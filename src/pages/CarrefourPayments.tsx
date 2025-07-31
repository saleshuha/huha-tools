import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, ShoppingCart, TrendingUp, Package, Calculator, BarChart3, Receipt, Download, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <Card 
          className="cursor-pointer hover:shadow-lg transition-all border-emerald-200 hover:border-emerald-300" 
          onClick={() => handleCardClick('all', 'Total Sales Revenue')}
        >
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-emerald-700">Total Sales Revenue</p>
                <p className="text-lg font-bold text-emerald-600">{formatCurrency(metrics.totalRevenue)}</p>
                <p className="text-xs text-muted-foreground">
                  From {metrics.totalOrders} orders
                </p>
              </div>
              <ShoppingCart className="h-4 w-4 text-emerald-600" />
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-all border-blue-200 hover:border-blue-300" 
          onClick={() => handleCardClick('profitable', 'Profitable Orders')}
        >
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-blue-700">Net Profit</p>
                <p className="text-lg font-bold text-blue-600">{formatCurrency(metrics.totalProfit)}</p>
                <p className="text-xs text-muted-foreground">
                  {metrics.profitMargin.toFixed(1)}% margin
                </p>
              </div>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-all border-orange-200 hover:border-orange-300" 
          onClick={() => handleCardClick('pending', 'Pending Payments')}
        >
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-orange-700">Pending Payments</p>
                <p className="text-lg font-bold text-orange-600">{formatCurrency(metrics.totalPendingAmount)}</p>
                <p className="text-xs text-muted-foreground">
                  {metrics.totalPendingPayments} orders awaiting payment
                </p>
              </div>
              <Calculator className="h-4 w-4 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-all border-purple-200 hover:border-purple-300" 
          onClick={() => handleCardClick('profitable', 'Profitable Orders')}
        >
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-purple-700">Profitable Orders</p>
                <p className="text-lg font-bold text-purple-600">{metrics.profitableOrders}</p>
                <p className="text-xs text-muted-foreground">
                  {metrics.totalOrders > 0 ? (metrics.profitableOrders / metrics.totalOrders * 100).toFixed(1) : 0}% success rate
                </p>
              </div>
              <BarChart3 className="h-4 w-4 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-all border-red-200 hover:border-red-300" 
          onClick={() => handleCardClick('all', 'Total Costs')}
        >
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-red-700">Total Costs</p>
                <p className="text-lg font-bold text-red-600">{formatCurrency(metrics.totalCosts)}</p>
                <p className="text-xs text-muted-foreground">
                  Cost of goods sold
                </p>
              </div>
              <Calculator className="h-4 w-4 text-red-600" />
            </div>
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
          <CarrefourSalesOrdersTable refresh={refreshKey} filteredData={filteredOrders} onRefresh={handleRefresh} />
        </CardContent>
      </Card>
    </div>;
}