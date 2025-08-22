import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileText, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

interface UploadStatus {
  status: 'idle' | 'uploading' | 'success' | 'error' | 'retrying';
  progress: number;
  message: string;
  retryCount: number;
  file?: File;
}

export const SingleUpload = () => {
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({
    status: 'idle',
    progress: 0,
    message: '',
    retryCount: 0,
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.match(/\.(csv|xlsx|xls)$/i)) {
      toast({
        title: "Invalid File Type",
        description: "Please select a CSV or Excel file.",
        variant: "destructive"
      });
      return;
    }

    setUploadStatus({
      status: 'idle',
      progress: 0,
      message: `Selected: ${file.name}`,
      retryCount: 0,
      file,
    });
  };

  const simulateUpload = async (): Promise<boolean> => {
    // Simulate upload process with random success/failure
    return new Promise((resolve) => {
      setTimeout(() => {
        const success = Math.random() > 0.3; // 70% success rate
        resolve(success);
      }, 2000 + Math.random() * 3000); // 2-5 seconds
    });
  };

  const startUpload = async () => {
    if (!uploadStatus.file) return;

    setUploadStatus(prev => ({
      ...prev,
      status: 'uploading',
      progress: 0,
      message: 'Connecting to Noon Partners...',
    }));

    // Simulate upload progress
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 200));
      setUploadStatus(prev => ({
        ...prev,
        progress: i,
        message: i < 50 ? 'Uploading file...' : 'Processing file...',
      }));
    }

    const success = await simulateUpload();

    if (success) {
      setUploadStatus(prev => ({
        ...prev,
        status: 'success',
        progress: 100,
        message: 'File uploaded successfully!',
      }));
      toast({
        title: "Upload Successful",
        description: `${uploadStatus.file?.name} has been uploaded successfully.`,
      });
    } else {
      // Check if it's a "file already in process" error
      const isInProcess = Math.random() > 0.5;
      if (isInProcess && uploadStatus.retryCount < 5) {
        setUploadStatus(prev => ({
          ...prev,
          status: 'retrying',
          message: 'File already in process. Retrying in 5 minutes...',
          retryCount: prev.retryCount + 1,
        }));
        
        // Simulate retry after delay
        setTimeout(() => {
          startUpload();
        }, 5000); // 5 seconds for demo (would be 5 minutes in real app)
      } else {
        setUploadStatus(prev => ({
          ...prev,
          status: 'error',
          message: uploadStatus.retryCount >= 5 
            ? 'Max retries reached. Upload failed.' 
            : 'Upload failed. Please try again.',
        }));
        toast({
          title: "Upload Failed",
          description: "The file could not be uploaded. Please check the logs for details.",
          variant: "destructive"
        });
      }
    }
  };

  const resetUpload = () => {
    setUploadStatus({
      status: 'idle',
      progress: 0,
      message: '',
      retryCount: 0,
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getStatusIcon = () => {
    switch (uploadStatus.status) {
      case 'uploading':
        return <Clock className="h-4 w-4 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'retrying':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusColor = () => {
    switch (uploadStatus.status) {
      case 'uploading':
        return 'bg-blue-500';
      case 'success':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      case 'retrying':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>File Selection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center">
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <div className="space-y-2">
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadStatus.status === 'uploading' || uploadStatus.status === 'retrying'}
              >
                Select File
              </Button>
              <p className="text-sm text-muted-foreground">
                Supports CSV and Excel files
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </CardContent>
      </Card>

      {uploadStatus.file && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getStatusIcon()}
                <div>
                  <p className="font-medium">{uploadStatus.file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(uploadStatus.file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <Badge className={getStatusColor()}>
                {uploadStatus.status}
              </Badge>
            </div>

            {uploadStatus.status === 'uploading' && (
              <div className="space-y-2">
                <Progress value={uploadStatus.progress} className="w-full" />
                <p className="text-sm text-center">{uploadStatus.progress}%</p>
              </div>
            )}

            {uploadStatus.message && (
              <p className="text-sm text-muted-foreground">
                {uploadStatus.message}
              </p>
            )}

            {uploadStatus.retryCount > 0 && (
              <p className="text-sm text-yellow-600 dark:text-yellow-400">
                Retry attempt: {uploadStatus.retryCount}/5
              </p>
            )}

            <div className="flex gap-2">
              {uploadStatus.status === 'idle' && (
                <Button onClick={startUpload} className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Start Upload
                </Button>
              )}
              
              {(uploadStatus.status === 'success' || uploadStatus.status === 'error') && (
                <Button onClick={resetUpload} variant="outline">
                  Upload Another File
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};