import { Card } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  value: number;
  subtitle?: string;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
  };
  variant?: 'primary' | 'success' | 'warning' | 'info' | 'neutral' | 'accent';
  onClick?: () => void;
  isActive?: boolean;
  animate?: boolean;
}

export function MetricCard({ 
  icon: Icon, 
  label, 
  value, 
  subtitle,
  trend,
  variant = 'primary', 
  onClick,
  isActive = false,
  animate = true
}: MetricCardProps) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (!animate) {
      setDisplayValue(value);
      return;
    }

    const duration = 800;
    const steps = 30;
    const stepDuration = duration / steps;
    const increment = value / steps;
    let current = 0;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      current = Math.min(Math.round(increment * step), value);
      setDisplayValue(current);
      if (step >= steps) {
        clearInterval(timer);
        setDisplayValue(value);
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [value, animate]);

  const variantStyles = {
    primary: {
      card: 'from-primary/10 via-primary/5 to-transparent border-primary/30',
      icon: 'bg-gradient-to-br from-primary to-primary-dark text-primary-foreground shadow-glow/30',
      text: 'text-primary',
      ring: 'ring-primary/20'
    },
    success: {
      card: 'from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-500/30',
      icon: 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-emerald-500/30',
      text: 'text-emerald-600 dark:text-emerald-400',
      ring: 'ring-emerald-500/20'
    },
    warning: {
      card: 'from-amber-500/10 via-amber-500/5 to-transparent border-amber-500/30',
      icon: 'bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-amber-500/30',
      text: 'text-amber-600 dark:text-amber-400',
      ring: 'ring-amber-500/20'
    },
    info: {
      card: 'from-sky-500/10 via-sky-500/5 to-transparent border-sky-500/30',
      icon: 'bg-gradient-to-br from-sky-500 to-sky-600 text-white shadow-sky-500/30',
      text: 'text-sky-600 dark:text-sky-400',
      ring: 'ring-sky-500/20'
    },
    neutral: {
      card: 'from-muted/50 via-muted/30 to-transparent border-border/50',
      icon: 'bg-gradient-to-br from-muted-foreground/80 to-muted-foreground text-background',
      text: 'text-muted-foreground',
      ring: 'ring-muted/20'
    },
    accent: {
      card: 'from-violet-500/10 via-violet-500/5 to-transparent border-violet-500/30',
      icon: 'bg-gradient-to-br from-violet-500 to-violet-600 text-white shadow-violet-500/30',
      text: 'text-violet-600 dark:text-violet-400',
      ring: 'ring-violet-500/20'
    }
  };

  const styles = variantStyles[variant];

  return (
    <Card 
      className={`
        relative overflow-hidden p-5 
        bg-gradient-to-br ${styles.card}
        border transition-all duration-300 
        ${onClick ? 'cursor-pointer hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]' : ''}
        ${isActive ? `ring-2 ${styles.ring} shadow-lg` : ''}
        group
      `}
      onClick={onClick}
    >
      {/* Decorative Background */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/5 to-transparent rounded-full -translate-y-16 translate-x-16 group-hover:translate-x-12 transition-transform duration-500" />
      
      <div className="relative flex items-start gap-4">
        {/* Icon Container */}
        <div className={`
          p-3 rounded-xl ${styles.icon} shadow-lg
          transform transition-transform duration-300 group-hover:scale-110
        `}>
          <Icon className="w-5 h-5" />
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-bold tracking-tight ${styles.text}`}>
              {displayValue.toLocaleString()}
            </span>
            {trend && (
              <span className={`
                text-xs font-semibold px-1.5 py-0.5 rounded-full
                ${trend.direction === 'up' ? 'bg-emerald-500/20 text-emerald-600' : ''}
                ${trend.direction === 'down' ? 'bg-red-500/20 text-red-600' : ''}
                ${trend.direction === 'neutral' ? 'bg-muted text-muted-foreground' : ''}
              `}>
                {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'} {Math.abs(trend.value)}%
              </span>
            )}
          </div>
          <p className="text-sm font-medium text-muted-foreground mt-0.5">{label}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground/70 mt-1">{subtitle}</p>
          )}
        </div>
      </div>
      
      {/* Hover Glow Effect */}
      {onClick && (
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          <div className={`absolute inset-0 bg-gradient-to-t ${styles.card} opacity-50`} />
        </div>
      )}
    </Card>
  );
}
