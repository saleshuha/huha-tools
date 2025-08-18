import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, Archive, RefreshCw } from 'lucide-react';
import { ProcessingJob } from '@/pages/NoonFileCleaner';

interface ResultsDisplayProps {
  job: ProcessingJob;
  onReset: () => void;
}

export const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ job, onReset }) => {
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

  if (job.status !== 'completed' || !job.results) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
            <div className="space-y-2">
              <h3 className="text-lg font-medium">No Results Available</h3>
              <p className="text-muted-foreground">
                Complete a processing job to see results here.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { results } = job;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Processing Results</h2>
        <Button onClick={onReset} variant="outline" className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Start New Job
        </Button>
      </div>

      {/* Individual Cleaned Files */}
      <Card>
        <CardHeader>
          <CardTitle>Cleaned Files</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {results.cleanedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-4 border rounded-lg bg-background"
            >
              <div className="space-y-1">
                <h4 className="font-medium">{file.name}</h4>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>Removed: {file.removedCount} SKUs</span>
                  <span>Remaining: {file.remainingCount} SKUs</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => downloadFile(file.blob, file.name)}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => downloadFile(results.logFiles[index].blob, results.logFiles[index].name)}
                  className="flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Log
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Global Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Download All</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {results.consolidatedFile && (
              <Button
                onClick={() => downloadFile(results.consolidatedFile!.blob, results.consolidatedFile!.name)}
                className="flex items-center gap-2 h-auto p-4"
                variant="outline"
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  <div className="text-left">
                    <div className="font-medium">Consolidated File</div>
                    <div className="text-sm text-muted-foreground">All cleaned data in one file</div>
                  </div>
                </div>
              </Button>
            )}
            
            {results.zipFile && (
              <Button
                onClick={() => downloadFile(results.zipFile!.blob, results.zipFile!.name)}
                className="flex items-center gap-2 h-auto p-4"
                variant="outline"
              >
                <div className="flex items-center gap-2">
                  <Archive className="h-5 w-5" />
                  <div className="text-left">
                    <div className="font-medium">Complete Package</div>
                    <div className="text-sm text-muted-foreground">All files in ZIP format</div>
                  </div>
                </div>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Job Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Job Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="space-y-1">
              <p className="text-2xl font-bold text-primary">{job.baseFiles.length}</p>
              <p className="text-sm text-muted-foreground">Base Files</p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-primary">{job.errorFiles.length}</p>
              <p className="text-sm text-muted-foreground">Error Files</p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-green-600">
                {results.cleanedFiles.reduce((sum, file) => sum + file.removedCount, 0)}
              </p>
              <p className="text-sm text-muted-foreground">SKUs Removed</p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-blue-600">
                {results.cleanedFiles.reduce((sum, file) => sum + file.remainingCount, 0)}
              </p>
              <p className="text-sm text-muted-foreground">SKUs Remaining</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};