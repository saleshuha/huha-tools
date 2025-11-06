import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, BarChart3, Activity } from 'lucide-react';
import { StockChange } from './StockHistoryChangeCard';
import { format, parseISO } from 'date-fns';

interface StockHistoryChartProps {
  changes: StockChange[];
}

export function StockHistoryChart({ changes }: StockHistoryChartProps) {
  const chartData = useMemo(() => {
    // Sort changes chronologically
    const sorted = [...changes].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    
    // Build timeline data
    return sorted.map((change, index) => ({
      date: format(parseISO(change.created_at), 'MMM dd'),
      fullDate: format(parseISO(change.created_at), 'MMM dd, yyyy HH:mm'),
      quantity: change.new_quantity,
      change: change.change_amount,
      cumulative: sorted.slice(0, index + 1).reduce((sum, c) => sum + c.change_amount, 0),
      type: change.reference_type,
    }));
  }, [changes]);

  const changesByType = useMemo(() => {
    const types: Record<string, number> = {};
    changes.forEach(c => {
      const type = c.reference_type || 'unknown';
      types[type] = (types[type] || 0) + Math.abs(c.change_amount);
    });
    
    return Object.entries(types).map(([name, value]) => ({
      name: name.replace('_', ' ').toUpperCase(),
      value
    }));
  }, [changes]);

  if (changes.length === 0) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Stock Level Over Time */}
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <TrendingUp className="w-4 h-4 text-primary" />
            Stock Level Timeline
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorQuantity" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
              />
              <YAxis 
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px'
                }}
                labelFormatter={(label) => {
                  const item = chartData.find(d => d.date === label);
                  return item?.fullDate || label;
                }}
              />
              <Area 
                type="monotone" 
                dataKey="quantity" 
                stroke="hsl(var(--primary))" 
                fill="url(#colorQuantity)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Changes by Type */}
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <BarChart3 className="w-4 h-4 text-primary" />
            Changes by Type
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={changesByType}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 10 }}
                angle={-45}
                textAnchor="end"
                height={80}
                className="text-muted-foreground"
              />
              <YAxis 
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px'
                }}
              />
              <Bar 
                dataKey="value" 
                fill="hsl(var(--primary))" 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Cumulative Change */}
      <Card className="lg:col-span-2">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Activity className="w-4 h-4 text-primary" />
            Cumulative Change Over Time
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
              />
              <YAxis 
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px'
                }}
                labelFormatter={(label) => {
                  const item = chartData.find(d => d.date === label);
                  return item?.fullDate || label;
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="cumulative" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))', r: 3 }}
                name="Net Change"
              />
              <Line 
                type="monotone" 
                dataKey="change" 
                stroke="hsl(var(--chart-2))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--chart-2))', r: 3 }}
                name="Individual Change"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
