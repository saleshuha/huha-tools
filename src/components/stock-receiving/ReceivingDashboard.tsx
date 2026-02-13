import { Package, CheckCircle2, Clock, Users } from 'lucide-react';

interface ReceivingDashboardProps {
  totalPOs: number;
  receivedToday: number;
  pendingCount: number;
  groupCount: number;
}

export function ReceivingDashboard({ totalPOs, receivedToday, pendingCount, groupCount }: ReceivingDashboardProps) {
  const metrics = [
    {
      label: 'Total POs',
      value: totalPOs,
      icon: Package,
      gradient: 'from-sky/10 to-sky/5',
      iconColor: 'text-sky',
      borderColor: 'border-sky/20',
    },
    {
      label: 'Received Today',
      value: receivedToday,
      icon: CheckCircle2,
      gradient: 'from-emerald/10 to-emerald/5',
      iconColor: 'text-emerald',
      borderColor: 'border-emerald/20',
    },
    {
      label: 'Pending',
      value: pendingCount,
      icon: Clock,
      gradient: 'from-warning/10 to-warning/5',
      iconColor: 'text-warning',
      borderColor: 'border-warning/20',
    },
    {
      label: 'Groups',
      value: groupCount,
      icon: Users,
      gradient: 'from-primary/10 to-primary/5',
      iconColor: 'text-primary',
      borderColor: 'border-primary/20',
    },
  ];

  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-bold text-foreground">Smart Stock Receiving</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className={`relative overflow-hidden rounded-xl border ${metric.borderColor} bg-gradient-to-br ${metric.gradient} p-4 transition-all hover:shadow-md`}
          >
            <div className="flex items-center gap-3">
              <div className={`rounded-lg bg-background/80 p-2 ${metric.iconColor}`}>
                <metric.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{metric.value}</p>
                <p className="text-xs text-muted-foreground font-medium">{metric.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
