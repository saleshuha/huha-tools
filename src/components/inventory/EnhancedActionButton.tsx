import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type ButtonVariant = 'default' | 'emerald' | 'blue' | 'purple' | 'orange' | 'cyan' | 'red';

interface EnhancedActionButtonProps {
  label: string;
  icon: LucideIcon;
  onClick?: () => void;
  badge?: string | number;
  tooltip?: string;
  shortcut?: string;
  variant?: ButtonVariant;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  default: 'hover:bg-muted hover:border-border/80',
  emerald: 'hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-600 dark:hover:text-emerald-400',
  blue: 'hover:bg-blue-500/10 hover:border-blue-500/30 hover:text-blue-600 dark:hover:text-blue-400',
  purple: 'hover:bg-purple-500/10 hover:border-purple-500/30 hover:text-purple-600 dark:hover:text-purple-400',
  orange: 'hover:bg-orange-500/10 hover:border-orange-500/30 hover:text-orange-600 dark:hover:text-orange-400',
  cyan: 'hover:bg-cyan-500/10 hover:border-cyan-500/30 hover:text-cyan-600 dark:hover:text-cyan-400',
  red: 'hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-600 dark:hover:text-red-400',
};

export function EnhancedActionButton({
  label,
  icon: Icon,
  onClick,
  badge,
  tooltip,
  shortcut,
  variant = 'default',
  disabled = false,
  className,
  children
}: EnhancedActionButtonProps) {
  const buttonContent = (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'h-10 px-4 gap-2 font-medium transition-all duration-200',
        'bg-background/50 border-border/60',
        'hover:shadow-md hover:scale-[1.02] active:scale-[0.98]',
        variantStyles[variant],
        disabled && 'opacity-50 cursor-not-allowed hover:scale-100',
        className
      )}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className="truncate">{label}</span>
      {badge !== undefined && (
        <Badge 
          variant="secondary" 
          className="ml-1 text-xs px-1.5 py-0 h-5 font-semibold bg-primary/10 text-primary"
        >
          {badge}
        </Badge>
      )}
      {shortcut && (
        <kbd className="hidden sm:inline-flex ml-auto text-[10px] font-sans bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
          {shortcut}
        </kbd>
      )}
      {children}
    </Button>
  );

  if (tooltip) {
    return (
      <TooltipProvider>
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            {buttonContent}
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return buttonContent;
}
