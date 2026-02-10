import { cn } from '@/lib/utils';
import { Upload, Search, Package, CheckCircle2 } from 'lucide-react';
import { WizardStep } from './types';

interface DFStepIndicatorProps {
  currentStep: WizardStep;
  completedSteps: Set<WizardStep>;
  orderCount?: number;
  sunskyCount?: number;
  matchedCount?: number;
  processedCount?: number;
}

const steps = [
  { step: 1 as WizardStep, label: 'Upload', icon: Upload },
  { step: 2 as WizardStep, label: 'Source Match', icon: Search },
  { step: 3 as WizardStep, label: 'Inventory', icon: Package },
  { step: 4 as WizardStep, label: 'Process', icon: CheckCircle2 },
];

export function DFStepIndicator({ currentStep, completedSteps, orderCount, sunskyCount, matchedCount, processedCount }: DFStepIndicatorProps) {
  const getCounts = (step: WizardStep) => {
    switch (step) {
      case 1: return orderCount !== undefined ? `${orderCount} orders` : undefined;
      case 2: return sunskyCount !== undefined ? `${sunskyCount} from Sunsky` : undefined;
      case 3: return matchedCount !== undefined ? `${matchedCount} matched` : undefined;
      case 4: return processedCount !== undefined ? `${processedCount} processed` : undefined;
    }
  };

  return (
    <div className="flex items-center justify-between w-full max-w-3xl mx-auto">
      {steps.map((s, idx) => {
        const isActive = currentStep === s.step;
        const isCompleted = completedSteps.has(s.step);
        const Icon = s.icon;
        const count = getCounts(s.step);

        return (
          <div key={s.step} className="flex items-center flex-1">
            <div className="flex flex-col items-center gap-1.5">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all",
                isActive && "border-primary bg-primary text-primary-foreground shadow-md",
                isCompleted && !isActive && "border-primary bg-primary/10 text-primary",
                !isActive && !isCompleted && "border-muted-foreground/30 bg-muted text-muted-foreground"
              )}>
                <Icon className="w-4 h-4" />
              </div>
              <span className={cn(
                "text-xs font-medium",
                isActive && "text-primary",
                !isActive && "text-muted-foreground"
              )}>
                {s.label}
              </span>
              {count && (
                <span className="text-[10px] text-muted-foreground">{count}</span>
              )}
            </div>
            {idx < steps.length - 1 && (
              <div className={cn(
                "flex-1 h-0.5 mx-3 mt-[-20px]",
                completedSteps.has(s.step) ? "bg-primary" : "bg-muted-foreground/20"
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
}
