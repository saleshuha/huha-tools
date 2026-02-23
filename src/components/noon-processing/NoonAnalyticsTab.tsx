import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { NoonStore } from '@/hooks/useNoonStores';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { BarChart3, TrendingUp, Store, Globe } from 'lucide-react';

interface AnalyticsOrder {
  id: string;
  order_status: string;
  order_country_code: string;
  created_at: string;
  selected_store_id: string;
  quantity: number;
}

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2, 160 60% 45%))',
  'hsl(var(--chart-3, 30 80% 55%))',
  'hsl(var(--chart-4, 280 65% 60%))',
  'hsl(var(--chart-5, 340 75% 55%))',
];

export function NoonAnalyticsTab({ stores }: { stores: NoonStore[] }) {
  const [orders, setOrders] = useState<AnalyticsOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('noon_processing_orders')
        .select('id, order_status, order_country_code, created_at, selected_store_id, quantity')
        .order('created_at', { ascending: false });
      setOrders((data as any) || []);
      setLoading(false);
    };
    fetchOrders();
  }, []);

  const totalOrders = orders.length;
  const uniqueCountries = useMemo(() => new Set(orders.map(o => o.order_country_code).filter(Boolean)).size, [orders]);
  const topStore = useMemo(() => {
    const counts: Record<string, number> = {};
    orders.forEach(o => { if (o.selected_store_id) counts[o.selected_store_id] = (counts[o.selected_store_id] || 0) + 1; });
    const topId = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
    return stores.find(s => s.id === topId)?.name || 'N/A';
  }, [orders, stores]);

  // Orders per day (last 7 days)
  const dailyData = useMemo(() => {
    const days: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days[d.toISOString().split('T')[0]] = 0;
    }
    orders.forEach(o => {
      const day = o.created_at.split('T')[0];
      if (day in days) days[day]++;
    });
    return Object.entries(days).map(([date, count]) => ({
      date: new Date(date).toLocaleDateString('en', { weekday: 'short', day: 'numeric' }),
      orders: count,
    }));
  }, [orders]);

  // Orders by status
  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    orders.forEach(o => {
      const s = o.order_status || 'Unknown';
      counts[s] = (counts[s] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [orders]);

  // Orders by store
  const storeData = useMemo(() => {
    const counts: Record<string, number> = {};
    orders.forEach(o => {
      const name = stores.find(s => s.id === o.selected_store_id)?.name || 'Unknown';
      counts[name] = (counts[name] || 0) + 1;
    });
    return Object.entries(counts).map(([name, orders]) => ({ name, orders })).sort((a, b) => b.orders - a.orders);
  }, [orders, stores]);

  // Orders by country
  const countryData = useMemo(() => {
    const counts: Record<string, number> = {};
    orders.forEach(o => {
      const c = o.order_country_code || 'Unknown';
      counts[c] = (counts[c] || 0) + 1;
    });
    return Object.entries(counts).map(([name, orders]) => ({ name, orders })).sort((a, b) => b.orders - a.orders);
  }, [orders]);

  const avgDaily = useMemo(() => {
    if (orders.length === 0) return 0;
    const dates = new Set(orders.map(o => o.created_at.split('T')[0]));
    return Math.round(orders.length / Math.max(dates.size, 1));
  }, [orders]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stat Bar */}
      <div className="flex flex-wrap items-center gap-3 p-2.5 rounded-xl bg-card border border-border">
        <div className="flex items-center gap-2 px-3 py-1.5">
          <div className="w-2 h-2 rounded-full bg-primary" />
          <span className="text-xs text-muted-foreground">Total Orders</span>
          <span className="text-sm font-semibold text-foreground">{totalOrders}</span>
        </div>
        <div className="w-px h-6 bg-border" />
        <div className="flex items-center gap-2 px-3 py-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-xs text-muted-foreground">Avg Daily</span>
          <span className="text-sm font-semibold text-foreground">{avgDaily}</span>
        </div>
        <div className="w-px h-6 bg-border" />
        <div className="flex items-center gap-2 px-3 py-1.5">
          <div className="w-2 h-2 rounded-full bg-yellow-500" />
          <span className="text-xs text-muted-foreground">Top Store</span>
          <span className="text-sm font-semibold text-foreground">{topStore}</span>
        </div>
        <div className="w-px h-6 bg-border" />
        <div className="flex items-center gap-2 px-3 py-1.5">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-xs text-muted-foreground">Countries</span>
          <span className="text-sm font-semibold text-foreground">{uniqueCountries}</span>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Orders per Day */}
        <div className="p-4 rounded-xl bg-card border border-border">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" /> Orders per Day (Last 7 Days)
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} />
              <Bar dataKey="orders" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Orders by Status */}
        <div className="p-4 rounded-xl bg-card border border-border">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" /> Orders by Status
          </h3>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40} paddingAngle={2}>
                  {statusData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">No data</div>
          )}
        </div>

        {/* Orders by Store */}
        <div className="p-4 rounded-xl bg-card border border-border">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Store className="h-4 w-4 text-primary" /> Orders by Store
          </h3>
          {storeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={storeData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} />
                <Bar dataKey="orders" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">No data</div>
          )}
        </div>

        {/* Orders by Country */}
        <div className="p-4 rounded-xl bg-card border border-border">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" /> Orders by Country
          </h3>
          {countryData.length > 0 ? (
            <div className="space-y-2">
              {countryData.map((item, i) => (
                <div key={item.name} className="flex items-center gap-3">
                  <span className="text-sm font-medium text-foreground w-12 uppercase">{item.name}</span>
                  <div className="flex-1 h-6 rounded bg-muted/30 overflow-hidden">
                    <div
                      className="h-full rounded transition-all"
                      style={{
                        width: `${(item.orders / Math.max(...countryData.map(c => c.orders))) * 100}%`,
                        backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                      }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-foreground w-10 text-right">{item.orders}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">No data</div>
          )}
        </div>
      </div>
    </div>
  );
}
