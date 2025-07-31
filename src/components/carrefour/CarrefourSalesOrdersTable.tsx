import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Edit2, Trash2, Save, X, Plus, CheckSquare, CreditCard, Package, Download, Filter, CalendarIcon, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useCountry } from "@/contexts/CountryContext";
import { useToast } from "@/hooks/use-toast";
import { CarrefourSalesOrder, CreateCarrefourSalesOrder } from "@/types/carrefour";

interface FilterOptions {
  status: string;
  paymentStatus: string;
  minSaleValue: string;
  maxSaleValue: string;
  minCost: string;
  maxCost: string;
  startDate: Date | undefined;
  endDate: Date | undefined;
}

interface CarrefourSalesOrdersTableProps {
  refresh: number;
  filteredData?: CarrefourSalesOrder[];
  onRefresh: () => void;
}

interface EditingOrder {
  order_number: string;
  sale_value: number;
  seller_fees: number;
  payment_status: 'Pending' | 'Received';
  cost: number;
  profit: number;
  status: 'Delivered' | 'Returned' | 'Cancelled' | 'Shipped' | 'Other';
}

export function CarrefourSalesOrdersTable({ refresh, filteredData, onRefresh }: CarrefourSalesOrdersTableProps) {
  const [salesOrders, setSalesOrders] = useState<CarrefourSalesOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<EditingOrder | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    status: 'all',
    paymentStatus: 'all',
    minSaleValue: '',
    maxSaleValue: '',
    minCost: '',
    maxCost: '',
    startDate: undefined,
    endDate: undefined,
  });
  const [newOrderData, setNewOrderData] = useState<EditingOrder>({
    order_number: "",
    sale_value: 0,
    seller_fees: 0,
    payment_status: 'Pending',
    cost: 0,
    profit: 0,
    status: 'Delivered',
  });
  
  const tableRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { selectedCountry } = useCountry();

  // Apply filters and get filtered data
  const getFilteredData = () => {
    const dataToFilter = filteredData || salesOrders;
    return dataToFilter.filter(order => {
      // Status filter
      if (filters.status && filters.status !== 'all' && order.status !== filters.status) return false;
      
      // Payment status filter
      if (filters.paymentStatus && filters.paymentStatus !== 'all' && order.payment_status !== filters.paymentStatus) return false;
      
      // Sale value range filter
      if (filters.minSaleValue && order.sale_value < parseFloat(filters.minSaleValue)) return false;
      if (filters.maxSaleValue && order.sale_value > parseFloat(filters.maxSaleValue)) return false;
      
      // Cost range filter
      if (filters.minCost && order.cost < parseFloat(filters.minCost)) return false;
      if (filters.maxCost && order.cost > parseFloat(filters.maxCost)) return false;
      
      // Date range filter
      const orderDate = new Date(order.created_at);
      if (filters.startDate && orderDate < filters.startDate) return false;
      if (filters.endDate && orderDate > filters.endDate) return false;
      
      return true;
    });
  };

  const filteredAndSearchedData = getFilteredData();
  
  // Pagination
  const totalPages = Math.ceil(filteredAndSearchedData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = filteredAndSearchedData.slice(startIndex, endIndex);

  // Currency helper function
  const getCurrency = () => {
    return selectedCountry === 'KSA' ? 'SAR' : 'AED';
  };

  const formatCurrency = (amount: number) => {
    const currency = getCurrency();
    return `${amount.toFixed(2)} ${currency}`;
  };

  // Export functionality
  const exportToCSV = (data: CarrefourSalesOrder[]) => {
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
    link.download = `carrefour-sales-${selectedCountry}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportAll = () => {
    exportToCSV(filteredAndSearchedData);
  };

  useEffect(() => {
    fetchSalesOrders();
  }, [selectedCountry, refresh]);

  const fetchSalesOrders = async () => {
    try {
      const { data, error } = await supabase
        .from("carrefour_payments")
        .select("*")
        .eq("country", selectedCountry)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSalesOrders((data || []) as CarrefourSalesOrder[]);
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

  // Auto-calculate profit when values change
  const calculateProfit = (saleValue: number, cost: number, fees: number) => {
    return saleValue - cost - fees;
  };

  const handleEditClick = (order: CarrefourSalesOrder) => {
    setEditingId(order.id);
    setEditingData({
      order_number: order.order_number,
      sale_value: order.sale_value,
      seller_fees: order.seller_fees,
      payment_status: order.payment_status,
      cost: order.cost,
      profit: order.profit,
      status: order.status,
    });
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditingData(null);
  };

  const handleNewOrderCancel = () => {
    setIsAddingNew(false);
    setNewOrderData({
      order_number: "",
      sale_value: 0,
      seller_fees: 0,
      payment_status: 'Pending',
      cost: 0,
      profit: 0,
      status: 'Delivered',
    });
  };

  const handleEditSave = async () => {
    if (!editingData || !editingId) return;

    try {
      const { error } = await supabase
        .from("carrefour_payments")
        .update({
          order_number: editingData.order_number,
          sale_value: editingData.sale_value,
          seller_fees: editingData.seller_fees,
          payment_status: editingData.payment_status,
          cost: editingData.cost,
          profit: editingData.profit,
          status: editingData.status,
        })
        .eq("id", editingId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Sales order updated successfully",
      });

      setEditingId(null);
      setEditingData(null);
      onRefresh();
    } catch (error) {
      console.error("Error updating sales order:", error);
      toast({
        title: "Error",
        description: "Failed to update sales order",
        variant: "destructive",
      });
    }
  };

  const handleNewOrderSave = async () => {
    if (!newOrderData.order_number) {
      toast({
        title: "Error",
        description: "Order number is required",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("carrefour_payments")
        .insert([{
          ...newOrderData,
          user_id: user.id,
          country: selectedCountry,
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Sales order created successfully",
      });

      setIsAddingNew(false);
      setNewOrderData({
        order_number: "",
        sale_value: 0,
        seller_fees: 0,
        payment_status: 'Pending',
        cost: 0,
        profit: 0,
        status: 'Delivered',
      });
      onRefresh();
    } catch (error) {
      console.error("Error creating sales order:", error);
      toast({
        title: "Error",
        description: "Failed to create sales order",
        variant: "destructive",
      });
    }
  };

  const updateEditingData = (field: keyof EditingOrder, value: string | number) => {
    if (!editingData) return;
    
    const updatedData = { ...editingData, [field]: value };
    
    // Auto-calculate profit when relevant fields change
    if (field === 'sale_value' || field === 'cost' || field === 'seller_fees') {
      updatedData.profit = calculateProfit(updatedData.sale_value, updatedData.cost, updatedData.seller_fees);
    }
    
    setEditingData(updatedData);
  };

  const updateNewOrderData = (field: keyof EditingOrder, value: string | number) => {
    const updatedData = { ...newOrderData, [field]: value };
    
    // Auto-calculate profit when relevant fields change
    if (field === 'sale_value' || field === 'cost' || field === 'seller_fees') {
      updatedData.profit = calculateProfit(updatedData.sale_value, updatedData.cost, updatedData.seller_fees);
    }
    
    setNewOrderData(updatedData);
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

      onRefresh();
    } catch (error) {
      console.error("Error deleting sales order:", error);
      toast({
        title: "Error",
        description: "Failed to delete sales order record",
        variant: "destructive",
      });
    }
  };

  // Bulk operations
  const handleBulkStatusUpdate = async (status: 'Delivered' | 'Returned' | 'Cancelled' | 'Shipped' | 'Other') => {
    if (selectedOrders.size === 0) return;

    try {
      const { error } = await supabase
        .from("carrefour_payments")
        .update({ status })
        .in("id", Array.from(selectedOrders));

      if (error) throw error;

      toast({
        title: "Success",
        description: `${selectedOrders.size} orders marked as ${status}`,
      });

      setSelectedOrders(new Set());
      onRefresh();
    } catch (error) {
      console.error("Error updating order status:", error);
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive",
      });
    }
  };

  const handleBulkPaymentUpdate = async (paymentStatus: 'Pending' | 'Received') => {
    if (selectedOrders.size === 0) return;

    try {
      const { error } = await supabase
        .from("carrefour_payments")
        .update({ payment_status: paymentStatus })
        .in("id", Array.from(selectedOrders));

      if (error) throw error;

      toast({
        title: "Success",
        description: `${selectedOrders.size} payments marked as ${paymentStatus}`,
      });

      setSelectedOrders(new Set());
      onRefresh();
    } catch (error) {
      console.error("Error updating payment status:", error);
      toast({
        title: "Error",
        description: "Failed to update payment status",
        variant: "destructive",
      });
    }
  };

  const renderEditableCell = (
    value: string | number,
    field: keyof EditingOrder,
    type: "text" | "number" | "select" = "text",
    isEditing: boolean = false,
    isNewRow: boolean = false
  ) => {
    if (!isEditing && !isNewRow) {
      if (field === 'status' && typeof value === 'string') {
        const statusColors = {
          'Delivered': 'bg-emerald-100 text-emerald-800 border-emerald-200',
          'Returned': 'bg-red-100 text-red-800 border-red-200',
          'Cancelled': 'bg-gray-100 text-gray-800 border-gray-200',
          'Shipped': 'bg-blue-100 text-blue-800 border-blue-200',
          'Other': 'bg-purple-100 text-purple-800 border-purple-200'
        };
        return (
          <Badge className={`text-xs ${statusColors[value as keyof typeof statusColors] || statusColors.Other}`}>
            {value}
          </Badge>
        );
      }
      if (field === 'payment_status' && typeof value === 'string') {
        const paymentColors = {
          'Pending': 'bg-orange-100 text-orange-800 border-orange-200',
          'Received': 'bg-green-100 text-green-800 border-green-200'
        };
        return (
          <Badge className={`text-xs ${paymentColors[value as keyof typeof paymentColors] || paymentColors.Pending}`}>
            {value}
          </Badge>
        );
      }
      return <span>{value}</span>;
    }

    const currentData = isNewRow ? newOrderData : editingData;
    const updateFunction = isNewRow ? updateNewOrderData : updateEditingData;

    if (type === "select" && field === "status") {
      return (
        <Select
          value={currentData?.[field] as string || "Delivered"}
          onValueChange={(value) => updateFunction(field, value)}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Delivered">Delivered</SelectItem>
            <SelectItem value="Returned">Returned</SelectItem>
            <SelectItem value="Cancelled">Cancelled</SelectItem>
            <SelectItem value="Shipped">Shipped</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>
      );
    }

    if (type === "select" && field === "payment_status") {
      return (
        <Select
          value={currentData?.[field] as string || "Pending"}
          onValueChange={(value) => updateFunction(field, value)}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Received">Received</SelectItem>
          </SelectContent>
        </Select>
      );
    }

    return (
      <Input
        type={type}
        step={type === "number" ? "0.01" : undefined}
        value={currentData?.[field] || ""}
        onChange={(e) => {
          const newValue = type === "number" ? parseFloat(e.target.value) || 0 : e.target.value;
          updateFunction(field, newValue);
        }}
        className="h-8 text-sm"
        placeholder={type === "number" ? "0.00" : "Enter value"}
      />
    );
  };

  if (isLoading && !filteredData) {
    return <div className="text-center py-8">Loading sales orders...</div>;
  }

  const displayData = currentData;

  return (
    <div ref={tableRef} data-table-component className="space-y-4">
      {/* Bulk Actions and Controls */}
      <div className="flex justify-between items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          {selectedOrders.size > 0 && (
            <>
              <Badge variant="secondary" className="px-3 py-1">
                {selectedOrders.size} selected
              </Badge>
              <Button
                onClick={() => handleBulkStatusUpdate('Delivered')}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                size="sm"
              >
                <CheckSquare className="h-3 w-3" />
                Mark as Delivered
              </Button>
              <Button
                onClick={() => handleBulkStatusUpdate('Shipped')}
                className="gap-2 bg-cyan-600 hover:bg-cyan-700"
                size="sm"
              >
                <Package className="h-3 w-3" />
                Mark as Shipped
              </Button>
              <Button
                onClick={() => handleBulkPaymentUpdate('Received')}
                className="gap-2 bg-blue-600 hover:bg-blue-700"
                size="sm"
              >
                <CreditCard className="h-3 w-3" />
                Mark as Paid
              </Button>
            </>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowFilters(!showFilters)}
            variant="outline"
            className="gap-2"
            size="sm"
          >
            <Filter className="h-4 w-4" />
            Filters
          </Button>
          <Button
            onClick={handleExportAll}
            className="gap-2 bg-green-600 hover:bg-green-700"
            size="sm"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button
            onClick={() => setIsAddingNew(true)}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700"
            disabled={isAddingNew}
          >
            <Plus className="h-4 w-4" />
            Add Row
          </Button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <Card className="mb-4 border-slate-200">
          <CardHeader>
            <CardTitle className="text-sm">Filter Options</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Status Filter */}
              <div>
                <label className="text-sm font-medium">Status</label>
                <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="Delivered">Delivered</SelectItem>
                    <SelectItem value="Shipped">Shipped</SelectItem>
                    <SelectItem value="Returned">Returned</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Payment Status Filter */}
              <div>
                <label className="text-sm font-medium">Payment Status</label>
                <Select value={filters.paymentStatus} onValueChange={(value) => setFilters(prev => ({ ...prev, paymentStatus: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Payment Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Payment Statuses</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Received">Received</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sale Value Range */}
              <div>
                <label className="text-sm font-medium">Sale Value Range</label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={filters.minSaleValue}
                    onChange={(e) => setFilters(prev => ({ ...prev, minSaleValue: e.target.value }))}
                    className="w-20"
                  />
                  <Input
                    type="number"
                    placeholder="Max"
                    value={filters.maxSaleValue}
                    onChange={(e) => setFilters(prev => ({ ...prev, maxSaleValue: e.target.value }))}
                    className="w-20"
                  />
                </div>
              </div>

              {/* Cost Range */}
              <div>
                <label className="text-sm font-medium">Cost Range</label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={filters.minCost}
                    onChange={(e) => setFilters(prev => ({ ...prev, minCost: e.target.value }))}
                    className="w-20"
                  />
                  <Input
                    type="number"
                    placeholder="Max"
                    value={filters.maxCost}
                    onChange={(e) => setFilters(prev => ({ ...prev, maxCost: e.target.value }))}
                    className="w-20"
                  />
                </div>
              </div>

              {/* Date Range */}
              <div className="col-span-2">
                <label className="text-sm font-medium">Order Date Range</label>
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-40 justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.startDate ? format(filters.startDate, "PPP") : "Start Date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={filters.startDate}
                        onSelect={(date) => setFilters(prev => ({ ...prev, startDate: date }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-40 justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.endDate ? format(filters.endDate, "PPP") : "End Date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={filters.endDate}
                        onSelect={(date) => setFilters(prev => ({ ...prev, endDate: date }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Clear Filters */}
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setFilters({
                      status: 'all',
                      paymentStatus: 'all',
                      minSaleValue: '',
                      maxSaleValue: '',
                      minCost: '',
                      maxCost: '',
                      startDate: undefined,
                      endDate: undefined,
                    });
                    setCurrentPage(1);
                  }}
                  className="w-full"
                >
                  Clear All Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {filteredAndSearchedData.length === 0 && !isAddingNew ? (
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground mb-2">No Sales Orders Found</h3>
          <p className="text-sm text-muted-foreground">Start by adding your first sales order to track profit.</p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedOrders.size === displayData.length && displayData.length > 0}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedOrders(new Set(displayData.map(order => order.id)));
                      } else {
                        setSelectedOrders(new Set());
                      }
                    }}
                  />
                </TableHead>
                <TableHead className="font-semibold text-emerald-700">Order Details</TableHead>
                <TableHead className="font-semibold text-emerald-700">Sale Value</TableHead>
                <TableHead className="font-semibold text-red-700">Cost</TableHead>
                <TableHead className="font-semibold text-yellow-700">Platform Fees</TableHead>
                <TableHead className="font-semibold text-blue-700">Net Profit</TableHead>
                <TableHead className="font-semibold text-orange-700">Payment Status</TableHead>
                <TableHead className="font-semibold text-purple-700">Order Status</TableHead>
                <TableHead className="font-semibold">Date</TableHead>
                <TableHead className="font-semibold text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* New Row for Adding */}
              {isAddingNew && (
                <TableRow className="bg-emerald-50 border-emerald-200">
                  <TableCell>
                    <Checkbox disabled />
                  </TableCell>
                  <TableCell>
                    {renderEditableCell("", "order_number", "text", false, true)}
                  </TableCell>
                  <TableCell>
                    {renderEditableCell(0, "sale_value", "number", false, true)}
                  </TableCell>
                  <TableCell>
                    {renderEditableCell(0, "cost", "number", false, true)}
                  </TableCell>
                  <TableCell>
                    {renderEditableCell(0, "seller_fees", "number", false, true)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3 text-emerald-500" />
                      <span className="font-bold text-emerald-600">
                        {formatCurrency(newOrderData.profit)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {renderEditableCell("Pending", "payment_status", "select", false, true)}
                  </TableCell>
                  <TableCell>
                    {renderEditableCell("Delivered", "status", "select", false, true)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    New
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-center space-x-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 hover:bg-emerald-100"
                        onClick={handleNewOrderSave}
                      >
                        <Save className="h-3 w-3 text-emerald-600" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 hover:bg-red-100"
                        onClick={handleNewOrderCancel}
                      >
                        <X className="h-3 w-3 text-red-600" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}

              {/* Existing Rows */}
              {displayData.map((order, index) => {
                const profitMargin = order.sale_value > 0 ? (order.profit / order.sale_value) * 100 : 0;
                const isEditing = editingId === order.id;
                
                return (
                  <TableRow 
                    key={order.id} 
                    className={`hover:bg-muted/20 transition-colors ${
                      isEditing ? "bg-blue-50 border-blue-200" : 
                      index % 2 === 0 ? "bg-background" : "bg-muted/5"
                    }`}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedOrders.has(order.id)}
                        onCheckedChange={(checked) => {
                          const newSelected = new Set(selectedOrders);
                          if (checked) {
                            newSelected.add(order.id);
                          } else {
                            newSelected.delete(order.id);
                          }
                          setSelectedOrders(newSelected);
                        }}
                        disabled={editingId !== null || isAddingNew}
                      />
                    </TableCell>
                    
                    <TableCell>
                      {isEditing ? (
                        renderEditableCell(order.order_number, "order_number", "text", true)
                      ) : (
                        <div className="space-y-1">
                          <Badge variant="outline" className="font-mono text-xs bg-emerald-50 border-emerald-200">
                            {order.order_number}
                          </Badge>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Package className="h-3 w-3" />
                            Order ID
                          </div>
                        </div>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      {isEditing ? (
                        renderEditableCell(order.sale_value, "sale_value", "number", true)
                      ) : (
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3 text-emerald-500" />
                          <span className="font-semibold text-emerald-600">
                            {formatCurrency(order.sale_value)}
                          </span>
                        </div>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      {isEditing ? (
                        renderEditableCell(order.cost, "cost", "number", true)
                      ) : (
                        <span className="font-medium text-red-600">
                          {formatCurrency(order.cost)}
                        </span>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      {isEditing ? (
                        renderEditableCell(order.seller_fees, "seller_fees", "number", true)
                      ) : (
                        <span className="font-medium text-yellow-600">
                          {formatCurrency(order.seller_fees)}
                        </span>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3 text-blue-500" />
                          <span className="font-bold text-blue-600">
                            {formatCurrency(editingData?.profit || 0)}
                          </span>
                        </div>
                      ) : (
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
                              {formatCurrency(order.profit)}
                            </span>
                          </div>
                          <Badge 
                            variant={order.profit >= 0 ? "secondary" : "destructive"}
                            className="text-xs"
                          >
                            {profitMargin.toFixed(1)}% margin
                          </Badge>
                        </div>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      {renderEditableCell(order.payment_status, "payment_status", "select", isEditing)}
                    </TableCell>
                    
                    <TableCell>
                      {renderEditableCell(order.status, "status", "select", isEditing)}
                    </TableCell>
                    
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString()}
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex justify-center space-x-1">
                        {isEditing ? (
                          <>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0 hover:bg-emerald-100"
                              onClick={handleEditSave}
                            >
                              <Save className="h-3 w-3 text-emerald-600" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0 hover:bg-red-100"
                              onClick={handleEditCancel}
                            >
                              <X className="h-3 w-3 text-red-600" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0 hover:bg-blue-100"
                              onClick={() => handleEditClick(order)}
                              disabled={editingId !== null || isAddingNew}
                            >
                              <Edit2 className="h-3 w-3 text-blue-600" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDelete(order.id)}
                              disabled={editingId !== null || isAddingNew}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-muted-foreground">
            Showing {startIndex + 1} to {Math.min(endIndex, filteredAndSearchedData.length)} of {filteredAndSearchedData.length} results
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = currentPage <= 3 
                  ? i + 1 
                  : currentPage > totalPages - 3 
                    ? totalPages - 4 + i 
                    : currentPage - 2 + i;
                
                if (pageNum < 1 || pageNum > totalPages) return null;
                
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                    className="w-8 h-8 p-0"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
