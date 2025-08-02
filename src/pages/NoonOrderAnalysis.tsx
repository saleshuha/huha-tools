import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { 
  Download, TrendingUp, TrendingDown, Package, DollarSign, AlertTriangle, 
  Search, Filter, RefreshCw, AlertCircle, CheckCircle, Clock, XCircle, 
  Eye, FileText, Calculator, Target, Zap, Award, ChevronLeft, ChevronRight
} from "lucide-react";
import { useCountry } from "@/contexts/CountryContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, subMonths } from "date-fns";

interface OrderAnalysis {
  totalOrders: number;
  ordersWithFees: number;
  ordersWithoutFees: number;
  deliveredOrders: number;
  cancelledOrders: number;
  returnedOrders: number;
  shippedOrders: number;
  pendingOrders: number;
  totalRevenue: number;
  totalFees: number;
  netAmount: number;
  averageOrderValue: number;
  returnRate: number;
  cancellationRate: number;
  deliveryRate: number;
  averageFeePercentage: number;
  profitMargin: number;
  feesCoverage: number;
}

interface OrderDetail {
  // Sales data (primary)
  item_nr: string;
  order_id?: string;
  sku?: string;
  product_title?: string;
  item_status?: string;
  ordered_date?: string;
  shipped_date?: string;
  delivered_date?: string;
  cancelled_date?: string;
  returned_date?: string;
  invoice_price?: number;
  family?: string;
  brand?: string;
  
  // Fees data (calculated)
  fees_found: boolean;
  total_fees: number;
  net_amount: number;
  fee_breakdown: {[key: string]: number};
  days_to_deliver?: number;
  profit_margin?: number;
  
  // Enhanced status
  enhanced_status: string;
  status_color: string;
  has_cost_data: boolean;
}

interface StatusBreakdown {
  status: string;
  count: number;
  percentage: number;
  totalRevenue: number;
  totalFees: number;
  netAmount: number;
  avgOrderValue: number;
  feesFound: number;
  feesCoverage: number;
}

interface FeeBreakdown {
  feeType: string;
  amount: number;
  percentage: number;
  ordersAffected: number;
  avgPerAffectedOrder: number;
  description: string;
}

