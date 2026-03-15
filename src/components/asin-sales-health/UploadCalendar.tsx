import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Lock, Unlock, Calendar } from 'lucide-react';
import type { UploadLock } from '@/hooks/useAsinSalesHealth';

interface Props {
  locks: UploadLock[];
  onSelectMonth: (year: number, month: number) => void;
  onUnlock: (year: number, month: number) => void;
  selectedYear: number;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function UploadCalendar({ locks, onSelectMonth, onUnlock, selectedYear }: Props) {
  const lockMap = new Map<string, UploadLock>();
  locks.forEach(l => lockMap.set(`${l.year}-${l.month}`, l));

  return (
    <Card className="border border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Upload Calendar — {selectedYear}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
          {MONTH_NAMES.map((name, idx) => {
            const monthNum = idx + 1;
            const key = `${selectedYear}-${monthNum}`;
            const lock = lockMap.get(key);
            const isLocked = !!lock;
            const isFuture = new Date(selectedYear, idx) > new Date();

            return (
              <div
                key={key}
                className={`rounded-lg border p-3 text-center transition-colors ${
                  isLocked
                    ? 'bg-green-50 border-green-300 dark:bg-green-950/30 dark:border-green-800'
                    : isFuture
                    ? 'bg-muted/30 border-border opacity-50'
                    : 'bg-card border-border hover:border-primary/50 cursor-pointer'
                }`}
                onClick={() => !isLocked && !isFuture && onSelectMonth(selectedYear, monthNum)}
              >
                <div className="text-xs font-medium text-foreground">{name}</div>
                {isLocked ? (
                  <div className="mt-1 space-y-1">
                    <Lock className="h-3 w-3 mx-auto text-green-600" />
                    <div className="text-[10px] text-muted-foreground">{lock.total_asins} ASINs</div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 text-[10px] px-1"
                      onClick={(e) => { e.stopPropagation(); onUnlock(selectedYear, monthNum); }}
                    >
                      <Unlock className="h-3 w-3 mr-1" /> Unlock
                    </Button>
                  </div>
                ) : !isFuture ? (
                  <div className="mt-1">
                    <Badge variant="outline" className="text-[10px]">Pending</Badge>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
