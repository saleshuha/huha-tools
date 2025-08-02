import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, TrendingUp, TrendingDown, Package, DollarSign, AlertTriangle } from "lucide-react";
import { useCountry } from "@/contexts/CountryContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface OrderAnalysis {
  totalOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  returnedOrders: number;
  totalRevenue: number;
  totalFees: number;
  netAmount: number;
  averageOrderValue: number;
  returnRate: number;
  cancellationRate: number;
}

interface OrderDetail {
  order_nr: string;
  item_nr?: string;
  sku?: string;
  product_title?: string;
  item_status?: string;
  ordered_date?: string;
  delivered_date?: string;
  cancelled_date?: string;
  returned_date?: string;
  invoice_price?: number;
  total_fees: number;
  net_amount: number;
  fulfillment_mode?: string;
  family?: string;
  brand?: string;
}

interface StatusBreakdown {
  status: string;
  count: number;
  percentage: number;
  totalRevenue: number;
  totalFees: number;
  netAmount: number;
}

interface FeeBreakdown {
  feeType: string;
  amount: number;
  percentage: number;
}

export default function NoonOrderAnalysis() {
  const { selectedCountry } = useCountry();
  const [loading, setLoading] = useState(true);
  const [selectedStore, setSelectedStore] = useState<string>("all");
  const [stores, setStores] = useState<Array<{ id: string; name: string }>>([]);
  
  const [analysis, setAnalysis] = useState<OrderAnalysis>({
    totalOrders: 0,
    deliveredOrders: 0,
    cancelledOrders: 0,
    returnedOrders: 0,
    totalRevenue: 0,
    totalFees: 0,
    netAmount: 0,
    averageOrderValue: 0,
    returnRate: 0,
    cancellationRate: 0
  });

  const [orderDetails, setOrderDetails] = useState<OrderDetail[]>([]);
  const [statusBreakdown, setStatusBreakdown] = useState<StatusBreakdown[]>([]);
  const [feeBreakdown, setFeeBreakdown] = useState<FeeBreakdown[]>([]);

  useEffect(() => {
    loadStores();
  }, [selectedCountry]);

  useEffect(() => {
    if (stores.length > 0) {
      loadOrderAnalysis();
    }
  }, [selectedStore, selectedCountry, stores]);

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

  const loadOrderAnalysis = async () => {
    try {
      setLoading(true);

      // Build query conditions
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

      // Fetch all sales data in batches
      const salesData = [];
      let salesOffset = 0;
      const batchSize = 1000;

      while (true) {
        const { data, error } = await salesQuery
          .range(salesOffset, salesOffset + batchSize - 1)
          .order('ordered_date', { ascending: false });

        if (error) throw error;
        if (!data || data.length === 0) break;

        salesData.push(...data);
        if (data.length < batchSize) break;
        salesOffset += batchSize;
      }

      // Fetch all fees data in batches
      const feesData = [];
      let feesOffset = 0;

      while (true) {
        const { data, error } = await feesQuery
          .range(feesOffset, feesOffset + batchSize - 1)
          .order('ordered_date', { ascending: false });

        if (error) throw error;
        if (!data || data.length === 0) break;

        feesData.push(...data);
        if (data.length < batchSize) break;
        feesOffset += batchSize;
      }

      // Create order map from fees data (which contains financial info)
      const orderMap = new Map();
      feesData.forEach(fee => {
        const key = `${fee.order_nr}-${fee.item_nr || ''}`;
        orderMap.set(key, fee);
      });

      // Combine sales data with fees data
      const combinedOrders: OrderDetail[] = [];
      
      salesData.forEach(sale => {
        const key = `${sale.item_nr}-${sale.item_nr || ''}`;
        const feeData = orderMap.get(key) || {};
        
        // Calculate total fees
        const totalFees = (
          (feeData.fee_referral || 0) +
          (feeData.fee_shipping || 0) +
          (feeData.fee_outbound_fbn || 0) +
          (feeData.fee_weight_handling || 0) +
          (feeData.fee_crossdock || 0) +
          (feeData.fee_directship_outbound || 0) +
          (feeData.fee_damaged_return || 0) +
          (feeData.fee_noon_penalty || 0) +
          (feeData.fee_item_cancellation || 0) +
          (feeData.fee_warranty_penalty || 0) +
          (feeData.fee_retention_penalty || 0) +
          (feeData.fee_alternate_seller_fulfillment || 0) +
          (feeData.fee_miscellaneous || 0) +
          (feeData.fee_direct_collection || 0) +
          (feeData.fee_reinvoicing || 0) +
          (feeData.fee_noon_promo || 0) +
          (feeData.fee_noon_markup || 0)
        );

        const invoicePrice = feeData.invoice_price || sale.invoice_price || 0;
        const netAmount = invoicePrice - totalFees;

        combinedOrders.push({
          order_nr: sale.item_nr || '',
          item_nr: sale.item_nr,
          sku: sale.sku,
          product_title: sale.title_en || sale.title_ar,
          item_status: sale.item_status,
          ordered_date: sale.ordered_date,
          delivered_date: sale.delivered_date,
          cancelled_date: sale.cancelled_date,
          returned_date: sale.returned_date,
          invoice_price: invoicePrice,
          total_fees: totalFees,
          net_amount: netAmount,
          fulfillment_mode: feeData.fulfillment_mode || 'Unknown',
          family: sale.family,
          brand: sale.brand_en || sale.brand_ar
        });
      });

      // Calculate analysis metrics
      const totalOrders = combinedOrders.length;
      const deliveredOrders = combinedOrders.filter(o => o.item_status === 'delivered').length;
      const cancelledOrders = combinedOrders.filter(o => o.item_status === 'cancelled').length;
      const returnedOrders = combinedOrders.filter(o => o.item_status === 'returned').length;
      
      const totalRevenue = combinedOrders.reduce((sum, o) => sum + (o.invoice_price || 0), 0);
      const totalFees = combinedOrders.reduce((sum, o) => sum + o.total_fees, 0);
      const netAmount = totalRevenue - totalFees;
      
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
      const returnRate = totalOrders > 0 ? (returnedOrders / totalOrders) * 100 : 0;
      const cancellationRate = totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0;

      setAnalysis({
        totalOrders,
        deliveredOrders,
        cancelledOrders,
        returnedOrders,
        totalRevenue,
        totalFees,
        netAmount,
        averageOrderValue,
        returnRate,
        cancellationRate
      });

      // Calculate status breakdown
      const statusMap = new Map();
      combinedOrders.forEach(order => {
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

      const statusBreakdownData = Array.from(statusMap.values()).map(item => ({
        ...item,
        percentage: totalOrders > 0 ? (item.count / totalOrders) * 100 : 0
      }));

      // Calculate fee breakdown from fees data
      const feeTypes = [
        { key: 'fee_referral', name: 'Referral Fees' },
        { key: 'fee_shipping', name: 'Shipping Fees' },
        { key: 'fee_outbound_fbn', name: 'FBN Outbound' },
        { key: 'fee_weight_handling', name: 'Weight Handling' },
        { key: 'fee_crossdock', name: 'Crossdock' },
        { key: 'fee_directship_outbound', name: 'Direct Ship' },
        { key: 'fee_damaged_return', name: 'Damaged Return' },
        { key: 'fee_noon_penalty', name: 'Penalties' },
        { key: 'fee_item_cancellation', name: 'Cancellation' },
        { key: 'fee_warranty_penalty', name: 'Warranty Penalty' },
        { key: 'fee_retention_penalty', name: 'Retention Penalty' },
        { key: 'fee_alternate_seller_fulfillment', name: 'Alt. Fulfillment' },
        { key: 'fee_miscellaneous', name: 'Miscellaneous' },
        { key: 'fee_direct_collection', name: 'Direct Collection' },
        { key: 'fee_reinvoicing', name: 'Reinvoicing' },
        { key: 'fee_noon_promo', name: 'Noon Promo' },
        { key: 'fee_noon_markup', name: 'Noon Markup' }
      ];

      const feeBreakdownData = feeTypes.map(feeType => {
        const amount = feesData.reduce((sum, fee) => sum + (fee[feeType.key] || 0), 0);
        return {
          feeType: feeType.name,
          amount,
          percentage: totalFees > 0 ? (amount / totalFees) * 100 : 0
        };
      }).filter(item => item.amount > 0);

      setOrderDetails(combinedOrders);
      setStatusBreakdown(statusBreakdownData);
      setFeeBreakdown(feeBreakdownData);

    } catch (error) {
      console.error('Error loading order analysis:', error);
      toast.error('Failed to load order analysis');
    } finally {
      setLoading(false);
    }
  };

  const exportData = (type: string) => {
    let data: any[] = [];
    let filename = "";

    switch (type) {
      case 'overview':
        data = [analysis];
        filename = `order_analysis_overview_${selectedCountry}_${new Date().toISOString().split('T')[0]}.csv`;
        break;
      case 'orders':
        data = orderDetails;
        filename = `order_details_${selectedCountry}_${new Date().toISOString().split('T')[0]}.csv`;
        break;
      case 'status':
        data = statusBreakdown;
        filename = `status_breakdown_${selectedCountry}_${new Date().toISOString().split('T')[0]}.csv`;
        break;
      case 'fees':
        data = feeBreakdown;
        filename = `fee_breakdown_${selectedCountry}_${new Date().toISOString().split('T')[0]}.csv`;
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
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'returned':
        return 'bg-orange-100 text-orange-800';
      case 'shipped':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-lg text-slate-600">Loading order analysis...</p>
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
          <h1 className="text-4xl font-bold text-slate-900">
            Noon Order Analysis
          </h1>
          <p className="text-lg text-slate-600">
            Comprehensive analysis of orders, sales status, and fee charges
          </p>
        </div>

        {/* Store Filter */}
        <Card>
          <CardHeader>
            <CardTitle>Filter Options</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-center">
              <Select value={selectedStore} onValueChange={setSelectedStore}>
                <SelectTrigger className="w-64">
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
              <Button onClick={loadOrderAnalysis}>Refresh Analysis</Button>
            </div>
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analysis.totalOrders.toLocaleString()}</div>
              <div className="flex gap-2 mt-2">
                <Badge className="bg-green-100 text-green-800">
                  {analysis.deliveredOrders} Delivered
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(analysis.totalRevenue)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                AOV: {formatCurrency(analysis.averageOrderValue)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Fees</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{formatCurrency(analysis.totalFees)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {formatPercentage((analysis.totalFees / analysis.totalRevenue) * 100)} of revenue
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Amount</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(analysis.netAmount)}</div>
              <div className="flex gap-2 mt-2">
                <span className="text-xs text-red-600">
                  Return: {formatPercentage(analysis.returnRate)}
                </span>
                <span className="text-xs text-orange-600">
                  Cancel: {formatPercentage(analysis.cancellationRate)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Analysis Tabs */}
        <Tabs defaultValue="status" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="status">Order Status</TabsTrigger>
            <TabsTrigger value="fees">Fee Breakdown</TabsTrigger>
            <TabsTrigger value="orders">Order Details</TabsTrigger>
            <TabsTrigger value="exports">Export Data</TabsTrigger>
          </TabsList>

          <TabsContent value="status">
            <Card>
              <CardHeader>
                <CardTitle>Order Status Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Count</TableHead>
                      <TableHead>Percentage</TableHead>
                      <TableHead>Total Revenue</TableHead>
                      <TableHead>Total Fees</TableHead>
                      <TableHead>Net Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {statusBreakdown.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Badge className={getStatusColor(item.status)}>
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{item.count.toLocaleString()}</TableCell>
                        <TableCell>{formatPercentage(item.percentage)}</TableCell>
                        <TableCell>{formatCurrency(item.totalRevenue)}</TableCell>
                        <TableCell className="text-red-600">{formatCurrency(item.totalFees)}</TableCell>
                        <TableCell className="text-green-600">{formatCurrency(item.netAmount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fees">
            <Card>
              <CardHeader>
                <CardTitle>Fee Breakdown Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fee Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Percentage of Total Fees</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {feeBreakdown
                      .sort((a, b) => b.amount - a.amount)
                      .map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.feeType}</TableCell>
                          <TableCell className="text-red-600">{formatCurrency(item.amount)}</TableCell>
                          <TableCell>{formatPercentage(item.percentage)}</TableCell>
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
                <CardTitle>Order Details</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Showing {orderDetails.length.toLocaleString()} orders
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
                        <TableHead>Fulfillment</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orderDetails.slice(0, 100).map((order, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-mono text-xs">{order.order_nr}</TableCell>
                          <TableCell className="font-mono text-xs">{order.sku}</TableCell>
                          <TableCell className="max-w-48 truncate">{order.product_title}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(order.item_status || '')}>
                              {order.item_status}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatCurrency(order.invoice_price || 0)}</TableCell>
                          <TableCell className="text-red-600">{formatCurrency(order.total_fees)}</TableCell>
                          <TableCell className={order.net_amount >= 0 ? "text-green-600" : "text-red-600"}>
                            {formatCurrency(order.net_amount)}
                          </TableCell>
                          <TableCell>{order.fulfillment_mode}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {orderDetails.length > 100 && (
                    <p className="text-center py-4 text-sm text-muted-foreground">
                      Showing first 100 orders. Export data to see all orders.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="exports">
            <Card>
              <CardHeader>
                <CardTitle>Export Data</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button onClick={() => exportData('overview')} className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Export Overview Summary
                  </Button>
                  <Button onClick={() => exportData('orders')} className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Export Order Details
                  </Button>
                  <Button onClick={() => exportData('status')} className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Export Status Breakdown
                  </Button>
                  <Button onClick={() => exportData('fees')} className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Export Fee Breakdown
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