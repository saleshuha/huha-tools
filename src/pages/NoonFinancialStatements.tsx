import { useState } from 'react';
import { HuhaHeader01 } from '@/components/ui/huha-header-01';
import { FileUploadZone } from '@/components/noon-financial/FileUploadZone';
import { DateGroupCards } from '@/components/noon-financial/DateGroupCards';
import { NoonTransaction, DailySummary } from '@/types/noonFinancial';
import { parseNoonStatement, groupTransactionsByDate } from '@/utils/noonFinancialParser';
import { BarChart3, ChevronDown, Upload } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';

export default function NoonFinancialStatements() {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [transactions, setTransactions] = useState<NoonTransaction[]>([]);
  const [dailySummaries, setDailySummaries] = useState<DailySummary[]>([]);
  const [isUploadOpen, setIsUploadOpen] = useState(true);

  const handleFileUpload = (file: File, data: Record<string, any>[], headers: string[]) => {
    const parsedTransactions = parseNoonStatement(data);
    
    const allTransactions = [...transactions, ...parsedTransactions];
    setTransactions(allTransactions);
    setUploadedFiles(prev => [...prev, file]);

    const dailyData = groupTransactionsByDate(allTransactions);
    setDailySummaries(dailyData);
    
    // Collapse upload zone after successful upload
    setIsUploadOpen(false);
  };

  const hasData = transactions.length > 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <HuhaHeader01
        icon={<BarChart3 className="h-6 w-6 text-primary-foreground" />}
        title="Noon Financial Statement Analyzer"
        subtitle="Upload and analyze your weekly Noon financial statements"
      />

      <Collapsible open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              {hasData ? 'Upload More Files' : 'Upload Statement Files'}
            </span>
            <ChevronDown className={`h-4 w-4 transition-transform ${isUploadOpen ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-4">
          <FileUploadZone onFileUpload={handleFileUpload} />
        </CollapsibleContent>
      </Collapsible>

      {hasData && (
        <DateGroupCards dailySummaries={dailySummaries} />
      )}
    </div>
  );
}
