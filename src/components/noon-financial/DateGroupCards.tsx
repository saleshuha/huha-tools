import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DailySummary } from '@/types/noonFinancial';
import { Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface DateGroupCardsProps {
  dailySummaries: DailySummary[];
}

export function DateGroupCards({ dailySummaries }: DateGroupCardsProps) {
  if (dailySummaries.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No transactions to display
      </div>
    );
  }

  // Group entries by reference within each day
  const groupEntriesByReference = (entries: DailySummary['entries']) => {
    const refMap = new Map<string, { amount: number; count: number }>();
    entries.forEach(entry => {
      if (!refMap.has(entry.reference)) {
        refMap.set(entry.reference, { amount: 0, count: 0 });
      }
      const data = refMap.get(entry.reference)!;
      data.amount += entry.amount;
      data.count += 1;
    });
    return Array.from(refMap.entries()).map(([reference, data]) => ({
      reference,
      amount: data.amount,
      count: data.count,
    }));
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {dailySummaries.map((day, index) => {
        const groupedEntries = groupEntriesByReference(day.entries);
        
        return (
          <Card key={index} className="overflow-hidden">
            <CardHeader className="pb-2 bg-muted/30">
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-4 w-4 text-primary" />
                {format(day.date, 'dd MMM yyyy')}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-3 space-y-2">
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {groupedEntries.map((entry, i) => (
                  <div key={i} className="flex justify-between items-center text-sm py-1 border-b border-border/30 last:border-0">
                    <span className="text-muted-foreground truncate flex-1 mr-2 font-mono text-xs">
                      {entry.reference || 'No Reference'}
                    </span>
                    <span className={`font-medium whitespace-nowrap ${
                      entry.amount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {entry.amount >= 0 ? '+' : ''}{entry.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
              
              <div className="pt-2 border-t border-border flex justify-between items-center">
                <span className="text-sm font-medium">Daily Total</span>
                <span className={`font-bold ${
                  day.totalAmount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  {day.totalAmount >= 0 ? '+' : ''}{day.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
