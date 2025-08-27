import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Download, 
  Clock, 
  Activity, 
  CheckCircle2, 
  AlertCircle, 
  Calendar,
  Database,
  FileText,
  Settings,
  Users,
  Tag,
  Package
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ExportHistoryEntry } from '@/hooks/useExportHistory';

interface ExportHistoryDialogProps {
  entry: ExportHistoryEntry | null;
  isOpen: boolean;
  onClose: () => void;
  onDownload: (entry: ExportHistoryEntry) => void;
  onRerun: (entry: ExportHistoryEntry) => void;
}

export function ExportHistoryDialog({ 
  entry, 
  isOpen, 
  onClose, 
  onDownload, 
  onRerun 
}: ExportHistoryDialogProps) {
  if (!entry) return null;

  const metadata = entry.metadata || {};
  const filters = entry.filters || {};
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'processing':
        return <Activity className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'cancelled':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      default:
        return <Activity className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: 'default',
      processing: 'secondary',
      failed: 'destructive',
      cancelled: 'outline'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`;
  };

  const getExportType = (type: string) => {
    switch (type) {
      case 'status_export': return 'Status Export';
      case 'category_export': return 'Category Export';
      case 'search_export': return 'Search Export';
      default: return type;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {getStatusIcon(entry.status)}
            Export Details
          </DialogTitle>
          <DialogDescription>
            Comprehensive information about this export operation
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-6">
            {/* Overview Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Export Overview
                  </div>
                  {getStatusBadge(entry.status)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-muted-foreground">Export Type</div>
                    <div className="font-semibold">{getExportType(entry.export_type)}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-muted-foreground">Total Items</div>
                    <div className="font-semibold">{entry.total_items.toLocaleString()}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-muted-foreground">Created</div>
                    <div className="font-semibold">{formatDistanceToNow(new Date(entry.created_at))} ago</div>
                  </div>
                </div>
                
                {entry.file_path && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-muted-foreground">File Name</div>
                      <div className="font-mono text-sm bg-muted p-2 rounded">
                        {entry.file_path.split('/').pop()}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-muted-foreground">File Size</div>
                      <div className="font-semibold">{formatFileSize(entry.file_size)}</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Export Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Export Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filters.status && (
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-muted-foreground">Product Status</div>
                      <Badge variant="outline">
                        {filters.status === 1 ? 'Valid' :
                         filters.status === 2 ? 'Deleted' :
                         filters.status === 3 ? 'Out of Stock' :
                         filters.status === 4 ? 'Hidden (too old)' :
                         `Status ${filters.status}`}
                      </Badge>
                    </div>
                  )}
                  
                  {filters.categoryName && (
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-muted-foreground">Category</div>
                      <Badge variant="outline">{filters.categoryName}</Badge>
                    </div>
                  )}
                  
                  {filters.pageSize && (
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-muted-foreground">Page Size</div>
                      <Badge variant="outline">{filters.pageSize} items per page</Badge>
                    </div>
                  )}
                  
                  {filters.maxPages && (
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-muted-foreground">Max Pages</div>
                      <Badge variant="outline">
                        {filters.maxPages === 9007199254740991 ? 'Unlimited' : filters.maxPages}
                      </Badge>
                    </div>
                  )}
                </div>

                {/* API Keys Used */}
                {filters.apiKeys && Array.isArray(filters.apiKeys) && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      API Keys Used ({filters.apiKeys.length})
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {filters.apiKeys.map((api: any, index: number) => (
                        <Badge key={api.id || index} variant="secondary">
                          {api.name || `API Key ${index + 1}`}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Export Columns */}
                {filters.columns && Array.isArray(filters.columns) && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      Export Columns ({filters.columns.length})
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {filters.columns.map((column: string, index: number) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {column}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Timing Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Timing Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-muted-foreground">Started At</div>
                    <div className="font-mono text-sm">
                      {new Date(entry.created_at).toLocaleString()}
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-muted-foreground">Time Ago</div>
                    <div className="font-semibold">
                      {formatDistanceToNow(new Date(entry.created_at))} ago
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Error Information */}
            {entry.error_message && (
              <Card className="border-red-200 bg-red-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-800">
                    <AlertCircle className="h-5 w-5" />
                    Error Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-white border border-red-200 rounded-md p-3">
                    <code className="text-sm text-red-800 whitespace-pre-wrap">
                      {entry.error_message}
                    </code>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Raw Metadata */}
            {Object.keys(metadata).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Additional Metadata
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted p-3 rounded-md">
                    <pre className="text-xs overflow-x-auto">
                      {JSON.stringify(metadata, null, 2)}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>

        {/* Actions */}
        <Separator />
        <div className="flex items-center justify-between pt-4">
          <div className="text-sm text-muted-foreground">
            Export ID: <code className="bg-muted px-1 py-0.5 rounded">{entry.id}</code>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onRerun(entry)}>
              <Activity className="h-4 w-4 mr-2" />
              Rerun Export
            </Button>
            {entry.file_path && (
              <Button onClick={() => onDownload(entry)}>
                <Download className="h-4 w-4 mr-2" />
                Download File
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}