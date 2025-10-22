import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Package, DollarSign } from 'lucide-react';

interface ReportChartsProps {
  data: any[];
  reportType: string;
}

export const ReportCharts: React.FC<ReportChartsProps> = ({ data, reportType }) => {
  // Status distribution data
  const statusData = React.useMemo(() => {
    const statusCount: { [key: string]: number } = {};
    data.forEach(item => {
      const status = item.status || 'unknown';
      statusCount[status] = (statusCount[status] || 0) + 1;
    });
    return Object.entries(statusCount).map(([name, value]) => ({ name, value }));
  }, [data]);

  // Top items by value
  const topItemsByValue = React.useMemo(() => {
    if (reportType === 'inventory') return [];
    return [...data]
      .sort((a, b) => (b.total_cost || 0) - (a.total_cost || 0))
      .slice(0, 10)
      .map(item => ({
        name: item.sku_code || item.asin || 'Unknown',
        value: item.total_cost || 0
      }));
  }, [data, reportType]);

  // Quantity distribution
  const quantityDistribution = React.useMemo(() => {
    const ranges = [
      { name: '1-10', min: 1, max: 10, count: 0 },
      { name: '11-50', min: 11, max: 50, count: 0 },
      { name: '51-100', min: 51, max: 100, count: 0 },
      { name: '101-500', min: 101, max: 500, count: 0 },
      { name: '500+', min: 501, max: Infinity, count: 0 }
    ];

    data.forEach(item => {
      const qty = item.quantity || 0;
      const range = ranges.find(r => qty >= r.min && qty <= r.max);
      if (range) range.count++;
    });

    return ranges.map(({ name, count }) => ({ name, count }));
  }, [data]);

  const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

  if (data.length === 0) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      {/* Status Distribution Pie Chart */}
      {statusData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="h-4 w-4" />
              Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="hsl(var(--primary))"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Top Items by Value */}
      {topItemsByValue.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <DollarSign className="h-4 w-4" />
              Top 10 Items by Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topItemsByValue} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} fontSize={12} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Quantity Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4" />
            Quantity Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={quantityDistribution}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};
