import React from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { MetricColor } from './AdvancedMetricCard';

interface MiniSparklineProps {
  data: number[];
  color?: MetricColor;
  width?: number;
  height?: number;
}

const colorMap: Record<MetricColor, string> = {
  blue: '#3b82f6',
  green: '#10b981',
  red: '#ef4444',
  orange: '#f97316',
  yellow: '#eab308',
  purple: '#a855f7',
  pink: '#ec4899',
  cyan: '#06b6d4',
  teal: '#14b8a6',
  emerald: '#10b981'
};

export const MiniSparkline: React.FC<MiniSparklineProps> = ({
  data,
  color = 'blue',
  width = 60,
  height = 20
}) => {
  const chartData = data.map((value, index) => ({ value, index }));
  const strokeColor = colorMap[color];

  return (
    <div style={{ width, height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={strokeColor}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
