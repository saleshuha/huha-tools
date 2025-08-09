import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TrendingUp, TrendingDown, DollarSign, Package, Search, Download, Filter, Settings, Calculator, Plus, Minus, Save, HelpCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useToast } from '@/hooks/use-toast';

interface ProfitAnalyticsData {
  sku_code: string;
  title: string;
  purchase_cost: number;
  sell_price: number;
  commission_rate: number;
  commission_amount: number;
  profit_margin: number;
  profit_amount: number;
  quantity_ordered: number;
  total_profit: number;
  po_number: string;
  order_date: string;
  status: string;
  currency: string;
  shipping_rate: number;
  multiplier: number;
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
  const [globalMultiplier, setGlobalMultiplier] = useState(2.5);
  const [globalCommission, setGlobalCommission] = useState(15);
  const [shippingRate, setShippingRate] = useState(0.005);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const { profile } = useUserProfile();
  const { toast } = useToast();

  // Load saved values on component mount
  useEffect(() => {
    const loadSavedValues = () => {
      try {
        const savedMultiplier = localStorage.getItem(`po_multiplier_${profile?.id || 'default'}`);
        const savedCommission = localStorage.getItem(`po_commission_${profile?.id || 'default'}`);
        const savedShipping = localStorage.getItem(`po_shipping_rate_${profile?.id || 'default'}`);
        
        if (savedMultiplier) setGlobalMultiplier(parseFloat(savedMultiplier));
        if (savedCommission) setGlobalCommission(parseFloat(savedCommission));
        if (savedShipping) setShippingRate(parseFloat(savedShipping));
      } catch (error) {
        console.error('Failed to load saved pricing values:', error);
      }
    };

    if (profile?.id) {
      loadSavedValues();
    }
  }, [profile?.id]);

  useEffect(() => {
    calculateProfitAnalytics();
  }, [poOrders, sunskySKUs]);

  // Mark changes as unsaved when values change
  const handleMultiplierChange = (newValue: number) => {
    setGlobalMultiplier(newValue);
    setHasUnsavedChanges(true);
  };

  const handleCommissionChange = (newValue: number) => {
    setGlobalCommission(newValue);
    setHasUnsavedChanges(true);
  };

  const handleShippingRateChange = (newValue: number) => {
    setShippingRate(newValue);
    setHasUnsavedChanges(true);
  };

