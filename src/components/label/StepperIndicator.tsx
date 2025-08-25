import { Badge } from "@/components/ui/badge";
import { CheckCircle, Circle, Database, FileText, Palette, Printer } from "lucide-react";

interface StepperIndicatorProps {
  currentStep: number;
  hasDataset: boolean;
  hasTemplate: boolean;
}

const steps = [
  { id: 1, label: "Data", icon: Database, description: "Import or select dataset" },
  { id: 2, label: "Template", icon: FileText, description: "Choose or create template" },
  { id: 3, label: "Design", icon: Palette, description: "Map elements to data" },
  { id: 4, label: "Print", icon: Printer, description: "Generate and print labels" }
];

export function StepperIndicator({ currentStep, hasDataset, hasTemplate }: StepperIndicatorProps) {
  const getStepStatus = (stepId: number) => {
    if (stepId < currentStep) return 'completed';
    if (stepId === currentStep) return 'current';
    return 'pending';
  };

  const isStepAccessible = (stepId: number) => {
    if (stepId === 1) return true;
    if (stepId === 2) return true;
    if (stepId === 3) return hasDataset;
    if (stepId === 4) return hasDataset && hasTemplate;
    return false;
  };

  return (
    <div className="flex items-center justify-between w-full max-w-4xl mx-auto mb-8 p-4 bg-card rounded-lg border">
      {steps.map((step, index) => {
        const status = getStepStatus(step.id);
        const isAccessible = isStepAccessible(step.id);
        const Icon = step.icon;

        return (
          <div key={step.id} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div className={`
                flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300
                ${status === 'completed' 
                  ? 'bg-success border-success text-success-foreground' 
                  : status === 'current'
                  ? 'bg-primary border-primary text-primary-foreground'
                  : isAccessible
                  ? 'bg-muted border-border text-muted-foreground hover:border-primary'
                  : 'bg-muted border-muted text-muted-foreground/50'
                }
              `}>
                {status === 'completed' ? (
                  <CheckCircle className="w-6 h-6" />
                ) : (
                  <Icon className="w-6 h-6" />
                )}
              </div>
              <div className="mt-3 text-center">
                <p className={`text-sm font-medium ${
                  status === 'current' ? 'text-primary' : 
                  status === 'completed' ? 'text-success' :
                  isAccessible ? 'text-foreground' : 'text-muted-foreground'
                }`}>
                  {step.label}
                </p>
                <p className="text-xs text-muted-foreground mt-1 max-w-20">
                  {step.description}
                </p>
                {/* Status badges */}
                <div className="mt-2 flex justify-center">
                  {step.id === 1 && hasDataset && (
                    <Badge variant="secondary" className="text-xs">Active</Badge>
                  )}
                  {step.id === 2 && hasTemplate && (
                    <Badge variant="secondary" className="text-xs">Ready</Badge>
                  )}
                  {step.id === 3 && hasDataset && (
                    <Badge variant="secondary" className="text-xs">Available</Badge>
                  )}
                  {step.id === 4 && hasDataset && hasTemplate && (
                    <Badge variant="secondary" className="text-xs">Ready</Badge>
                  )}
                </div>
              </div>
            </div>
            
            {/* Connector line */}
            {index < steps.length - 1 && (
              <div className={`
                flex-1 h-0.5 mx-4 transition-all duration-300
                ${status === 'completed' || (status === 'current' && index < steps.length - 1)
                  ? 'bg-success' 
                  : 'bg-border'
                }
              `} />
            )}
          </div>
        );
      })}
    </div>
  );
}