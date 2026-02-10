import { useState } from 'react';
import { DFStepIndicator } from './DFStepIndicator';
import { DFUploadStep } from './DFUploadStep';
import { DFSourceMatchStep } from './DFSourceMatchStep';
import { DFInventoryMatchStep } from './DFInventoryMatchStep';
import { DFProcessStep } from './DFProcessStep';
import { DFOrderItem, WizardStep } from './types';

export function DFProcessingWizard() {
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [completedSteps, setCompletedSteps] = useState<Set<WizardStep>>(new Set());
  const [orders, setOrders] = useState<DFOrderItem[]>([]);
  const [processedCount, setProcessedCount] = useState(0);

  const markComplete = (step: WizardStep) => {
    setCompletedSteps(prev => new Set([...prev, step]));
  };

  const sunskyCount = orders.filter(o => o.sourceStatus === 'sunsky').length;
  const matchedCount = orders.filter(o => o.inventoryStatus === 'in-stock' || o.inventoryStatus === 'low-stock').length;

  return (
    <div className="space-y-6">
      <DFStepIndicator
        currentStep={currentStep}
        completedSteps={completedSteps}
        orderCount={orders.length || undefined}
        sunskyCount={completedSteps.has(2) ? sunskyCount : undefined}
        matchedCount={completedSteps.has(3) ? matchedCount : undefined}
        processedCount={processedCount || undefined}
      />

      {currentStep === 1 && (
        <DFUploadStep
          onComplete={(uploaded) => {
            setOrders(uploaded);
            markComplete(1);
            setCurrentStep(2);
          }}
        />
      )}

      {currentStep === 2 && (
        <DFSourceMatchStep
          orders={orders}
          onComplete={(matched) => {
            setOrders(matched);
            markComplete(2);
            setCurrentStep(3);
          }}
          onBack={() => setCurrentStep(1)}
        />
      )}

      {currentStep === 3 && (
        <DFInventoryMatchStep
          orders={orders}
          onComplete={(matched) => {
            setOrders(matched);
            markComplete(3);
            setCurrentStep(4);
          }}
          onBack={() => setCurrentStep(2)}
        />
      )}

      {currentStep === 4 && (
        <DFProcessStep
          orders={orders}
          onBack={() => setCurrentStep(3)}
          onProcessed={(count) => setProcessedCount(prev => prev + count)}
        />
      )}
    </div>
  );
}
