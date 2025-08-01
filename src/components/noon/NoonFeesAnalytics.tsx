import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NoonOrderFeesData, NoonFeesSummary } from "@/types/noon-fees";
import { DollarSign, Package, TrendingDown, TrendingUp } from "lucide-react";

interface NoonFeesAnalyticsProps {
  feesData: NoonOrderFeesData[];
}

export function NoonFeesAnalytics({ feesData }: NoonFeesAnalyticsProps) {
  const calculateSummary = (): NoonFeesSummary => {
    if (feesData.length === 0) {
      return {
        totalOrders: 0,
        totalRevenue: 0,
        totalFees: 0,
        netPayment: 0,
        averageOrderValue: 0,
        totalReturns: 0,
        returnRate: 0
      };
    }

    const totalOrders = feesData.length;
    const totalRevenue = feesData.reduce((sum, order) => sum + (order.invoice_price || 0), 0);
    const totalFees = feesData.reduce((sum, order) => {
      return sum + (
        (order.fee_referral || 0) +
        (order.fee_shipping || 0) +
        (order.fee_noon_promo || 0) +
        (order.fee_noon_markup || 0) +
        (order.fee_outbound_fbn || 0) +
        (order.fee_weight_handling || 0) +
        (order.fee_crossdock || 0) +
        (order.fee_directship_outbound || 0) +
        (order.fee_damaged_return || 0) +
        (order.fee_noon_penalty || 0) +
        (order.fee_item_cancellation || 0) +
        (order.fee_warranty_penalty || 0) +
        (order.fee_retention_penalty || 0) +
        (order.fee_alternate_seller_fulfillment || 0) +
        (order.fee_miscellaneous || 0) +
        (order.fee_direct_collection || 0) +
        (order.fee_reinvoicing || 0)
      );
    }, 0);
    const netPayment = feesData.reduce((sum, order) => sum + (order.total_payment || 0), 0);
    const averageOrderValue = totalRevenue / totalOrders;
    const totalReturns = feesData.filter(order => order.returned_date).length;
    const returnRate = (totalReturns / totalOrders) * 100;

    return {
      totalOrders,
      totalRevenue,
      totalFees,
      netPayment,
      averageOrderValue,
      totalReturns,
      returnRate
    };
  };

  const getTopPerformingSKUs = () => {
    const skuMap = new Map<string, {
      orders: number;
      revenue: number;
      fees: number;
      netPayment: number;
    }>();

    feesData.forEach(order => {
      const sku = order.sku;
      if (!skuMap.has(sku)) {
        skuMap.set(sku, { orders: 0, revenue: 0, fees: 0, netPayment: 0 });
      }
      
      const skuData = skuMap.get(sku)!;
      skuData.orders += 1;
      skuData.revenue += order.invoice_price || 0;
      skuData.netPayment += order.total_payment || 0;
      skuData.fees += (
        (order.fee_referral || 0) +
        (order.fee_shipping || 0) +
        (order.fee_noon_promo || 0) +
        (order.fee_noon_markup || 0) +
        (order.fee_outbound_fbn || 0) +
        (order.fee_weight_handling || 0) +
        (order.fee_crossdock || 0) +
        (order.fee_directship_outbound || 0) +
        (order.fee_damaged_return || 0) +
        (order.fee_noon_penalty || 0) +
        (order.fee_item_cancellation || 0) +
        (order.fee_warranty_penalty || 0) +
        (order.fee_retention_penalty || 0) +
        (order.fee_alternate_seller_fulfillment || 0) +
        (order.fee_miscellaneous || 0) +
        (order.fee_direct_collection || 0) +
        (order.fee_reinvoicing || 0)
      );
    });

    return Array.from(skuMap.entries())
      .map(([sku, data]) => ({ sku, ...data }))
      .sort((a, b) => b.netPayment - a.netPayment)
      .slice(0, 5);
  };

  const getFeeBreakdown = () => {
    const breakdown = {
      referralFees: 0,
      shippingFees: 0,
      penaltyFees: 0,
      fulfillmentFees: 0,
      otherFees: 0
    };

    feesData.forEach(order => {
      breakdown.referralFees += (order.fee_referral || 0) + (order.fee_noon_rocket_referral || 0);
      breakdown.shippingFees += (order.fee_shipping || 0) + (order.fee_outbound_fbn || 0) + (order.fee_directship_outbound || 0);
      breakdown.penaltyFees += (order.fee_noon_penalty || 0) + (order.fee_warranty_penalty || 0) + (order.fee_retention_penalty || 0);
      breakdown.fulfillmentFees += (order.fee_weight_handling || 0) + (order.fee_crossdock || 0) + (order.fee_alternate_seller_fulfillment || 0);
      breakdown.otherFees += (order.fee_noon_promo || 0) + (order.fee_noon_markup || 0) + (order.fee_damaged_return || 0) + (order.fee_item_cancellation || 0) + (order.fee_miscellaneous || 0) + (order.fee_direct_collection || 0) + (order.fee_reinvoicing || 0);
    });

    return breakdown;
  };

  const summary = calculateSummary();
  const topSKUs = getTopPerformingSKUs();
  const feeBreakdown = getFeeBreakdown();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 2
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalOrders.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.totalRevenue)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Fees</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(summary.totalFees)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Payment</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(summary.netPayment)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Fee Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Fee Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-lg font-semibold">{formatCurrency(feeBreakdown.referralFees)}</div>
              <div className="text-sm text-muted-foreground">Referral Fees</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold">{formatCurrency(feeBreakdown.shippingFees)}</div>
              <div className="text-sm text-muted-foreground">Shipping Fees</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold">{formatCurrency(feeBreakdown.fulfillmentFees)}</div>
              <div className="text-sm text-muted-foreground">Fulfillment Fees</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold">{formatCurrency(feeBreakdown.penaltyFees)}</div>
              <div className="text-sm text-muted-foreground">Penalty Fees</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold">{formatCurrency(feeBreakdown.otherFees)}</div>
              <div className="text-sm text-muted-foreground">Other Fees</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Performing SKUs */}
      <Card>
        <CardHeader>
          <CardTitle>Top Performing SKUs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topSKUs.map((sku, index) => (
              <div key={sku.sku} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <Badge variant="secondary">#{index + 1}</Badge>
                  <div>
                    <div className="font-medium">{sku.sku}</div>
                    <div className="text-sm text-muted-foreground">{sku.orders} orders</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{formatCurrency(sku.netPayment)}</div>
                  <div className="text-sm text-muted-foreground">Net Payment</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Return Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Return Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Total Returns:</span>
                <span className="font-semibold">{summary.totalReturns}</span>
              </div>
              <div className="flex justify-between">
                <span>Return Rate:</span>
                <span className="font-semibold">{summary.returnRate.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between">
                <span>Average Order Value:</span>
                <span className="font-semibold">{formatCurrency(summary.averageOrderValue)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Profit Margin</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Revenue:</span>
                <span className="font-semibold">{formatCurrency(summary.totalRevenue)}</span>
              </div>
              <div className="flex justify-between">
                <span>Fees:</span>
                <span className="font-semibold text-red-600">-{formatCurrency(summary.totalFees)}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="font-medium">Net Profit:</span>
                <span className="font-bold text-green-600">{formatCurrency(summary.netPayment)}</span>
              </div>
              <div className="flex justify-between">
                <span>Margin:</span>
                <span className="font-semibold">
                  {summary.totalRevenue > 0 ? ((summary.netPayment / summary.totalRevenue) * 100).toFixed(2) : 0}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}