import React, { useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, AlertTriangle } from 'lucide-react';

interface AutoProcessingIndicatorProps {
  totalOrders: number;
  uploadedOrders: number;
  readyOrders: number;
  placedOrders: number;
  isProcessing: boolean;
}

export function AutoProcessingIndicator({ 
  totalOrders, 
  uploadedOrders, 
  readyOrders, 
  placedOrders, 
  isProcessing 
}: AutoProcessingIndicatorProps) {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');

  useEffect(() => {
    if (totalOrders === 0) {
      setProgress(0);
      setCurrentStep('No orders to process');
      return;
    }

    const processedCount = totalOrders - uploadedOrders;
    const progressPercent = Math.round((processedCount / totalOrders) * 100);
    setProgress(progressPercent);

    if (uploadedOrders > 0) {
      setCurrentStep(`Processing ${uploadedOrders} new orders...`);
    } else if (readyOrders > 0) {
      setCurrentStep(`Placing ${readyOrders} orders with Sunsky...`);
    } else if (placedOrders > 0) {
      setCurrentStep(`Syncing ${placedOrders} placed orders...`);
    } else {
      setCurrentStep('All orders processed');
    }
  }, [totalOrders, uploadedOrders, readyOrders, placedOrders]);

  if (totalOrders === 0 && !isProcessing) return null;

  return (
    <div className="mb-4 p-4 border rounded-lg bg-background/50 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {isProcessing ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : progress === 100 ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          )}
          <span className="text-sm font-medium">Auto-Processing Status</span>
        </div>
        <Badge variant={progress === 100 ? "default" : "secondary"}>
          {progress}% Complete
        </Badge>
      </div>
      
      <Progress value={progress} className="mb-2" />
      
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{currentStep}</span>
        <span>{totalOrders - uploadedOrders} of {totalOrders} processed</span>
      </div>

      {(uploadedOrders > 0 || readyOrders > 0 || placedOrders > 0) && (
        <div className="flex gap-2 mt-2">
          {uploadedOrders > 0 && (
            <Badge variant="outline" className="text-xs">
              {uploadedOrders} validating
            </Badge>
          )}
          {readyOrders > 0 && (
            <Badge variant="outline" className="text-xs">
              {readyOrders} placing
            </Badge>
          )}
          {placedOrders > 0 && (
            <Badge variant="outline" className="text-xs">
              {placedOrders} syncing
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}