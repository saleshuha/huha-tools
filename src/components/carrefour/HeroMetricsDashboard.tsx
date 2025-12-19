import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Package, 
  Receipt, 
  Calculator,
  ChevronDown,
  ChevronUp,
  Wallet,
  PiggyBank,
  BarChart3,
  CircleDollarSign
} from "lucide-react";

interface Metrics {
  totalRevenue: number;
  totalCosts: number;
  totalProfit: number;
  totalInvestment: number;
  totalPlatformFees: number;
  revenueMinusFees: number;
  totalPendingAmount: number;
  totalPendingPayments: number;
  totalPendingCost: number;
  totalPendingProfit: number;
  totalPaidAmount: number;
  totalPaidPayments: number;
  totalFees: number;
  profitMargin: number;
  totalOrders: number;
  profitableOrders: number;
  deliveredItems: number;
  deliveredValue: number;
  deliveredCost: number;
  deliveredProfit: number;
  returnedItems: number;
  returnedValue: number;
  cancelledItems: number;
  cancelledValue: number;
  shippedItems: number;
  shippedValue: number;
  otherItems: number;
  otherValue: number;
}

interface HeroMetricsDashboardProps {
  metrics: Metrics;
  formatCurrency: (amount: number) => string;
  onCardClick: (filterType: string, title: string) => void;
}

