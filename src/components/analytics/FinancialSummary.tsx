import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, Percent, AlertTriangle, Target } from "lucide-react";

interface FinancialSummaryProps {
  profitData: any[];
}

export function FinancialSummary({ profitData }: FinancialSummaryProps) {
  if (!profitData || profitData.length === 0) {
    return null;
  }

  // Calculate comprehensive financial metrics
  const totalRevenue = profitData.reduce((sum, item) => sum + (item.sellingPrice || 0), 0);
  const totalCost = profitData.reduce((sum, item) => sum + (item.costPrice || 0), 0);
  const totalVAT = profitData.reduce((sum, item) => sum + (item.vatAmount || 0), 0);
  const totalCommission = profitData.reduce((sum, item) => sum + (item.commissionAmount || 0), 0);
  const totalShipping = profitData.reduce((sum, item) => sum + (item.shippingCost || 0), 0);
  const totalNetPayout = profitData.reduce((sum, item) => sum + (item.netPayout || 0), 0);
  const totalReturnLoss = profitData.reduce((sum, item) => sum + (item.returnLoss || 0), 0);
  const totalGrossProfit = profitData.reduce((sum, item) => sum + (item.grossProfit || 0), 0);
  const totalFinalProfit = profitData.reduce((sum, item) => sum + (item.finalProfit || 0), 0);

  // Calculate percentages and ratios
  const grossMargin = totalRevenue > 0 ? (totalGrossProfit / totalRevenue) * 100 : 0;
  const netMargin = totalRevenue > 0 ? (totalFinalProfit / totalRevenue) * 100 : 0;
  const costRatio = totalRevenue > 0 ? (totalCost / totalRevenue) * 100 : 0;
  const commissionRate = totalRevenue > 0 ? (totalCommission / totalRevenue) * 100 : 0;
  const returnRate = totalRevenue > 0 ? (totalReturnLoss / totalRevenue) * 100 : 0;

  // Profitability analysis
  const profitableItems = profitData.filter(item => (item.finalProfit || 0) > 0);
  const unprofitableItems = profitData.filter(item => (item.finalProfit || 0) <= 0);
  const profitabilityRatio = profitData.length > 0 ? (profitableItems.length / profitData.length) * 100 : 0;

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;
  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

  const getPerformanceColor = (value: number, thresholds: { good: number; fair: number }) => {
    if (value >= thresholds.good) return "text-green-600";
    if (value >= thresholds.fair) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 mb-6">
      {/* Revenue Metrics */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
          <p className="text-xs text-muted-foreground">
            {profitData.length} items sold
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Net Payout</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">{formatCurrency(totalNetPayout)}</div>
          <p className="text-xs text-muted-foreground">
            After platform deductions
          </p>
        </CardContent>
      </Card>

      {/* Cost Metrics */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Costs</CardTitle>
          <TrendingDown className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{formatCurrency(totalCost)}</div>
          <p className="text-xs text-muted-foreground">
            {formatPercentage(costRatio)} of revenue
          </p>
        </CardContent>
      </Card>

      {/* Profit Metrics */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Final Profit</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${totalFinalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(totalFinalProfit)}
          </div>
          <p className={`text-xs ${getPerformanceColor(netMargin, { good: 15, fair: 5 })}`}>
            {formatPercentage(netMargin)} net margin
          </p>
        </CardContent>
      </Card>

      {/* Return Impact */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Return Losses</CardTitle>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{formatCurrency(totalReturnLoss)}</div>
          <p className={`text-xs ${getPerformanceColor(10 - returnRate, { good: 8, fair: 5 })}`}>
            {formatPercentage(returnRate)} impact
          </p>
        </CardContent>
      </Card>

      {/* Profitability Ratio */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Profitable Items</CardTitle>
          <Percent className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${getPerformanceColor(profitabilityRatio, { good: 80, fair: 60 })}`}>
            {formatPercentage(profitabilityRatio)}
          </div>
          <p className="text-xs text-muted-foreground">
            {profitableItems.length} of {profitData.length} items
          </p>
        </CardContent>
      </Card>

      {/* Additional Financial Breakdown Cards */}
      <Card className="md:col-span-2 lg:col-span-4 xl:col-span-6">
        <CardHeader>
          <CardTitle>Financial Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-sm">
            <div className="space-y-1">
              <p className="text-muted-foreground">Commission Fees</p>
              <p className="font-semibold">{formatCurrency(totalCommission)}</p>
              <p className="text-xs text-muted-foreground">{formatPercentage(commissionRate)}</p>
            </div>
            
            <div className="space-y-1">
              <p className="text-muted-foreground">VAT Collected</p>
              <p className="font-semibold">{formatCurrency(totalVAT)}</p>
              <p className="text-xs text-muted-foreground">{formatPercentage(totalRevenue > 0 ? (totalVAT / totalRevenue) * 100 : 0)}</p>
            </div>
            
            <div className="space-y-1">
              <p className="text-muted-foreground">Shipping Revenue</p>
              <p className="font-semibold">{formatCurrency(totalShipping)}</p>
              <p className="text-xs text-muted-foreground">{formatPercentage(totalRevenue > 0 ? (totalShipping / totalRevenue) * 100 : 0)}</p>
            </div>
            
            <div className="space-y-1">
              <p className="text-muted-foreground">Gross Profit</p>
              <p className={`font-semibold ${totalGrossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(totalGrossProfit)}
              </p>
              <p className="text-xs text-muted-foreground">{formatPercentage(grossMargin)}</p>
            </div>
            
            <div className="space-y-1">
              <p className="text-muted-foreground">Average Order Value</p>
              <p className="font-semibold">
                {formatCurrency(profitData.length > 0 ? totalRevenue / profitData.length : 0)}
              </p>
              <p className="text-xs text-muted-foreground">Per transaction</p>
            </div>
            
            <div className="space-y-1">
              <p className="text-muted-foreground">Break-even Items</p>
              <p className="font-semibold">
                {profitData.filter(item => Math.abs(item.finalProfit || 0) < 1).length}
              </p>
              <p className="text-xs text-muted-foreground">±$1.00 range</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}