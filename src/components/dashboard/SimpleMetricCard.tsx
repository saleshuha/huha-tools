import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface SimpleMetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  onClick?: () => void;
  loading?: boolean;
}

export const SimpleMetricCard: React.FC<SimpleMetricCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  onClick,
  loading
}) => {
  if (loading) {
    return <Skeleton className="h-32" />;
  }

  return (
    <Card 
      className="hover:border-primary/50 transition-colors cursor-pointer border"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <Icon className="w-5 h-5 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{typeof value === 'number' ? value.toLocaleString() : value}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </CardContent>
    </Card>
  );
};
