import { Card } from '@/components/ui/card';
import { WeeklySummary } from '@/types/noonFinancial';
import { TrendingUp, TrendingDown, DollarSign, Calendar, CreditCard, Award } from 'lucide-react';

interface WeeklySummaryCardsProps {
  summaries: WeeklySummary[];
}

export function WeeklySummaryCards({ summaries }: WeeklySummaryCardsProps) {
  const totalNetProceeds = summaries.reduce((sum, s) => sum + s.netProceeds, 0);
  const totalFees = summaries.reduce((sum, s) => sum + s.totalFees, 0);
  const totalVAT = summaries.reduce((sum, s) => sum + s.vatAmount, 0);
  const totalPayouts = summaries.reduce((sum, s) => sum + s.payoutAmount, 0);
  const netProfit = totalNetProceeds - totalFees - totalVAT;
  const avgWeeklyRevenue = summaries.length > 0 ? totalNetProceeds / summaries.length : 0;

  const metrics = [
    {
      title: 'Total Net Proceeds',
      value: totalNetProceeds,
      icon: TrendingUp,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'Total Fees Paid',
      value: totalFees,
      icon: TrendingDown,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-500/10',
    },
    {
      title: 'Total VAT',
      value: totalVAT,
      icon: CreditCard,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-500/10',
    },
    {
      title: 'Net Profit',
      value: netProfit,
      icon: Award,
      color: netProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400',
      bgColor: netProfit >= 0 ? 'bg-green-500/10' : 'bg-red-500/10',
    },
    {
      title: 'Total Payouts',
      value: totalPayouts,
      icon: DollarSign,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Weeks Analyzed',
      value: summaries.length,
      icon: Calendar,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-500/10',
      isCount: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {metrics.map((metric, index) => {
        const Icon = metric.icon;
        return (
          <Card key={index} className="glass-container p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{metric.title}</p>
                <p className={`text-2xl font-bold ${metric.color}`}>
                  {metric.isCount
                    ? metric.value
                    : `${metric.value >= 0 ? '+' : ''}${metric.value.toFixed(2)} SAR`}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${metric.bgColor}`}>
                <Icon className={`h-6 w-6 ${metric.color}`} />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
