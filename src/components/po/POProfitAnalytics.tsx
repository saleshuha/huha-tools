import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, TrendingDown, DollarSign, Package, Search, Download, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useToast } from '@/hooks/use-toast';

interface ProfitAnalyticsData {
  sku_code: string;
  title: string;
  purchase_cost: number;
  sell_price: number;
  profit_margin: number;
  profit_amount: number;
  quantity_ordered: number;
  total_profit: number;
  po_number: string;
  order_date: string;
  status: string;
  currency: string;
}

interface POProfitAnalyticsProps {
  poOrders: any[];
  sunskySKUs: any[];
}

export function POProfitAnalytics({ poOrders, sunskySKUs }: POProfitAnalyticsProps) {
  const [analyticsData, setAnalyticsData] = useState<ProfitAnalyticsData[]>([]);
  const [filteredData, setFilteredData] = useState<ProfitAnalyticsData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const { profile } = useUserProfile();
  const { toast } = useToast();

  useEffect(() => {
    calculateProfitAnalytics();
  }, [poOrders, sunskySKUs]);

  useEffect(() => {
    filterData();
  }, [analyticsData, searchTerm, statusFilter]);

  const calculateProfitAnalytics = () => {
    setIsLoading(true);
    
    try {
      const profitData: ProfitAnalyticsData[] = [];
      
      poOrders.forEach(order => {
        // Find matching SKU data for purchase cost
        const skuData = sunskySKUs.find(sku => sku.sku_code === order.sku_code);
        
        if (skuData && order.unit_cost) {
          const purchaseCost = skuData.cost || 0;
          const sellPrice = order.unit_cost || 0;
          const quantity = order.quantity || 1;
          
          const profitAmount = sellPrice - purchaseCost;
          const profitMargin = purchaseCost > 0 ? (profitAmount / purchaseCost) * 100 : 0;
          const totalProfit = profitAmount * quantity;
          
          profitData.push({
            sku_code: order.sku_code,
            title: skuData.title || skuData.description || 'N/A',
            purchase_cost: purchaseCost,
            sell_price: sellPrice,
            profit_margin: profitMargin,
            profit_amount: profitAmount,
            quantity_ordered: quantity,
            total_profit: totalProfit,
            po_number: order.po_number,
            order_date: order.order_date || order.created_at,
            status: order.status,
            currency: order.currency || 'AED'
          });
        }
      });
      
      setAnalyticsData(profitData);
    } catch (error) {
      console.error('Error calculating profit analytics:', error);
      toast({
        title: "Calculation Error",
        description: "Failed to calculate profit analytics",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterData = () => {
    let filtered = analyticsData;
    
    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.sku_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.po_number.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }
    
    setFilteredData(filtered);
  };

  const getCurrencySymbol = (currency: string) => {
    switch (currency) {
      case 'SAR': return 'SAR';
      case 'AED': return 'AED';
      default: return 'AED';
    }
  };

  // Calculate summary statistics
  const totalProfit = filteredData.reduce((sum, item) => sum + item.total_profit, 0);
  const averageMargin = filteredData.length > 0 
    ? filteredData.reduce((sum, item) => sum + item.profit_margin, 0) / filteredData.length 
    : 0;
  const totalOrders = filteredData.length;
  const profitableItems = filteredData.filter(item => item.profit_amount > 0).length;

  const exportToCSV = () => {
    const headers = ['SKU Code', 'Title', 'Purchase Cost', 'Sell Price', 'Profit Amount', 'Profit Margin %', 'Quantity', 'Total Profit', 'PO Number', 'Status'];
    const csvData = filteredData.map(item => [
      item.sku_code,
      item.title,
      item.purchase_cost.toFixed(2),
      item.sell_price.toFixed(2),
      item.profit_amount.toFixed(2),
      item.profit_margin.toFixed(1),
      item.quantity_ordered,
      item.total_profit.toFixed(2),
      item.po_number,
      item.status
    ]);
    
    const csvContent = [headers, ...csvData].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `po-profit-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {totalProfit.toFixed(2)} {getCurrencySymbol(profile?.country === 'KSA' ? 'SAR' : 'AED')}
            </div>
            <p className="text-xs text-muted-foreground">
              From {totalOrders} orders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Margin</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {averageMargin.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Profit margin average
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profitable Items</CardTitle>
            <Package className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {profitableItems} / {totalOrders}
            </div>
            <p className="text-xs text-muted-foreground">
              Items with positive profit
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {totalOrders > 0 ? ((profitableItems / totalOrders) * 100).toFixed(1) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Profitable order rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Profit Analytics
          </CardTitle>
          <CardDescription>
            Analyze profit margins comparing SKU purchase costs with PO sell prices
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search SKU, title, or PO number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="ordered">Ordered</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
              </SelectContent>
            </Select>
            
            <Button onClick={exportToCSV} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>

          {/* Profit Analytics Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU Code</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead className="text-right">Purchase Cost</TableHead>
                  <TableHead className="text-right">Sell Price</TableHead>
                  <TableHead className="text-right">Profit</TableHead>
                  <TableHead className="text-right">Margin %</TableHead>
                  <TableHead className="text-center">Qty</TableHead>
                  <TableHead className="text-right">Total Profit</TableHead>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      Loading analytics...
                    </TableCell>
                  </TableRow>
                ) : filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      No data available. Upload PO files and ensure SKUs have cost information.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono text-sm">{item.sku_code}</TableCell>
                      <TableCell className="max-w-48 truncate">{item.title}</TableCell>
                      <TableCell className="text-right">
                        {item.purchase_cost.toFixed(2)} {getCurrencySymbol(item.currency)}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.sell_price.toFixed(2)} {getCurrencySymbol(item.currency)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={item.profit_amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {item.profit_amount.toFixed(2)} {getCurrencySymbol(item.currency)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={item.profit_margin >= 0 ? 'default' : 'destructive'}>
                          {item.profit_margin >= 0 ? '+' : ''}{item.profit_margin.toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">{item.quantity_ordered}</TableCell>
                      <TableCell className="text-right font-medium">
                        <span className={item.total_profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {item.total_profit.toFixed(2)} {getCurrencySymbol(item.currency)}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{item.po_number}</TableCell>
                      <TableCell>
                        <Badge variant={
                          item.status === 'delivered' ? 'default' :
                          item.status === 'shipped' ? 'secondary' :
                          item.status === 'ordered' ? 'outline' : 'destructive'
                        }>
                          {item.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}