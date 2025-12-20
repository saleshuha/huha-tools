import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricsSectionHeaderProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  className?: string;
}

export const MetricsSectionHeader: React.FC<MetricsSectionHeaderProps> = ({
  icon: Icon,
  title,
  description,
  className
}) => {
  return (
    <div className={cn('flex items-center gap-2 mb-2', className)}>
      <Icon className="w-4 h-4 text-muted-foreground" />
      <div className="flex items-center gap-2">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</h4>
        {description && (
          <span className="text-[10px] text-muted-foreground/70">• {description}</span>
        )}
      </div>
    </div>
  );
};
