import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
// import { DateRangePicker } from "@/components/ui/date-range-picker";
import { 
  Download, TrendingUp, TrendingDown, Package, DollarSign, AlertTriangle, 
  Search, Filter, Calendar, BarChart3, PieChart, LineChart, 
  Package2, ShoppingCart, RefreshCw, AlertCircle, CheckCircle,
  Clock, XCircle, ArrowUpDown, Eye, FileText
} from "lucide-react";
import { useCountry } from "@/contexts/CountryContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart as RechartsPieChart, Cell, LineChart as RechartsLineChart, Line,
  ComposedChart, Area, AreaChart
} from "recharts";
import { format, parseISO, startOfMonth, endOfMonth, subMonths } from "date-fns";

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe', '#00c49f', '#ffbb28', '#ff8042'];

interface OrderAnalysis {
  totalOrders: number;
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
}

interface OrderDetail {
  order_nr: string;
  item_nr?: string;
  sku?: string;
  product_title?: string;
  item_status?: string;
  ordered_date?: string;
  shipped_date?: string;
  delivered_date?: string;
  cancelled_date?: string;
  returned_date?: string;
  invoice_price?: number;
  total_fees: number;
  net_amount: number;
  fulfillment_mode?: string;
  family?: string;
  brand?: string;
  fee_breakdown: {[key: string]: number};
  days_to_deliver?: number;
  profit_margin?: number;
}

interface StatusBreakdown {
  status: string;
  count: number;
  percentage: number;
  totalRevenue: number;
  totalFees: number;
  netAmount: number;
  avgOrderValue: number;
  avgFeePercentage: number;
}

interface FeeBreakdown {
  feeType: string;
  amount: number;
  percentage: number;
  avgPerOrder: number;
  description: string;
}

interface TimelineData {
  month: string;
  orders: number;
  revenue: number;
  fees: number;
  netAmount: number;
  delivered: number;
  cancelled: number;
  returned: number;
}

interface TopPerformer {
  sku: string;
  product_title: string;
  orders: number;
  revenue: number;
  fees: number;
  netAmount: number;
  margin: number;
  avgOrderValue: number;
}

