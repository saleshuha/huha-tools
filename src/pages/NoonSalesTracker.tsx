import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, 
  FileText, 
  DollarSign, 
  BarChart3, 
  TrendingUp, 
  AlertTriangle, 
  Download, 
  ArrowLeft, 
  Store as StoreIcon,
  Activity,
  ShoppingBag
} from "lucide-react";
import { SalesFileUpload } from "@/components/sales/SalesFileUpload";
import { ReturnsFileUpload } from "@/components/sales/ReturnsFileUpload";
import { CostDataEntry } from "@/components/sales/CostDataEntry";
import { ProfitAnalyticsDashboard } from "@/components/analytics/ProfitAnalyticsDashboard";
import { ItemProfitTable } from "@/components/analytics/ItemProfitTable";
import { ReturnAnalysis } from "@/components/analytics/ReturnAnalysis";
import { FinancialSummary } from "@/components/analytics/FinancialSummary";
import { Store } from "@/types/store";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function NoonSalesTracker() {
  const { storeId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [currentStore, setCurrentStore] = useState<Store | null>(null);
  const [salesData, setSalesData] = useState([]);
  const [returnsData, setReturnsData] = useState([]);
  const [costData, setCostData] = useState([]);
  const [profitData, setProfitData] = useState([]);

  useEffect(() => {
    if (storeId) {
      fetchCurrentStore();
    }
  }, [storeId]);

  useEffect(() => {
    // Calculate profit data when all data sources are available
    if (salesData.length > 0 && costData.length > 0) {
      calculateProfitData();
    }
  }, [salesData, returnsData, costData]);

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

  const calculateProfitData = () => {
    // Calculate profit/loss per item
    const calculations = salesData.map(sale => {
      const cost = costData.find(c => c.sku === sale.sku || c.asin === sale.asin);
      const returns = returnsData.filter(r => r.sku === sale.sku || r.asin === sale.asin);
      
      const costPrice = cost?.costPrice || 0;
      const netPayout = sale.netPayout || 0;
      const returnLoss = returns.reduce((sum, ret) => sum + (ret.totalDeduction || 0), 0);
      
      return {
        ...sale,
        costPrice,
        grossProfit: netPayout - costPrice,
        returnLoss,
        finalProfit: netPayout - costPrice - returnLoss,
        profitMargin: netPayout > 0 ? ((netPayout - costPrice - returnLoss) / netPayout * 100) : 0
      };
    });
    
    setProfitData(calculations);
  };

  // Currency helper function
  const getCurrency = () => {
    return currentStore?.currency || 'AED';
  };

  const formatCurrency = (amount: number) => {
    const currency = getCurrency();
    return `${amount.toFixed(2)} ${currency}`;
  };

  // Summary metrics
  const summaryMetrics = useMemo(() => {
    const totalRevenue = profitData.reduce((sum, item) => sum + (item.netPayout || 0), 0);
    const totalCost = profitData.reduce((sum, item) => sum + (item.costPrice || 0), 0);
    const totalProfit = profitData.reduce((sum, item) => sum + (item.finalProfit || 0), 0);
    const totalReturns = returnsData.length;
    const totalReturnLoss = profitData.reduce((sum, item) => sum + (item.returnLoss || 0), 0);
    
    return {
      totalRevenue,
      totalCost,
      totalProfit,
      totalReturns,
      totalReturnLoss,
      profitMargin: totalRevenue > 0 ? (totalProfit / totalRevenue * 100) : 0,
      totalItems: profitData.length
    };
  }, [profitData, returnsData]);

  const exportToCSV = () => {
    if (profitData.length === 0) {
      toast({
        title: "No Data",
        description: "No profit data available to export",
        variant: "destructive",
      });
      return;
    }

    const headers = ['SKU/ASIN', 'Revenue', 'Cost', 'Gross Profit', 'Return Loss', 'Final Profit', 'Profit Margin %'];
    const csvContent = [
      headers.join(','),
      ...profitData.map(item => [
        item.sku || item.asin || '',
        item.netPayout || 0,
        item.costPrice || 0,
        item.grossProfit || 0,
        item.returnLoss || 0,
        item.finalProfit || 0,
        item.profitMargin || 0
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${currentStore?.name || 'store'}_noon_profit_analysis.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full max-w-none px-6 py-6 space-y-6 ml-0">
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
              <ShoppingBag className="h-8 w-8 text-orange-600" />
              {currentStore?.name || 'Store'} - Noon Sales Tracker
              <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700">
                Profit Analytics
              </Badge>
            </h1>
            <p className="text-muted-foreground mt-1 flex items-center gap-2">
              <StoreIcon className="h-4 w-4" />
              Upload sales data, analyze profits, and track returns
              {currentStore?.location && (
                <span>• {currentStore.location}</span>
              )}
            </p>
          </div>
        </div>
        
        <Button 
          onClick={exportToCSV}
          className="gap-2 bg-orange-600 hover:bg-orange-700"
          disabled={profitData.length === 0}
        >
          <Download className="h-4 w-4" />
          Export Report
        </Button>
      </div>

      {/* Summary Metrics */}
      {profitData.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card className="border-orange-200">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-orange-700">Total Revenue</p>
                  <p className="text-lg font-bold text-orange-600">{formatCurrency(summaryMetrics.totalRevenue)}</p>
                  <p className="text-xs text-muted-foreground">
                    {summaryMetrics.totalItems} items
                  </p>
                </div>
                <ShoppingBag className="h-4 w-4 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-200">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-red-700">Total Cost</p>
                  <p className="text-lg font-bold text-red-600">{formatCurrency(summaryMetrics.totalCost)}</p>
                  <p className="text-xs text-muted-foreground">
                    Cost of goods
                  </p>
                </div>
                <DollarSign className="h-4 w-4 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-200">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-green-700">Net Profit</p>
                  <p className="text-lg font-bold text-green-600">{formatCurrency(summaryMetrics.totalProfit)}</p>
                  <p className="text-xs text-muted-foreground">
                    {summaryMetrics.profitMargin.toFixed(1)}% margin
                  </p>
                </div>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-yellow-200">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-yellow-700">Return Loss</p>
                  <p className="text-lg font-bold text-yellow-600">{formatCurrency(summaryMetrics.totalReturnLoss)}</p>
                  <p className="text-xs text-muted-foreground">
                    {summaryMetrics.totalReturns} returns
                  </p>
                </div>
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-blue-700">Items Sold</p>
                  <p className="text-lg font-bold text-blue-600">{summaryMetrics.totalItems}</p>
                  <p className="text-xs text-muted-foreground">
                    Total products
                  </p>
                </div>
                <Activity className="h-4 w-4 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-200">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-purple-700">Avg Revenue</p>
                  <p className="text-lg font-bold text-purple-600">
                    {formatCurrency(summaryMetrics.totalItems > 0 ? summaryMetrics.totalRevenue / summaryMetrics.totalItems : 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Per item
                  </p>
                </div>
                <BarChart3 className="h-4 w-4 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Data Upload & Management
          </TabsTrigger>
          <TabsTrigger value="analysis" className="flex items-center gap-2" disabled={profitData.length === 0}>
            <BarChart3 className="h-4 w-4" />
            Profit Analysis
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6">
          <Tabs defaultValue="sales" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="sales" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Sales Data
              </TabsTrigger>
              <TabsTrigger value="returns" className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Returns Data
              </TabsTrigger>
              <TabsTrigger value="costs" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Item Costs
              </TabsTrigger>
            </TabsList>

            <TabsContent value="sales" className="space-y-4">
              <Card className="border-orange-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-orange-600" />
                    Upload Sales Data
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <SalesFileUpload onDataUploaded={setSalesData} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="returns" className="space-y-4">
              <Card className="border-red-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    Upload Returns/Credit Data
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ReturnsFileUpload onDataUploaded={setReturnsData} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="costs" className="space-y-4">
              <Card className="border-blue-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-blue-600" />
                    Item Cost Management
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CostDataEntry onDataUpdated={setCostData} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-6">
          <FinancialSummary profitData={profitData} />
          
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="items" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Item Analysis
              </TabsTrigger>
              <TabsTrigger value="returns" className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Return Analysis
              </TabsTrigger>
              <TabsTrigger value="dashboard" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Dashboard
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <ProfitAnalyticsDashboard profitData={profitData} />
            </TabsContent>

            <TabsContent value="items" className="space-y-4">
              <ItemProfitTable profitData={profitData} />
            </TabsContent>

            <TabsContent value="returns" className="space-y-4">
              <ReturnAnalysis returnsData={returnsData} salesData={salesData} />
            </TabsContent>

            <TabsContent value="dashboard" className="space-y-4">
              <ProfitAnalyticsDashboard profitData={profitData} />
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
}