import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle, 
  Play, 
  Pause, 
  Trash2, 
  FolderPlus 
} from 'lucide-react';

interface QueueFile {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error' | 'retrying';
  progress: number;
  retryCount: number;
  message: string;
  addedAt: Date;
  completedAt?: Date;
}

export const BulkUploadQueue = () => {
  const [queue, setQueue] = useState<QueueFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [permanentMode, setPermanentMode] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFilesSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    const validFiles = files.filter(file => 
      file.name.match(/\.(csv|xlsx|xls)$/i)
    );

    if (validFiles.length !== files.length) {
      toast({
        title: "Some Files Skipped",
        description: "Only CSV and Excel files are supported.",
        variant: "destructive"
      });
    }

    const newQueueFiles: QueueFile[] = validFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      status: 'pending',
      progress: 0,
      retryCount: 0,
      message: 'Waiting in queue...',
      addedAt: new Date(),
    }));

    setQueue(prev => [...prev, ...newQueueFiles]);
    
    toast({
      title: "Files Added",
      description: `${validFiles.length} files added to the upload queue.`,
    });
  };

  const simulateUpload = async (file: QueueFile): Promise<boolean> => {
    // Update file status to uploading
    setQueue(prev => prev.map(f => 
      f.id === file.id 
        ? { ...f, status: 'uploading', message: 'Uploading...' }
        : f
    ));

    // Simulate progress
    for (let progress = 0; progress <= 100; progress += 10) {
      if (isPaused) {
        await new Promise(resolve => {
          const checkPause = () => {
            if (!isPaused) resolve(undefined);
            else setTimeout(checkPause, 100);
          };
          checkPause();
        });
      }

      setQueue(prev => prev.map(f => 
        f.id === file.id 
          ? { ...f, progress, message: `Uploading... ${progress}%` }
          : f
      ));
      
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Simulate success/failure
    const success = Math.random() > 0.3; // 70% success rate
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return success;
  };

  const processQueue = async () => {
    if (isProcessing || queue.length === 0) return;
    
    setIsProcessing(true);
    setCurrentIndex(0);

    for (let i = 0; i < queue.length; i++) {
      if (isPaused) {
        await new Promise(resolve => {
          const checkPause = () => {
            if (!isPaused) resolve(undefined);
            else setTimeout(checkPause, 100);
          };
          checkPause();
        });
      }

      const file = queue[i];
      if (file.status !== 'pending') continue;

      setCurrentIndex(i);
      
      let success = false;
      let retryCount = 0;

      while (!success && retryCount < 5) {
        success = await simulateUpload(file);
        
        if (!success) {
          retryCount++;
          const isInProcess = Math.random() > 0.5;
          
          if (isInProcess && retryCount < 5) {
            setQueue(prev => prev.map(f => 
              f.id === file.id 
                ? {
                    ...f, 
                    status: 'retrying',
                    retryCount,
                    message: `File in process. Retry ${retryCount}/5 in 5 minutes...`
                  }
                : f
            ));
            
            // Wait for retry (5 seconds for demo, would be 5 minutes in real app)
            await new Promise(resolve => setTimeout(resolve, 5000));
          }
        }
      }

      // Update final status
      setQueue(prev => prev.map(f => 
        f.id === file.id 
          ? {
              ...f, 
              status: success ? 'success' : 'error',
              progress: success ? 100 : f.progress,
              message: success ? 'Upload completed' : 'Upload failed after max retries',
              completedAt: new Date(),
            }
          : f
      ));

      if (!permanentMode && success) {
        // Schedule file deletion (demo: 10 seconds, real: configurable delay)
        setTimeout(() => {
          setQueue(prev => prev.filter(f => f.id !== file.id));
        }, 10000);
      }
    }

    setIsProcessing(false);
    setCurrentIndex(0);
    
    toast({
      title: "Queue Processing Complete",
      description: "All files in the queue have been processed.",
    });
  };

  const removeFile = (fileId: string) => {
    setQueue(prev => prev.filter(f => f.id !== fileId));
  };

  const clearQueue = () => {
    setQueue([]);
    setCurrentIndex(0);
  };

  const pauseResume = () => {
    setIsPaused(!isPaused);
  };

  const getStatusIcon = (status: QueueFile['status']) => {
    switch (status) {
      case 'uploading':
        return <Clock className="h-4 w-4 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'retrying':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: QueueFile['status']) => {
    switch (status) {
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
      {/* File Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Add Files to Queue</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center">
            <FolderPlus className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <div className="space-y-2">
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
              >
                Add Files to Queue
              </Button>
              <p className="text-sm text-muted-foreground">
                Select multiple CSV and Excel files
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              multiple
              onChange={handleFilesSelect}
              className="hidden"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="permanent-mode"
              checked={permanentMode}
              onCheckedChange={setPermanentMode}
              disabled={isProcessing}
            />
            <Label htmlFor="permanent-mode">
              Permanent Mode (files won't be auto-deleted after upload)
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Queue Controls */}
      {queue.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Queue Controls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              {!isProcessing ? (
                <Button onClick={processQueue} className="flex items-center gap-2">
                  <Play className="h-4 w-4" />
                  Start Queue
                </Button>
              ) : (
                <Button onClick={pauseResume} variant="outline" className="flex items-center gap-2">
                  {isPaused ? (
                    <>
                      <Play className="h-4 w-4" />
                      Resume
                    </>
                  ) : (
                    <>
                      <Pause className="h-4 w-4" />
                      Pause
                    </>
                  )}
                </Button>
              )}
              
              <Button 
                onClick={clearQueue} 
                variant="destructive" 
                disabled={isProcessing}
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Clear Queue
              </Button>
            </div>

            {isProcessing && (
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Processing file {currentIndex + 1} of {queue.length}</span>
                  <span>{Math.round(((currentIndex) / queue.length) * 100)}% complete</span>
                </div>
                <Progress value={((currentIndex) / queue.length) * 100} className="w-full" />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Queue Display */}
      {queue.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Queue ({queue.length} files)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {queue.map((queueFile, index) => (
                <div 
                  key={queueFile.id} 
                  className={`p-4 border rounded-lg ${
                    index === currentIndex && isProcessing 
                      ? 'border-primary bg-primary/5' 
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(queueFile.status)}
                      <div>
                        <p className="font-medium">{queueFile.file.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(queueFile.file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(queueFile.status)}>
                        {queueFile.status}
                      </Badge>
                      
                      {queueFile.status === 'pending' && !isProcessing && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => removeFile(queueFile.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {queueFile.status === 'uploading' && (
                    <div className="mt-3 space-y-1">
                      <Progress value={queueFile.progress} className="w-full" />
                      <p className="text-xs text-center">{queueFile.progress}%</p>
                    </div>
                  )}

                  <p className="text-sm text-muted-foreground mt-2">
                    {queueFile.message}
                  </p>

                  {queueFile.retryCount > 0 && (
                    <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                      Retry attempt: {queueFile.retryCount}/5
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};