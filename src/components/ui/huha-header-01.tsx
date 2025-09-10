import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface HuhaHeader01Action {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'outline' | 'secondary';
  className?: string;
}

interface HuhaHeader01Badge {
  label: string;
  variant?: 'default' | 'secondary' | 'outline';
  icon?: React.ReactNode;
  className?: string;
}

interface HuhaHeader01Props {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  actions?: HuhaHeader01Action[];
  badges?: HuhaHeader01Badge[];
  className?: string;
}

export const HuhaHeader01: React.FC<HuhaHeader01Props> = ({
  icon,
  title,
  subtitle,
  actions = [],
  badges = [],
  className
}) => {
  return (
    <div className={cn("flex items-center justify-between gap-4 p-4", className)}>
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 text-primary flex items-center justify-center">
          {icon}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {title}
          </h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {actions.map((action, index) => (
          <Button
            key={index}
            variant={action.variant || 'default'}
            size="sm"
            onClick={action.onClick}
            className={cn(action.className)}
          >
            {action.icon}
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  );
};