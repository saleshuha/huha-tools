import { Card, CardContent } from '@/components/ui/card';
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
  const cards = [
    { label: 'Total ASINs', value: summary.total, icon: Package, color: 'text-foreground' },
    { label: 'Growing', value: summary.growing, icon: TrendingUp, color: 'text-green-600' },
    { label: 'Stable', value: summary.stable, icon: Minus, color: 'text-blue-600' },
    { label: 'Declining', value: summary.declining, icon: TrendingDown, color: 'text-orange-600' },
    { label: 'Inactive', value: summary.inactive, icon: AlertTriangle, color: 'text-destructive' },
    { label: 'New', value: summary.newAsins, icon: Sparkles, color: 'text-purple-600' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map(c => (
        <Card key={c.label} className="border border-border">
          <CardContent className="p-4 flex flex-col items-center gap-1">
            <c.icon className={`h-5 w-5 ${c.color}`} />
            <span className="text-2xl font-bold text-foreground">{c.value}</span>
            <span className="text-xs text-muted-foreground">{c.label}</span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
