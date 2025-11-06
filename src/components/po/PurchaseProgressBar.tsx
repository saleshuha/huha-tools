import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle, AlertCircle } from 'lucide-react';

interface PurchaseProgressBarProps {
  totalItems: number;
  purchasedItems: number;
  partialItems: number;
}

export const PurchaseProgressBar = ({ 
  totalItems, 
  purchasedItems, 
  partialItems 
}: PurchaseProgressBarProps) => {
  const pendingItems = totalItems - purchasedItems - partialItems;
  const progressPercent = totalItems > 0 ? (purchasedItems / totalItems) * 100 : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Purchase Progress</h3>
        <span className="text-sm font-semibold text-primary">
          {progressPercent.toFixed(0)}% Complete
        </span>
      </div>
      
      <Progress value={progressPercent} className="h-2" />
      
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <div>
            <p className="font-medium">{purchasedItems}</p>
            <p className="text-xs text-muted-foreground">Complete</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-yellow-500" />
          <div>
            <p className="font-medium">{partialItems}</p>
            <p className="text-xs text-muted-foreground">Partial</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Circle className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="font-medium">{pendingItems}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </div>
        </div>
      </div>
    </div>
  );
};
