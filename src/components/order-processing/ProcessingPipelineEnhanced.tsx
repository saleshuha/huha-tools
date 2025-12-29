import { Card } from '@/components/ui/card';
import { Upload, Target, Clock, CheckCircle2, ArrowRight } from 'lucide-react';

interface ProcessingPipelineEnhancedProps {
  currentStep: 'upload' | 'pending' | 'matched' | 'processed';
  uploadCount: number;
  matchedCount: number;
  pendingCount: number;
  processedCount: number;
  onStepClick?: (step: string) => void;
}

export function ProcessingPipelineEnhanced({
  currentStep,
  uploadCount,
  matchedCount,
  pendingCount,
  processedCount,
  onStepClick
}: ProcessingPipelineEnhancedProps) {
  const steps = [
    { 
      id: 'upload', 
      label: 'Upload', 
      icon: Upload, 
      count: uploadCount,
      color: 'from-violet-500 to-purple-600',
      bgColor: 'bg-violet-500/10',
      borderColor: 'border-violet-500/30',
      textColor: 'text-violet-600 dark:text-violet-400'
    },
    { 
      id: 'matched', 
      label: 'Matched', 
      icon: Target, 
      count: matchedCount,
      color: 'from-emerald-500 to-green-600',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/30',
      textColor: 'text-emerald-600 dark:text-emerald-400'
    },
    { 
      id: 'pending', 
      label: 'Review', 
      icon: Clock, 
      count: pendingCount,
      color: 'from-amber-500 to-orange-600',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/30',
      textColor: 'text-amber-600 dark:text-amber-400'
    },
    { 
      id: 'processed', 
      label: 'Processed', 
      icon: CheckCircle2, 
      count: processedCount,
      color: 'from-sky-500 to-blue-600',
      bgColor: 'bg-sky-500/10',
      borderColor: 'border-sky-500/30',
      textColor: 'text-sky-600 dark:text-sky-400'
    }
  ];

  const currentIndex = steps.findIndex(s => s.id === currentStep);

  return (
    <Card className="p-4 bg-gradient-to-r from-card via-muted/20 to-card border-border/50">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = step.id === currentStep;
          const isPast = index < currentIndex;
          const isLast = index === steps.length - 1;

          return (
            <div key={step.id} className="flex items-center flex-1">
              {/* Step */}
              <button
                onClick={() => onStepClick?.(step.id)}
                className={`
                  relative flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-300
                  ${isActive ? `${step.bgColor} ${step.borderColor} border-2 shadow-lg scale-105` : ''}
                  ${isPast ? 'opacity-70' : ''}
                  hover:scale-105 hover:opacity-100
                  group cursor-pointer
                `}
              >
                {/* Icon Circle */}
                <div className={`
                  relative p-3 rounded-full transition-all duration-300
                  ${isActive 
                    ? `bg-gradient-to-br ${step.color} text-white shadow-lg` 
                    : isPast 
                      ? 'bg-muted text-muted-foreground'
                      : 'bg-muted/50 text-muted-foreground/50'
                  }
                  group-hover:shadow-md
                `}>
                  <Icon className="w-5 h-5" />
                  
                  {/* Pulse Animation for Active */}
                  {isActive && (
                    <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${step.color} animate-ping opacity-30`} />
                  )}
                </div>

                {/* Label & Count */}
                <div className="text-center">
                  <p className={`text-sm font-semibold ${isActive ? step.textColor : 'text-muted-foreground'}`}>
                    {step.label}
                  </p>
                  <p className={`text-lg font-bold ${isActive ? step.textColor : 'text-foreground'}`}>
                    {step.count.toLocaleString()}
                  </p>
                </div>

                {/* Active Indicator */}
                {isActive && (
                  <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-gradient-to-br ${step.color}`} />
                )}
              </button>

              {/* Connector */}
              {!isLast && (
                <div className="flex-1 flex items-center justify-center px-2">
                  <div className={`
                    flex-1 h-0.5 transition-all duration-500
                    ${index < currentIndex 
                      ? 'bg-gradient-to-r from-emerald-500/50 to-emerald-500/20' 
                      : 'bg-border/30'
                    }
                  `} />
                  <ArrowRight className={`
                    w-4 h-4 mx-1 transition-all duration-300
                    ${index < currentIndex 
                      ? 'text-emerald-500' 
                      : index === currentIndex 
                        ? 'text-primary animate-pulse' 
                        : 'text-muted-foreground/30'
                    }
                  `} />
                  <div className={`
                    flex-1 h-0.5 transition-all duration-500
                    ${index < currentIndex 
                      ? 'bg-gradient-to-r from-emerald-500/20 to-emerald-500/50' 
                      : 'bg-border/30'
                    }
                  `} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