export function HeroMetricsDashboard({ metrics, formatCurrency, onCardClick }: HeroMetricsDashboardProps) {
  const [showDetails, setShowDetails] = useState(false);

  // Calculate additional derived metrics
  const profitTrend = metrics.profitMargin >= 0;
  const deliveredInvestment = metrics.deliveredCost + metrics.deliveredProfit;
  const pendingInvestment = metrics.totalPendingCost + metrics.totalPendingProfit;

  return (
    <div className="space-y-4">
      {/* Hero KPIs - 4 Main Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Sale */}
        <Card 
          className="relative overflow-hidden cursor-pointer group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-emerald-500 to-emerald-600 dark:from-emerald-600 dark:to-emerald-700"
          onClick={() => onCardClick('revenue', 'Total Sale')}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-emerald-100">Total Sale</CardTitle>
              <div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white mb-2">{formatCurrency(metrics.totalRevenue)}</div>
            <div className="flex items-center gap-2">
              <Badge className="bg-white/20 hover:bg-white/30 text-white border-0 text-xs">
                {metrics.totalOrders} orders
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Total Delivered */}
        <Card 
          className="relative overflow-hidden cursor-pointer group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-green-500 to-green-600 dark:from-green-600 dark:to-green-700"
          onClick={() => onCardClick('delivered', 'Total Delivered')}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-green-100">Total Delivered</CardTitle>
              <div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm">
                <Package className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white mb-2">{formatCurrency(metrics.deliveredValue)}</div>
            <div className="flex items-center gap-2">
              <Badge className="bg-white/20 hover:bg-white/30 text-white border-0 text-xs">
                {metrics.deliveredItems} delivered
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Total Paid */}
        <Card 
          className="relative overflow-hidden cursor-pointer group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700"
          onClick={() => onCardClick('paid', 'Total Paid')}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-blue-100">Total Paid</CardTitle>
              <div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm">
                <Wallet className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white mb-2">{formatCurrency(metrics.totalPaidAmount)}</div>
            <div className="flex items-center gap-2">
              <Badge className="bg-white/20 hover:bg-white/30 text-white border-0 text-xs">
                {metrics.totalPaidPayments} payments
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Total Pending to Receive */}
        <Card 
          className="relative overflow-hidden cursor-pointer group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-orange-500 to-orange-600 dark:from-orange-600 dark:to-orange-700"
          onClick={() => onCardClick('pending', 'Total Pending to Receive')}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-orange-100">Pending to Receive</CardTitle>
              <div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm">
                <Receipt className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white mb-2">{formatCurrency(metrics.totalPendingAmount)}</div>
            <div className="flex items-center gap-2">
              <Badge className="bg-white/20 hover:bg-white/30 text-white border-0 text-xs">
                {metrics.totalPendingPayments} pending
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Collapsible Secondary Metrics */}
      <Collapsible open={showDetails} onOpenChange={setShowDetails}>
        <CollapsibleTrigger asChild>
          <Button 
            variant="outline" 
            className="w-full justify-between h-10 bg-card hover:bg-muted/50 border-dashed"
          >
            <span className="flex items-center gap-2 text-muted-foreground">
              <BarChart3 className="h-4 w-4" />
              {showDetails ? 'Hide' : 'Show'} Financial Breakdown
            </span>
            {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="pt-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Shipped Revenue */}
            <Card 
              className="cursor-pointer hover:shadow-md transition-all border-l-4 border-l-cyan-500 hover:border-l-cyan-600"
              onClick={() => onCardClick('shipped', 'Shipped Revenue')}
            >
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <Package className="h-4 w-4 text-cyan-600" />
                  <span className="text-xs font-medium text-muted-foreground">Shipped</span>
                </div>
                <div className="text-lg font-bold">{formatCurrency(metrics.shippedValue)}</div>
                <div className="text-xs text-muted-foreground">{metrics.shippedItems} orders</div>
              </CardContent>
            </Card>

            {/* Total Costs */}
            <Card 
              className="cursor-pointer hover:shadow-md transition-all border-l-4 border-l-red-500 hover:border-l-red-600"
              onClick={() => onCardClick('costs', 'Total Costs')}
            >
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <Calculator className="h-4 w-4 text-red-600" />
                  <span className="text-xs font-medium text-muted-foreground">Total Costs</span>
                </div>
                <div className="text-lg font-bold">{formatCurrency(metrics.totalCosts)}</div>
                <div className="text-xs text-muted-foreground">Cost of goods</div>
              </CardContent>
            </Card>

            {/* Platform Fees */}
            <Card 
              className="cursor-pointer hover:shadow-md transition-all border-l-4 border-l-amber-500 hover:border-l-amber-600"
              onClick={() => onCardClick('fees', 'Total Platform Fees')}
            >
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <Receipt className="h-4 w-4 text-amber-600" />
                  <span className="text-xs font-medium text-muted-foreground">Platform Fees</span>
                </div>
                <div className="text-lg font-bold">{formatCurrency(metrics.totalPlatformFees)}</div>
                <div className="text-xs text-muted-foreground">Seller charges</div>
              </CardContent>
            </Card>

            {/* Revenue minus Fees */}
            <Card 
              className="cursor-pointer hover:shadow-md transition-all border-l-4 border-l-teal-500 hover:border-l-teal-600"
              onClick={() => onCardClick('all', 'Revenue minus Platform Fees')}
            >
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <CircleDollarSign className="h-4 w-4 text-teal-600" />
                  <span className="text-xs font-medium text-muted-foreground">Net Revenue</span>
                </div>
                <div className="text-lg font-bold">{formatCurrency(metrics.revenueMinusFees)}</div>
                <div className="text-xs text-muted-foreground">After fees</div>
              </CardContent>
            </Card>

            {/* Total Investment */}
            <Card 
              className="cursor-pointer hover:shadow-md transition-all border-l-4 border-l-indigo-500 hover:border-l-indigo-600"
              onClick={() => onCardClick('investment', 'Total Investment')}
            >
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <PiggyBank className="h-4 w-4 text-indigo-600" />
                  <span className="text-xs font-medium text-muted-foreground">Investment</span>
                </div>
                <div className="text-lg font-bold">{formatCurrency(metrics.totalInvestment)}</div>
                <div className="text-xs text-muted-foreground">Profit + Cost</div>
              </CardContent>
            </Card>

            {/* Profitable Orders */}
            <Card 
              className="cursor-pointer hover:shadow-md transition-all border-l-4 border-l-emerald-500 hover:border-l-emerald-600"
              onClick={() => onCardClick('profitable', 'Profitable Orders')}
            >
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                  <span className="text-xs font-medium text-muted-foreground">Profitable</span>
                </div>
                <div className="text-lg font-bold">{metrics.profitableOrders}</div>
                <div className="text-xs text-muted-foreground">orders with profit</div>
              </CardContent>
            </Card>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
