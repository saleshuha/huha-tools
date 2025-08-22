import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle, 
  FileText,
  TrendingUp,
  Timer,
  Target
} from 'lucide-react';

interface ProgressStats {
  totalFiles: number;
  completedFiles: number;
  failedFiles: number;
  pendingFiles: number;
  retryingFiles: number;
  totalSize: number;
  uploadedSize: number;
  avgUploadTime: number;
  successRate: number;
}

// Mock data for demonstration
const mockStats: ProgressStats = {
  totalFiles: 25,
  completedFiles: 18,
  failedFiles: 2,
  pendingFiles: 3,
  retryingFiles: 2,
  totalSize: 245.5, // MB
  uploadedSize: 189.2, // MB
  avgUploadTime: 3.2, // minutes
  successRate: 90, // percentage
};

const mockCurrentFile = {
  name: 'inventory_report_2024.xlsx',
  progress: 67,
  status: 'uploading' as const,
  timeRemaining: 45, // seconds
  retryCount: 0,
};

export const UploadProgress = () => {
  const [stats] = useState<ProgressStats>(mockStats);
  const [currentFile] = useState(mockCurrentFile);
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    return `${minutes}m ${secs}s`;
  };

  const formatSize = (sizeInMB: number) => {
    if (sizeInMB >= 1024) {
      return `${(sizeInMB / 1024).toFixed(1)} GB`;
    }
    return `${sizeInMB.toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Overall Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Overall Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Files Processed</span>
              <span>{stats.completedFiles + stats.failedFiles} / {stats.totalFiles}</span>
            </div>
            <Progress 
              value={((stats.completedFiles + stats.failedFiles) / stats.totalFiles) * 100} 
              className="w-full" 
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Data Uploaded</span>
              <span>{formatSize(stats.uploadedSize)} / {formatSize(stats.totalSize)}</span>
            </div>
            <Progress 
              value={(stats.uploadedSize / stats.totalSize) * 100} 
              className="w-full" 
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <CheckCircle className="h-6 w-6 mx-auto mb-1 text-green-500" />
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {stats.completedFiles}
              </p>
              <p className="text-xs text-green-600 dark:text-green-400">Completed</p>
            </div>

            <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <XCircle className="h-6 w-6 mx-auto mb-1 text-red-500" />
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {stats.failedFiles}
              </p>
              <p className="text-xs text-red-600 dark:text-red-400">Failed</p>
            </div>

            <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <Clock className="h-6 w-6 mx-auto mb-1 text-gray-500" />
              <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                {stats.pendingFiles}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Pending</p>
            </div>

            <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <AlertCircle className="h-6 w-6 mx-auto mb-1 text-yellow-500" />
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {stats.retryingFiles}
              </p>
              <p className="text-xs text-yellow-600 dark:text-yellow-400">Retrying</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current File Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Current Upload</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-blue-500" />
            <div className="flex-1">
              <p className="font-medium">{currentFile.name}</p>
              <p className="text-sm text-muted-foreground">
                {currentFile.progress}% complete • {currentFile.timeRemaining}s remaining
              </p>
            </div>
            <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">
              {currentFile.status}
            </Badge>
          </div>

          <div className="space-y-2">
            <Progress value={currentFile.progress} className="w-full" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Uploading...</span>
              <span>{currentFile.progress}%</span>
            </div>
          </div>

          {currentFile.retryCount > 0 && (
            <p className="text-sm text-yellow-600 dark:text-yellow-400">
              Retry attempt: {currentFile.retryCount}/5
            </p>
          )}
        </CardContent>
      </Card>

      {/* Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Session Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <Timer className="h-6 w-6 mx-auto mb-2 text-blue-500" />
              <p className="text-2xl font-bold">{formatTime(elapsedTime)}</p>
              <p className="text-sm text-muted-foreground">Elapsed Time</p>
            </div>

            <div className="text-center p-4 border rounded-lg">
              <TrendingUp className="h-6 w-6 mx-auto mb-2 text-green-500" />
              <p className="text-2xl font-bold">{stats.avgUploadTime}m</p>
              <p className="text-sm text-muted-foreground">Avg Upload Time</p>
            </div>

            <div className="text-center p-4 border rounded-lg">
              <Target className="h-6 w-6 mx-auto mb-2 text-purple-500" />
              <p className="text-2xl font-bold">{stats.successRate}%</p>
              <p className="text-sm text-muted-foreground">Success Rate</p>
            </div>

            <div className="text-center p-4 border rounded-lg">
              <FileText className="h-6 w-6 mx-auto mb-2 text-orange-500" />
              <p className="text-2xl font-bold">{formatSize(stats.totalSize)}</p>
              <p className="text-sm text-muted-foreground">Total Size</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Queue Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Next in Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {['product_catalog_update.csv', 'pricing_adjustments.xlsx', 'inventory_sync.csv'].map((filename, index) => (
              <div key={filename} className="flex items-center gap-3 p-3 border rounded-lg">
                <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-medium">
                  {index + 1}
                </div>
                <FileText className="h-4 w-4 text-gray-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{filename}</p>
                  <p className="text-xs text-muted-foreground">Waiting in queue</p>
                </div>
                <Badge variant="outline">Pending</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};