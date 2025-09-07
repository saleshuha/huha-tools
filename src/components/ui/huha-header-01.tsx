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
    <div className={cn(
      "relative overflow-hidden rounded-xl border bg-card/50 backdrop-blur-sm shadow-soft",
      className
    )}>
      <div className="relative z-10 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            {icon && (
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-soft">
                {icon}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-semibold text-foreground">
                {title}
              </h1>
              {subtitle && (
                <p className="text-muted-foreground mt-1">{subtitle}</p>
              )}
            </div>
          </div>
          
          {actions.length > 0 && (
            <div className="flex items-center gap-2">
              {actions.map((action, index) => (
                <Button
                  key={index}
                  variant={action.variant || 'default'}
                  size="sm"
                  onClick={action.onClick}
                  className={cn("shadow-none", action.className)}
                >
                  {action.icon}
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </div>
        
        {badges.length > 0 && (
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border/50">
            {badges.map((badge, index) => (
              <Badge
                key={index}
                variant={badge.variant || 'default'}
                className={cn("shadow-none", badge.className)}
              >
                {badge.icon}
                {badge.label}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};