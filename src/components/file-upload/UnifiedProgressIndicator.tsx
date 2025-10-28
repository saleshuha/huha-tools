import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Loader2, AlertCircle, FileIcon } from 'lucide-react';
import { SimplifiedProcessingState } from './SimplifiedBulkProcessor';

interface UnifiedProgressIndicatorProps {
  state: SimplifiedProcessingState;
}

/**
 * Single, unified progress indicator for file processing
 */
export const UnifiedProgressIndicator: React.FC<UnifiedProgressIndicatorProps> = ({ state }) => {
  if (state.status === 'idle') {
    return null;
  }

  const getStatusIcon = () => {
    switch (state.status) {
      case 'processing':
        return <Loader2 className="h-5 w-5 animate-spin text-primary" />;
      case 'complete':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-destructive" />;
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (state.status) {
      case 'processing':
        return 'bg-primary/10 border-primary';
      case 'complete':
        return 'bg-green-50 border-green-500 dark:bg-green-950';
      case 'error':
        return 'bg-destructive/10 border-destructive';
      default:
        return '';
    }
  };

  return (
    <Card className={`${getStatusColor()} transition-colors`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {getStatusIcon()}
          <span>
            {state.status === 'processing' && 'Processing Files...'}
            {state.status === 'complete' && 'Processing Complete'}
            {state.status === 'error' && 'Processing Failed'}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Overall Progress</span>
            <Badge variant="outline">
              {state.currentFileIndex} / {state.totalFiles} files
            </Badge>
          </div>
          <Progress value={state.progress} className="h-2" />
          <div className="text-xs text-muted-foreground text-right">
            {state.progress}%
          </div>
        </div>

        {/* Current Status */}
        {state.message && (
          <div className="text-sm">
            <span className="font-medium">Status: </span>
            <span className="text-muted-foreground">{state.message}</span>
          </div>
        )}

        {/* Current File */}
        {state.currentFile && state.status === 'processing' && (
          <div className="flex items-center gap-2 text-sm bg-muted/50 p-2 rounded">
            <FileIcon className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium truncate">{state.currentFile}</span>
          </div>
        )}

        {/* Errors */}
        {state.errors.length > 0 && (
          <div className="space-y-1">
            <div className="text-sm font-medium text-destructive">
              Errors ({state.errors.length}):
            </div>
            <div className="text-xs space-y-1 max-h-32 overflow-y-auto">
              {state.errors.map((error, idx) => (
                <div key={idx} className="text-muted-foreground bg-destructive/5 p-2 rounded">
                  {error}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
