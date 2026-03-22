import type { AsinHealth } from '@/hooks/useAsinSalesHealth';

interface Props {
  data: AsinHealth;
  maxQty: number;
}

const STATUS_COLORS: Record<string, string> = {
  star: 'bg-emerald-500',
  growing: 'bg-green-500',
  stable: 'bg-primary',
  declining: 'bg-orange-500',
  at_risk: 'bg-red-500',
  low_mover: 'bg-muted-foreground',
  dead: 'bg-muted-foreground',
  new: 'bg-purple-500',
};

export function AsinTrendChart({ data, maxQty }: Props) {
  const bars = data.monthlyData.slice(-12);
  const localMax = maxQty || 1;

  return (
    <div className="flex items-end gap-[2px] h-8">
      {bars.map((m, i) => {
        const height = Math.max(2, (m.qty / localMax) * 32);
        const color = m.qty === 0 ? 'bg-muted' : (STATUS_COLORS[data.status] || 'bg-primary');
        return (
          <div
            key={i}
            className={`w-2 rounded-t ${color} transition-all`}
            style={{ height: `${height}px` }}
            title={`${m.month}/${m.year}: ${m.qty}`}
          />
        );
      })}
    </div>
  );
}
