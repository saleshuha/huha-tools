import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Loader2 } from 'lucide-react';

interface LiveApiCheckProgressProps {
  current: number;
  total: number;
  checking: boolean;
}

export function LiveApiCheckProgress({ current, total, checking }: LiveApiCheckProgressProps) {
  if (!checking) return null;

  const progress = total > 0 ? (current / total) * 100 : 0;

  return (
    <Card className="p-6 mb-6 border-primary/20 bg-primary/5">
      <div className="flex items-center gap-4">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-foreground">
              Checking items against Sunsky catalog...
            </p>
            <span className="text-sm text-muted-foreground">
              {current} / {total}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>
    </Card>
  );
}
