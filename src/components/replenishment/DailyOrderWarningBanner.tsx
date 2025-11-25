import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface DailyOrderWarningBannerProps {
  pendingCount: number;
  onViewPending: () => void;
}

export function DailyOrderWarningBanner({ pendingCount, onViewPending }: DailyOrderWarningBannerProps) {
  if (pendingCount === 0) return null;

  return (
    <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
      <AlertTriangle className="h-5 w-5" />
      <AlertTitle className="text-lg font-semibold">Previous Day Orders Pending</AlertTitle>
      <AlertDescription className="mt-2">
        <div className="flex items-center justify-between">
          <span>
            You have <strong>{pendingCount}</strong> item{pendingCount !== 1 ? 's' : ''} from previous days that haven't been ordered yet.
            These items need attention before processing today's sales.
          </span>
          <Button 
            variant="outline" 
            size="sm"
            onClick={onViewPending}
            className="ml-4 whitespace-nowrap"
          >
            View Pending Items
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