export default function NoonOrderAnalysis() {
  const { selectedCountry } = useCountry();
  const [loading, setLoading] = useState(true);
  const [selectedStore, setSelectedStore] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<{from: Date | undefined, to: Date | undefined}>({
    from: subMonths(new Date(), 3),
    to: new Date()
  });
  const [stores, setStores] = useState<Array<{ id: string; name: string }>>([]);
  
  const [analysis, setAnalysis] = useState<OrderAnalysis>({
    totalOrders: 0,
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
    profitMargin: 0
  });

  const [orderDetails, setOrderDetails] = useState<OrderDetail[]>([]);
  const [statusBreakdown, setStatusBreakdown] = useState<StatusBreakdown[]>([]);
  const [feeBreakdown, setFeeBreakdown] = useState<FeeBreakdown[]>([]);
  const [timelineData, setTimelineData] = useState<TimelineData[]>([]);
  const [topPerformers, setTopPerformers] = useState<TopPerformer[]>([]);

  // Filtered data based on search and filters
  const filteredOrders = useMemo(() => {
    return orderDetails.filter(order => {
      const matchesSearch = !searchTerm || 
        order.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.product_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.order_nr?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = selectedStatus === "all" || order.item_status === selectedStatus;
      
      return matchesSearch && matchesStatus;
    });
  }, [orderDetails, searchTerm, selectedStatus]);

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

      // Build query conditions with date range
      let salesQuery = supabase
        .from('noon_sales_data')
        .select('*')
        .eq('country_code', selectedCountry);

      let feesQuery = supabase
        .from('noon_order_fees')
        .select('*')
        .eq('country_code', selectedCountry);

      if (selectedStore !== "all") {
        salesQuery = salesQuery.eq('store_id', selectedStore);
        feesQuery = feesQuery.eq('store_id', selectedStore);
      }

      if (dateRange.from) {
        salesQuery = salesQuery.gte('ordered_date', dateRange.from.toISOString());
        feesQuery = feesQuery.gte('ordered_date', dateRange.from.toISOString());
      }

      if (dateRange.to) {
        salesQuery = salesQuery.lte('ordered_date', dateRange.to.toISOString());
        feesQuery = feesQuery.lte('ordered_date', dateRange.to.toISOString());
      }

      // Fetch all data in batches
      const [salesData, feesData] = await Promise.all([
        fetchAllData(salesQuery),
        fetchAllData(feesQuery)
      ]);

      console.log(`Loaded ${salesData.length} sales records and ${feesData.length} fees records`);

      // Create comprehensive order matching maps
      const feesMap = new Map();
      const feesMapByOrder = new Map();
      
      feesData.forEach(fee => {
        // Map by order number and item number combination
        const key1 = `${fee.order_nr}`;
        const key2 = `${fee.order_nr}-${fee.item_nr}`;
        
        if (!feesMapByOrder.has(key1)) {
          feesMapByOrder.set(key1, []);
        }
        feesMapByOrder.get(key1).push(fee);
        
        feesMap.set(key2, fee);
      });

      // Process orders with improved matching
      const combinedOrders: OrderDetail[] = [];
      const processedOrders = new Set();

      // First, process sales data
      salesData.forEach(sale => {
        const orderKey = `${sale.item_nr}`;
        
        if (processedOrders.has(orderKey)) return;
        processedOrders.add(orderKey);

        // Try to find matching fee data
        let feeData = feesMap.get(`${sale.item_nr}-${sale.item_nr}`);
        
        // If not found, try alternative matching
        if (!feeData) {
          const orderFees = feesMapByOrder.get(sale.item_nr);
          if (orderFees && orderFees.length > 0) {
            feeData = orderFees[0]; // Take first match
          }
        }

        const order = createOrderDetail(sale, feeData);
        if (order) combinedOrders.push(order);
      });

      // Then, process fees data that don't have corresponding sales data
      feesData.forEach(fee => {
        const orderKey = `${fee.order_nr}`;
        
        if (processedOrders.has(orderKey)) return;
        processedOrders.add(orderKey);

        const order = createOrderDetail(null, fee);
        if (order) combinedOrders.push(order);
      });

      console.log(`Created ${combinedOrders.length} combined order records`);

      // Calculate comprehensive metrics
      const metrics = calculateMetrics(combinedOrders);
      const statusData = calculateStatusBreakdown(combinedOrders);
      const feeData = calculateFeeBreakdown(combinedOrders);
      const timeline = calculateTimelineData(combinedOrders);
      const performers = calculateTopPerformers(combinedOrders);

      setAnalysis(metrics);
      setOrderDetails(combinedOrders);
      setStatusBreakdown(statusData);
      setFeeBreakdown(feeData);
      setTimelineData(timeline);
      setTopPerformers(performers);

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

  const createOrderDetail = (sale: any, fee: any): OrderDetail | null => {
    // Use fee data as primary source, sales as secondary
    const primaryData = fee || sale;
    if (!primaryData) return null;

    const feeBreakdown = fee ? {
      referral: fee.fee_referral || 0,
      shipping: fee.fee_shipping || 0,
      outbound_fbn: fee.fee_outbound_fbn || 0,
      weight_handling: fee.fee_weight_handling || 0,
      crossdock: fee.fee_crossdock || 0,
      directship_outbound: fee.fee_directship_outbound || 0,
      damaged_return: fee.fee_damaged_return || 0,
      noon_penalty: fee.fee_noon_penalty || 0,
      item_cancellation: fee.fee_item_cancellation || 0,
      warranty_penalty: fee.fee_warranty_penalty || 0,
      retention_penalty: fee.fee_retention_penalty || 0,
      alternate_seller_fulfillment: fee.fee_alternate_seller_fulfillment || 0,
      miscellaneous: fee.fee_miscellaneous || 0,
      direct_collection: fee.fee_direct_collection || 0,
      reinvoicing: fee.fee_reinvoicing || 0,
      noon_promo: fee.fee_noon_promo || 0,
      noon_markup: fee.fee_noon_markup || 0
    } : {};

    const totalFees = Object.values(feeBreakdown).reduce((sum: number, fee: any) => sum + (fee || 0), 0);
    const invoicePrice = fee?.invoice_price || sale?.invoice_price || 0;
    const netAmount = invoicePrice - totalFees;

    const orderedDate = primaryData.ordered_date;
    const deliveredDate = primaryData.delivered_date || sale?.delivered_date;
    const daysToDeliver = orderedDate && deliveredDate ? 
      calculateDaysBetween(orderedDate, deliveredDate) : null;

    return {
      order_nr: primaryData.order_nr || primaryData.item_nr || '',
      item_nr: primaryData.item_nr || sale?.item_nr,
      sku: primaryData.sku || sale?.sku,
      product_title: primaryData.product_title || sale?.title_en || sale?.title_ar,
      item_status: primaryData.item_status || sale?.item_status || 'unknown',
      ordered_date: orderedDate,
      shipped_date: primaryData.shipped_date || sale?.shipped_date,
      delivered_date: deliveredDate,
      cancelled_date: primaryData.cancelled_date || sale?.cancelled_date,
      returned_date: primaryData.returned_date || sale?.returned_date,
      invoice_price: invoicePrice,
      total_fees: totalFees,
      net_amount: netAmount,
      fulfillment_mode: fee?.fulfillment_mode || 'Unknown',
      family: fee?.family || sale?.family,
      brand: fee?.brand || sale?.brand_en || sale?.brand_ar,
      fee_breakdown: feeBreakdown,
      days_to_deliver: daysToDeliver,
      profit_margin: invoicePrice > 0 ? (netAmount / invoicePrice) * 100 : 0
    };
  };

  const calculateMetrics = (orders: OrderDetail[]): OrderAnalysis => {
    const totalOrders = orders.length;
    if (totalOrders === 0) return analysis;

    const deliveredOrders = orders.filter(o => o.item_status === 'delivered').length;
    const cancelledOrders = orders.filter(o => o.item_status === 'cancelled').length;
    const returnedOrders = orders.filter(o => o.item_status === 'returned').length;
    const shippedOrders = orders.filter(o => o.item_status === 'shipped').length;
    const pendingOrders = orders.filter(o => !['delivered', 'cancelled', 'returned', 'shipped'].includes(o.item_status || '')).length;
    
    const totalRevenue = orders.reduce((sum, o) => sum + (o.invoice_price || 0), 0);
    const totalFees = orders.reduce((sum, o) => sum + o.total_fees, 0);
    const netAmount = totalRevenue - totalFees;
    
    return {
      totalOrders,
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
      profitMargin: totalRevenue > 0 ? (netAmount / totalRevenue) * 100 : 0
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
          netAmount: 0
        });
      }
      const statusData = statusMap.get(status);
      statusData.count++;
      statusData.totalRevenue += order.invoice_price || 0;
      statusData.totalFees += order.total_fees;
      statusData.netAmount += order.net_amount;
    });

    return Array.from(statusMap.values()).map(item => ({
      ...item,
      percentage: orders.length > 0 ? (item.count / orders.length) * 100 : 0,
      avgOrderValue: item.count > 0 ? item.totalRevenue / item.count : 0,
      avgFeePercentage: item.totalRevenue > 0 ? (item.totalFees / item.totalRevenue) * 100 : 0
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
    const totalOrders = orders.length;

    return feeTypes.map(feeType => {
      const amount = orders.reduce((sum, order) => 
        sum + (order.fee_breakdown[feeType.key] || 0), 0);
      
      return {
        feeType: feeType.name,
        amount,
        percentage: totalFees > 0 ? (amount / totalFees) * 100 : 0,
        avgPerOrder: totalOrders > 0 ? amount / totalOrders : 0,
        description: feeType.desc
      };
    }).filter(item => item.amount > 0).sort((a, b) => b.amount - a.amount);
  };

  const calculateTimelineData = (orders: OrderDetail[]): TimelineData[] => {
    const monthMap = new Map();
    
    orders.forEach(order => {
      if (!order.ordered_date) return;
      
      const month = format(new Date(order.ordered_date), 'yyyy-MM');
      if (!monthMap.has(month)) {
        monthMap.set(month, {
          month,
          orders: 0,
          revenue: 0,
          fees: 0,
          netAmount: 0,
          delivered: 0,
          cancelled: 0,
          returned: 0
        });
      }
      
      const data = monthMap.get(month);
      data.orders++;
      data.revenue += order.invoice_price || 0;
      data.fees += order.total_fees;
      data.netAmount += order.net_amount;
      
      switch(order.item_status) {
        case 'delivered': data.delivered++; break;
        case 'cancelled': data.cancelled++; break;
        case 'returned': data.returned++; break;
      }
    });

    return Array.from(monthMap.values()).sort((a, b) => a.month.localeCompare(b.month));
  };

  const calculateTopPerformers = (orders: OrderDetail[]): TopPerformer[] => {
    const skuMap = new Map();
    
    orders.forEach(order => {
      if (!order.sku) return;
      
      if (!skuMap.has(order.sku)) {
        skuMap.set(order.sku, {
          sku: order.sku,
          product_title: order.product_title || '',
          orders: 0,
          revenue: 0,
          fees: 0,
          netAmount: 0
        });
      }
      
      const data = skuMap.get(order.sku);
      data.orders++;
      data.revenue += order.invoice_price || 0;
      data.fees += order.total_fees;
      data.netAmount += order.net_amount;
    });

    return Array.from(skuMap.values())
      .map(item => ({
        ...item,
        margin: item.revenue > 0 ? (item.netAmount / item.revenue) * 100 : 0,
        avgOrderValue: item.orders > 0 ? item.revenue / item.orders : 0
      }))
      .sort((a, b) => b.netAmount - a.netAmount)
      .slice(0, 20);
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
      case 'timeline':
        data = timelineData;
        filename = `timeline_data_${selectedCountry}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
        break;
      case 'performers':
        data = topPerformers;
        filename = `top_performers_${selectedCountry}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
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
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'returned':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'shipped':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
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
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-lg text-slate-600">Loading comprehensive order analysis...</p>
            <p className="text-sm text-slate-500 mt-2">Processing sales data and fee records...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Advanced Noon Order Analysis
          </h1>
          <p className="text-lg text-slate-600">
            Deep insights into order performance, fee optimization, and revenue analytics
          </p>
        </div>

        {/* Advanced Filters */}
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Advanced Filters & Controls
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Store</label>
                <Select value={selectedStore} onValueChange={setSelectedStore}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select store" />
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
                <label className="text-sm font-medium">Status</label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
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
                <label className="text-sm font-medium">Search Orders</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="SKU, Order #, Product..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Date Range</label>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : ''}
                    onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value ? new Date(e.target.value) : undefined }))}
                    className="w-32"
                  />
                  <Input
                    type="date"
                    value={dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : ''}
                    onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value ? new Date(e.target.value) : undefined }))}
                    className="w-32"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-4">
              <Button onClick={loadOrderAnalysis} className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Refresh Analysis
              </Button>
              <Badge variant="outline" className="flex items-center gap-1">
                <Package2 className="h-3 w-3" />
                {analysis.totalOrders.toLocaleString()} Total Orders
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {filteredOrders.length.toLocaleString()} Filtered
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analysis.totalOrders.toLocaleString()}</div>
              <div className="flex flex-wrap gap-1 mt-2">
                <Badge className="bg-green-100 text-green-800 text-xs">
                  {analysis.deliveredOrders} Delivered
                </Badge>
                <Badge className="bg-blue-100 text-blue-800 text-xs">
                  {analysis.shippedOrders} Shipped
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {formatPercentage(analysis.deliveryRate)} delivery rate
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(analysis.totalRevenue)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                AOV: {formatCurrency(analysis.averageOrderValue)}
              </p>
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp className="h-3 w-3 text-green-500" />
                <span className="text-xs text-green-600">
                  {formatPercentage(analysis.profitMargin)} margin
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Fees</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{formatCurrency(analysis.totalFees)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {formatPercentage(analysis.averageFeePercentage)} of revenue
              </p>
              <div className="flex items-center gap-1 mt-2">
                <TrendingDown className="h-3 w-3 text-red-500" />
                <span className="text-xs text-red-600">
                  {formatCurrency(analysis.totalFees / analysis.totalOrders)} avg/order
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(analysis.netAmount)}</div>
              <div className="flex flex-wrap gap-1 mt-2">
                <Badge variant="outline" className="text-xs">
                  {formatPercentage(analysis.returnRate)} Return
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {formatPercentage(analysis.cancellationRate)} Cancel
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                After all fees and charges
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Advanced Analytics Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview" className="flex items-center gap-1">
              <BarChart3 className="h-3 w-3" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="timeline" className="flex items-center gap-1">
              <LineChart className="h-3 w-3" />
              Timeline
            </TabsTrigger>
            <TabsTrigger value="status" className="flex items-center gap-1">
              <PieChart className="h-3 w-3" />
              Status
            </TabsTrigger>
            <TabsTrigger value="fees" className="flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              Fees
            </TabsTrigger>
            <TabsTrigger value="performers" className="flex items-center gap-1">
              <Package2 className="h-3 w-3" />
              Top SKUs
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              Orders
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Order Status Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Tooltip formatter={(value, name) => [value, name]} />
                      <Legend />
                      <RechartsPieChart data={statusBreakdown.map(item => ({
                        name: item.status,
                        value: item.count
                      }))}>
                        {statusBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </RechartsPieChart>
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Revenue vs Fees Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={statusBreakdown}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="status" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      <Legend />
                      <Bar dataKey="totalRevenue" fill="#8884d8" name="Revenue" />
                      <Bar dataKey="totalFees" fill="#ff7300" name="Fees" />
                      <Bar dataKey="netAmount" fill="#82ca9d" name="Net Amount" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="timeline">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Performance Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <ComposedChart data={timelineData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip formatter={(value, name) => {
                      if (name === 'Revenue' || name === 'Fees' || name === 'Net Amount') {
                        return formatCurrency(Number(value));
                      }
                      return [value, name];
                    }} />
                    <Legend />
                    <Area yAxisId="left" type="monotone" dataKey="orders" fill="#8884d8" fillOpacity={0.3} name="Orders" />
                    <Bar yAxisId="right" dataKey="revenue" fill="#82ca9d" name="Revenue" />
                    <Bar yAxisId="right" dataKey="fees" fill="#ff7300" name="Fees" />
                    <Line yAxisId="right" type="monotone" dataKey="netAmount" stroke="#ffc658" strokeWidth={3} name="Net Amount" />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="status">
            <Card>
              <CardHeader>
                <CardTitle>Detailed Status Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Count</TableHead>
                      <TableHead>Percentage</TableHead>
                      <TableHead>Avg Order Value</TableHead>
                      <TableHead>Total Revenue</TableHead>
                      <TableHead>Total Fees</TableHead>
                      <TableHead>Fee %</TableHead>
                      <TableHead>Net Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {statusBreakdown.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Badge className={getStatusColor(item.status)} variant="outline">
                            <div className="flex items-center gap-1">
                              {getStatusIcon(item.status)}
                              {item.status}
                            </div>
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono">{item.count.toLocaleString()}</TableCell>
                        <TableCell>{formatPercentage(item.percentage)}</TableCell>
                        <TableCell>{formatCurrency(item.avgOrderValue)}</TableCell>
                        <TableCell>{formatCurrency(item.totalRevenue)}</TableCell>
                        <TableCell className="text-red-600">{formatCurrency(item.totalFees)}</TableCell>
                        <TableCell>{formatPercentage(item.avgFeePercentage)}</TableCell>
                        <TableCell className={item.netAmount >= 0 ? "text-green-600" : "text-red-600"}>
                          {formatCurrency(item.netAmount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fees">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Fee Structure Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={feeBreakdown.slice(0, 10)} layout="horizontal">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="feeType" type="category" width={120} />
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      <Bar dataKey="amount" fill="#ff7300" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Detailed Fee Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fee Type</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Total Amount</TableHead>
                        <TableHead>% of Total Fees</TableHead>
                        <TableHead>Avg per Order</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {feeBreakdown.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{item.feeType}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{item.description}</TableCell>
                          <TableCell className="text-red-600 font-mono">{formatCurrency(item.amount)}</TableCell>
                          <TableCell>{formatPercentage(item.percentage)}</TableCell>
                          <TableCell className="font-mono">{formatCurrency(item.avgPerOrder)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="performers">
            <Card>
              <CardHeader>
                <CardTitle>Top Performing SKUs</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Orders</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>Fees</TableHead>
                      <TableHead>Net Amount</TableHead>
                      <TableHead>Margin %</TableHead>
                      <TableHead>AOV</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topPerformers.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                        <TableCell className="max-w-48 truncate">{item.product_title}</TableCell>
                        <TableCell>{item.orders}</TableCell>
                        <TableCell>{formatCurrency(item.revenue)}</TableCell>
                        <TableCell className="text-red-600">{formatCurrency(item.fees)}</TableCell>
                        <TableCell className={item.netAmount >= 0 ? "text-green-600" : "text-red-600"}>
                          {formatCurrency(item.netAmount)}
                        </TableCell>
                        <TableCell className={item.margin >= 0 ? "text-green-600" : "text-red-600"}>
                          {formatPercentage(item.margin)}
                        </TableCell>
                        <TableCell>{formatCurrency(item.avgOrderValue)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span>Order Details</span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => exportData('orders')}>
                      <Download className="h-4 w-4 mr-1" />
                      Export Orders
                    </Button>
                  </div>
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Showing {filteredOrders.length.toLocaleString()} of {orderDetails.length.toLocaleString()} orders
                </p>
              </CardHeader>
              <CardContent>
                <div className="max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order #</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Revenue</TableHead>
                        <TableHead>Fees</TableHead>
                        <TableHead>Net</TableHead>
                        <TableHead>Margin</TableHead>
                        <TableHead>Days to Deliver</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOrders.slice(0, 100).map((order, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-mono text-xs">{order.order_nr}</TableCell>
                          <TableCell className="font-mono text-xs">{order.sku}</TableCell>
                          <TableCell className="max-w-48 truncate">{order.product_title}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(order.item_status || '')} variant="outline">
                              <div className="flex items-center gap-1">
                                {getStatusIcon(order.item_status || '')}
                                {order.item_status}
                              </div>
                            </Badge>
                          </TableCell>
                          <TableCell>{formatCurrency(order.invoice_price || 0)}</TableCell>
                          <TableCell className="text-red-600">{formatCurrency(order.total_fees)}</TableCell>
                          <TableCell className={order.net_amount >= 0 ? "text-green-600" : "text-red-600"}>
                            {formatCurrency(order.net_amount)}
                          </TableCell>
                          <TableCell className={order.profit_margin && order.profit_margin >= 0 ? "text-green-600" : "text-red-600"}>
                            {order.profit_margin ? formatPercentage(order.profit_margin) : 'N/A'}
                          </TableCell>
                          <TableCell>{order.days_to_deliver || 'N/A'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {filteredOrders.length > 100 && (
                    <p className="text-center py-4 text-sm text-muted-foreground">
                      Showing first 100 orders. Use filters or export to see all {filteredOrders.length.toLocaleString()} orders.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Export Center */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Export Center
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <Button onClick={() => exportData('overview')} variant="outline" className="flex flex-col items-center gap-2 h-20">
                <BarChart3 className="h-6 w-6" />
                <span className="text-xs">Overview</span>
              </Button>
              <Button onClick={() => exportData('timeline')} variant="outline" className="flex flex-col items-center gap-2 h-20">
                <LineChart className="h-6 w-6" />
                <span className="text-xs">Timeline</span>
              </Button>
              <Button onClick={() => exportData('status')} variant="outline" className="flex flex-col items-center gap-2 h-20">
                <PieChart className="h-6 w-6" />
                <span className="text-xs">Status</span>
              </Button>
              <Button onClick={() => exportData('fees')} variant="outline" className="flex flex-col items-center gap-2 h-20">
                <DollarSign className="h-6 w-6" />
                <span className="text-xs">Fees</span>
              </Button>
              <Button onClick={() => exportData('performers')} variant="outline" className="flex flex-col items-center gap-2 h-20">
                <Package2 className="h-6 w-6" />
                <span className="text-xs">Top SKUs</span>
              </Button>
              <Button onClick={() => exportData('orders')} variant="outline" className="flex flex-col items-center gap-2 h-20">
                <FileText className="h-6 w-6" />
                <span className="text-xs">Orders</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}