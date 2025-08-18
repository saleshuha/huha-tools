import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, Clock, CheckCircle, XCircle, FileText } from 'lucide-react';
import { ProcessingJob } from '@/pages/NoonFileCleaner';

interface HistoryViewProps {
  jobs: ProcessingJob[];
}

export const HistoryView: React.FC<HistoryViewProps> = ({ jobs }) => {
  const getStatusIcon = (status: ProcessingJob['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-blue-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: ProcessingJob['status']) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500">Completed</Badge>;
      case 'error':
        return <Badge variant="destructive">Failed</Badge>;
      case 'processing':
        return <Badge variant="default">Processing</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const formatDuration = (start?: Date, end?: Date) => {
    if (!start || !end) return 'N/A';
    const duration = end.getTime() - start.getTime();
    const seconds = Math.floor(duration / 1000);
    return `${seconds}s`;
  };

  const downloadFile = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (jobs.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <Clock className="h-12 w-12 mx-auto text-muted-foreground" />
            <div className="space-y-2">
              <h3 className="text-lg font-medium">No Processing History</h3>
              <p className="text-muted-foreground">
                Your completed processing jobs will appear here.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Processing History ({jobs.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Start Time</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Base Files</TableHead>
              <TableHead>Error Files</TableHead>
              <TableHead>SKUs Removed</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.map((job) => (
              <TableRow key={job.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(job.status)}
                    {getStatusBadge(job.status)}
                  </div>
                </TableCell>
                <TableCell>
                  {job.startTime ? job.startTime.toLocaleString() : 'N/A'}
                </TableCell>
                <TableCell>
                  {formatDuration(job.startTime, job.endTime)}
                </TableCell>
                <TableCell>{job.baseFiles.length}</TableCell>
                <TableCell>{job.errorFiles.length}</TableCell>
                <TableCell>
                  {job.results 
                    ? job.results.cleanedFiles.reduce((sum, file) => sum + file.removedCount, 0)
                    : 'N/A'
                  }
                </TableCell>
                <TableCell>
                  {job.status === 'completed' && job.results && (
                    <div className="flex items-center gap-2">
                      {job.results.zipFile && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadFile(job.results!.zipFile!.blob, job.results!.zipFile!.name)}
                          className="flex items-center gap-1"
                        >
                          <Download className="h-3 w-3" />
                          ZIP
                        </Button>
                      )}
                      {job.results.consolidatedFile && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadFile(job.results!.consolidatedFile!.blob, job.results!.consolidatedFile!.name)}
                          className="flex items-center gap-1"
                        >
                          <FileText className="h-3 w-3" />
                          Consolidated
                        </Button>
                      )}
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};