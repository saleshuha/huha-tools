import React, { useMemo } from 'react';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Package, PackageCheck, PackageX, ShoppingCart, AlertTriangle,
  TrendingUp, Printer, Clock, Truck, RefreshCw, Download,
  BarChart3, Layers, Box, CircleDot, Repeat, DollarSign,
  Zap, Activity, CalendarClock, CreditCard, CheckCircle2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { toast } from 'sonner';

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(142 71% 45%)',
  'hsl(38 92% 50%)',
  'hsl(280 65% 60%)',
  'hsl(340 75% 55%)',
  'hsl(var(--destructive))',
];

interface MetricPillProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  highlight?: boolean;
  onClick?: () => void;
}

function MetricPill({ icon: Icon, label, value, highlight, onClick }: MetricPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-all ${
        highlight ? 'bg-primary/10 text-primary font-semibold' : 'bg-muted/50 text-foreground'
      } ${onClick ? 'hover:bg-muted/80 cursor-pointer' : 'cursor-default'}`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-semibold text-sm">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </span>
    </button>
  );
}

function SectionSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3"><Skeleton className="h-5 w-40" /></CardHeader>
      <CardContent>
        <div className="flex gap-2 flex-wrap">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-9 w-32" />)}
        </div>
      </CardContent>
    </Card>
  );
}

function formatCurrency(val: number) {
  if (val >= 1000) return `$${(val / 1000).toFixed(1)}k`;
  return `$${val.toFixed(0)}`;
}

export function MetricsDashboard() {
  const {
    inventoryMetrics,
    velocityMetrics,
    poMetrics,
    fulfillmentMetrics,
    isLoadingInventory,
    isLoadingSecondary,
    refreshAll,
  } = useDashboardMetrics();
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try { await refreshAll(); } finally { setIsRefreshing(false); }
  };

  const handleExport = () => {
    const lines = ['Section,Metric,Value'];
    if (inventoryMetrics) {
      lines.push(
        `Inventory,Total ASINs,${inventoryMetrics.totalAsins}`,
        `Inventory,Total SKUs,${inventoryMetrics.totalSkus}`,
        `Inventory,In Stock,${inventoryMetrics.inStockCount}`,
        `Inventory,Out of Stock,${inventoryMetrics.outOfStockCount}`,
        `Inventory,Total ASIN Units,${inventoryMetrics.totalAsinUnits}`,
        `Inventory,Total SKU Units,${inventoryMetrics.totalSkuUnits}`,
        `Inventory,Sold ASIN (30d),${inventoryMetrics.soldAsinUnits}`,
        `Inventory,Sold SKU (30d),${inventoryMetrics.soldSkuUnits}`,
        `Inventory,Missing SKU,${inventoryMetrics.missingSku}`,
        `Inventory,Missing Title,${inventoryMetrics.missingTitle}`,
      );
    }
    if (velocityMetrics) {
      lines.push(
        `Velocity,Fast Moving,${velocityMetrics.fastMoving}`,
        `Velocity,Medium Moving,${velocityMetrics.mediumMoving}`,
        `Velocity,Slow Moving,${velocityMetrics.slowMoving}`,
        `Velocity,No Sales,${velocityMetrics.noSales}`,
        `Velocity,Week Sales,${velocityMetrics.weekSales}`,
        `Velocity,Avg Daily Sales,${velocityMetrics.avgDailySales.toFixed(1)}`,
      );
    }
    if (poMetrics) {
      lines.push(
        `PO,Unique POs,${poMetrics.uniquePOs}`,
        `PO,Active Orders,${poMetrics.activeOrders}`,
        `PO,Active Quantity,${poMetrics.activeQuantity}`,
        `PO,Pending,${poMetrics.statusBreakdown.pending.count}`,
        `PO,Ordered,${poMetrics.statusBreakdown.ordered.count}`,
        `PO,Shipped,${poMetrics.statusBreakdown.shipped.count}`,
        `PO,Delivered,${poMetrics.statusBreakdown.delivered.count}`,
        `PO,Due This Week,${poMetrics.timeline.thisWeek}`,
        `PO,Delayed,${poMetrics.timeline.delayed}`,
      );
    }
    if (fulfillmentMetrics) {
      lines.push(
        `Fulfillment,Total Value,${fulfillmentMetrics.totalValue}`,
        `Fulfillment,Paid Value,${fulfillmentMetrics.paidValue}`,
        `Fulfillment,Pending Value,${fulfillmentMetrics.pendingValue}`,
        `Fulfillment,Overdue Value,${fulfillmentMetrics.overdueValue}`,
      );
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard-metrics-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Metrics exported');
  };

  // Charts
  const velocityChartData = useMemo(() => {
    if (!velocityMetrics) return [];
    return [
      { name: 'Fast', value: velocityMetrics.fastMoving },
      { name: 'Medium', value: velocityMetrics.mediumMoving },
      { name: 'Slow', value: velocityMetrics.slowMoving },
      { name: 'No Sales', value: velocityMetrics.noSales },
    ].filter(d => d.value > 0);
  }, [velocityMetrics]);

  const poStatusChartData = useMemo(() => {
    if (!poMetrics) return [];
    return Object.entries(poMetrics.statusBreakdown)
      .map(([name, { count }]) => ({ name, count }))
      .filter(d => d.count > 0);
  }, [poMetrics]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Dashboard Metrics</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={handleExport}>
            <Download className="h-3.5 w-3.5" />
            Export
          </Button>
        </div>
      </div>

      {/* ===== INVENTORY ===== */}
      {isLoadingInventory ? <SectionSkeleton /> : inventoryMetrics && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              Inventory Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              <MetricPill icon={Layers} label="ASINs" value={inventoryMetrics.totalAsins} highlight onClick={() => navigate('/inventory')} />
              <MetricPill icon={Box} label="SKUs" value={inventoryMetrics.totalSkus} onClick={() => navigate('/inventory')} />
              <MetricPill icon={PackageCheck} label="In Stock" value={inventoryMetrics.inStockCount} onClick={() => navigate('/inventory')} />
              <MetricPill icon={PackageX} label="Out of Stock" value={inventoryMetrics.outOfStockCount} highlight={inventoryMetrics.outOfStockCount > 0} onClick={() => navigate('/inventory')} />
              <MetricPill icon={Package} label="ASIN Units" value={inventoryMetrics.totalAsinUnits} onClick={() => navigate('/inventory')} />
              <MetricPill icon={Package} label="SKU Units" value={inventoryMetrics.totalSkuUnits} onClick={() => navigate('/inventory')} />
              <MetricPill icon={ShoppingCart} label="Sold ASIN (30d)" value={inventoryMetrics.soldAsinUnits} onClick={() => navigate('/inventory')} />
              <MetricPill icon={ShoppingCart} label="Sold SKU (30d)" value={inventoryMetrics.soldSkuUnits} onClick={() => navigate('/inventory')} />
            </div>
            {(inventoryMetrics.missingSku > 0 || inventoryMetrics.missingTitle > 0) && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {inventoryMetrics.missingSku > 0 && <MetricPill icon={AlertTriangle} label="Missing SKU" value={inventoryMetrics.missingSku} highlight onClick={() => navigate('/inventory')} />}
                {inventoryMetrics.missingTitle > 0 && <MetricPill icon={AlertTriangle} label="Missing Title" value={inventoryMetrics.missingTitle} highlight onClick={() => navigate('/inventory')} />}
                {inventoryMetrics.missingImage > 0 && <MetricPill icon={AlertTriangle} label="Missing Image" value={inventoryMetrics.missingImage} onClick={() => navigate('/inventory')} />}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ===== VELOCITY / REPLENISHMENT ===== */}
      {isLoadingSecondary ? <SectionSkeleton /> : velocityMetrics && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Repeat className="h-4 w-4 text-primary" />
              Sales Velocity & Replenishment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              <MetricPill icon={Zap} label="Fast Moving" value={velocityMetrics.fastMoving} highlight onClick={() => navigate('/replenishment')} />
              <MetricPill icon={Activity} label="Medium" value={velocityMetrics.mediumMoving} onClick={() => navigate('/replenishment')} />
              <MetricPill icon={Clock} label="Slow" value={velocityMetrics.slowMoving} onClick={() => navigate('/replenishment')} />
              <MetricPill icon={PackageX} label="No Sales" value={velocityMetrics.noSales} onClick={() => navigate('/replenishment')} />
              <MetricPill icon={TrendingUp} label="Week Sales" value={velocityMetrics.weekSales} highlight onClick={() => navigate('/replenishment')} />
              <MetricPill icon={BarChart3} label="Avg Daily" value={velocityMetrics.avgDailySales.toFixed(1)} />
            </div>

            {/* Velocity Pie */}
            {velocityChartData.length > 0 && (
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={velocityChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {velocityChartData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Urgent restocks */}
            {velocityMetrics.urgentRestocks.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" /> Top Urgent Restocks
                </p>
                <div className="grid gap-1">
                  {velocityMetrics.urgentRestocks.slice(0, 5).map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-xs px-2 py-1 rounded bg-muted/30">
                      <span className="truncate max-w-[200px]">{item.title || item.asin_id}</span>
                      <span className="font-semibold text-primary">{item.recommendation} units</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ===== AMAZON / PO ===== */}
      {isLoadingSecondary ? <SectionSkeleton /> : poMetrics && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Amazon / Purchase Orders
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              <MetricPill icon={Layers} label="Unique POs" value={poMetrics.uniquePOs} highlight onClick={() => navigate('/po-tracker')} />
              <MetricPill icon={Box} label="Active Items" value={poMetrics.activeOrders} onClick={() => navigate('/po-tracker')} />
              <MetricPill icon={Package} label="Active Qty" value={poMetrics.activeQuantity} onClick={() => navigate('/po-tracker')} />
            </div>

            {/* Status breakdown with values */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {Object.entries(poMetrics.statusBreakdown).map(([status, { count, value }]) => (
                <MetricPill
                  key={status}
                  icon={status === 'delivered' ? CheckCircle2 : status === 'shipped' ? Truck : status === 'ordered' ? Printer : CircleDot}
                  label={`${status} (${formatCurrency(value)})`}
                  value={count}
                  highlight={status === 'pending' && count > 0}
                  onClick={() => navigate('/po-tracker')}
                />
              ))}
            </div>

            {/* Timeline */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <MetricPill icon={CalendarClock} label="Due This Week" value={poMetrics.timeline.thisWeek} onClick={() => navigate('/po-tracker')} />
              <MetricPill icon={CalendarClock} label="Due This Month" value={poMetrics.timeline.thisMonth} onClick={() => navigate('/po-tracker')} />
              {poMetrics.timeline.delayed > 0 && (
                <MetricPill icon={AlertTriangle} label="Delayed" value={poMetrics.timeline.delayed} highlight onClick={() => navigate('/po-tracker')} />
              )}
            </div>

            {/* PO Status Bar Chart */}
            {poStatusChartData.length > 0 && (
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={poStatusChartData} margin={{ left: 0, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ===== FULFILLMENT / PAYMENTS ===== */}
      {isLoadingSecondary ? <SectionSkeleton /> : fulfillmentMetrics && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />
              Fulfillment & Payments
              <span className="text-xs font-normal text-muted-foreground">({fulfillmentMetrics.creditDays}d credit)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              <MetricPill icon={DollarSign} label="Total Value" value={formatCurrency(fulfillmentMetrics.totalValue)} highlight onClick={() => navigate('/amazon-orders')} />
              <MetricPill icon={CheckCircle2} label={`Paid (${fulfillmentMetrics.paidCount})`} value={formatCurrency(fulfillmentMetrics.paidValue)} onClick={() => navigate('/amazon-orders')} />
              <MetricPill icon={Clock} label={`Pending (${fulfillmentMetrics.pendingCount})`} value={formatCurrency(fulfillmentMetrics.pendingValue)} onClick={() => navigate('/amazon-orders')} />
              {fulfillmentMetrics.overdueCount > 0 && (
                <MetricPill icon={AlertTriangle} label={`Overdue (${fulfillmentMetrics.overdueCount})`} value={formatCurrency(fulfillmentMetrics.overdueValue)} highlight onClick={() => navigate('/amazon-orders')} />
              )}
            </div>
            {/* Upcoming payments */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <MetricPill icon={CalendarClock} label={`Due 7d (${fulfillmentMetrics.upcomingPayments.next7Days.count})`} value={formatCurrency(fulfillmentMetrics.upcomingPayments.next7Days.value)} onClick={() => navigate('/amazon-orders')} />
              <MetricPill icon={CalendarClock} label={`Due 30d (${fulfillmentMetrics.upcomingPayments.next30Days.count})`} value={formatCurrency(fulfillmentMetrics.upcomingPayments.next30Days.value)} onClick={() => navigate('/amazon-orders')} />
              <MetricPill icon={CalendarClock} label={`Due 90d (${fulfillmentMetrics.upcomingPayments.next90Days.count})`} value={formatCurrency(fulfillmentMetrics.upcomingPayments.next90Days.value)} onClick={() => navigate('/amazon-orders')} />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
