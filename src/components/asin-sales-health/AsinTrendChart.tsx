import { useMemo } from 'react';
import type { AsinHealth } from '@/hooks/useAsinSalesHealth';

interface Props {
  data: AsinHealth;
  maxQty: number;
}

const MONTH_NAMES = ['', 'J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

export function AsinTrendChart({ data, maxQty }: Props) {
  const bars = data.monthlyData.slice(-12);
  const localMax = maxQty || 1;

  return (
    <div className="flex items-end gap-[2px] h-8">
      {bars.map((m, i) => {
        const height = Math.max(2, (m.qty / localMax) * 32);
        const color = m.qty === 0 ? 'bg-muted' : data.status === 'growing' ? 'bg-green-500' : data.status === 'declining' ? 'bg-orange-500' : data.status === 'inactive' ? 'bg-destructive' : 'bg-primary';
        return (
          <div
            key={i}
            className={`w-2 rounded-t ${color} transition-all`}
            style={{ height: `${height}px` }}
            title={`${MONTH_NAMES[m.month]} ${m.year}: ${m.qty}`}
          />
        );
      })}
    </div>
  );
}
