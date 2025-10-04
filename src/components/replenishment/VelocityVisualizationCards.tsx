import { Card } from '@/components/ui/card';
import { UnifiedVelocityItem } from '@/hooks/useUnifiedVelocityAnalytics';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

interface VelocityVisualizationCardsProps {
  items: UnifiedVelocityItem[];
  loading: boolean;
}

export function VelocityVisualizationCards({ items, loading }: VelocityVisualizationCardsProps) {
  const velocityDistribution = [
    { name: 'Fast Moving', value: items.filter(i => i.velocity_category === 'Fast Moving').length, color: '#10b981' },
    { name: 'Medium Moving', value: items.filter(i => i.velocity_category === 'Medium Moving').length, color: '#3b82f6' },
    { name: 'Slow Moving', value: items.filter(i => i.velocity_category === 'Slow Moving').length, color: '#f59e0b' },
    { name: 'No Sales', value: items.filter(i => i.velocity_category === 'No Sales').length, color: '#ef4444' }
  ];

  const topPerformers = items
    .filter(i => i.sales_velocity > 0)
    .sort((a, b) => b.sales_velocity - a.sales_velocity)
    .slice(0, 10)
    .map(item => ({
      name: item.sku || item.asin.substring(0, 10),
      velocity: Number(item.sales_velocity.toFixed(2)),
      recommended: item.recommended_reorder_quantity
    }));

  const stockHealth = [
    { name: 'Critical (<7d)', value: items.filter(i => i.days_until_stockout !== null && i.days_until_stockout <= 7).length, color: '#ef4444' },
    { name: 'Low (7-14d)', value: items.filter(i => i.days_until_stockout !== null && i.days_until_stockout > 7 && i.days_until_stockout <= 14).length, color: '#f59e0b' },
    { name: 'Adequate (14-30d)', value: items.filter(i => i.days_until_stockout !== null && i.days_until_stockout > 14 && i.days_until_stockout <= 30).length, color: '#10b981' },
    { name: 'Good (>30d)', value: items.filter(i => i.days_until_stockout !== null && i.days_until_stockout > 30).length, color: '#3b82f6' }
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="p-6 animate-pulse">
            <div className="h-64 bg-muted rounded" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      {/* Velocity Distribution */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Velocity Distribution</h3>
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
              {velocityDistribution.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </Card>

      {/* Top Performers */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Top 10 Performers</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={topPerformers}>
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="velocity" fill="#3b82f6" name="Velocity" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Stock Health */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Stock Health Distribution</h3>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={stockHealth}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, value }) => `${name}: ${value}`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {stockHealth.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </Card>

      {/* Trend Analysis */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Velocity Trends</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-green-500/10 rounded-lg">
            <span className="font-medium text-green-600">📈 Trending Up</span>
            <span className="text-2xl font-bold">{items.filter(i => i.velocity_trend === 'trending_up').length}</span>
          </div>
          <div className="flex items-center justify-between p-4 bg-blue-500/10 rounded-lg">
            <span className="font-medium text-blue-600">➡️ Stable</span>
            <span className="text-2xl font-bold">{items.filter(i => i.velocity_trend === 'stable').length}</span>
          </div>
          <div className="flex items-center justify-between p-4 bg-red-500/10 rounded-lg">
            <span className="font-medium text-red-600">📉 Trending Down</span>
            <span className="text-2xl font-bold">{items.filter(i => i.velocity_trend === 'trending_down').length}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
