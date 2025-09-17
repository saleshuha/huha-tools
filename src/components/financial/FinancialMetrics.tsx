import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FinancialMetrics as MetricsType } from '@/types/financial';
import { DollarSign, TrendingUp, AlertCircle, FileText } from 'lucide-react';
import { useContext } from 'react';
import { useCountry } from '@/contexts/CountryContext';

interface FinancialMetricsProps {
  metrics: MetricsType;
}

export const FinancialMetrics = ({ metrics }: FinancialMetricsProps) => {
  const { selectedCountry } = useCountry();
  
  const getCurrency = () => {
    switch (selectedCountry) {
      case 'KSA':
        return 'SAR';
      case 'UAE':
        return 'AED';
      default:
        return 'AED';
    }
  };

  const currency = getCurrency();

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
          <AlertCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">
            {formatAmount(metrics.totalOutstanding)}
          </div>
          <p className="text-xs text-muted-foreground">
            {metrics.byStatus.pending + metrics.byStatus.partial + metrics.byStatus.overdue} unpaid records
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {formatAmount(metrics.totalPaid)}
          </div>
          <p className="text-xs text-muted-foreground">
            {metrics.byStatus.paid} paid records
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Overdue Amount</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">
            {formatAmount(metrics.totalOverdue)}
          </div>
          <p className="text-xs text-muted-foreground">
            {metrics.byStatus.overdue} overdue records
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Records</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {metrics.totalRecords}
          </div>
          <p className="text-xs text-muted-foreground">
            All financial records
          </p>
        </CardContent>
      </Card>
    </div>
  );
};