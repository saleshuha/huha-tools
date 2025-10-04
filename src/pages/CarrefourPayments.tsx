import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Search, ShoppingCart, TrendingUp, TrendingDown, Package, Calculator, BarChart3, Receipt, Download, X, ArrowLeft, Store as StoreIcon, CheckCircle, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { CarrefourSalesOrdersTable } from "@/components/carrefour/CarrefourSalesOrdersTable";
import { CarrefourSalesOrder } from "@/types/carrefour";
import { Store } from "@/types/store";
import { supabase } from "@/integrations/supabase/client";
import { useCountry } from "@/contexts/CountryContext";
import { useToast } from "@/hooks/use-toast";
export default function CarrefourSalesTracker() {
  const {
    storeId
  } = useParams();
  const navigate = useNavigate();
  const [currentStore, setCurrentStore] = useState<Store | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [salesOrders, setSalesOrders] = useState<CarrefourSalesOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [dateRange, setDateRange] = useState<{from: Date | undefined, to: Date | undefined}>({ from: undefined, to: undefined });
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
      const {
        data,
        error
      } = await supabase.from("stores").select("*").eq("id", storeId).single();
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
      const {
        data,
        error
      } = await supabase.from("carrefour_payments").select("*").eq("store_id", storeId).eq("country", currentStore.country) // Filter by store's country
      .order("created_at", {
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
    return dateFilteredOrders.filter(order => order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) || order.status.toLowerCase().includes(searchTerm.toLowerCase()));
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
    const csvContent = [headers.join(','), ...data.map(order => [order.order_number, order.sale_value, order.seller_fees, order.cost, order.profit, order.status, order.payment_status, order.country, new Date(order.created_at).toLocaleDateString()].join(','))].join('\n');
    const blob = new Blob([csvContent], {
      type: 'text/csv;charset=utf-8;'
    });
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
    setSelectedItems(new Set()); // Reset selections when opening dialog
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
  const handleExport = (filterType: string, filename: string) => {
    let dataToExport = dateFilteredOrders;
    switch (filterType) {
      case 'all':
        dataToExport = dateFilteredOrders;
        break;
      case 'delivered':
        dataToExport = dateFilteredOrders.filter(o => o.status === 'Delivered');
        break;
      case 'shipped':
        dataToExport = dateFilteredOrders.filter(o => o.status === 'Shipped');
        break;
      case 'returned':
        dataToExport = dateFilteredOrders.filter(o => o.status === 'Returned');
        break;
      case 'cancelled':
        dataToExport = dateFilteredOrders.filter(o => o.status === 'Cancelled');
        break;
      case 'other':
        dataToExport = dateFilteredOrders.filter(o => o.status === 'Other');
        break;
      case 'pending':
        dataToExport = dateFilteredOrders.filter(o => o.payment_status === 'Pending');
        break;
      case 'profitable':
        dataToExport = dateFilteredOrders.filter(o => o.profit > 0);
        break;
    }
    exportToCSV(dataToExport, filename);
  };

  // Filter dialog data based on search term
  const filteredDialogData = useMemo(() => {
    if (!dialogData.searchTerm.trim()) return dialogData.data;
    return dialogData.data.filter(order => order.order_number.toLowerCase().includes(dialogData.searchTerm.toLowerCase()) || order.status.toLowerCase().includes(dialogData.searchTerm.toLowerCase()) || order.payment_status.toLowerCase().includes(dialogData.searchTerm.toLowerCase()));
  }, [dialogData.data, dialogData.searchTerm]);
  return <div className="w-full max-w-none px-6 py-6 space-y-6 ml-0">
      {/* Header with Back Button and Date Filter */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate("/stores")} className="gap-2">
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
              {currentStore?.location && <span>• {currentStore.location}</span>}
            </p>
          </div>
        </div>
        
        {/* Date Range Filter */}
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "w-[220px] justify-start text-left font-medium border-2 border-primary/20 hover:border-primary/40 bg-primary/5 hover:bg-primary/10 shadow-sm",
                  !dateRange.from && !dateRange.to && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-3 w-3 text-primary" />
                <span className="text-xs">
                  {dateRange.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "MMM dd")} - {format(dateRange.to, "MMM dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "MMM dd, y")
                    )
                  ) : (
                    "Filter by Date"
                  )}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 shadow-lg border-2" align="end">
              <div className="bg-gradient-to-b from-primary/5 to-background p-3 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-sm text-primary">Select Date Range</h4>
                    <p className="text-xs text-muted-foreground">Choose a period to filter your metrics</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-xs px-2 py-1 h-auto bg-primary/10 hover:bg-primary/20 text-primary"
                    onClick={() => setDateRange({ from: undefined, to: undefined })}
                  >
                    All Time
                  </Button>
                </div>
              </div>
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange.from}
                selected={{ from: dateRange.from, to: dateRange.to }}
                onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
                numberOfMonths={2}
                className={cn("p-4 pointer-events-auto")}
                classNames={{
                  months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                  month: "space-y-4",
                  caption: "flex justify-center pt-1 relative items-center text-primary font-medium",
                  caption_label: "text-sm font-medium",
                  nav: "space-x-1 flex items-center",
                  nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 hover:bg-primary/10 rounded-md",
                  nav_button_previous: "absolute left-1",
                  nav_button_next: "absolute right-1",
                  table: "w-full border-collapse space-y-1",
                  head_row: "flex",
                  head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
                  row: "flex w-full mt-2",
                  cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-primary/10 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                  day: "h-8 w-8 p-0 font-normal aria-selected:opacity-100 hover:bg-primary/20 rounded-md transition-colors",
                  day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                  day_today: "bg-accent text-accent-foreground font-semibold",
                  day_outside: "text-muted-foreground opacity-50",
                  day_disabled: "text-muted-foreground opacity-50",
                  day_range_middle: "aria-selected:bg-primary/10 aria-selected:text-foreground",
                  day_hidden: "invisible",
                }}
              />
              {(dateRange.from || dateRange.to) && (
                <div className="p-3 border-t bg-muted/30">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="w-full hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20" 
                    onClick={() => setDateRange({ from: undefined, to: undefined })}
                  >
                    Clear Date Filter
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Enhanced Key Metrics Grid - Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* 1. Total Sales Revenue */}
        <Card className="shadow-md border-0 bg-gradient-to-br from-emerald-50 to-emerald-100 relative overflow-hidden cursor-pointer hover:shadow-lg transition-all" onClick={() => handleCardClick('revenue', 'Total Sales Revenue')}>
          <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-600/10 rounded-full -translate-y-8 translate-x-8"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium text-emerald-900">Total Sales Revenue</CardTitle>
            <ShoppingCart className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent className="pb-2">
            <div className="text-2xl font-bold text-emerald-900 mb-1">{formatCurrency(metrics.totalRevenue)}</div>
            <div className="flex items-center gap-2 text-xs">
              <TrendingUp className="h-3 w-3 text-emerald-600" />
              <span className="text-emerald-700">From {metrics.totalOrders} orders</span>
            </div>
            <p className="text-xs text-emerald-600 mt-1">
              Across all store operations
            </p>
          </CardContent>
        </Card>

        {/* 2. Shipped Revenue */}
        <Card className="shadow-md border-0 bg-gradient-to-br from-cyan-50 to-cyan-100 relative overflow-hidden cursor-pointer hover:shadow-lg transition-all" onClick={() => handleCardClick('shipped', 'Shipped Revenue')}>
          <div className="absolute top-0 right-0 w-16 h-16 bg-cyan-600/10 rounded-full -translate-y-8 translate-x-8"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium text-cyan-900">Shipped Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-cyan-600" />
          </CardHeader>
          <CardContent className="pb-2">
            <div className="text-2xl font-bold text-cyan-900 mb-1">{formatCurrency(metrics.shippedValue)}</div>
            <div className="flex items-center gap-2 text-xs">
              <Calculator className="h-3 w-3 text-cyan-600" />
              <span className="text-cyan-700">{metrics.shippedItems} shipped orders</span>
            </div>
            <p className="text-xs text-cyan-600 mt-1">
              Orders currently in transit
            </p>
          </CardContent>
        </Card>

        {/* 3. Delivered Revenue */}
        <Card className="shadow-md border-0 bg-gradient-to-br from-green-50 to-green-100 relative overflow-hidden cursor-pointer hover:shadow-lg transition-all" onClick={() => handleCardClick('delivered', 'Delivered Revenue')}>
          <div className="absolute top-0 right-0 w-16 h-16 bg-green-600/10 rounded-full -translate-y-8 translate-x-8"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium text-green-900">Delivered Revenue</CardTitle>
            <BarChart3 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent className="pb-2">
            <div className="text-2xl font-bold text-green-900 mb-1">{formatCurrency(metrics.deliveredValue)}</div>
            <div className="flex items-center gap-2 text-xs">
              <TrendingUp className="h-3 w-3 text-green-600" />
              <span className="text-green-700">{metrics.deliveredItems} completed</span>
            </div>
            <p className="text-xs text-green-600 mt-1">
              Successfully delivered orders
            </p>
          </CardContent>
        </Card>

        {/* 4. Total Platform Fees */}
        <Card className="shadow-md border-0 bg-gradient-to-br from-amber-50 to-amber-100 relative overflow-hidden cursor-pointer hover:shadow-lg transition-all" onClick={() => handleCardClick('fees', 'Total Platform Fees')}>
          <div className="absolute top-0 right-0 w-16 h-16 bg-amber-600/10 rounded-full -translate-y-8 translate-x-8"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium text-amber-900">Total Platform Fees</CardTitle>
            <Receipt className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent className="pb-2">
            <div className="text-2xl font-bold text-amber-900 mb-1">{formatCurrency(metrics.totalPlatformFees)}</div>
            <div className="flex items-center gap-2 text-xs">
              <Calculator className="h-3 w-3 text-amber-600" />
              <span className="text-amber-700">Platform charges</span>
            </div>
            <p className="text-xs text-amber-600 mt-1">
              All seller fees collected
            </p>
          </CardContent>
        </Card>

        {/* 5. Revenue minus Platform Fees */}
        <Card className="shadow-md border-0 bg-gradient-to-br from-teal-50 to-teal-100 relative overflow-hidden cursor-pointer hover:shadow-lg transition-all" onClick={() => handleCardClick('all', 'Revenue minus Platform Fees')}>
          <div className="absolute top-0 right-0 w-16 h-16 bg-teal-600/10 rounded-full -translate-y-8 translate-x-8"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium text-teal-900">Revenue minus Fees</CardTitle>
            <TrendingUp className="h-4 w-4 text-teal-600" />
          </CardHeader>
          <CardContent className="pb-2">
            <div className="text-2xl font-bold text-teal-900 mb-1">{formatCurrency(metrics.revenueMinusFees)}</div>
            <div className="flex items-center gap-2 text-xs">
              <Calculator className="h-3 w-3 text-teal-600" />
              <span className="text-teal-700">Revenue - Platform Fees</span>
            </div>
            <p className="text-xs text-teal-600 mt-1">
              Revenue after platform fees
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Key Metrics Grid - Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* 6. Net Profit */}
        <Card className="shadow-md border-0 bg-gradient-to-br from-blue-50 to-blue-100 relative overflow-hidden cursor-pointer hover:shadow-lg transition-all" onClick={() => handleCardClick('profitable', 'Net Profit')}>
          <div className="absolute top-0 right-0 w-16 h-16 bg-blue-600/10 rounded-full -translate-y-8 translate-x-8"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium text-blue-900">Net Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent className="pb-2">
            <div className="text-2xl font-bold text-blue-900 mb-1">{formatCurrency(metrics.totalProfit)}</div>
            <div className="flex items-center gap-2 text-xs">
              <Calculator className="h-3 w-3 text-blue-600" />
              <span className="text-blue-700">{metrics.profitMargin.toFixed(1)}% margin</span>
            </div>
            <p className="text-xs text-blue-600 mt-1">
              Profit after all costs
            </p>
          </CardContent>
        </Card>

        {/* 7. Total Costs */}
        <Card className="shadow-md border-0 bg-gradient-to-br from-red-50 to-red-100 relative overflow-hidden cursor-pointer hover:shadow-lg transition-all" onClick={() => handleCardClick('costs', 'Total Costs')}>
          <div className="absolute top-0 right-0 w-16 h-16 bg-red-600/10 rounded-full -translate-y-8 translate-x-8"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium text-red-900">Total Costs</CardTitle>
            <Calculator className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent className="pb-2">
            <div className="text-2xl font-bold text-red-900 mb-1">{formatCurrency(metrics.totalCosts)}</div>
            <div className="flex items-center gap-2 text-xs">
              <TrendingDown className="h-3 w-3 text-red-600" />
              <span className="text-red-700">Cost of goods sold</span>
            </div>
            <p className="text-xs text-red-600 mt-1">
              All operational costs
            </p>
          </CardContent>
        </Card>

        {/* 8. Total Investment */}
        <Card className="shadow-md border-0 bg-gradient-to-br from-indigo-50 to-indigo-100 relative overflow-hidden cursor-pointer hover:shadow-lg transition-all" onClick={() => handleCardClick('investment', 'Total Investment')}>
          <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-600/10 rounded-full -translate-y-8 translate-x-8"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium text-indigo-900">Total Investment</CardTitle>
            <Calculator className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent className="pb-2">
            <div className="text-2xl font-bold text-indigo-900 mb-1">{formatCurrency(metrics.totalInvestment)}</div>
            <div className="flex items-center gap-2 text-xs">
              <TrendingUp className="h-3 w-3 text-indigo-600" />
              <span className="text-indigo-700">Profit + Cost combined</span>
            </div>
            <p className="text-xs text-indigo-600 mt-1">
              Total financial commitment
            </p>
          </CardContent>
        </Card>

        {/* 9. Pending Payments */}
        <Card className="shadow-md border-0 bg-gradient-to-br from-orange-50 to-orange-100 relative overflow-hidden cursor-pointer hover:shadow-lg transition-all" onClick={() => handleCardClick('pending', 'Pending Payments')}>
          <div className="absolute top-0 right-0 w-16 h-16 bg-orange-600/10 rounded-full -translate-y-8 translate-x-8"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium text-orange-900">Pending to Receive</CardTitle>
            <Calculator className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent className="pb-2">
            <div className="space-y-2">
              <div>
                <p className="text-xs text-orange-700 font-medium">Total Cost</p>
                <div className="text-xl font-bold text-orange-900">{formatCurrency(metrics.totalPendingCost)}</div>
              </div>
              <div>
                <p className="text-xs text-orange-700 font-medium">Total Profit</p>
                <div className="text-xl font-bold text-orange-900">{formatCurrency(metrics.totalPendingProfit)}</div>
              </div>
              <div className="pt-2 border-t border-orange-300">
                <p className="text-xs text-orange-800 font-semibold">Total Pending</p>
                <div className="text-2xl font-bold text-orange-950">{formatCurrency(metrics.totalPendingCost + metrics.totalPendingProfit)}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs mt-2">
              <TrendingUp className="h-3 w-3 text-orange-600" />
              <span className="text-orange-700">{metrics.totalPendingPayments} orders pending</span>
            </div>
          </CardContent>
        </Card>

        {/* 10. Total Paid Payments */}
        <Card className="shadow-md border-0 bg-gradient-to-br from-green-50 to-green-100 relative overflow-hidden cursor-pointer hover:shadow-lg transition-all" onClick={() => handleCardClick('paid', 'Total Paid Payments')}>
          <div className="absolute top-0 right-0 w-16 h-16 bg-green-600/10 rounded-full -translate-y-8 translate-x-8"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium text-green-900">Total Paid Payments</CardTitle>
            <Package className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent className="pb-2">
            <div className="text-2xl font-bold text-green-900 mb-1">{formatCurrency(metrics.totalPaidAmount)}</div>
            <div className="flex items-center gap-2 text-xs">
              <TrendingUp className="h-3 w-3 text-green-600" />
              <span className="text-green-700">{metrics.totalPaidPayments} orders received</span>
            </div>
            <p className="text-xs text-green-600 mt-1">
              Successfully paid orders
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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
        <Card className="cursor-pointer hover:shadow-md transition-all border-green-200 hover:border-green-300" onClick={() => handleCardClick('delivered', 'Delivered Orders')}>
          <CardContent className="pt-2 pb-2 px-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-green-700">Delivered Orders</p>
                <p className="text-sm font-bold text-green-600">{metrics.deliveredItems}</p>
                <p className="text-xs text-muted-foreground">
                  Value: {formatCurrency(metrics.deliveredValue)}
                </p>
              </div>
              <Package className="h-3 w-3 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-all border-cyan-200 hover:border-cyan-300" onClick={() => handleCardClick('shipped', 'Shipped Orders')}>
          <CardContent className="pt-2 pb-2 px-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-cyan-700">Shipped Orders</p>
                <p className="text-sm font-bold text-cyan-600">{metrics.shippedItems}</p>
                <p className="text-xs text-muted-foreground">
                  Value: {formatCurrency(metrics.shippedValue)}
                </p>
              </div>
              <Package className="h-3 w-3 text-cyan-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-all border-red-200 hover:border-red-300" onClick={() => handleCardClick('returned', 'Returned Orders')}>
          <CardContent className="pt-2 pb-2 px-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-red-700">Returned Orders</p>
                <p className="text-sm font-bold text-red-600">{metrics.returnedItems}</p>
                <p className="text-xs text-muted-foreground">
                  Value: {formatCurrency(metrics.returnedValue)}
                </p>
              </div>
              <Package className="h-3 w-3 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-all border-gray-200 hover:border-gray-300" onClick={() => handleCardClick('cancelled', 'Cancelled Orders')}>
          <CardContent className="pt-2 pb-2 px-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-700">Cancelled Orders</p>
                <p className="text-sm font-bold text-gray-600">{metrics.cancelledItems}</p>
                <p className="text-xs text-muted-foreground">
                  Value: {formatCurrency(metrics.cancelledValue)}
                </p>
              </div>
              <Package className="h-3 w-3 text-gray-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-all border-indigo-200 hover:border-indigo-300" onClick={() => handleCardClick('other', 'Other Orders')}>
          <CardContent className="pt-2 pb-2 px-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-indigo-700">Other Orders</p>
                <p className="text-sm font-bold text-indigo-600">{metrics.otherItems}</p>
                <p className="text-xs text-muted-foreground">
                  Value: {formatCurrency(metrics.otherValue)}
                </p>
              </div>
              <Package className="h-3 w-3 text-indigo-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Dialog for showing filtered data with selection */}
      <Dialog open={dialogData.isOpen} onOpenChange={open => setDialogData(prev => ({
      ...prev,
      isOpen: open
    }))}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{dialogData.title}</span>
              <div className="flex items-center gap-2">
                {selectedItems.size > 0 && <Button onClick={exportSelectedItems} className="gap-2 bg-blue-600 hover:bg-blue-700" size="sm">
                    <Download className="h-4 w-4" />
                    Export Selected ({selectedItems.size})
                  </Button>}
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
              <Input placeholder="Search orders..." value={dialogData.searchTerm} onChange={e => setDialogData(prev => ({
              ...prev,
              searchTerm: e.target.value
            }))} className="pl-10" />
            </div>

            {/* Selection Controls */}
            <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <Checkbox id="select-all" checked={selectedItems.size === filteredDialogData.length && filteredDialogData.length > 0} onCheckedChange={handleSelectAll} />
                <label htmlFor="select-all" className="text-sm font-medium">
                  Select All ({filteredDialogData.length})
                </label>
              </div>
              {selectedItems.size > 0 && <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    {selectedItems.size} selected
                  </Badge>
                  <Button variant="outline" size="sm" onClick={() => setSelectedItems(new Set())}>
                    Clear Selection
                  </Button>
                </div>}
            </div>

            {/* Enhanced Table with Selection */}
            <div className="border rounded-lg overflow-auto max-h-[40vh]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox checked={selectedItems.size === filteredDialogData.length && filteredDialogData.length > 0} onCheckedChange={handleSelectAll} />
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
                  {filteredDialogData.map(order => <TableRow key={order.id} className={selectedItems.has(order.id) ? 'bg-blue-50' : ''}>
                      <TableCell>
                        <Checkbox checked={selectedItems.has(order.id)} onCheckedChange={checked => handleSelectItem(order.id, checked as boolean)} />
                      </TableCell>
                      <TableCell className="font-medium">{order.order_number}</TableCell>
                      <TableCell>{formatCurrency(order.sale_value)}</TableCell>
                      <TableCell>{formatCurrency(order.seller_fees)}</TableCell>
                      <TableCell>{formatCurrency(order.cost)}</TableCell>
                      <TableCell className={order.profit > 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatCurrency(order.profit)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={order.status === 'Delivered' ? 'default' : order.status === 'Shipped' ? 'secondary' : order.status === 'Returned' ? 'destructive' : 'outline'}>
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={order.payment_status === 'Received' ? 'default' : 'secondary'}>
                          {order.payment_status}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>)}
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