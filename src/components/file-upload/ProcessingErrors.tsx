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

  // Group errors by type for better organization
  const groupedErrors = errors.reduce((acc, error) => {
    if (!acc[error.type]) {
      acc[error.type] = [];
    }
    acc[error.type].push(error);
    return acc;
  }, {} as Record<string, ProcessingError[]>);

  const getErrorTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'validation':
        return 'text-warning border-warning/20 bg-warning/5';
      case 'parsing':
        return 'text-destructive border-destructive/20 bg-destructive/5';
      case 'mapping':
        return 'text-primary border-primary/20 bg-primary/5';
      case 'duplicate':
        return 'text-accent border-accent/20 bg-accent/5';
      default:
        return 'text-destructive border-destructive/20 bg-destructive/5';
    }
  };

  const getErrorReason = (error: ProcessingError) => {
    // Extract more detailed error information
    const errorMessage = error.error.toLowerCase();
    
    if (errorMessage.includes('duplicate')) {
      return 'Duplicate SKU already exists in database';
    } else if (errorMessage.includes('validation')) {
      return 'Data validation failed - check required fields';
    } else if (errorMessage.includes('parsing')) {
      return 'File format issue - unable to read data';
    } else if (errorMessage.includes('mapping')) {
      return 'Column mapping configuration error';
    } else if (errorMessage.includes('missing')) {
      return 'Required data fields are missing';
    } else if (errorMessage.includes('format')) {
      return 'Invalid data format detected';
    } else {
      return error.error;
    }
  };

  return (
    <Card className="border-border/50 bg-card/95 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-destructive text-lg">
          <AlertCircle className="h-5 w-5" />
          Processing Errors ({errors.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
          {Object.entries(groupedErrors).map(([type, typeErrors]) => (
            <div key={type} className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <div className={`px-2 py-1 rounded-md text-xs font-semibold uppercase tracking-wide ${getErrorTypeColor(type)}`}>
                  {type} ({typeErrors.length})
                </div>
              </div>
              {typeErrors.map((error) => (
                <div key={error.id} className={`rounded-lg border p-3 ${getErrorTypeColor(error.type)}`}>
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {error.file}
                      </div>
                      <div className="text-sm mt-1">
                        {getErrorReason(error)}
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs opacity-75">
                        <span>{new Date(error.timestamp).toLocaleTimeString()}</span>
                        {error.rowsAffected > 0 && (
                          <span className="bg-current/10 px-2 py-0.5 rounded">
                            {error.rowsAffected} rows affected
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};