  // Save values permanently
  const savePricingSettings = async () => {
    try {
      // Save to localStorage for immediate persistence
      localStorage.setItem(`po_multiplier_${profile?.id || 'default'}`, globalMultiplier.toString());
      localStorage.setItem(`po_commission_${profile?.id || 'default'}`, globalCommission.toString());
      localStorage.setItem(`po_shipping_rate_${profile?.id || 'default'}`, shippingRate.toString());
      
      setHasUnsavedChanges(false);
      calculateProfitAnalytics(); // Recalculate with new values
      
      toast({
        title: "Settings Saved",
        description: "Pricing settings have been saved permanently",
      });
    } catch (error) {
      console.error('Failed to save pricing settings:', error);
      toast({
        title: "Error",
        description: "Failed to save pricing settings",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    filterData();
  }, [analyticsData, searchTerm, statusFilter]);

  const calculateProfitAnalytics = () => {
    setIsLoading(true);
    
    try {
      const profitData: ProfitAnalyticsData[] = [];
      
      // Get only matched PO orders (ones with sunsky_sku data)
      const matchedOrders = poOrders.filter(order => order.sunsky_sku !== null);
      
      matchedOrders.forEach(order => {
        // Use the sunsky_sku data that comes with the order
        const skuData = order.sunsky_sku;
        
        if (skuData) {
          const baseCost = skuData.cost || 0;
          const weight = skuData.weight || 0;
          const quantity = order.quantity || 1;
          
          // Calculate shipping cost based on weight
          const shippingCost = weight * shippingRate;
          const purchaseCostWithShipping = baseCost + shippingCost;
          
          // Calculate sell price using multiplier
          const sellPrice = baseCost * globalMultiplier;
          
          // Calculate commission
          const commissionAmount = (sellPrice * globalCommission) / 100;
          
          // Calculate profit
          const profitAmount = sellPrice - purchaseCostWithShipping - commissionAmount;
          const profitMargin = purchaseCostWithShipping > 0 ? (profitAmount / purchaseCostWithShipping) * 100 : 0;
          const totalProfit = profitAmount * quantity;
          
          profitData.push({
            sku_code: order.sku_code,
            title: skuData.title || skuData.description || 'N/A',
            purchase_cost: purchaseCostWithShipping,
            sell_price: sellPrice,
            commission_rate: globalCommission,
            commission_amount: commissionAmount,
            profit_margin: profitMargin,
            profit_amount: profitAmount,
            quantity_ordered: quantity,
            total_profit: totalProfit,
            po_number: order.po_number,
            order_date: order.order_date || order.created_at,
            status: order.status,
            currency: order.currency || 'AED',
            shipping_rate: shippingCost,
            multiplier: globalMultiplier
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

  // Remove auto-recalculation - only recalculate when saved
  // useEffect(() => {
  //   if (analyticsData.length > 0) {
  //     calculateProfitAnalytics();
  //   }
  // }, [globalMultiplier, globalCommission, shippingRate]);

  const exportToCSV = () => {
    const headers = ['PO', 'SKU Code', 'Purchase Cost (inc. shipping)', 'Sell Price', 'Commission %', 'Commission Amount', 'Profit', 'Margin %', 'QTY', 'Total Profit', 'Status'];
    const csvData = filteredData.map(item => [
      item.po_number,
      item.sku_code,
      item.purchase_cost.toFixed(2),
      item.sell_price.toFixed(2),
      item.commission_rate.toFixed(1),
      item.commission_amount.toFixed(2),
      item.profit_amount.toFixed(2),
      item.profit_margin.toFixed(1),
      item.quantity_ordered,
      item.total_profit.toFixed(2),
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto p-6 space-y-8">
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


      {/* Analytics Data Display Only */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Profit Analytics - Matched Items Only
          </CardTitle>
          <CardDescription>
            Showing only PO items that have been matched with SKU catalog data
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
            
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Settings className="h-4 w-4" />
                  Pricing Settings
                  {hasUnsavedChanges && (
                    <div className="h-2 w-2 rounded-full bg-amber-500"></div>
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Pricing Controls
                  </DialogTitle>
                  <DialogDescription>
                    Configure multiplier, commission, and shipping rates for profit calculations
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-6">
                  <TooltipProvider>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      
                      {/* Sell Price Multiplier */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded bg-blue-100 dark:bg-blue-900/30">
                            <Calculator className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="flex-1">
                            <label className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                              Sell Price Multiplier
                            </label>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-3 w-3 text-muted-foreground ml-1 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-48">Multiplies the SKU cost to determine the selling price</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                        
                        <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 space-y-3">
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              value={globalMultiplier}
                              onChange={(e) => handleMultiplierChange(parseFloat(e.target.value) || 1)}
                              min={1}
                              max={5}
                              step={0.1}
                              className="w-20 text-center font-bold"
                            />
                            <span className="text-sm text-muted-foreground">x</span>
                          </div>
                          
                          <div className="space-y-2">
                            <Slider
                              value={[globalMultiplier]}
                              onValueChange={([value]) => handleMultiplierChange(value)}
                              min={1}
                              max={5}
                              step={0.1}
                              className="w-full"
                            />
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>1.0x</span>
                              <span>5.0x</span>
                            </div>
                          </div>
                          
                          <div className="flex gap-1 flex-wrap">
                            {[1.5, 2.0, 2.5, 3.0, 3.5, 4.0].map(value => (
                              <Button
                                key={value}
                                variant={Math.abs(globalMultiplier - value) < 0.1 ? "default" : "outline"}
                                size="sm"
                                onClick={() => handleMultiplierChange(value)}
                                className="text-xs h-7 px-2"
                              >
                                {value}x
                              </Button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Commission Rate */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded bg-green-100 dark:bg-green-900/30">
                            <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
                          </div>
                          <div className="flex-1">
                            <label className="text-sm font-semibold text-green-900 dark:text-green-100">
                              Commission Rate
                            </label>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-3 w-3 text-muted-foreground ml-1 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-48">Platform commission charged as percentage of sell price</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                        
                        <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4 space-y-3">
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              value={globalCommission}
                              onChange={(e) => handleCommissionChange(parseFloat(e.target.value) || 0)}
                              min={0}
                              max={30}
                              step={0.5}
                              className="w-20 text-center font-bold"
                            />
                            <span className="text-sm text-muted-foreground">%</span>
                          </div>
                          
                          <div className="space-y-2">
                            <Slider
                              value={[globalCommission]}
                              onValueChange={([value]) => handleCommissionChange(value)}
                              min={0}
                              max={30}
                              step={0.5}
                              className="w-full"
                            />
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>0%</span>
                              <span>30%</span>
                            </div>
                          </div>
                          
                          <div className="flex gap-1 flex-wrap">
                            {[5, 10, 15, 20, 25].map(value => (
                              <Button
                                key={value}
                                variant={Math.abs(globalCommission - value) < 0.1 ? "default" : "outline"}
                                size="sm"
                                onClick={() => handleCommissionChange(value)}
                                className="text-xs h-7 px-2"
                              >
                                {value}%
                              </Button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Shipping Rate */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded bg-purple-100 dark:bg-purple-900/30">
                            <Package className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div className="flex-1">
                            <label className="text-sm font-semibold text-purple-900 dark:text-purple-100">
                              Shipping Rate
                            </label>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-3 w-3 text-muted-foreground ml-1 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-48">Cost per gram for shipping from supplier to warehouse</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                        
                        <div className="bg-purple-50 dark:bg-purple-950/20 rounded-lg p-4 space-y-3">
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              value={shippingRate}
                              onChange={(e) => handleShippingRateChange(parseFloat(e.target.value) || 0)}
                              min={0}
                              max={0.02}
                              step={0.001}
                              className="w-24 text-center font-bold"
                            />
                            <span className="text-xs text-muted-foreground">AED/g</span>
                          </div>
                          
                          <div className="space-y-2">
                            <Slider
                              value={[shippingRate * 1000]}
                              onValueChange={([value]) => handleShippingRateChange(value / 1000)}
                              min={1}
                              max={15}
                              step={0.5}
                              className="w-full"
                            />
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>0.001</span>
                              <span>0.015</span>
                            </div>
                          </div>
                          
                          <div className="flex gap-1 flex-wrap">
                            {[0.002, 0.003, 0.005, 0.007, 0.010].map(value => (
                              <Button
                                key={value}
                                variant={Math.abs(shippingRate - value) < 0.0001 ? "default" : "outline"}
                                size="sm"
                                onClick={() => handleShippingRateChange(value)}
                                className="text-xs h-7 px-1.5"
                              >
                                {value.toFixed(3)}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </TooltipProvider>
                  
                  {/* Action Bar */}
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      {hasUnsavedChanges ? (
                        <span className="flex items-center gap-2 text-amber-600">
                          <AlertCircle className="h-4 w-4" />
                          Changes will take effect after saving
                        </span>
                      ) : (
                        <span className="flex items-center gap-2 text-green-600">
                          <div className="h-2 w-2 rounded-full bg-green-500"></div>
                          All settings saved
                        </span>
                      )}
                    </div>
                    
                    <Button 
                      onClick={savePricingSettings}
                      disabled={!hasUnsavedChanges}
                      className={`gap-2 transition-all duration-200 ${
                        hasUnsavedChanges 
                          ? "bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg" 
                          : ""
                      }`}
                      variant={hasUnsavedChanges ? "default" : "outline"}
                      size="lg"
                    >
                      <Save className="h-4 w-4" />
                      {hasUnsavedChanges ? "Save Changes & Apply" : "All Changes Saved"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Profit Analytics Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO</TableHead>
                  <TableHead>SKU Code</TableHead>
                  <TableHead className="text-right">Purchase Cost<br/><span className="text-xs text-muted-foreground">(inc. shipping)</span></TableHead>
                  <TableHead className="text-right">Sell Price<br/><span className="text-xs text-muted-foreground">({globalMultiplier}x multiplier)</span></TableHead>
                  <TableHead className="text-right">Commission<br/><span className="text-xs text-muted-foreground">({globalCommission}%)</span></TableHead>
                  <TableHead className="text-right">Profit</TableHead>
                  <TableHead className="text-right">Margin %</TableHead>
                  <TableHead className="text-center">QTY</TableHead>
                  <TableHead className="text-right">Total Profit</TableHead>
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
                      No matched items found. Upload PO files and ensure they match with your SKU catalog.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono text-sm font-medium">{item.po_number}</TableCell>
                      <TableCell className="font-mono text-sm">{item.sku_code}</TableCell>
                      <TableCell className="text-right">
                        <div className="text-sm">
                          {item.purchase_cost.toFixed(2)} {getCurrencySymbol(item.currency)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {(item.purchase_cost - item.shipping_rate).toFixed(2)} + {item.shipping_rate.toFixed(3)} shipping
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="text-sm">
                          {item.sell_price.toFixed(2)} {getCurrencySymbol(item.currency)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {item.multiplier}x base cost
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="text-sm">
                          {item.commission_amount.toFixed(2)} {getCurrencySymbol(item.currency)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {item.commission_rate}% of sell price
                        </div>
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
                      <TableCell className="text-center font-medium">{item.quantity_ordered}</TableCell>
                      <TableCell className="text-right font-medium">
                        <span className={item.total_profit >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                          {item.total_profit.toFixed(2)} {getCurrencySymbol(item.currency)}
                        </span>
                      </TableCell>
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
    </div>
  );
}