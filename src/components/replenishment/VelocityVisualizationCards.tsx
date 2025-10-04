import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { UnifiedVelocityItem } from "@/hooks/useUnifiedVelocityAnalytics";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface VelocityVisualizationCardsProps {
  items: UnifiedVelocityItem[];
  loading: boolean;
}

const COLORS = {
  'Fast Moving': '#10b981',
  'Medium Moving': '#3b82f6',
  'Slow Moving': '#f59e0b',
  'No Sales': '#ef4444'
};

const TREND_COLORS = {
  'trending_up': '#10b981',
  'stable': '#6b7280',
  'trending_down': '#ef4444'
};

export function VelocityVisualizationCards({ items, loading }: VelocityVisualizationCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader><div className="h-6 bg-muted rounded w-1/3" /></CardHeader>
            <CardContent><div className="h-64 bg-muted rounded" /></CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Velocity Distribution Data
  const velocityDistribution = [
    { name: 'Fast Moving', value: items.filter(i => i.velocity_category === 'Fast Moving').length },
    { name: 'Medium Moving', value: items.filter(i => i.velocity_category === 'Medium Moving').length },
    { name: 'Slow Moving', value: items.filter(i => i.velocity_category === 'Slow Moving').length },
    { name: 'No Sales', value: items.filter(i => i.velocity_category === 'No Sales').length }
  ];

  // Trend Distribution Data
  const trendDistribution = [
    { 
      name: 'Trending Up', 
      value: items.filter(i => i.velocity_trend === 'trending_up').length,
      icon: TrendingUp,
      color: TREND_COLORS.trending_up
    },
    { 
      name: 'Stable', 
      value: items.filter(i => i.velocity_trend === 'stable').length,
      icon: Minus,
      color: TREND_COLORS.stable
    },
    { 
      name: 'Trending Down', 
      value: items.filter(i => i.velocity_trend === 'trending_down').length,
      icon: TrendingDown,
      color: TREND_COLORS.trending_down
    }
  ];

  // Top Performers Data
  const topPerformers = items
    .filter(i => i.sales_velocity > 0)
    .sort((a, b) => b.sales_velocity - a.sales_velocity)
    .slice(0, 10)
    .map(i => ({
      name: i.sku || i.asin.slice(0, 8),
      velocity: Number(i.sales_velocity.toFixed(2))
    }));

  // Stock Health Data
  const stockHealth = [
    { 
      name: 'Critical (≤7 days)', 
      value: items.filter(i => i.days_until_stockout !== null && i.days_until_stockout <= 7).length,
      color: '#ef4444'
    },
    { 
      name: 'Low (8-14 days)', 
      value: items.filter(i => i.days_until_stockout !== null && i.days_until_stockout > 7 && i.days_until_stockout <= 14).length,
      color: '#f59e0b'
    },
    { 
      name: 'Adequate (15-30 days)', 
      value: items.filter(i => i.days_until_stockout !== null && i.days_until_stockout > 14 && i.days_until_stockout <= 30).length,
      color: '#3b82f6'
    },
    { 
      name: 'Healthy (>30 days)', 
      value: items.filter(i => i.days_until_stockout !== null && i.days_until_stockout > 30).length,
      color: '#10b981'
    }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      {/* Velocity Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Velocity Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={velocityDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {velocityDistribution.map((entry) => (
                  <Cell key={entry.name} fill={COLORS[entry.name as keyof typeof COLORS]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Trend Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Velocity Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {trendDistribution.map((trend) => (
              <div key={trend.name} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <trend.icon className="h-5 w-5" style={{ color: trend.color }} />
                  <span className="font-medium">{trend.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">{trend.value}</span>
                  <span className="text-sm text-muted-foreground">items</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Performers */}
      <Card>
        <CardHeader>
          <CardTitle>Top 10 Performers</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={topPerformers}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="velocity" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Stock Health */}
      <Card>
        <CardHeader>
          <CardTitle>Stock Health Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={stockHealth}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {stockHealth.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
