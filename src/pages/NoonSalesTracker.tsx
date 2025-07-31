import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, BarChart3, FileText, DollarSign, TrendingUp, AlertTriangle, Download } from "lucide-react";
import { SalesFileUpload } from "@/components/sales/SalesFileUpload";
import { ReturnsFileUpload } from "@/components/sales/ReturnsFileUpload";
import { CostDataEntry } from "@/components/sales/CostDataEntry";
import { ProfitAnalyticsDashboard } from "@/components/analytics/ProfitAnalyticsDashboard";
import { ItemProfitTable } from "@/components/analytics/ItemProfitTable";
import { ReturnAnalysis } from "@/components/analytics/ReturnAnalysis";
import { FinancialSummary } from "@/components/analytics/FinancialSummary";

export default function NoonSalesTracker() {
  const [salesData, setSalesData] = useState([]);
  const [returnsData, setReturnsData] = useState([]);
  const [costData, setCostData] = useState([]);
  const [profitData, setProfitData] = useState([]);

  // Calculate profit data when all data sources are available
  const calculateProfitData = () => {
    if (salesData.length > 0 && costData.length > 0) {
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
    }
  };

  // Trigger calculation when data changes
  useEffect(() => {
    calculateProfitData();
  }, [salesData, returnsData, costData]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-6 w-6" />
          <h1 className="text-3xl font-bold">Noon Sales Tracker</h1>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
          <Download className="h-4 w-4" />
          Export Report
        </button>
      </div>

      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Data Upload & Management
          </TabsTrigger>
          <TabsTrigger value="analysis" className="flex items-center gap-2">
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
                <FileText className="h-4 w-4" />
                Returns Data
              </TabsTrigger>
              <TabsTrigger value="costs" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Item Costs
              </TabsTrigger>
            </TabsList>

            <TabsContent value="sales" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Upload Sales Data</CardTitle>
                </CardHeader>
                <CardContent>
                  <SalesFileUpload onDataUploaded={setSalesData} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="returns" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Upload Returns/Credit Data</CardTitle>
                </CardHeader>
                <CardContent>
                  <ReturnsFileUpload onDataUploaded={setReturnsData} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="costs" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Item Cost Management</CardTitle>
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
        </TabsContent>
      </Tabs>
    </div>
  );
}