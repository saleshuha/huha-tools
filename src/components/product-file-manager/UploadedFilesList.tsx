import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Trash2 } from 'lucide-react';

interface UploadedFile {
  name: string;
  size: number;
  rowCount: number;
}

interface UploadedFilesListProps {
  files: UploadedFile[];
  onRemoveFile: (fileName: string) => void;
}

export function UploadedFilesList({ files, onRemoveFile }: UploadedFilesListProps) {
  if (files.length === 0) return null;

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Card className="glass-container p-4">
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground mb-3">
          Uploaded Files ({files.length})
        </h3>
        {files.map((file) => (
          <div
            key={file.name}
            className="flex items-center justify-between p-3 rounded-md bg-muted/50 border border-border/50 hover:border-border transition-colors"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {file.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {file.rowCount} rows • {formatFileSize(file.size)}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemoveFile(file.name)}
              className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive flex-shrink-0"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
}
