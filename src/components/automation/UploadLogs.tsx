import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle, 
  Search,
  Download,
  Filter,
  Calendar
} from 'lucide-react';

interface LogEntry {
  id: string;
  timestamp: Date;
  filename: string;
  status: 'success' | 'error' | 'retry' | 'processing';
  message: string;
  duration?: number;
  retryCount?: number;
  errorDetails?: string;
  fileSize: number;
}

// Mock log data
const mockLogs: LogEntry[] = [
  {
    id: '1',
    timestamp: new Date('2024-01-15T10:30:00'),
    filename: 'inventory_report_2024.xlsx',
    status: 'success',
    message: 'File uploaded successfully',
    duration: 180,
    fileSize: 2.4,
  },
  {
    id: '2',
    timestamp: new Date('2024-01-15T10:25:00'),
    filename: 'product_catalog.csv',
    status: 'error',
    message: 'Upload failed after maximum retries',
    retryCount: 5,
    errorDetails: 'Connection timeout after 3 attempts',
    fileSize: 1.8,
  },
  {
    id: '3',
    timestamp: new Date('2024-01-15T10:20:00'),
    filename: 'pricing_updates.xlsx',
    status: 'retry',
    message: 'File already in process, retrying in 5 minutes',
    retryCount: 2,
    fileSize: 0.9,
  },
  {
    id: '4',
    timestamp: new Date('2024-01-15T10:15:00'),
    filename: 'customer_data.csv',
    status: 'success',
    message: 'File uploaded successfully',
    duration: 95,
    fileSize: 5.2,
  },
  {
    id: '5',
    timestamp: new Date('2024-01-15T10:10:00'),
    filename: 'stock_levels.xlsx',
    status: 'processing',
    message: 'File is being processed',
    fileSize: 3.1,
  },
];

export const UploadLogs = () => {
  const [logs] = useState<LogEntry[]>(mockLogs);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.message.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (status: LogEntry['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'retry':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: LogEntry['status']) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'retry':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'processing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatFileSize = (sizeInMB: number) => {
    return `${sizeInMB.toFixed(1)} MB`;
  };

  const exportLogs = () => {
    const csvContent = [
      ['Timestamp', 'Filename', 'Status', 'Message', 'Duration', 'Retry Count', 'File Size'],
      ...filteredLogs.map(log => [
        log.timestamp.toISOString(),
        log.filename,
        log.status,
        log.message,
        log.duration ? formatDuration(log.duration) : '',
        log.retryCount?.toString() || '',
        formatFileSize(log.fileSize),
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `upload-logs-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Filters and Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Log Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="success">Success</option>
                <option value="error">Error</option>
                <option value="retry">Retry</option>
                <option value="processing">Processing</option>
              </select>
              
              <Button onClick={exportLogs} variant="outline" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>Showing {filteredLogs.length} of {logs.length} entries</span>
          </div>
        </CardContent>
      </Card>

      {/* Log Entries */}
      <Card>
        <CardHeader>
          <CardTitle>Upload History</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] w-full">
            <div className="space-y-3">
              {filteredLogs.map((log) => (
                <div 
                  key={log.id} 
                  className="p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      {getStatusIcon(log.status)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-sm truncate">{log.filename}</p>
                          <Badge variant="outline" className={getStatusColor(log.status)}>
                            {log.status}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-2">
                          {log.message}
                        </p>
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {log.timestamp.toLocaleString()}
                          </span>
                          
                          <span>Size: {formatFileSize(log.fileSize)}</span>
                          
                          {log.duration && (
                            <span>Duration: {formatDuration(log.duration)}</span>
                          )}
                          
                          {log.retryCount && log.retryCount > 0 && (
                            <span className="text-yellow-600 dark:text-yellow-400">
                              Retries: {log.retryCount}
                            </span>
                          )}
                        </div>
                        
                        {log.errorDetails && (
                          <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs">
                            <p className="text-red-600 dark:text-red-400 font-medium">Error Details:</p>
                            <p className="text-red-700 dark:text-red-300">{log.errorDetails}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {filteredLogs.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No log entries found matching your criteria.</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Log Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <CheckCircle className="h-6 w-6 mx-auto mb-1 text-green-500" />
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {logs.filter(log => log.status === 'success').length}
              </p>
              <p className="text-xs text-green-600 dark:text-green-400">Successful</p>
            </div>

            <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <XCircle className="h-6 w-6 mx-auto mb-1 text-red-500" />
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {logs.filter(log => log.status === 'error').length}
              </p>
              <p className="text-xs text-red-600 dark:text-red-400">Failed</p>
            </div>

            <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <AlertCircle className="h-6 w-6 mx-auto mb-1 text-yellow-500" />
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {logs.filter(log => log.status === 'retry').length}
              </p>
              <p className="text-xs text-yellow-600 dark:text-yellow-400">Retrying</p>
            </div>

            <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Clock className="h-6 w-6 mx-auto mb-1 text-blue-500" />
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {logs.filter(log => log.status === 'processing').length}
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400">Processing</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};