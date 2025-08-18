import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { ProcessingJob } from '@/pages/NoonFileCleaner';

interface ProcessingStatusProps {
  job: ProcessingJob;
}

export const ProcessingStatus: React.FC<ProcessingStatusProps> = ({ job }) => {
  const getStatusIcon = () => {
    switch (job.status) {
      case 'processing':
        return <Loader2 className="h-6 w-6 animate-spin text-primary" />;
      case 'completed':
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'error':
        return <XCircle className="h-6 w-6 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = () => {
    switch (job.status) {
      case 'processing':
        return <Badge variant="default">Processing</Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-green-500">Completed</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="secondary">Idle</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getStatusIcon()}
              <span>Processing Status</span>
            </div>
            {getStatusBadge()}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium">{job.currentStep}</span>
              <span className="text-muted-foreground">{Math.round(job.progress)}%</span>
            </div>
            <Progress value={job.progress} className="h-2" />
          </div>

          {job.error && (
            <div className="p-4 border border-red-200 bg-red-50 dark:bg-red-950/20 rounded-lg">
              <h4 className="font-medium text-red-800 dark:text-red-200 mb-2">Error Details</h4>
              <p className="text-sm text-red-600 dark:text-red-300">{job.error}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <p className="font-medium">Base Files</p>
              <p className="text-muted-foreground">{job.baseFiles.length} files</p>
            </div>
            <div className="space-y-1">
              <p className="font-medium">Error Files</p>
              <p className="text-muted-foreground">{job.errorFiles.length} files</p>
            </div>
          </div>

          {job.startTime && (
            <div className="text-sm text-muted-foreground">
              <p>Started: {job.startTime.toLocaleString()}</p>
              {job.endTime && (
                <p>Completed: {job.endTime.toLocaleString()}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {job.status === 'processing' && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-sm text-muted-foreground">
                Please wait while we process your files...
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};