import React, { useMemo } from 'react';
import { useDashboardMetrics, DashboardMetrics } from '@/hooks/useDashboardMetrics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Package, PackageCheck, PackageX, ShoppingCart, AlertTriangle,
  TrendingUp, Printer, Clock, MapPin, Truck, RefreshCw, Download,
  BarChart3, Globe, Layers, Box, CircleDot, Repeat, CalendarPlus,
  DollarSign
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { toast } from 'sonner';

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2, 160 60% 45%))',
  'hsl(var(--chart-3, 30 80% 55%))',
  'hsl(var(--chart-4, 280 65% 60%))',
  'hsl(var(--chart-5, 340 75% 55%))',
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
        highlight
          ? 'bg-primary/10 text-primary font-semibold'
          : 'bg-muted/50 text-foreground'
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
    <div className="space-y-3">
      <Skeleton className="h-6 w-48" />
      <div className="flex gap-2 flex-wrap">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-9 w-32" />)}
      </div>
    </div>
  );
}

function exportMetricsCSV(m: DashboardMetrics) {
  const lines = [
    'Section,Metric,Value',
    // Inventory
    `Inventory,Total Items,${m.inventory.total}`,
    `Inventory,In Stock,${m.inventory.inStock}`,
    `Inventory,Out of Stock,${m.inventory.outOfStock}`,
    `Inventory,Sold,${m.inventory.sold}`,
    `Inventory,Ordered,${m.inventory.ordered}`,
    `Inventory,Damaged,${m.inventory.damaged}`,
    `Inventory,Low Stock (1-5),${m.inventory.lowStock}`,
    `Inventory,New (7d),${m.inventory.newLast7Days}`,
    `Inventory,Total Quantity,${m.inventory.totalQuantity}`,
    ...Object.entries(m.inventory.countryBreakdown).map(([k, v]) => `Inventory,Country: ${k},${v}`),
    // PO
    `Amazon PO,Total POs,${m.po.totalPOs}`,
    `Amazon PO,Total Items,${m.po.totalItems}`,
    `Amazon PO,Total Qty,${m.po.totalQty}`,
    `Amazon PO,Printed,${m.po.printedCount}`,
    `Amazon PO,Pending,${m.po.pendingCount}`,
    `Amazon PO,Sunsky Sourced,${m.po.sunskySourced}`,
    `Amazon PO,Total Cost,${m.po.totalCost.toFixed(2)}`,
    ...Object.entries(m.po.locationBreakdown).map(([k, v]) => `Amazon PO,Location: ${k},${v.count} items / ${v.qty} qty`),
    // Replenishment
    `Replenishment,Items Needing Restock,${m.replenishment.itemsNeedingRestock}`,
    `Replenishment,Eligible for Restock,${m.replenishment.eligibleForRestock}`,
    `Replenishment,Avg Days Since Restock,${m.replenishment.avgDaysSinceRestock}`,
  ];

  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `dashboard-metrics-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success('Metrics exported');
}

export function MetricsDashboard() {
  const { data: metrics, isLoading, refetch, isFetching } = useDashboardMetrics();
  const navigate = useNavigate();

  const statusChartData = useMemo(() => {
    if (!metrics) return [];
    return Object.entries(metrics.inventory.statusBreakdown)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name: name.replace(/_/g, ' '), value }));
  }, [metrics]);

  const locationChartData = useMemo(() => {
    if (!metrics) return [];
    return Object.entries(metrics.po.locationBreakdown)
      .map(([name, { qty }]) => ({ name: name.length > 15 ? name.slice(0, 15) + '…' : name, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 8);
  }, [metrics]);

  if (isLoading) {
    return (
      <div className="space-y-6 p-4">
        <SectionSkeleton />
        <SectionSkeleton />
        <SectionSkeleton />
      </div>
    );
  }

  if (!metrics) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">Failed to load metrics. Please log in and try again.</p>
      </Card>
    );
  }

  const m = metrics;

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Dashboard Metrics</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => exportMetricsCSV(m)}>
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* ===== INVENTORY SECTION ===== */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            Inventory Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-1.5 flex-wrap">
            <MetricPill icon={Layers} label="Total" value={m.inventory.total} highlight onClick={() => navigate('/inventory')} />
            <MetricPill icon={PackageCheck} label="In Stock" value={m.inventory.inStock} onClick={() => navigate('/inventory')} />
            <MetricPill icon={PackageX} label="Out of Stock" value={m.inventory.outOfStock} onClick={() => navigate('/inventory')} />
            <MetricPill icon={ShoppingCart} label="Sold" value={m.inventory.sold} onClick={() => navigate('/inventory')} />
            <MetricPill icon={Clock} label="Ordered" value={m.inventory.ordered} onClick={() => navigate('/inventory')} />
            <MetricPill icon={AlertTriangle} label="Low Stock" value={m.inventory.lowStock} highlight={m.inventory.lowStock > 0} onClick={() => navigate('/inventory')} />
            <MetricPill icon={CalendarPlus} label="New (7d)" value={m.inventory.newLast7Days} onClick={() => navigate('/inventory')} />
            <MetricPill icon={Box} label="Total Qty" value={m.inventory.totalQuantity} />
          </div>

          {/* Country breakdown pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {Object.entries(m.inventory.countryBreakdown).map(([country, count]) => (
              <MetricPill key={country} icon={Globe} label={country} value={count} onClick={() => navigate('/inventory')} />
            ))}
          </div>

          {/* Status Pie Chart */}
          {statusChartData.length > 0 && (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {statusChartData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===== REPLENISHMENT SECTION ===== */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Repeat className="h-4 w-4 text-primary" />
            Replenishment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-1.5 flex-wrap">
            <MetricPill icon={AlertTriangle} label="Need Restock" value={m.replenishment.itemsNeedingRestock} highlight={m.replenishment.itemsNeedingRestock > 0} onClick={() => navigate('/replenishment')} />
            <MetricPill icon={PackageCheck} label="Eligible" value={m.replenishment.eligibleForRestock} onClick={() => navigate('/replenishment')} />
            <MetricPill icon={Clock} label="Avg Days Since Restock" value={m.replenishment.avgDaysSinceRestock} />
          </div>
        </CardContent>
      </Card>

      {/* ===== AMAZON / PO SECTION ===== */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Amazon / Purchase Orders
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-1.5 flex-wrap">
            <MetricPill icon={Layers} label="Total POs" value={m.po.totalPOs} highlight onClick={() => navigate('/po-tracker')} />
            <MetricPill icon={Box} label="Total Items" value={m.po.totalItems} onClick={() => navigate('/po-tracker')} />
            <MetricPill icon={Package} label="Total Qty" value={m.po.totalQty} onClick={() => navigate('/po-tracker')} />
            <MetricPill icon={Printer} label="Printed" value={m.po.printedCount} onClick={() => navigate('/po-tracker')} />
            <MetricPill icon={Clock} label="Pending" value={m.po.pendingCount} highlight={m.po.pendingCount > 0} onClick={() => navigate('/po-tracker')} />
            <MetricPill icon={Truck} label="Sunsky Sourced" value={m.po.sunskySourced} onClick={() => navigate('/po-tracker')} />
            <MetricPill icon={DollarSign} label="Total Cost" value={`$${m.po.totalCost.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`} />
          </div>

          {/* PO Status pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {Object.entries(m.po.statusBreakdown).map(([status, count]) => (
              <MetricPill key={status} icon={CircleDot} label={status} value={count} onClick={() => navigate('/po-tracker')} />
            ))}
          </div>

          {/* Location Bar Chart */}
          {locationChartData.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" /> Qty by Location
              </p>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={locationChartData} layout="vertical" margin={{ left: 10, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="qty" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
