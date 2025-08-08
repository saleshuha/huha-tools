import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { UploadMode } from '@/types/file-upload';

interface FileUploadAreaProps {
  uploadMode: UploadMode;
  selectedFiles: FileList | null;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onClearFiles: () => void;
}

export const FileUploadArea: React.FC<FileUploadAreaProps> = ({
  uploadMode,
  selectedFiles,
  fileInputRef,
  onFileUpload,
  onClearFiles
}) => {
  return (
    <div className="flex items-center gap-4">
      <Input
        ref={fileInputRef}
        type="file"
        multiple={uploadMode === 'bulk'}
        accept=".csv,.xlsx,.xls"
        onChange={onFileUpload}
        className="flex-1"
      />
      {selectedFiles && selectedFiles.length > 0 && (
        <Button variant="outline" onClick={onClearFiles}>
          <X className="h-4 w-4" />
          Clear
        </Button>
      )}
    </div>
  );
};