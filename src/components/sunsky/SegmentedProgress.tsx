import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, Package, CheckCircle, Truck, Clock, ExternalLink 
} from 'lucide-react';

interface ProgressSegment {
  step: number;
  label: string;
  color: string;
  icon: React.ComponentType<any>;
  isActive: boolean;
  isCompleted: boolean;
}

interface SegmentedProgressProps {
  currentStep: number;
  totalSteps: number;
  percentage: number;
  statusLabel: string;
  statusColor: string;
  showLabels?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const stepIcons = {
  1: AlertTriangle,
  2: Package,
  3: CheckCircle,
  4: Package,
  5: Truck,
  6: CheckCircle,
};

const stepLabels = {
  1: 'Unpaid',
  2: 'Ordered',
  3: 'Paid',
  4: 'Ready',
  5: 'Shipped',
  6: 'Delivered',
};

const stepColors = {
  1: 'hsl(var(--warning))',
  2: 'hsl(var(--sky))',
  3: 'hsl(var(--primary))',
  4: 'hsl(var(--cyan))',
  5: 'hsl(var(--teal))',
  6: 'hsl(var(--success))',
};

export function SegmentedProgress({ 
  currentStep, 
  totalSteps, 
  percentage, 
  statusLabel, 
  statusColor,
  showLabels = true,
  size = 'md',
  className = ''
}: SegmentedProgressProps) {
  const segments: ProgressSegment[] = Array.from({ length: totalSteps }, (_, i) => {
    const step = i + 1;
    const IconComponent = stepIcons[step as keyof typeof stepIcons] || Package;
    
    return {
      step,
      label: stepLabels[step as keyof typeof stepLabels] || `Step ${step}`,
      color: stepColors[step as keyof typeof stepColors] || 'hsl(var(--muted-foreground))',
      icon: IconComponent,
      isActive: step === currentStep,
      isCompleted: step < currentStep,
    };
  });

  const sizeClasses = {
    sm: {
      container: 'space-y-2',
      progress: 'h-2',
      steps: 'gap-1',
      step: 'p-2 text-xs',
      icon: 'h-3 w-3',
    },
    md: {
      container: 'space-y-3',
      progress: 'h-3',
      steps: 'gap-2',
      step: 'p-3 text-sm',
      icon: 'h-4 w-4',
    },
    lg: {
      container: 'space-y-4',
      progress: 'h-4',
      steps: 'gap-3',
      step: 'p-4 text-base',
      icon: 'h-5 w-5',
    },
  };

  const classes = sizeClasses[size];

  return (
    <div className={`${classes.container} ${className}`}>
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Badge 
            className="text-white border-0" 
            style={{ backgroundColor: statusColor }}
          >
            {statusLabel}
          </Badge>
          <span className="text-sm text-muted-foreground font-mono">
            {percentage}%
          </span>
        </div>
        <Progress 
          value={percentage} 
          className={classes.progress}
        />
      </div>

      {/* Step Indicators */}
      {showLabels && (
        <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 ${classes.steps}`}>
          {segments.map((segment) => {
            const IconComponent = segment.icon;
            let stepClass = `${classes.step} rounded-lg border transition-all duration-200 text-center`;
            
            if (segment.isCompleted) {
              stepClass += ' bg-success/10 border-success text-success';
            } else if (segment.isActive) {
              stepClass += ' bg-primary/10 border-primary text-primary ring-2 ring-primary/20';
            } else {
              stepClass += ' bg-muted border-border text-muted-foreground';
            }

            return (
              <div key={segment.step} className={stepClass}>
                <IconComponent className={`${classes.icon} mx-auto mb-1`} />
                <div className="font-medium">{segment.label}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Compact mini indicators for small size */}
      {!showLabels && (
        <div className="flex justify-between items-center">
          {segments.map((segment) => {
            const IconComponent = segment.icon;
            let dotClass = "w-3 h-3 rounded-full transition-all duration-200 flex items-center justify-center";
            
            if (segment.isCompleted) {
              dotClass += ' bg-success';
            } else if (segment.isActive) {
              dotClass += ' bg-primary ring-2 ring-primary/30';
            } else {
              dotClass += ' bg-border';
            }

            return (
              <div key={segment.step} className="flex flex-col items-center gap-1">
                <div className={dotClass}>
                  {(segment.isCompleted || segment.isActive) && (
                    <IconComponent className="h-2 w-2 text-white" />
                  )}
                </div>
                <span className="text-xs text-muted-foreground">{segment.step}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default SegmentedProgress;