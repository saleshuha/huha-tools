import { Check, Clock, FileUp, Zap } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface ProcessingPipelineProps {
  currentStep: 'upload' | 'pending' | 'matched' | 'processed';
  pendingCount?: number;
  matchedCount?: number;
  processedCount?: number;
}

export function ProcessingPipeline({ currentStep, pendingCount = 0, matchedCount = 0, processedCount = 0 }: ProcessingPipelineProps) {
  const steps = [
    { key: 'upload', label: 'Upload & Process', icon: FileUp, count: null },
    { key: 'pending', label: 'Pending Deduction', icon: Zap, count: pendingCount },
    { key: 'matched', label: 'Matched Orders', icon: Clock, count: matchedCount },
    { key: 'processed', label: 'Processed Orders', icon: Check, count: processedCount }
  ];

  const currentStepIndex = steps.findIndex(s => s.key === currentStep);

  return (
    <Card className="p-6 bg-gradient-to-r from-primary/5 via-card to-accent/5 border-primary/20">
      <h3 className="text-sm font-semibold mb-4 text-foreground">Processing Pipeline</h3>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = index === currentStepIndex;
          const isCompleted = index < currentStepIndex;
          const isPending = index > currentStepIndex;

          return (
            <div key={step.key} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div 
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300
                    ${isActive ? 'bg-gradient-primary shadow-glow/30 scale-110' : ''}
                    ${isCompleted ? 'bg-success/20 border-2 border-success' : ''}
                    ${isPending ? 'bg-muted/50 border-2 border-border' : ''}
                  `}
                >
                  <Icon 
                    className={`
                      w-5 h-5
                      ${isActive ? 'text-primary-foreground' : ''}
                      ${isCompleted ? 'text-success' : ''}
                      ${isPending ? 'text-muted-foreground' : ''}
                    `}
                  />
                </div>
                <div className="mt-2 text-center">
                  <div 
                    className={`
                      text-xs font-medium
                      ${isActive ? 'text-primary' : ''}
                      ${isCompleted ? 'text-success' : ''}
                      ${isPending ? 'text-muted-foreground' : ''}
                    `}
                  >
                    {step.label}
                  </div>
                  {step.count !== null && step.count > 0 && (
                    <div 
                      className={`
                        text-xs mt-1 px-2 py-0.5 rounded-full inline-block
                        ${isActive ? 'bg-primary/20 text-primary' : ''}
                        ${isCompleted ? 'bg-success/20 text-success' : ''}
                        ${isPending ? 'bg-muted text-muted-foreground' : ''}
                      `}
                    >
                      {step.count}
                    </div>
                  )}
                </div>
              </div>
              {index < steps.length - 1 && (
                <div 
                  className={`
                    h-0.5 flex-1 mx-2 transition-all duration-300
                    ${index < currentStepIndex ? 'bg-success' : 'bg-border'}
                  `}
                />
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
