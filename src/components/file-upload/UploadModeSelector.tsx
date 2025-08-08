import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UploadMode } from '@/types/file-upload';

interface UploadModeSelectorProps {
  uploadMode: UploadMode;
  onUploadModeChange: (mode: UploadMode) => void;
}

export const UploadModeSelector: React.FC<UploadModeSelectorProps> = ({
  uploadMode,
  onUploadModeChange
}) => {
  return (
    <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/50">
      <label className="text-sm font-medium">Upload Mode:</label>
      <Select
        value={uploadMode}
        onValueChange={(value: UploadMode) => onUploadModeChange(value)}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Select mode" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="single">Single File</SelectItem>
          <SelectItem value="bulk">Bulk Files</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};