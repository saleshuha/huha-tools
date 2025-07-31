import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, TrendingUp, AlertTriangle, Download } from "lucide-react";
import { ProfitAnalyticsDashboard } from "@/components/analytics/ProfitAnalyticsDashboard";
import { ItemProfitTable } from "@/components/analytics/ItemProfitTable";
import { ReturnAnalysis } from "@/components/analytics/ReturnAnalysis";
import { FinancialSummary } from "@/components/analytics/FinancialSummary";

export default function ProfitAnalyzer() {
  const [salesData, setSalesData] = useState([]);
  const [returnsData, setReturnsData] = useState([]);
  const [costData, setCostData] = useState([]);
  const [profitData, setProfitData] = useState([]);

  useEffect(() => {
    // Calculate profit data when all data sources are available
    if (salesData.length > 0 && costData.length > 0) {
      calculateProfitData();
    }
  }, [salesData, returnsData, costData]);

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

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-6 w-6" />
          <h1 className="text-3xl font-bold">Profit Analyzer</h1>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
          <Download className="h-4 w-4" />
          Export Report
        </button>
      </div>

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
            <BarChart3 className="h-4 w-4" />
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
    </div>
  );
}