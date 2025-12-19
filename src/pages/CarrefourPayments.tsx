import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, ArrowLeft, Store as StoreIcon, CheckCircle, ShoppingCart, Package, Search } from "lucide-react";
import { CarrefourSalesOrdersTable } from "@/components/carrefour/CarrefourSalesOrdersTable";
import { HeroMetricsDashboard } from "@/components/carrefour/HeroMetricsDashboard";
import { CommandBar } from "@/components/carrefour/CommandBar";
import { StatusFilterPills } from "@/components/carrefour/StatusFilterPills";
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
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });
  const [activeStatusFilter, setActiveStatusFilter] = useState<string | null>(null);
  const [dialogData, setDialogData] = useState<{
    isOpen: boolean;
    title: string;
    data: CarrefourSalesOrder[];
    searchTerm: string;
    filterType: string;
  }>({
    isOpen: false,
    title: '',
    data: [],
    searchTerm: '',
    filterType: ''
  });
  const { selectedCountry } = useCountry();
  const { toast } = useToast();

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
      const { data, error } = await supabase.from("stores").select("*").eq("id", storeId).single();
      if (error) throw error;
      setCurrentStore(data as Store);
    } catch (error) {
      console.error("Error fetching store:", error);
      toast({
        title: "Error",
        description: "Failed to fetch store information",
        variant: "destructive"
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
        .eq("country", currentStore.country)
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

  // Filter sales orders based on date range
  const dateFilteredOrders = useMemo(() => {
    if (!dateRange.from && !dateRange.to) return salesOrders;
    
    return salesOrders.filter(order => {
      const orderDate = new Date(order.created_at);
      const fromDate = dateRange.from;
      const toDate = dateRange.to;
      
      if (fromDate && toDate) {
        return orderDate >= fromDate && orderDate <= toDate;
      } else if (fromDate) {
        return orderDate >= fromDate;
      } else if (toDate) {
        return orderDate <= toDate;
      }
      return true;
    });
  }, [salesOrders, dateRange]);

  // Filter sales orders based on search term
  const filteredOrders = useMemo(() => {
    if (!searchTerm.trim()) return dateFilteredOrders;
    return dateFilteredOrders.filter(order => 
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) || 
      order.status.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [dateFilteredOrders, searchTerm]);

  // Calculate metrics using date filtered data
  const metrics = useMemo(() => {
    const totalRevenue = dateFilteredOrders.reduce((sum, o) => sum + o.sale_value, 0);
    const totalCosts = dateFilteredOrders.reduce((sum, o) => sum + o.cost, 0);
    const totalProfit = dateFilteredOrders.reduce((sum, o) => sum + o.profit, 0);
    const pendingOrders = dateFilteredOrders.filter(o => o.payment_status === 'Pending');
    const totalPendingPayments = pendingOrders.length;
    const totalPendingAmount = pendingOrders.reduce((sum, o) => sum + o.sale_value, 0);
    const totalPendingCost = pendingOrders.reduce((sum, o) => sum + o.cost, 0);
    const totalPendingProfit = pendingOrders.reduce((sum, o) => sum + o.profit, 0);
    const totalFees = dateFilteredOrders.reduce((sum, o) => sum + o.seller_fees, 0);
    const profitMargin = totalRevenue > 0 ? totalProfit / totalRevenue * 100 : 0;

    // Status-based metrics
    const deliveredOrders = dateFilteredOrders.filter(o => o.status === 'Delivered');
    const returnedOrders = dateFilteredOrders.filter(o => o.status === 'Returned');
    const cancelledOrders = dateFilteredOrders.filter(o => o.status === 'Cancelled');
    const shippedOrders = dateFilteredOrders.filter(o => o.status === 'Shipped');
    const otherOrders = dateFilteredOrders.filter(o => o.status === 'Other');

    return {
      totalRevenue,
      totalCosts,
      totalProfit,
      totalInvestment: totalProfit + totalCosts,
      totalPlatformFees: totalFees,
      revenueMinusFees: totalRevenue - totalFees,
      totalPendingAmount,
      totalPendingPayments,
      totalPendingCost,
      totalPendingProfit,
      totalPaidAmount: dateFilteredOrders.filter(o => o.payment_status === 'Received').reduce((sum, o) => sum + o.sale_value, 0),
      totalPaidPayments: dateFilteredOrders.filter(o => o.payment_status === 'Received').length,
      totalFees,
      profitMargin,
      totalOrders: dateFilteredOrders.length,
      profitableOrders: dateFilteredOrders.filter(o => o.profit > 0).length,
      deliveredItems: deliveredOrders.length,
      deliveredValue: deliveredOrders.reduce((sum, o) => sum + o.sale_value, 0),
      deliveredCost: deliveredOrders.reduce((sum, o) => sum + o.cost, 0),
      deliveredProfit: deliveredOrders.reduce((sum, o) => sum + o.profit, 0),
      returnedItems: returnedOrders.length,
      returnedValue: returnedOrders.reduce((sum, o) => sum + o.sale_value, 0),
      cancelledItems: cancelledOrders.length,
      cancelledValue: cancelledOrders.reduce((sum, o) => sum + o.sale_value, 0),
      shippedItems: shippedOrders.length,
      shippedValue: shippedOrders.reduce((sum, o) => sum + o.sale_value, 0),
      otherItems: otherOrders.length,
      otherValue: otherOrders.reduce((sum, o) => sum + o.sale_value, 0)
    };
  }, [dateFilteredOrders]);

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
    let dataToShow = dateFilteredOrders;
    switch (filterType) {
      case 'all':
      case 'revenue':
        dataToShow = dateFilteredOrders;
        break;
      case 'delivered':
        dataToShow = dateFilteredOrders.filter(o => o.status === 'Delivered');
        break;
      case 'shipped':
        dataToShow = dateFilteredOrders.filter(o => o.status === 'Shipped');
        break;
      case 'returned':
        dataToShow = dateFilteredOrders.filter(o => o.status === 'Returned');
        break;
      case 'cancelled':
        dataToShow = dateFilteredOrders.filter(o => o.status === 'Cancelled');
        break;
      case 'other':
        dataToShow = dateFilteredOrders.filter(o => o.status === 'Other');
        break;
      case 'pending':
        dataToShow = dateFilteredOrders.filter(o => o.payment_status === 'Pending');
        break;
      case 'paid':
        dataToShow = dateFilteredOrders.filter(o => o.payment_status === 'Received');
        break;
      case 'profitable':
        dataToShow = dateFilteredOrders.filter(o => o.profit > 0);
        break;
      case 'costs':
        dataToShow = dateFilteredOrders.filter(o => o.cost > 0);
        break;
      case 'fees':
        dataToShow = dateFilteredOrders.filter(o => o.seller_fees > 0);
        break;
      case 'investment':
        dataToShow = dateFilteredOrders.filter(o => o.profit + o.cost > 0);
        break;
    }
    setDialogData({
      isOpen: true,
      title,
      data: dataToShow,
      searchTerm: '',
      filterType
    });
    setSelectedItems(new Set());
  };

  const handleStatusFilterChange = (filterType: string, title: string) => {
    if (activeStatusFilter === filterType || filterType === 'all') {
      setActiveStatusFilter(null);
    } else {
      setActiveStatusFilter(filterType);
      handleCardClick(filterType, title);
    }
  };

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(new Set(filteredDialogData.map(order => order.id)));
    } else {
      setSelectedItems(new Set());
    }
  };

  const handleSelectItem = (orderId: string, checked: boolean) => {
    const newSelectedItems = new Set(selectedItems);
    if (checked) {
      newSelectedItems.add(orderId);
    } else {
      newSelectedItems.delete(orderId);
    }
    setSelectedItems(newSelectedItems);
  };

  const exportSelectedItems = () => {
    const selectedOrders = filteredDialogData.filter(order => selectedItems.has(order.id));
    if (selectedOrders.length === 0) {
      toast({
        title: "No Selection",
        description: "Please select at least one item to export.",
        variant: "destructive"
      });
      return;
    }
    exportToCSV(selectedOrders, `selected-${dialogData.title.toLowerCase().replace(/\s+/g, '-')}`);
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

  return (
    <div className="w-full max-w-none px-6 py-6 space-y-6 ml-0">
      {/* Compact Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate("/stores")} size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="h-8 w-px bg-border" />
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ShoppingCart className="h-6 w-6 text-primary" />
              {currentStore?.name || 'Store'}
              <Badge variant="secondary" className="text-xs ml-2">
                Sales Tracker
              </Badge>
            </h1>
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <StoreIcon className="h-3 w-3" />
              {currentStore?.location || 'Track and analyze sales performance'}
            </p>
          </div>
        </div>
      </div>

      {/* Hero Metrics Dashboard */}
      <HeroMetricsDashboard
        metrics={metrics}
        formatCurrency={formatCurrency}
        onCardClick={handleCardClick}
      />

      {/* Status Filter Pills */}
      <Card className="border-dashed">
        <CardContent className="py-4">
          <StatusFilterPills
            statusCounts={{
              deliveredItems: metrics.deliveredItems,
              shippedItems: metrics.shippedItems,
              returnedItems: metrics.returnedItems,
              cancelledItems: metrics.cancelledItems,
              otherItems: metrics.otherItems,
              totalPendingPayments: metrics.totalPendingPayments,
              totalPaidPayments: metrics.totalPaidPayments,
            }}
            activeFilter={activeStatusFilter}
            onFilterChange={handleStatusFilterChange}
          />
        </CardContent>
      </Card>

      {/* Command Bar */}
      <CommandBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
      />

      {/* Enhanced Dialog for showing filtered data with selection */}
      <Dialog open={dialogData.isOpen} onOpenChange={open => setDialogData(prev => ({ ...prev, isOpen: open }))}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{dialogData.title}</span>
              <div className="flex items-center gap-2">
                {selectedItems.size > 0 && (
                  <Button onClick={exportSelectedItems} className="gap-2 bg-blue-600 hover:bg-blue-700" size="sm">
                    <Download className="h-4 w-4" />
                    Export Selected ({selectedItems.size})
                  </Button>
                )}
                <Button onClick={() => exportToCSV(filteredDialogData, dialogData.title.toLowerCase().replace(/\s+/g, '-'))} className="gap-2 bg-emerald-600 hover:bg-emerald-700" size="sm">
                  <Download className="h-4 w-4" />
                  Export All
                </Button>
              </div>
            </DialogTitle>
            <DialogDescription>
              Showing {filteredDialogData.length} orders
              {selectedItems.size > 0 && ` • ${selectedItems.size} selected`}
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

            {/* Selection Controls */}
            <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="select-all" 
                  checked={selectedItems.size === filteredDialogData.length && filteredDialogData.length > 0} 
                  onCheckedChange={handleSelectAll} 
                />
                <label htmlFor="select-all" className="text-sm font-medium">
                  Select All ({filteredDialogData.length})
                </label>
              </div>
              {selectedItems.size > 0 && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    {selectedItems.size} selected
                  </Badge>
                  <Button variant="outline" size="sm" onClick={() => setSelectedItems(new Set())}>
                    Clear Selection
                  </Button>
                </div>
              )}
            </div>

            {/* Enhanced Table with Selection */}
            <div className="border rounded-lg overflow-auto max-h-[40vh]">
              <Table>
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox 
                        checked={selectedItems.size === filteredDialogData.length && filteredDialogData.length > 0} 
                        onCheckedChange={handleSelectAll} 
                      />
                    </TableHead>
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
                  {filteredDialogData.map(order => (
                    <TableRow key={order.id} className={selectedItems.has(order.id) ? 'bg-primary/5' : ''}>
                      <TableCell>
                        <Checkbox 
                          checked={selectedItems.has(order.id)} 
                          onCheckedChange={checked => handleSelectItem(order.id, checked as boolean)} 
                        />
                      </TableCell>
                      <TableCell className="font-medium">{order.order_number}</TableCell>
                      <TableCell>{formatCurrency(order.sale_value)}</TableCell>
                      <TableCell>{formatCurrency(order.seller_fees)}</TableCell>
                      <TableCell>{formatCurrency(order.cost)}</TableCell>
                      <TableCell className={order.profit > 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                        {formatCurrency(order.profit)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          order.status === 'Delivered' ? 'default' : 
                          order.status === 'Shipped' ? 'secondary' : 
                          order.status === 'Returned' ? 'destructive' : 'outline'
                        }>
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={order.payment_status === 'Received' ? 'default' : 'secondary'}>
                          {order.payment_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sales Orders Table */}
      <Card className="border">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Package className="h-5 w-5 text-primary" />
            Sales Orders
            {searchTerm && (
              <Badge variant="secondary" className="ml-2">
                {filteredOrders.length} of {salesOrders.length}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            {searchTerm ? `Filtered results for "${searchTerm}"` : "Complete list of sales orders with profit analysis"}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <CarrefourSalesOrdersTable 
            refresh={refreshKey} 
            filteredData={filteredOrders} 
            onRefresh={handleRefresh} 
            storeId={storeId} 
          />
        </CardContent>
      </Card>
    </div>
  );
}
