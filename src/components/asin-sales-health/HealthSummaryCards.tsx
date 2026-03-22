import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, AlertTriangle, Package, Activity, Skull } from 'lucide-react';

interface Props {
  summary: {
    total: number;
    active: number;
    growing: number;
    declining: number;
    atRisk: number;
    lowDead: number;
  };
}

export function HealthSummaryCards({ summary }: Props) {
  const pct = (v: number) => summary.total > 0 ? ((v / summary.total) * 100) : 0;

  const cards = [
    { label: 'Total ASINs', value: summary.total, icon: Package, color: 'text-foreground', progressColor: 'bg-foreground', pct: 100 },
    { label: 'Active', value: summary.active, icon: Activity, color: 'text-green-600', progressColor: 'bg-green-500', pct: pct(summary.active) },
    { label: 'Growing', value: summary.growing, icon: TrendingUp, color: 'text-emerald-600', progressColor: 'bg-emerald-500', pct: pct(summary.growing) },
    { label: 'Declining', value: summary.declining, icon: TrendingDown, color: 'text-orange-600', progressColor: 'bg-orange-500', pct: pct(summary.declining) },
    { label: 'At Risk', value: summary.atRisk, icon: AlertTriangle, color: 'text-red-600', progressColor: 'bg-red-500', pct: pct(summary.atRisk) },
    { label: 'Low / Dead', value: summary.lowDead, icon: Skull, color: 'text-muted-foreground', progressColor: 'bg-muted-foreground', pct: pct(summary.lowDead) },
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
