import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileText, X, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { POColumnMapping } from './POColumnMapping';

interface POFileUploadProps {
  onFilesUpload: (mappedData: any[]) => void;
  isLoading: boolean;
}

interface ParsedFile {
  file: File;
  headers: string[];
  data: string[][];
}

export function POFileUpload({ onFilesUpload, isLoading }: POFileUploadProps) {
  const [parsedFiles, setParsedFiles] = useState<ParsedFile[]>([]);
  const [showMapping, setShowMapping] = useState(false);

  const parseFile = async (file: File): Promise<ParsedFile> => {
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      throw new Error(`File ${file.name} is empty`);
    }

    // Parse CSV data
    const data = lines.map(line => 
      line.split(',').map(cell => cell.trim().replace(/"/g, ''))
    );

    return {
      file,
      headers: data[0],
      data
    };
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    try {
      const parsed = await Promise.all(acceptedFiles.map(parseFile));
      setParsedFiles(parsed);
      setShowMapping(true);
    } catch (error) {
      console.error('Error parsing files:', error);
    }
  }, []);

  // ALL HOOKS MUST BE CALLED AT THE TOP LEVEL - BEFORE ANY EARLY RETURNS
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

  const handleMappingComplete = (mappedData: any[]) => {
    onFilesUpload(mappedData);
    setParsedFiles([]);
    setShowMapping(false);
  };

  const handleBack = () => {
    setShowMapping(false);
    setParsedFiles([]);
  };

  // Show column mapping interface if files are parsed
  if (showMapping && parsedFiles.length > 0) {
    return (
      <POColumnMapping
        files={parsedFiles}
        onMappingComplete={handleMappingComplete}
        onBack={handleBack}
        isLoading={isLoading}
      />
    );
  }

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
            You'll be able to map columns to the required fields.
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
              Files Selected ({acceptedFiles.length})
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
                  <ArrowRight className="h-4 w-4 text-green-500" />
                </div>
              ))}
            </div>
            <Button 
              onClick={() => onDrop([...acceptedFiles])} 
              className="w-full mt-3"
              disabled={isLoading}
            >
              Proceed to Column Mapping
            </Button>
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
            <p className="mb-2">Your CSV/Excel files should contain these columns (any column names can be mapped):</p>
            <div className="bg-background p-3 rounded border font-mono text-xs space-y-1">
              <div className="text-red-600 font-bold">Required Columns:</div>
              • PO - Purchase order number<br />
              • Ship to Location - Destination/warehouse location<br />
              • ASIN - Amazon Standard Identification Number<br />
              • Model Number - Product model/part number<br />
              • Title - Product title/description<br />
              • Outstanding Cases (qty) - Quantity to order<br />
              <div className="text-gray-600 mt-2">Optional Columns:</div>
              • External Id - External reference identifier<br />
              • External Id Type - Type of external reference
            </div>
            <p className="mt-2 text-xs">
              <strong>Example:</strong> Your "Order ID" column maps to "PO", "Product Name" maps to "Title", "Cases" maps to "Outstanding Cases"
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}