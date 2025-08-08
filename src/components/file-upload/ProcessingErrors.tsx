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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-5 w-5" />
          Processing Errors ({errors.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {errors.map((error) => (
            <Alert key={error.id} variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>{error.file}:</strong> {error.error}
                {error.rowsAffected > 0 && (
                  <span className="text-sm ml-2">({error.rowsAffected} rows affected)</span>
                )}
                <div className="text-xs text-muted-foreground mt-1">
                  {new Date(error.timestamp).toLocaleTimeString()} - {error.type}
                </div>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};