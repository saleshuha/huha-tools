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
    <div className={cn("huha-header border-b-2 border-border/50 bg-gradient-to-r from-card/80 to-card/60 backdrop-blur-md shadow-lg mx-6 my-4", className)} style={{ minHeight: 'var(--header-min-h, 80px)' }}>
      <div className="px-6 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-5">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-md">
                {icon}
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-primary/90 to-primary/70 bg-clip-text text-transparent leading-tight">
                  {title}
                </h1>
                <p className="text-base text-muted-foreground">{subtitle}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
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
        
        {/* Status Bar */}
        {badges.length > 0 && (
          <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-muted/30 to-muted/20 rounded-xl border-2 border-border/30">
            {badges.map((badge, index) => (
              <Badge
                key={index}
                variant={badge.variant || 'default'}
                className={cn(badge.className)}
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