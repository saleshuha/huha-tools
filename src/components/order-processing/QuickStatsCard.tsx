import { Card } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface QuickStatsCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  variant?: 'primary' | 'success' | 'warning' | 'info' | 'neutral';
  className?: string;
}

export function QuickStatsCard({ icon: Icon, label, value, variant = 'primary', className = '' }: QuickStatsCardProps) {
  const variantClasses = {
    primary: 'bg-primary/10 border-primary/30 text-primary',
    success: 'bg-success/10 border-success/30 text-success',
    warning: 'bg-warning/10 border-warning/30 text-warning',
    info: 'bg-info/10 border-info/30 text-info',
    neutral: 'bg-muted/50 border-border text-muted-foreground'
  };

  return (
    <Card className={`p-4 ${variantClasses[variant]} border transition-all duration-300 hover:scale-105 hover:shadow-md ${className}`}>
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${variant === 'primary' ? 'bg-gradient-primary' : ''} ${variant === 'success' ? 'bg-success/20' : ''} ${variant === 'warning' ? 'bg-warning/20' : ''} ${variant === 'info' ? 'bg-info/20' : ''} ${variant === 'neutral' ? 'bg-muted' : ''}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-sm opacity-80">{label}</div>
        </div>
      </div>
    </Card>
  );
}
