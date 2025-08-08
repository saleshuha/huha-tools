import React from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Loader2, CheckCircle } from 'lucide-react';

interface ProcessingProgressProps {
  isProcessingBulk: boolean;
  bulkProgress: number;
  globalMapping: any;
  selectedFilesLength: number;
}

export const ProcessingProgress: React.FC<ProcessingProgressProps> = ({
  isProcessingBulk,
  bulkProgress,
  globalMapping,
  selectedFilesLength
}) => {
  return (
    <>
      {/* Processing Status */}
      {(isProcessingBulk && bulkProgress < 100) && (
        <div className="mt-4 p-4 border rounded-lg bg-blue-50 dark:bg-blue-950">
          <div className="flex items-center gap-2 mb-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="font-medium">Bulk Processing in Progress</span>
          </div>
          <div className="text-sm text-muted-foreground mb-2">
            Processing files and saving to database...
          </div>
          <Progress value={bulkProgress} className="w-full" />
          <div className="text-xs text-muted-foreground mt-1">
            {bulkProgress}% Complete
          </div>
        </div>
      )}
      
      {/* Global Mapping Status */}
      {globalMapping && (
        <div className="mt-4 p-3 border rounded-lg bg-green-50 dark:bg-green-950">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-800 dark:text-green-200">
              Column mapping applied to all files
            </span>
          </div>
          <div className="text-xs text-green-600 dark:text-green-400 mt-1">
            Ready to process {selectedFilesLength} files
          </div>
        </div>
      )}
      
      {/* Bulk Progress */}
      {isProcessingBulk && (
        <Card className="p-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Overall Progress</span>
              <span>{bulkProgress}%</span>
            </div>
            <Progress value={bulkProgress} className="w-full" />
          </div>
        </Card>
      )}
    </>
  );
};