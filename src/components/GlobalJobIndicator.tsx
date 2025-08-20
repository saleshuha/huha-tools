import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Activity, CheckCircle, XCircle } from 'lucide-react';
import { useImportJobs } from '@/hooks/useImportJobs';

export function GlobalJobIndicator() {
  const { jobs } = useImportJobs();
  
  // Show active jobs
  const activeJobs = jobs.filter(job => job.status === 'processing' || job.status === 'queued');
  const recentJobs = jobs.filter(job => job.status === 'completed' || job.status === 'failed').slice(0, 2);
  
  // Don't show if no relevant jobs
  if (activeJobs.length === 0 && recentJobs.length === 0) {
    return null;
  }

  const currentJob = activeJobs[0];

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <Card className="shadow-lg border-2 bg-background/95 backdrop-blur-sm">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-4 w-4 text-blue-500" />
            <span className="font-medium text-sm">
              {activeJobs.length > 0 ? 'Background Jobs' : 'Recent Jobs'}
            </span>
            {activeJobs.length > 1 && (
              <Badge variant="secondary" className="text-xs">
                +{activeJobs.length - 1} more
              </Badge>
            )}
          </div>

          {/* Current Active Job */}
          {currentJob && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span className="truncate capitalize">{currentJob.type.replace('_', ' ')}</span>
                <span>{currentJob.processed_items}/{currentJob.total_items}</span>
              </div>
              <Progress 
                value={currentJob.total_items ? (currentJob.processed_items / currentJob.total_items) * 100 : 0} 
                className="h-2" 
              />
              <div className="flex justify-between text-xs">
                <span className="text-green-600">✓ {currentJob.success_count}</span>
                <span className="text-red-600">✗ {currentJob.error_count}</span>
              </div>
            </div>
          )}

          {/* Recent completed jobs (when no active jobs) */}
          {activeJobs.length === 0 && recentJobs.length > 0 && (
            <div className="space-y-2">
              {recentJobs.map(job => (
                <div key={job.id} className="flex items-center justify-between text-xs">
                  <span className="truncate capitalize">{job.type.replace('_', ' ')}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{job.success_count}/{job.total_items}</span>
                    {job.status === 'completed' ? (
                      <CheckCircle className="h-3 w-3 text-green-500" />
                    ) : (
                      <XCircle className="h-3 w-3 text-red-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}