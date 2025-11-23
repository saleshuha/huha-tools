import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card } from '@/components/ui/card';
import { Upload, FileSpreadsheet, Loader2 } from 'lucide-react';
import { parseFileSimply } from '@/components/SimpleFileParser';
import { useToast } from '@/hooks/use-toast';

interface FileUploadZoneProps {
  onFileUpload: (file: File, data: Record<string, any>[], headers: string[]) => void;
}

export function FileUploadZone({ onFileUpload }: FileUploadZoneProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    const maxSize = 50 * 1024 * 1024; // 50MB

    // Check file size
    if (file.size > maxSize) {
      toast({
        title: 'File too large',
        description: 'Please upload a file smaller than 50MB',
        variant: 'destructive',
      });
      return;
    }

    // Check file type
    const validExtensions = ['.csv', '.xlsx', '.xls'];
    const fileExtension = file.name.toLowerCase().match(/\.[^.]+$/)?.[0];
    
    if (!fileExtension || !validExtensions.includes(fileExtension)) {
      toast({
        title: 'Invalid file format',
        description: 'Please upload a CSV (.csv) or Excel (.xlsx, .xls) file',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);

    try {
      const parsedData = await parseFileSimply(file);

      if (!parsedData || parsedData.length === 0) {
        toast({
          title: 'Empty file',
          description: 'The uploaded file contains no data',
          variant: 'destructive',
        });
        return;
      }

      // Extract headers from first row
      const headers = Object.keys(parsedData[0]);

      if (headers.length === 0) {
        toast({
          title: 'No columns found',
          description: 'Unable to detect columns in the file',
          variant: 'destructive',
        });
        return;
      }

      onFileUpload(file, parsedData, headers);

      toast({
        title: 'File uploaded successfully',
        description: `${parsedData.length} rows loaded from ${file.name}`,
      });
    } catch (error) {
      console.error('File parsing error:', error);
      toast({
        title: 'Failed to parse file',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  }, [onFileUpload, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 1,
    disabled: isProcessing,
  });

  return (
    <Card className="glass-container p-8">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all ${
          isDragActive
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50 hover:bg-accent/5'
        } ${isProcessing ? 'pointer-events-none opacity-60' : ''}`}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center gap-4">
          {isProcessing ? (
            <>
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
              <p className="text-lg font-medium text-foreground">Processing file...</p>
              <p className="text-sm text-muted-foreground">
                Please wait while we parse your data
              </p>
            </>
          ) : (
            <>
              <div className="p-4 rounded-full bg-primary/10">
                {isDragActive ? (
                  <Upload className="h-12 w-12 text-primary" />
                ) : (
                  <FileSpreadsheet className="h-12 w-12 text-primary" />
                )}
              </div>
              
              <div>
                <p className="text-lg font-medium text-foreground mb-2">
                  {isDragActive ? 'Drop your file here' : 'Upload Product File'}
                </p>
                <p className="text-sm text-muted-foreground">
                  Drag and drop or click to browse
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Supported formats:</span>
                <span className="font-medium text-foreground">.csv, .xlsx, .xls</span>
              </div>

              <div className="text-xs text-muted-foreground">
                Maximum file size: 50MB
              </div>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
