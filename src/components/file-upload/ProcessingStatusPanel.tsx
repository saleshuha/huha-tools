import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Loader2, AlertCircle, Clock } from 'lucide-react';

interface ProcessingStatusPanelProps {
  isProcessing: boolean;
  currentStep: string;
  currentFileIndex: number;
  totalFiles: number;
  currentFileName: string;
  overallProgress: number;
  status: 'idle' | 'parsing' | 'mapping' | 'uploading' | 'completed' | 'error';
  error?: string;
}

export function ProcessingStatusPanel({
  isProcessing,
  currentStep,
  currentFileIndex,
  totalFiles,
  currentFileName,
  overallProgress,
  status,
  error
}: ProcessingStatusPanelProps) {
  if (!isProcessing && status === 'idle') {
    return null;
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'idle':
        return <Clock className="h-5 w-5 text-muted-foreground" />;
      default:
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'idle':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          {getStatusIcon()}
          File Processing Status
          <Badge className={getStatusColor()}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Step */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">{currentStep}</span>
            <span className="text-muted-foreground">
              {currentFileIndex}/{totalFiles} files
            </span>
          </div>
          <Progress value={overallProgress} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{Math.round(overallProgress)}% complete</span>
            <span>{currentFileName}</span>
          </div>
        </div>

        {/* Error Display */}
        {error && status === 'error' && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800 font-medium">Error:</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Processing Steps */}
        <div className="grid grid-cols-4 gap-2 text-xs">
          <div className={`text-center p-2 rounded ${
            ['parsing', 'mapping', 'uploading', 'completed'].includes(status) 
              ? 'bg-green-100 text-green-800' 
              : 'bg-gray-100 text-gray-600'
          }`}>
            1. Parse Files
          </div>
          <div className={`text-center p-2 rounded ${
            ['mapping', 'uploading', 'completed'].includes(status) 
              ? 'bg-green-100 text-green-800' 
              : status === 'parsing' 
                ? 'bg-blue-100 text-blue-800' 
                : 'bg-gray-100 text-gray-600'
          }`}>
            2. Map Data
          </div>
          <div className={`text-center p-2 rounded ${
            ['uploading', 'completed'].includes(status) 
              ? 'bg-green-100 text-green-800' 
              : ['parsing', 'mapping'].includes(status) 
                ? 'bg-blue-100 text-blue-800' 
                : 'bg-gray-100 text-gray-600'
          }`}>
            3. Upload
          </div>
          <div className={`text-center p-2 rounded ${
            status === 'completed' 
              ? 'bg-green-100 text-green-800' 
              : ['parsing', 'mapping', 'uploading'].includes(status) 
                ? 'bg-blue-100 text-blue-800' 
                : 'bg-gray-100 text-gray-600'
          }`}>
            4. Complete
          </div>
        </div>
      </CardContent>
    </Card>
  );
}