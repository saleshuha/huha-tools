import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload } from 'lucide-react';

interface SimpleFileUploadProps {
  onFilesSelected: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
}

export const SimpleFileUpload = ({ 
  onFilesSelected, 
  accept = ".csv,.xlsx,.xls", 
  multiple = true, 
  disabled = false 
}: SimpleFileUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      onFilesSelected(files);
      // Clear the input to allow re-selecting the same files
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      <Input
        ref={fileInputRef}
        type="file"
        multiple={multiple}
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />
      
      <div 
        className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-muted-foreground/50 transition-colors cursor-pointer"
        onClick={handleClick}
      >
        <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">Upload Files</h3>
        <p className="text-muted-foreground mb-4">
          Click to select {multiple ? 'CSV/Excel files' : 'a CSV/Excel file'} (up to 1GB each)
        </p>
        <p className="text-xs text-muted-foreground mb-4">
          Supported formats: .csv, .xlsx, .xls
        </p>
        <Button onClick={handleClick} disabled={disabled}>
          <Upload className="h-4 w-4 mr-2" />
          Choose Files
        </Button>
      </div>
    </div>
  );
};