export default function NoonOrderAnalysis() {
  const { selectedCountry } = useCountry();
  const [loading, setLoading] = useState(true);
  const [selectedStore, setSelectedStore] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [feesFilter, setFeesFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<{from: Date | undefined, to: Date | undefined}>({
    from: subMonths(new Date(), 3),
    to: new Date()
  });
  const [stores, setStores] = useState<Array<{ id: string; name: string }>>([]);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  
  const [analysis, setAnalysis] = useState<OrderAnalysis>({
    totalOrders: 0,
    ordersWithFees: 0,
    ordersWithoutFees: 0,
    deliveredOrders: 0,
    cancelledOrders: 0,
    returnedOrders: 0,
    shippedOrders: 0,
    pendingOrders: 0,
    totalRevenue: 0,
    totalFees: 0,
    netAmount: 0,
    averageOrderValue: 0,
    returnRate: 0,
    cancellationRate: 0,
    deliveryRate: 0,
    averageFeePercentage: 0,
    profitMargin: 0,
    feesCoverage: 0
  });

  const [orderDetails, setOrderDetails] = useState<OrderDetail[]>([]);
  const [statusBreakdown, setStatusBreakdown] = useState<StatusBreakdown[]>([]);
  const [feeBreakdown, setFeeBreakdown] = useState<FeeBreakdown[]>([]);

  // Filtered data based on search and filters
  const filteredOrders = useMemo(() => {
    return orderDetails.filter(order => {
      const matchesSearch = !searchTerm || 
        order.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.product_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.item_nr?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = selectedStatus === "all" || order.item_status === selectedStatus;
      
      const matchesFees = feesFilter === "all" || 
        (feesFilter === "with-fees" && order.fees_found) ||
        (feesFilter === "without-fees" && !order.fees_found);
      
      return matchesSearch && matchesStatus && matchesFees;
    });
  }, [orderDetails, searchTerm, selectedStatus, feesFilter]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedStatus, feesFilter, itemsPerPage]);

  const uniqueStatuses = useMemo(() => {
    const statuses = new Set(orderDetails.map(order => order.item_status).filter(Boolean));
    return Array.from(statuses);
  }, [orderDetails]);

  useEffect(() => {
    loadStores();
  }, [selectedCountry]);

  useEffect(() => {
    if (stores.length > 0) {
      loadOrderAnalysis();
    }
  }, [selectedStore, selectedCountry, stores, dateRange]);

  const loadStores = async () => {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('id, name')
        .eq('platform', 'noon')
        .eq('country', selectedCountry)
        .eq('is_active', true);

      if (error) throw error;
      setStores(data || []);
    } catch (error) {
      console.error('Error loading stores:', error);
      toast.error('Failed to load stores');
    }
  };

  const calculateDaysBetween = (startDate: string, endDate: string) => {
    if (!startDate || !endDate) return null;
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  };

  const loadOrderAnalysis = async () => {
    try {
      setLoading(true);

      // Use the new database function for enhanced invoice/credit matching
      console.log('Loading order analysis using enhanced database function...');
      
      const { data: orderFeesData, error } = await supabase
        .rpc('get_order_fees_analysis_optimized', {
          country_filter: selectedCountry,
          store_filter: selectedStore === "all" ? null : selectedStore,
          start_date: dateRange.from?.toISOString(),
          end_date: dateRange.to?.toISOString(),
          limit_records: 2000  // Limit to prevent timeout
        });

      if (error) {
        console.error('Database function error:', error);
        throw error;
      }

      console.log(`Loaded ${orderFeesData?.length || 0} matched invoice/credit records with fees`);

      if (!orderFeesData || orderFeesData.length === 0) {
        // Set empty state
        setAnalysis({
          totalOrders: 0,
          ordersWithFees: 0,
          ordersWithoutFees: 0,
          deliveredOrders: 0,
          cancelledOrders: 0,
          returnedOrders: 0,
          shippedOrders: 0,
          pendingOrders: 0,
          totalRevenue: 0,
          totalFees: 0,
          netAmount: 0,
          averageOrderValue: 0,
          returnRate: 0,
          cancellationRate: 0,
          deliveryRate: 0,
          averageFeePercentage: 0,
          profitMargin: 0,
          feesCoverage: 0
        });
        setOrderDetails([]);
        setStatusBreakdown([]);
        setFeeBreakdown([]);
        return;
      }

      // Transform the database results into OrderDetail format
      const combinedOrders: OrderDetail[] = orderFeesData.map(record => {
        const hasFeesData = record.fee_coverage_status === 'Fees Available';
        
        // Convert JSONB fee breakdown to proper format
        let feeBreakdown: {[key: string]: number} = {};
        if (record.fee_breakdown && typeof record.fee_breakdown === 'object') {
          const breakdown = record.fee_breakdown as any;
          Object.keys(breakdown).forEach(key => {
            feeBreakdown[key] = Number(breakdown[key]) || 0;
          });
        }
        
        // Calculate days to delivery (if delivered)
        const orderedDate = record.document_date;
        const daysToDeliver = null; // We don't have delivery date in invoice/credit data
        
        // Enhanced status based on type and fees availability
        let enhancedStatus = `${record.order_type} - ${record.order_status}`;
        let statusColor = getStatusColor(record.order_status);
        
        if (hasFeesData) {
          enhancedStatus = `${enhancedStatus} (Fees Available)`;
          statusColor = statusColor.replace('bg-gray', 'bg-green');
        } else {
          enhancedStatus = `${enhancedStatus} (Fees Missing)`;
          statusColor = statusColor.replace('bg-gray', 'bg-orange');
        }

        return {
          item_nr: record.item_nr || '',
          order_id: record.order_number || '',
          sku: record.sku || undefined,
          product_title: record.description || undefined,
          item_status: record.order_status || undefined,
          ordered_date: record.document_date ? new Date(record.document_date).toISOString() : undefined,
          shipped_date: undefined,
          delivered_date: undefined,
          cancelled_date: record.order_type === 'credit' ? record.document_date : undefined,
          returned_date: record.order_type === 'credit' ? record.document_date : undefined,
          invoice_price: Number(record.invoice_price) || 0,
          family: undefined,
          brand: undefined,
          fees_found: hasFeesData,
          total_fees: Number(record.total_fees) || 0,
          net_amount: Number(record.net_amount) || 0,
          fee_breakdown: feeBreakdown,
          days_to_deliver: daysToDeliver,
          profit_margin: Number(record.profit_margin) || 0,
          enhanced_status: enhancedStatus,
          status_color: statusColor,
          has_cost_data: hasFeesData
        };
      });

      console.log(`Created ${combinedOrders.length} order records`);

      // Calculate metrics
      const metrics = calculateMetrics(combinedOrders);
      const statusData = calculateStatusBreakdown(combinedOrders);
      const feeData = calculateFeeBreakdown(combinedOrders);

      setAnalysis(metrics);
      setOrderDetails(combinedOrders);
      setStatusBreakdown(statusData);
      setFeeBreakdown(feeData);

    } catch (error) {
      console.error('Error loading order analysis:', error);
      toast.error('Failed to load order analysis');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllData = async (query: any) => {
    const allData = [];
    let offset = 0;
    const batchSize = 1000;

    while (true) {
      const { data, error } = await query
        .range(offset, offset + batchSize - 1)
        .order('ordered_date', { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) break;

      allData.push(...data);
      if (data.length < batchSize) break;
      offset += batchSize;
    }

    return allData;
  };

  const calculateMetrics = (orders: OrderDetail[]): OrderAnalysis => {
    const totalOrders = orders.length;
    if (totalOrders === 0) return analysis;

    const ordersWithFees = orders.filter(o => o.fees_found).length;
    const ordersWithoutFees = totalOrders - ordersWithFees;
    const deliveredOrders = orders.filter(o => o.item_status === 'delivered').length;
    const cancelledOrders = orders.filter(o => o.item_status === 'cancelled').length;
    const returnedOrders = orders.filter(o => o.item_status === 'returned').length;
    const shippedOrders = orders.filter(o => o.item_status === 'shipped').length;
    const pendingOrders = orders.filter(o => !['delivered', 'cancelled', 'returned', 'shipped'].includes(o.item_status || '')).length;
    
    const totalRevenue = orders.reduce((sum, o) => sum + (o.invoice_price || 0), 0);
    const totalFees = orders.reduce((sum, o) => sum + o.total_fees, 0);
    const netAmount = totalRevenue - totalFees;
    const feesCoverage = totalOrders > 0 ? (ordersWithFees / totalOrders) * 100 : 0;
    
    return {
      totalOrders,
      ordersWithFees,
      ordersWithoutFees,
      deliveredOrders,
      cancelledOrders,
      returnedOrders,
      shippedOrders,
      pendingOrders,
      totalRevenue,
      totalFees,
      netAmount,
      averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      returnRate: totalOrders > 0 ? (returnedOrders / totalOrders) * 100 : 0,
      cancellationRate: totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0,
      deliveryRate: totalOrders > 0 ? (deliveredOrders / totalOrders) * 100 : 0,
      averageFeePercentage: totalRevenue > 0 ? (totalFees / totalRevenue) * 100 : 0,
      profitMargin: totalRevenue > 0 ? (netAmount / totalRevenue) * 100 : 0,
      feesCoverage
    };
  };

  const calculateStatusBreakdown = (orders: OrderDetail[]): StatusBreakdown[] => {
    const statusMap = new Map();
    
    orders.forEach(order => {
      const status = order.item_status || 'unknown';
      if (!statusMap.has(status)) {
        statusMap.set(status, {
          status,
          count: 0,
          totalRevenue: 0,
          totalFees: 0,
          netAmount: 0,
          feesFound: 0
        });
      }
      const statusData = statusMap.get(status);
      statusData.count++;
      statusData.totalRevenue += order.invoice_price || 0;
      statusData.totalFees += order.total_fees;
      statusData.netAmount += order.net_amount;
      if (order.fees_found) statusData.feesFound++;
    });

    return Array.from(statusMap.values()).map(item => ({
      ...item,
      percentage: orders.length > 0 ? (item.count / orders.length) * 100 : 0,
      avgOrderValue: item.count > 0 ? item.totalRevenue / item.count : 0,
      feesCoverage: item.count > 0 ? (item.feesFound / item.count) * 100 : 0
    })).sort((a, b) => b.count - a.count);
  };

  const calculateFeeBreakdown = (orders: OrderDetail[]): FeeBreakdown[] => {
    const feeTypes = [
      { key: 'referral', name: 'Referral Fees', desc: 'Commission on sales' },
      { key: 'shipping', name: 'Shipping Fees', desc: 'Delivery charges' },
      { key: 'outbound_fbn', name: 'FBN Outbound', desc: 'Fulfillment by Noon' },
      { key: 'weight_handling', name: 'Weight Handling', desc: 'Weight-based fees' },
      { key: 'crossdock', name: 'Crossdock', desc: 'Warehouse processing' },
      { key: 'directship_outbound', name: 'Direct Ship', desc: 'Direct shipping fees' },
      { key: 'damaged_return', name: 'Damaged Return', desc: 'Product damage fees' },
      { key: 'noon_penalty', name: 'Penalties', desc: 'Various penalty fees' },
      { key: 'item_cancellation', name: 'Cancellation', desc: 'Order cancellation fees' },
      { key: 'warranty_penalty', name: 'Warranty Penalty', desc: 'Warranty-related fees' },
      { key: 'retention_penalty', name: 'Retention Penalty', desc: 'Payment retention fees' },
      { key: 'alternate_seller_fulfillment', name: 'Alt. Fulfillment', desc: 'Alternative fulfillment fees' },
      { key: 'miscellaneous', name: 'Miscellaneous', desc: 'Other fees' },
      { key: 'direct_collection', name: 'Direct Collection', desc: 'Collection fees' },
      { key: 'reinvoicing', name: 'Reinvoicing', desc: 'Invoice adjustment fees' },
      { key: 'noon_promo', name: 'Noon Promo', desc: 'Promotion fees' },
      { key: 'noon_markup', name: 'Noon Markup', desc: 'Platform markup fees' }
    ];

    const totalFees = orders.reduce((sum, order) => sum + order.total_fees, 0);

    return feeTypes.map(feeType => {
      const ordersWithThisFee = orders.filter(order => order.fee_breakdown[feeType.key] > 0);
      const amount = orders.reduce((sum, order) => 
        sum + (order.fee_breakdown[feeType.key] || 0), 0);
      
      return {
        feeType: feeType.name,
        amount,
        percentage: totalFees > 0 ? (amount / totalFees) * 100 : 0,
        ordersAffected: ordersWithThisFee.length,
        avgPerAffectedOrder: ordersWithThisFee.length > 0 ? amount / ordersWithThisFee.length : 0,
        description: feeType.desc
      };
    }).filter(item => item.amount > 0).sort((a, b) => b.amount - a.amount);
  };

  const exportData = (type: string) => {
    let data: any[] = [];
    let filename = "";

    switch (type) {
      case 'overview':
        data = [analysis];
        filename = `order_analysis_overview_${selectedCountry}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
        break;
      case 'orders':
        data = filteredOrders.map(order => ({
          ...order,
          fee_breakdown: JSON.stringify(order.fee_breakdown)
        }));
        filename = `order_details_${selectedCountry}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
        break;
      case 'status':
        data = statusBreakdown;
        filename = `status_breakdown_${selectedCountry}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
        break;
      case 'fees':
        data = feeBreakdown;
        filename = `fee_breakdown_${selectedCountry}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
        break;
    }

    if (data.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);

    toast.success(`${type} data exported successfully`);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'delivered':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'cancelled':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'returned':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'shipped':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'pending':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getStatusIcon = (status: string, hasFees: boolean) => {
    const baseIcon = (() => {
      switch (status?.toLowerCase()) {
        case 'delivered':
          return <CheckCircle className="h-3 w-3" />;
        case 'cancelled':
          return <XCircle className="h-3 w-3" />;
        case 'returned':
          return <RefreshCw className="h-3 w-3" />;
        case 'shipped':
          return <Package className="h-3 w-3" />;
        case 'pending':
          return <Clock className="h-3 w-3" />;
        default:
          return <AlertCircle className="h-3 w-3" />;
      }
    })();

    return (
      <div className="flex items-center gap-1">
        {baseIcon}
        {hasFees && <Calculator className="h-2 w-2 text-green-600" />}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center justify-center py-24">
            <div className="relative">
              <div className="animate-spin rounded-full h-24 w-24 border-4 border-slate-200 border-t-blue-600"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Calculator className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            <h3 className="mt-6 text-xl font-semibold text-slate-800">Processing Invoice & Credit Analysis</h3>
            <p className="mt-2 text-slate-600">Matching invoice/credit data with fee records...</p>
            <div className="mt-4 flex gap-2">
              <div className="h-2 w-2 bg-blue-600 rounded-full animate-bounce"></div>
              <div className="h-2 w-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
              <div className="h-2 w-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Enhanced Header */}
        <div className="text-center space-y-4 py-8">
          <div className="inline-flex items-center gap-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-2xl shadow-lg">
            <Target className="h-6 w-6" />
            <h1 className="text-2xl font-bold">Invoice & Credit Fee Analysis</h1>
          </div>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Comprehensive analysis matching invoice/credit note orders with their corresponding fee calculations for {selectedCountry}
          </p>
        </div>

        {/* Clean Filter Controls */}
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-slate-800">
              <Filter className="h-5 w-5 text-blue-600" />
              Analysis Controls
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Store</label>
                <Select value={selectedStore} onValueChange={setSelectedStore}>
                  <SelectTrigger className="border-slate-200">
                    <SelectValue placeholder="All Stores" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stores</SelectItem>
                    {stores.map((store) => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Status</label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="border-slate-200">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {uniqueStatuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Fees Status</label>
                <Select value={feesFilter} onValueChange={setFeesFilter}>
                  <SelectTrigger className="border-slate-200">
                    <SelectValue placeholder="All Orders" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Orders</SelectItem>
                    <SelectItem value="with-fees">With Fees Data</SelectItem>
                    <SelectItem value="without-fees">Missing Fees Data</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="SKU, Order #, Product..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 border-slate-200"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Actions</label>
                <Button onClick={loadOrderAnalysis} className="w-full bg-blue-600 hover:bg-blue-700">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 mt-6 pt-4 border-t border-slate-200">
              <Badge variant="outline" className="flex items-center gap-2 px-3 py-1.5">
                <Package className="h-3 w-3 text-blue-600" />
                <span className="font-medium">{analysis.totalOrders.toLocaleString()}</span>
                <span className="text-slate-500">Total Orders</span>
              </Badge>
              <Badge variant="outline" className="flex items-center gap-2 px-3 py-1.5">
                <CheckCircle className="h-3 w-3 text-green-600" />
                <span className="font-medium">{analysis.ordersWithFees.toLocaleString()}</span>
                <span className="text-slate-500">With Fees</span>
              </Badge>
              <Badge variant="outline" className="flex items-center gap-2 px-3 py-1.5">
                <AlertTriangle className="h-3 w-3 text-orange-600" />
                <span className="font-medium">{analysis.ordersWithoutFees.toLocaleString()}</span>
                <span className="text-slate-500">Missing Fees</span>
              </Badge>
              <Badge variant="outline" className="flex items-center gap-2 px-3 py-1.5">
                <Eye className="h-3 w-3 text-purple-600" />
                <span className="font-medium">{filteredOrders.length.toLocaleString()}</span>
                <span className="text-slate-500">Filtered</span>
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-50 to-blue-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-600/10 rounded-full -translate-y-12 translate-x-12"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-900">Total Revenue</CardTitle>
              <DollarSign className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-900 mb-2">{formatCurrency(analysis.totalRevenue)}</div>
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="text-blue-700">AOV: {formatCurrency(analysis.averageOrderValue)}</span>
              </div>
              <p className="text-xs text-blue-600 mt-2">
                {formatPercentage(analysis.feesCoverage)} orders have fee data
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0 bg-gradient-to-br from-emerald-50 to-emerald-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-600/10 rounded-full -translate-y-12 translate-x-12"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-emerald-900">Net Profit</CardTitle>
              <Target className="h-5 w-5 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-900 mb-2">{formatCurrency(analysis.netAmount)}</div>
              <div className="flex items-center gap-2 text-sm">
                <Zap className="h-4 w-4 text-emerald-600" />
                <span className="text-emerald-700">Margin: {formatPercentage(analysis.profitMargin)}</span>
              </div>
              <p className="text-xs text-emerald-600 mt-2">
                After all calculated fees
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0 bg-gradient-to-br from-red-50 to-red-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-red-600/10 rounded-full -translate-y-12 translate-x-12"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-red-900">Total Fees</CardTitle>
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-900 mb-2">{formatCurrency(analysis.totalFees)}</div>
              <div className="flex items-center gap-2 text-sm">
                <TrendingDown className="h-4 w-4 text-red-600" />
                <span className="text-red-700">{formatPercentage(analysis.averageFeePercentage)} of revenue</span>
              </div>
              <p className="text-xs text-red-600 mt-2">
                Based on {analysis.ordersWithFees} orders with fee data
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0 bg-gradient-to-br from-purple-50 to-purple-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-600/10 rounded-full -translate-y-12 translate-x-12"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-900">Order Performance</CardTitle>
              <Award className="h-5 w-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-900 mb-2">{formatPercentage(analysis.deliveryRate)}</div>
              <div className="flex items-center gap-2 text-sm">
                <Package className="h-4 w-4 text-purple-600" />
                <span className="text-purple-700">Delivery Rate</span>
              </div>
              <p className="text-xs text-purple-600 mt-2">
                {analysis.deliveredOrders} of {analysis.totalOrders} orders delivered
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Clean Analytics Tabs */}
        <Tabs defaultValue="orders" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-slate-100 p-1 rounded-lg">
            <TabsTrigger value="orders" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <FileText className="h-4 w-4 mr-2" />
              Order Details
            </TabsTrigger>
            <TabsTrigger value="status" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Package className="h-4 w-4 mr-2" />
              Status Analysis
            </TabsTrigger>
            <TabsTrigger value="fees" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Calculator className="h-4 w-4 mr-2" />
              Fee Breakdown
            </TabsTrigger>
            <TabsTrigger value="exports" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders">
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    Order Details
                  </span>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Show:</span>
                      <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
                        <SelectTrigger className="w-24 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="25">25</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                          <SelectItem value="250">250</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Badge variant="outline" className="text-sm">
                      {filteredOrders.length.toLocaleString()} orders
                    </Badge>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-slate-200 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="font-semibold">Order ID</TableHead>
                        <TableHead className="font-semibold">SKU</TableHead>
                        <TableHead className="font-semibold">Product</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                        <TableHead className="font-semibold text-right">Revenue</TableHead>
                        <TableHead className="font-semibold text-right">Fees</TableHead>
                        <TableHead className="font-semibold text-right">Net Amount</TableHead>
                        <TableHead className="font-semibold text-center">Fee Coverage</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedOrders.map((order, index) => (
                        <TableRow key={index} className="hover:bg-slate-50/50">
                          <TableCell className="font-mono text-xs">{order.item_nr}</TableCell>
                          <TableCell className="font-mono text-xs">{order.sku || 'N/A'}</TableCell>
                          <TableCell className="max-w-48 truncate" title={order.product_title}>
                            {order.product_title || 'N/A'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`${order.status_color} border text-xs`}>
                              {getStatusIcon(order.item_status || '', order.fees_found)}
                              <span className="ml-1">{order.item_status}</span>
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(order.invoice_price || 0)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-red-600">
                            {order.fees_found ? formatCurrency(order.total_fees) : 'N/A'}
                          </TableCell>
                          <TableCell className={`text-right font-mono ${order.net_amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {order.fees_found ? formatCurrency(order.net_amount) : 'N/A'}
                          </TableCell>
                          <TableCell className="text-center">
                            {order.fees_found ? (
                              <CheckCircle className="h-4 w-4 text-green-600 mx-auto" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-500 mx-auto" />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                
                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      Showing {startIndex + 1} to {Math.min(endIndex, filteredOrders.length)} of {filteredOrders.length} results
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="h-8 px-3"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          
                          return (
                            <Button
                              key={pageNum}
                              variant={currentPage === pageNum ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(pageNum)}
                              className="h-8 w-8 p-0"
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                        
                        {totalPages > 5 && currentPage < totalPages - 2 && (
                          <>
                            <span className="text-muted-foreground px-2">...</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage(totalPages)}
                              className="h-8 w-8 p-0"
                            >
                              {totalPages}
                            </Button>
                          </>
                        )}
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="h-8 px-3"
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="status">
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-blue-600" />
                  Status Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-slate-200 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="font-semibold">Status</TableHead>
                        <TableHead className="font-semibold text-right">Count</TableHead>
                        <TableHead className="font-semibold text-right">Percentage</TableHead>
                        <TableHead className="font-semibold text-right">Revenue</TableHead>
                        <TableHead className="font-semibold text-right">Fees</TableHead>
                        <TableHead className="font-semibold text-right">Net Amount</TableHead>
                        <TableHead className="font-semibold text-center">Fee Coverage</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {statusBreakdown.map((item, index) => (
                        <TableRow key={index} className="hover:bg-slate-50/50">
                          <TableCell>
                            <Badge variant="outline" className={`${getStatusColor(item.status)} border`}>
                              {getStatusIcon(item.status, false)}
                              <span className="ml-1">{item.status}</span>
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono">{item.count.toLocaleString()}</TableCell>
                          <TableCell className="text-right">{formatPercentage(item.percentage)}</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(item.totalRevenue)}</TableCell>
                          <TableCell className="text-right font-mono text-red-600">{formatCurrency(item.totalFees)}</TableCell>
                          <TableCell className={`text-right font-mono ${item.netAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(item.netAmount)}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-2">
                              <span className="text-sm">{formatPercentage(item.feesCoverage)}</span>
                              <span className="text-xs text-slate-500">({item.feesFound}/{item.count})</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fees">
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-blue-600" />
                  Fee Breakdown Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-slate-200 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="font-semibold">Fee Type</TableHead>
                        <TableHead className="font-semibold">Description</TableHead>
                        <TableHead className="font-semibold text-right">Total Amount</TableHead>
                        <TableHead className="font-semibold text-right">% of Total</TableHead>
                        <TableHead className="font-semibold text-right">Orders Affected</TableHead>
                        <TableHead className="font-semibold text-right">Avg per Order</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {feeBreakdown.map((item, index) => (
                        <TableRow key={index} className="hover:bg-slate-50/50">
                          <TableCell className="font-medium">{item.feeType}</TableCell>
                          <TableCell className="text-sm text-slate-600">{item.description}</TableCell>
                          <TableCell className="text-right font-mono text-red-600">{formatCurrency(item.amount)}</TableCell>
                          <TableCell className="text-right">{formatPercentage(item.percentage)}</TableCell>
                          <TableCell className="text-right font-mono">{item.ordersAffected}</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(item.avgPerAffectedOrder)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="exports">
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5 text-blue-600" />
                  Export Analysis Data
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Button 
                    onClick={() => exportData('overview')} 
                    variant="outline" 
                    className="flex flex-col items-center gap-3 h-24 hover:bg-blue-50 border-blue-200"
                  >
                    <Target className="h-8 w-8 text-blue-600" />
                    <span className="text-sm font-medium">Overview Summary</span>
                  </Button>
                  <Button 
                    onClick={() => exportData('orders')} 
                    variant="outline" 
                    className="flex flex-col items-center gap-3 h-24 hover:bg-emerald-50 border-emerald-200"
                  >
                    <FileText className="h-8 w-8 text-emerald-600" />
                    <span className="text-sm font-medium">Order Details</span>
                  </Button>
                  <Button 
                    onClick={() => exportData('status')} 
                    variant="outline" 
                    className="flex flex-col items-center gap-3 h-24 hover:bg-purple-50 border-purple-200"
                  >
                    <Package className="h-8 w-8 text-purple-600" />
                    <span className="text-sm font-medium">Status Breakdown</span>
                  </Button>
                  <Button 
                    onClick={() => exportData('fees')} 
                    variant="outline" 
                    className="flex flex-col items-center gap-3 h-24 hover:bg-orange-50 border-orange-200"
                  >
                    <Calculator className="h-8 w-8 text-orange-600" />
                    <span className="text-sm font-medium">Fee Analysis</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}