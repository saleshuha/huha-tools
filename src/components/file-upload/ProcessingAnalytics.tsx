import React from 'react';
import { Card, CardTitle } from '@/components/ui/card';
import { ProcessingAnalytics } from '@/types/file-upload';

interface ProcessingAnalyticsProps {
  analytics: ProcessingAnalytics;
}

export const ProcessingAnalyticsDisplay: React.FC<ProcessingAnalyticsProps> = ({
  analytics
}) => {
  if (analytics.totalFilesProcessed === 0) {
    return null;
  }

  return (
    <Card className="p-4">
      <CardTitle className="text-lg mb-3">Processing Summary</CardTitle>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <div className="font-medium text-muted-foreground">Files Processed</div>
          <div className="text-2xl font-bold">{analytics.totalFilesProcessed}</div>
        </div>
        <div>
          <div className="font-medium text-muted-foreground">Rows Processed</div>
          <div className="text-2xl font-bold">{analytics.totalRowsProcessed.toLocaleString()}</div>
        </div>
        <div>
          <div className="font-medium text-muted-foreground">SKUs Saved</div>
          <div className="text-2xl font-bold text-green-600">{analytics.savedToDatabase.toLocaleString()}</div>
        </div>
        <div>
          <div className="font-medium text-muted-foreground">Duplicates Filtered</div>
          <div className="text-2xl font-bold text-orange-600">{analytics.duplicatesFiltered.toLocaleString()}</div>
        </div>
      </div>
    </Card>
  );
};