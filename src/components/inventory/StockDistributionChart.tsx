import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { cn } from '@/lib/utils';

interface StockDistributionChartProps {
  inStock: number;
  outOfStock: number;
  onClick?: () => void;
  className?: string;
}

const COLORS = {
  inStock: '#10b981',
  outOfStock: '#ef4444'
};

export const StockDistributionChart: React.FC<StockDistributionChartProps> = ({
  inStock,
  outOfStock,
  onClick,
  className
}) => {
  const total = inStock + outOfStock;
  const inStockPercent = total > 0 ? Math.round((inStock / total) * 100) : 0;
  const outOfStockPercent = total > 0 ? Math.round((outOfStock / total) * 100) : 0;

  const data = [
    { name: 'In Stock', value: inStock, color: COLORS.inStock },
    { name: 'Out of Stock', value: outOfStock, color: COLORS.outOfStock }
  ].filter(d => d.value > 0);

  return (
    <Card
      className={cn(
        'cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02]',
        'border-2 hover:border-primary/30 bg-gradient-to-br from-card to-background',
        'flex flex-col h-32',
        className
      )}
      onClick={onClick}
    >
      <CardContent className="flex items-center p-4 h-full gap-4">
        {/* Mini Pie Chart */}
        <div className="w-20 h-20 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={22}
                outerRadius={36}
                paddingAngle={2}
                dataKey="value"
                strokeWidth={0}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string) => [value.toLocaleString(), name]}
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend and Stats */}
        <div className="flex flex-col gap-2 flex-1 min-w-0">
          <span className="text-xs font-medium text-muted-foreground">Stock Distribution</span>
          
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-xs text-muted-foreground">In Stock</span>
              <span className="text-xs font-semibold text-emerald-600 ml-auto">
                {inStock.toLocaleString()} ({inStockPercent}%)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-xs text-muted-foreground">Out of Stock</span>
              <span className="text-xs font-semibold text-red-600 ml-auto">
                {outOfStock.toLocaleString()} ({outOfStockPercent}%)
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
