import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SectionColor = 'emerald' | 'blue' | 'purple' | 'orange' | 'cyan' | 'red' | 'yellow' | 'pink';

interface ActionSectionProps {
  title: string;
  icon: LucideIcon;
  color: SectionColor;
  children: React.ReactNode;
  badge?: string | number;
  defaultOpen?: boolean;
  className?: string;
}

const colorStyles: Record<SectionColor, {
  border: string;
  iconBg: string;
  iconColor: string;
  headerBg: string;
  glow: string;
}> = {
  emerald: {
    border: 'border-l-emerald-500',
    iconBg: 'bg-emerald-500/10',
    iconColor: 'text-emerald-500',
    headerBg: 'from-emerald-500/5 to-transparent',
    glow: 'hover:shadow-emerald-500/10'
  },
  blue: {
    border: 'border-l-blue-500',
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-500',
    headerBg: 'from-blue-500/5 to-transparent',
    glow: 'hover:shadow-blue-500/10'
  },
  purple: {
    border: 'border-l-purple-500',
    iconBg: 'bg-purple-500/10',
    iconColor: 'text-purple-500',
    headerBg: 'from-purple-500/5 to-transparent',
    glow: 'hover:shadow-purple-500/10'
  },
  orange: {
    border: 'border-l-orange-500',
    iconBg: 'bg-orange-500/10',
    iconColor: 'text-orange-500',
    headerBg: 'from-orange-500/5 to-transparent',
    glow: 'hover:shadow-orange-500/10'
  },
  cyan: {
    border: 'border-l-cyan-500',
    iconBg: 'bg-cyan-500/10',
    iconColor: 'text-cyan-500',
    headerBg: 'from-cyan-500/5 to-transparent',
    glow: 'hover:shadow-cyan-500/10'
  },
  red: {
    border: 'border-l-red-500',
    iconBg: 'bg-red-500/10',
    iconColor: 'text-red-500',
    headerBg: 'from-red-500/5 to-transparent',
    glow: 'hover:shadow-red-500/10'
  },
  yellow: {
    border: 'border-l-yellow-500',
    iconBg: 'bg-yellow-500/10',
    iconColor: 'text-yellow-500',
    headerBg: 'from-yellow-500/5 to-transparent',
    glow: 'hover:shadow-yellow-500/10'
  },
  pink: {
    border: 'border-l-pink-500',
    iconBg: 'bg-pink-500/10',
    iconColor: 'text-pink-500',
    headerBg: 'from-pink-500/5 to-transparent',
    glow: 'hover:shadow-pink-500/10'
  }
};

export function ActionSection({ 
  title, 
  icon: Icon, 
  color, 
  children, 
  badge,
  defaultOpen = true,
  className 
}: ActionSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const styles = colorStyles[color];

  return (
    <Card className={cn(
      'border-l-4 overflow-hidden transition-all duration-300',
      styles.border,
      styles.glow,
      'hover:shadow-lg',
      className
    )}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <div className={cn(
            'flex items-center justify-between p-4 cursor-pointer',
            'bg-gradient-to-r',
            styles.headerBg,
            'hover:bg-muted/30 transition-colors duration-200'
          )}>
            <div className="flex items-center gap-3">
              <div className={cn(
                'w-9 h-9 rounded-lg flex items-center justify-center',
                styles.iconBg
              )}>
                <Icon className={cn('w-5 h-5', styles.iconColor)} />
              </div>
              <h3 className="font-semibold text-sm tracking-wide">{title}</h3>
              {badge !== undefined && (
                <Badge 
                  variant="secondary" 
                  className={cn(
                    'text-xs font-medium px-2 py-0.5',
                    styles.iconBg,
                    styles.iconColor
                  )}
                >
                  {badge}
                </Badge>
              )}
            </div>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              {isOpen ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </Button>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="p-4 pt-2 border-t border-border/50">
            {children}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
