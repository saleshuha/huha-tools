import { useState } from 'react';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WeeklySummary } from '@/types/noonFinancial';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

interface WeeklyBreakdownTableProps {
  summaries: WeeklySummary[];
}

export function WeeklyBreakdownTable({ summaries }: WeeklyBreakdownTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (reference: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(reference)) {
        newSet.delete(reference);
      } else {
        newSet.add(reference);
      }
      return newSet;
    });
  };

  const getStatusBadge = (summary: WeeklySummary) => {
    const isPaid = summary.payoutAmount > 0;
    return (
      <Badge variant={isPaid ? 'default' : 'secondary'}>
        {isPaid ? 'Paid' : 'Unpaid'}
      </Badge>
    );
  };

  return (
    <Card className="glass-container p-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Weekly Breakdown</h3>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Week Reference</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Fees</TableHead>
                <TableHead className="text-right">VAT</TableHead>
                <TableHead className="text-right">Payout</TableHead>
                <TableHead className="text-right">Net Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summaries.map((summary) => {
                const isExpanded = expandedRows.has(summary.reference);
                return (
                  <>
                    <TableRow key={summary.reference} className="cursor-pointer hover:bg-accent/5">
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleRow(summary.reference)}
                          className="h-8 w-8 p-0"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{summary.reference}</TableCell>
                      <TableCell>{format(summary.weekEndDate, 'MMM dd, yyyy')}</TableCell>
                      <TableCell className="text-right font-semibold text-green-600 dark:text-green-400">
                        +{summary.netProceeds.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-red-600 dark:text-red-400">
                        -{summary.totalFees.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-orange-600 dark:text-orange-400">
                        -{summary.vatAmount.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-blue-600 dark:text-blue-400">
                        {summary.payoutAmount > 0 ? '+' : ''}{summary.payoutAmount.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {summary.netAmount.toFixed(2)} SAR
                      </TableCell>
                      <TableCell>{getStatusBadge(summary)}</TableCell>
                    </TableRow>

                    {isExpanded && (
                      <TableRow>
                        <TableCell colSpan={9} className="bg-accent/5 p-6">
                          <div className="space-y-3">
                            <h4 className="font-semibold text-sm">Fee Breakdown</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {Object.entries(summary.feeBreakdown)
                                .sort(([, a], [, b]) => b - a)
                                .map(([feeType, amount]) => (
                                  <div
                                    key={feeType}
                                    className="flex justify-between items-center p-3 rounded-lg bg-background border"
                                  >
                                    <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                                      {feeType}
                                    </span>
                                    <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                                      -{amount.toFixed(2)}
                                    </span>
                                  </div>
                                ))}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </Card>
  );
}
