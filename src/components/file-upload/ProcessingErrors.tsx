import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { ProcessingError } from '@/types/file-upload';

interface ProcessingErrorsProps {
  errors: ProcessingError[];
}

export const ProcessingErrorsDisplay: React.FC<ProcessingErrorsProps> = ({
  errors
}) => {
  if (errors.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-destructive flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          Processing Errors ({errors.length})
        </h3>
        <div className="text-sm text-muted-foreground">
          Showing latest errors
        </div>
      </div>
      
      <div className="space-y-3 max-h-80 overflow-y-auto">
        {errors.map((error) => (
          <Alert key={error.id} variant="destructive" className="border-l-4 border-l-destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="space-y-2">
              <div className="font-medium text-destructive-foreground">
                Error in: <span className="font-bold">{error.file}</span>
              </div>
              
              <div className="text-sm bg-destructive/10 p-3 rounded border border-destructive/20">
                <div className="font-medium text-destructive mb-1">Error Details:</div>
                <div className="text-destructive/90">{error.error}</div>
              </div>
              
              <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-destructive/20 pt-2 mt-2">
                <div className="flex items-center gap-4">
                  <span className="px-2 py-1 bg-destructive/10 rounded text-destructive font-medium">
                    {error.type.toUpperCase()}
                  </span>
                  {error.rowsAffected > 0 && (
                    <span className="px-2 py-1 bg-warning/10 rounded text-warning font-medium">
                      {error.rowsAffected} rows affected
                    </span>
                  )}
                </div>
                <span className="text-muted-foreground">
                  {new Date(error.timestamp).toLocaleString()}
                </span>
              </div>
            </AlertDescription>
          </Alert>
        ))}
      </div>
      
      {errors.length > 5 && (
        <div className="text-center p-3 bg-muted/30 rounded border">
          <p className="text-sm text-muted-foreground">
            Showing {Math.min(errors.length, 10)} of {errors.length} total errors
          </p>
        </div>
      )}
    </div>
  );
};