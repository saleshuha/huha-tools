import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileText, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface POFileUploadProps {
  onFilesUpload: (files: File[]) => void;
  isLoading: boolean;
}

export function POFileUpload({ onFilesUpload, isLoading }: POFileUploadProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    onFilesUpload(acceptedFiles);
  }, [onFilesUpload]);

  const { getRootProps, getInputProps, isDragActive, acceptedFiles, fileRejections } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    multiple: true,
    disabled: isLoading
  });

  return (
    <div className="space-y-4">
      {/* File Upload Area */}
      <Card 
        {...getRootProps()} 
        className={`border-2 border-dashed cursor-pointer transition-colors ${
          isDragActive 
            ? 'border-primary bg-primary/5' 
            : 'border-muted-foreground/25 hover:border-primary/50'
        } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
          <input {...getInputProps()} />
          <Upload className={`h-12 w-12 mb-4 ${isDragActive ? 'text-primary' : 'text-muted-foreground'}`} />
          <h3 className="text-lg font-semibold mb-2">
            {isDragActive ? 'Drop PO files here' : 'Upload Purchase Order Files'}
          </h3>
          <p className="text-muted-foreground mb-4 max-w-sm">
            Upload Excel (.xlsx, .xls) or CSV files containing PO data. 
            Expected format: PO Number, SKU Code, Quantity
          </p>
          <Button variant="outline" disabled={isLoading}>
            <Upload className="h-4 w-4 mr-2" />
            {isLoading ? 'Processing...' : 'Choose Files'}
          </Button>
        </CardContent>
      </Card>

      {/* Accepted Files */}
      {acceptedFiles.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <h4 className="font-semibold mb-3 flex items-center">
              <FileText className="h-4 w-4 mr-2" />
              Ready to Process ({acceptedFiles.length} files)
            </h4>
            <div className="space-y-2">
              {acceptedFiles.map((file) => (
                <div key={file.name} className="flex items-center justify-between p-2 bg-muted rounded-md">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{file.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {(file.size / 1024).toFixed(1)} KB
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* File Rejections */}
      {fileRejections.length > 0 && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <h4 className="font-semibold mb-3 text-destructive flex items-center">
              <X className="h-4 w-4 mr-2" />
              Rejected Files
            </h4>
            <div className="space-y-2">
              {fileRejections.map(({ file, errors }) => (
                <div key={file.name} className="p-2 bg-destructive/10 rounded-md">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{file.name}</span>
                    <Badge variant="destructive" className="text-xs">
                      Invalid
                    </Badge>
                  </div>
                  {errors.map((error) => (
                    <p key={error.code} className="text-xs text-destructive mt-1">
                      {error.message}
                    </p>
                  ))}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Format Help */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <h4 className="font-semibold mb-2">Expected File Format</h4>
          <div className="text-sm text-muted-foreground">
            <p className="mb-2">Your CSV/Excel file should have columns in this order:</p>
            <div className="bg-background p-3 rounded border font-mono text-xs">
              PO Number, SKU Code, Quantity<br />
              PO-2024-001, ABC123, 10<br />
              PO-2024-001, XYZ789, 5<br />
              PO-2024-002, DEF456, 20
            </div>
            <p className="mt-2 text-xs">
              • First row should contain headers<br />
              • Multiple POs can be in the same file<br />
              • Only SKUs that exist in your Sunsky database will be processed
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}