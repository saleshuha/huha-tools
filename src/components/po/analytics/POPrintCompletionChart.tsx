import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Printer } from 'lucide-react';
import { PrintCompletionData } from '@/hooks/usePOAnalytics';

interface POPrintCompletionChartProps {
  data: PrintCompletionData;
}

export const POPrintCompletionChart: React.FC<POPrintCompletionChartProps> = ({ data }) => {
  const chartData = [
    { name: 'Printed', value: data.printed, color: 'hsl(var(--chart-3))' },
    { name: 'Not Printed', value: data.notPrinted, color: 'hsl(var(--muted))' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Printer className="h-4 w-4" />
          Print Completion Rate
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <p className="text-4xl font-bold">{data.rate}%</p>
              <p className="text-sm text-muted-foreground">Completion Rate</p>
            </div>
          </div>
          
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                fill="hsl(var(--primary))"
                dataKey="value"
                paddingAngle={5}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px'
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
          
          <div className="grid grid-cols-2 gap-4 text-center pt-2">
            <div>
              <p className="text-2xl font-bold">{data.printed}</p>
              <p className="text-xs text-muted-foreground">Printed</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{data.notPrinted}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
