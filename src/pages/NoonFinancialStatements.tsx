import { useState } from 'react';
import { HuhaHeader01 } from '@/components/ui/huha-header-01';
import { FileUploadZone } from '@/components/noon-financial/FileUploadZone';
import { TransactionTable } from '@/components/noon-financial/TransactionTable';
import { WeeklySummaryCards } from '@/components/noon-financial/WeeklySummaryCards';
import { WeeklyBreakdownTable } from '@/components/noon-financial/WeeklyBreakdownTable';
import { NoonTransaction, WeeklySummary } from '@/types/noonFinancial';
import { parseNoonStatement, groupTransactionsByWeek } from '@/utils/noonFinancialParser';
import { BarChart3 } from 'lucide-react';

export default function NoonFinancialStatements() {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [transactions, setTransactions] = useState<NoonTransaction[]>([]);
  const [weeklySummaries, setWeeklySummaries] = useState<WeeklySummary[]>([]);

  const handleFileUpload = (file: File, data: Record<string, any>[], headers: string[]) => {
    // Parse the CSV data into NoonTransaction objects
    const parsedTransactions = parseNoonStatement(data);
    
    // Append to existing transactions
    setTransactions(prev => [...prev, ...parsedTransactions]);
    setUploadedFiles(prev => [...prev, file]);

    // Group transactions by week
    const allTransactions = [...transactions, ...parsedTransactions];
    const weeklyData = groupTransactionsByWeek(allTransactions);
    setWeeklySummaries(weeklyData);
  };

  const hasData = transactions.length > 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <HuhaHeader01
        icon={<BarChart3 className="h-6 w-6 text-primary-foreground" />}
        title="Noon Financial Statement Analyzer"
        subtitle="Upload and analyze your weekly Noon financial statements"
      />

      <FileUploadZone onFileUpload={handleFileUpload} />

      {hasData && (
        <>
          <WeeklySummaryCards summaries={weeklySummaries} />
          <WeeklyBreakdownTable summaries={weeklySummaries} />
          <TransactionTable transactions={transactions} />
        </>
      )}
    </div>
  );
}
