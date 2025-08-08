import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { FileText, Clock, Loader2, CheckCircle, AlertCircle, MapPin } from 'lucide-react';
import { FileStatus, FileProgress } from '@/types/file-upload';

interface FileListDisplayProps {
  selectedFiles: FileList;
  fileStatuses: FileStatus;
  fileProgress: FileProgress;
}

export const FileListDisplay: React.FC<FileListDisplayProps> = ({
  selectedFiles,
  fileStatuses,
  fileProgress
}) => {
  const getStatusBadge = (fileName: string, status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case 'processing':
        return (
          <div className="flex items-center gap-2">
            <Progress value={fileProgress[fileName]} className="w-20" />
            <Badge variant="secondary">
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              Processing
            </Badge>
          </div>
        );
      case 'completed':
        return (
          <Badge variant="default">
            <CheckCircle className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive">
            <AlertCircle className="h-3 w-3 mr-1" />
            Error
          </Badge>
        );
      case 'mapped':
        return (
          <Badge variant="outline">
            <MapPin className="h-3 w-3 mr-1" />
            Mapped
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-2">
      {Array.from(selectedFiles).map((file, index) => (
        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
          <div className="flex items-center gap-3">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="font-medium">{file.name}</p>
              <p className="text-sm text-muted-foreground">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {getStatusBadge(file.name, fileStatuses[file.name])}
          </div>
        </div>
      ))}
    </div>
  );
};