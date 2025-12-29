import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface UploadButtonProps {
  onUpload: (file: File) => Promise<void>;
  isUploading?: boolean;
  progress?: number;
  disabled?: boolean;
}

export function UploadButton({ 
  onUpload, 
  isUploading = false, 
  progress = 0,
  disabled = false 
}: UploadButtonProps) {
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setUploadStatus('uploading');
    try {
      await onUpload(file);
      setUploadStatus('success');
      setTimeout(() => setUploadStatus('idle'), 3000);
    } catch (error) {
      setUploadStatus('error');
      setTimeout(() => setUploadStatus('idle'), 3000);
    }
  }, [onUpload]);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop: handleDrop,
    onDragEnter: () => setIsDragging(true),
    onDragLeave: () => setIsDragging(false),
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv']
    },
    multiple: false,
    noClick: true,
    disabled: disabled || isUploading
  });

  const getButtonContent = () => {
    if (isUploading || uploadStatus === 'uploading') {
      return (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Uploading...</span>
        </>
      );
    }
    if (uploadStatus === 'success') {
      return (
        <>
          <CheckCircle2 className="w-4 h-4" />
          <span>Uploaded!</span>
        </>
      );
    }
    if (uploadStatus === 'error') {
      return (
        <>
          <AlertCircle className="w-4 h-4" />
          <span>Error</span>
        </>
      );
    }
    return (
      <>
        <Upload className="w-4 h-4" />
        <span>Upload Orders</span>
      </>
    );
  };

  const getButtonVariant = () => {
    if (uploadStatus === 'success') return 'outline';
    if (uploadStatus === 'error') return 'destructive';
    return 'default';
  };

  return (
    <div {...getRootProps()} className="relative">
      <input {...getInputProps()} />
      
      {/* Drag Overlay */}
      {isDragActive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 p-8 rounded-2xl border-2 border-dashed border-primary bg-primary/5 animate-pulse">
            <FileSpreadsheet className="w-16 h-16 text-primary" />
            <p className="text-lg font-semibold text-primary">Drop file to upload</p>
            <p className="text-sm text-muted-foreground">.xlsx, .xls, or .csv</p>
          </div>
        </div>
      )}
      
      <div className="flex items-center gap-3">
        <Button
          onClick={open}
          disabled={disabled || isUploading}
          variant={getButtonVariant()}
          className={`
            gap-2 min-w-[140px] transition-all duration-300
            ${uploadStatus === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/20' : ''}
            ${isUploading ? '' : 'bg-gradient-to-r from-primary to-primary-dark hover:shadow-glow/30'}
          `}
        >
          {getButtonContent()}
        </Button>
        
        {/* Inline Progress */}
        {(isUploading || uploadStatus === 'uploading') && progress > 0 && (
          <div className="flex items-center gap-2 min-w-[120px]">
            <Progress value={progress} className="h-2 flex-1" />
            <span className="text-xs font-mono text-muted-foreground">{progress}%</span>
          </div>
        )}
      </div>
    </div>
  );
}
