import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Sparkles, Package } from 'lucide-react';

interface Props {
  summary: {
    total: number;
    growing: number;
    stable: number;
    declining: number;
    inactive: number;
    newAsins: number;
  };
}

export function HealthSummaryCards({ summary }: Props) {
  const pct = (v: number) => summary.total > 0 ? ((v / summary.total) * 100) : 0;

  const cards = [
    { label: 'Total ASINs', value: summary.total, icon: Package, color: 'text-foreground', progressColor: 'bg-foreground', pct: 100 },
    { label: 'Growing', value: summary.growing, icon: TrendingUp, color: 'text-green-600', progressColor: 'bg-green-500', pct: pct(summary.growing) },
    { label: 'Stable', value: summary.stable, icon: Minus, color: 'text-blue-600', progressColor: 'bg-blue-500', pct: pct(summary.stable) },
    { label: 'Declining', value: summary.declining, icon: TrendingDown, color: 'text-orange-600', progressColor: 'bg-orange-500', pct: pct(summary.declining) },
    { label: 'Inactive', value: summary.inactive, icon: AlertTriangle, color: 'text-destructive', progressColor: 'bg-destructive', pct: pct(summary.inactive) },
    { label: 'New', value: summary.newAsins, icon: Sparkles, color: 'text-purple-600', progressColor: 'bg-purple-500', pct: pct(summary.newAsins) },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map(c => (
        <Card key={c.label} className="border border-border">
          <CardContent className="p-4 flex flex-col items-center gap-1.5">
            <c.icon className={`h-5 w-5 ${c.color}`} />
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-foreground">{c.value}</span>
              {c.label !== 'Total ASINs' && summary.total > 0 && (
                <span className="text-[10px] text-muted-foreground">({c.pct.toFixed(1)}%)</span>
              )}
            </div>
            <span className="text-xs text-muted-foreground">{c.label}</span>
            <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden mt-0.5">
              <div
                className={`h-full rounded-full transition-all ${c.progressColor}`}
                style={{ width: `${c.pct}%` }}
              />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
