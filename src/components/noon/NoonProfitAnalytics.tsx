import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NoonOrderFeesData } from "@/types/noon-fees";
// SKUCostManager removed
import { DollarSign, Package, TrendingDown, TrendingUp, Target, AlertTriangle } from "lucide-react";

interface NoonProfitAnalyticsProps {
  feesData: NoonOrderFeesData[];
  skuCosts: any[];
}

export function NoonProfitAnalytics({ feesData, skuCosts }: NoonProfitAnalyticsProps) {
  const calculateProfitSummary = () => {
    if (feesData.length === 0) {
      return {
        totalOrders: 0,
        totalRevenue: 0,
        totalFees: 0,
        totalCosts: 0,
        netPayment: 0,
        totalProfit: 0,
        profitMargin: 0,
        ordersWithCosts: 0,
        skusWithCosts: 0,
        totalSkus: 0
      };
    }

    const totalOrders = feesData.length;
    const totalRevenue = feesData.reduce((sum, order) => sum + (Number(order.invoice_price) || 0), 0);
    
    const totalFees = feesData.reduce((sum, order) => {
      const fees = [
        'fee_referral', 'fee_shipping', 'fee_noon_promo', 'fee_noon_markup',
        'fee_outbound_fbn', 'fee_weight_handling', 'fee_crossdock', 'fee_directship_outbound',
        'fee_damaged_return', 'fee_noon_penalty', 'fee_item_cancellation', 'fee_warranty_penalty',
        'fee_retention_penalty', 'fee_alternate_seller_fulfillment', 'fee_miscellaneous',
        'fee_direct_collection', 'fee_reinvoicing', 'fee_noon_rocket_referral'
      ];
      
      return sum + fees.reduce((feeSum, feeField) => {
        return feeSum + (Number(order[feeField as keyof NoonOrderFeesData]) || 0);
      }, 0);
    }, 0);

    const netPayment = feesData.reduce((sum, order) => sum + (Number(order.total_payment) || 0), 0);

    // Calculate costs for orders that have cost data
    let totalCosts = 0;
    let ordersWithCosts = 0;

    feesData.forEach(order => {
      const costData = skuCosts.find(c => c.sku === order.sku);
      if (costData) {
        totalCosts += costData.cost;
        ordersWithCosts++;
      }
    });

    const uniqueSkus = new Set(feesData.map(order => order.sku).filter(Boolean));
    const skusWithCosts = skuCosts.filter(cost => uniqueSkus.has(cost.sku)).length;

    const totalProfit = netPayment - totalCosts;
    const profitMargin = netPayment > 0 ? (totalProfit / netPayment) * 100 : 0;

    return {
      totalOrders,
      totalRevenue,
      totalFees,
      totalCosts,
      netPayment,
      totalProfit,
      profitMargin,
      ordersWithCosts,
      skusWithCosts,
      totalSkus: uniqueSkus.size
    };
  };

  const getTopProfitableSKUs = () => {
    const skuProfitMap = new Map<string, {
      orders: number;
      revenue: number;
      fees: number;
      netPayment: number;
      cost: number;
      profit: number;
      margin: number;
    }>();

    feesData.forEach(order => {
      const sku = order.sku;
      const costData = skuCosts.find(c => c.sku === sku);
      
      if (!costData) return; // Skip SKUs without cost data

      if (!skuProfitMap.has(sku)) {
        skuProfitMap.set(sku, {
          orders: 0,
          revenue: 0,
          fees: 0,
          netPayment: 0,
          cost: 0,
          profit: 0,
          margin: 0
        });
      }

      const skuData = skuProfitMap.get(sku)!;
      const fees = [
        'fee_referral', 'fee_shipping', 'fee_noon_promo', 'fee_noon_markup',
        'fee_outbound_fbn', 'fee_weight_handling', 'fee_crossdock', 'fee_directship_outbound',
        'fee_damaged_return', 'fee_noon_penalty', 'fee_item_cancellation', 'fee_warranty_penalty',
        'fee_retention_penalty', 'fee_alternate_seller_fulfillment', 'fee_miscellaneous',
        'fee_direct_collection', 'fee_reinvoicing', 'fee_noon_rocket_referral'
      ];

      const orderFees = fees.reduce((sum, feeField) => {
        return sum + (Number(order[feeField as keyof NoonOrderFeesData]) || 0);
      }, 0);

      skuData.orders += 1;
      skuData.revenue += Number(order.invoice_price) || 0;
      skuData.fees += orderFees;
      skuData.netPayment += Number(order.total_payment) || 0;
      skuData.cost += costData.cost;
      skuData.profit = skuData.netPayment - skuData.cost;
      skuData.margin = skuData.netPayment > 0 ? (skuData.profit / skuData.netPayment) * 100 : 0;
    });

    return Array.from(skuProfitMap.entries())
      .map(([sku, data]) => ({ sku, ...data }))
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 5);
  };

  const summary = calculateProfitSummary();
  const topProfitableSKUs = getTopProfitableSKUs();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatPercentage = (percentage: number) => {
    return `${percentage.toFixed(1)}%`;
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">From {summary.totalOrders} orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Costs</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(summary.totalCosts)}</div>
            <p className="text-xs text-muted-foreground">{summary.ordersWithCosts} orders with costs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${summary.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(summary.totalProfit)}
            </div>
            <p className="text-xs text-muted-foreground">After costs & fees</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profit Margin</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${summary.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatPercentage(summary.profitMargin)}
            </div>
            <p className="text-xs text-muted-foreground">Overall margin</p>
          </CardContent>
        </Card>
      </div>

      {/* Cost Coverage Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Cost Coverage Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{summary.skusWithCosts}</div>
              <div className="text-sm text-muted-foreground">SKUs with costs</div>
              <Badge variant={summary.skusWithCosts === summary.totalSkus ? "default" : "secondary"} className="mt-1">
                {summary.totalSkus > 0 ? Math.round((summary.skusWithCosts / summary.totalSkus) * 100) : 0}% Complete
              </Badge>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{summary.totalSkus - summary.skusWithCosts}</div>
              <div className="text-sm text-muted-foreground">SKUs missing costs</div>
              {summary.totalSkus - summary.skusWithCosts > 0 && (
                <Badge variant="secondary" className="mt-1 bg-red-100 text-red-800">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Incomplete
                </Badge>
              )}
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{summary.ordersWithCosts}</div>
              <div className="text-sm text-muted-foreground">Orders with cost data</div>
              <div className="text-xs text-muted-foreground mt-1">
                {summary.totalOrders > 0 ? Math.round((summary.ordersWithCosts / summary.totalOrders) * 100) : 0}% of orders
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Profitable SKUs */}
      {topProfitableSKUs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Profitable SKUs</CardTitle>
            <p className="text-sm text-muted-foreground">SKUs with highest profit margins (cost data available)</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topProfitableSKUs.map((sku, index) => (
                <div key={sku.sku} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <Badge variant="secondary">#{index + 1}</Badge>
                    <div>
                      <div className="font-medium">{sku.sku}</div>
                      <div className="text-sm text-muted-foreground">{sku.orders} orders</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-semibold ${sku.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(sku.profit)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatPercentage(sku.margin)} margin
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Gross Revenue:</span>
                <span className="font-semibold">{formatCurrency(summary.totalRevenue)}</span>
              </div>
              <div className="flex justify-between">
                <span>Platform Fees:</span>
                <span className="font-semibold text-red-600">-{formatCurrency(summary.totalFees)}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="font-medium">Net Payment:</span>
                <span className="font-bold">{formatCurrency(summary.netPayment)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Profit Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Net Payment:</span>
                <span className="font-semibold">{formatCurrency(summary.netPayment)}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Costs:</span>
                <span className="font-semibold text-red-600">-{formatCurrency(summary.totalCosts)}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="font-medium">Final Profit:</span>
                <span className={`font-bold ${summary.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(summary.totalProfit)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Profit Margin:</span>
                <span className={`font-semibold ${summary.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatPercentage(summary.profitMargin)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}