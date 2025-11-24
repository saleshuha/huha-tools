import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Upload, FileSpreadsheet, Loader2 } from 'lucide-react';
import { parseFileSimply } from '@/components/SimpleFileParser';
import { useToast } from '@/hooks/use-toast';

interface FileUploadZoneProps {
  onFileUpload: (file: File, data: Record<string, any>[], headers: string[]) => void;
}

export function FileUploadZone({ onFileUpload }: FileUploadZoneProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({
    current: 0,
    total: 0,
    currentFileName: '',
    percentage: 0
  });
  const { toast } = useToast();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    setIsProcessing(true);
    const maxSize = 50 * 1024 * 1024; // 50MB per file
    const totalFiles = acceptedFiles.length;

    try {
      for (let i = 0; i < acceptedFiles.length; i++) {
        const file = acceptedFiles[i];
        
        // Update progress
        setUploadProgress({
          current: i + 1,
          total: totalFiles,
          currentFileName: file.name,
          percentage: Math.round(((i + 1) / totalFiles) * 100)
        });
        // Check file size
        if (file.size > maxSize) {
          toast({
            title: `File too large: ${file.name}`,
            description: 'Please upload files smaller than 50MB',
            variant: 'destructive',
          });
          continue;
        }

        // Check file type
        const validExtensions = ['.csv', '.xlsx', '.xls'];
        const fileExtension = file.name.toLowerCase().match(/\.[^.]+$/)?.[0];
        
        if (!fileExtension || !validExtensions.includes(fileExtension)) {
          toast({
            title: `Invalid file format: ${file.name}`,
            description: 'Please upload CSV (.csv) or Excel (.xlsx, .xls) files',
            variant: 'destructive',
          });
          continue;
        }

        const parsedData = await parseFileSimply(file);

        if (!parsedData || parsedData.length === 0) {
          toast({
            title: `Empty file: ${file.name}`,
            description: 'This file contains no data',
            variant: 'destructive',
          });
          continue;
        }

        // Extract headers from first row
        const headers = Object.keys(parsedData[0]);

        if (headers.length === 0) {
          toast({
            title: `No columns found: ${file.name}`,
            description: 'Unable to detect columns in this file',
            variant: 'destructive',
          });
          continue;
        }

        onFileUpload(file, parsedData, headers);

        toast({
          title: 'File uploaded successfully',
          description: `${parsedData.length} rows loaded from ${file.name} (${i + 1}/${totalFiles})`,
        });
      }
    } catch (error) {
      console.error('File parsing error:', error);
      toast({
        title: 'Failed to parse file',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
      setUploadProgress({ current: 0, total: 0, currentFileName: '', percentage: 0 });
    }
  }, [onFileUpload, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    multiple: true,
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
              <p className="text-lg font-medium text-foreground">
                Processing {uploadProgress.currentFileName}
              </p>
              <p className="text-sm text-muted-foreground">
                File {uploadProgress.current} of {uploadProgress.total}
              </p>
              
              <div className="w-full max-w-md space-y-2">
                <Progress value={uploadProgress.percentage} className="h-2" />
                <p className="text-xs text-center text-muted-foreground">
                  {uploadProgress.percentage}% Complete
                </p>
              </div>
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
                  {isDragActive ? 'Drop your files here' : 'Upload Product Files'}
                </p>
                <p className="text-sm text-muted-foreground">
                  Drag and drop multiple files or click to browse
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
