import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileUp, Upload, AlertCircle } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { parseFileSimply } from '@/components/SimpleFileParser';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ProductProfitUploadProps {
  onUpload: (data: any[], headers: string[], columnMapping: any) => void;
}

export const ProductProfitUpload: React.FC<ProductProfitUploadProps> = ({ onUpload }) => {
  const { toast } = useToast();
  const [uploadedFile, setUploadedFile] = useState<any>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [columnMapping, setColumnMapping] = useState<{
    asin?: string;
    sku?: string;
    selling_price?: string;
    quantity?: string;
    title?: string;
  }>({});
  const [isProcessing, setIsProcessing] = useState(false);

  const onDrop = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setIsProcessing(true);

    try {
      const result = await parseFileSimply(file);
      
      if (!result || result.length === 0) {
        throw new Error('No data found in file');
      }

      // Get headers from first row
      const fileHeaders = Object.keys(result[0]);
      setHeaders(fileHeaders);
      setPreviewData(result.slice(0, 5)); // Show first 5 rows
      setUploadedFile(file);

      // Try to auto-map columns based on common names
      const autoMapping: any = {};
      fileHeaders.forEach(header => {
        const lowerHeader = header.toLowerCase();
        if (lowerHeader.includes('asin')) autoMapping.asin = header;
        if (lowerHeader.includes('sku') && !autoMapping.sku) autoMapping.sku = header;
        if (lowerHeader.includes('price') || lowerHeader.includes('selling')) autoMapping.selling_price = header;
        if (lowerHeader.includes('quantity') || lowerHeader.includes('qty')) autoMapping.quantity = header;
        if (lowerHeader.includes('title') || lowerHeader.includes('name')) autoMapping.title = header;
      });

      setColumnMapping(autoMapping);

      toast({
        title: "File uploaded",
        description: `${result.length} rows loaded. Please map columns.`,
      });
    } catch (error) {
      console.error('Error parsing file:', error);
      toast({
        title: "Error parsing file",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    multiple: false,
    disabled: isProcessing
  });

  const handleProcess = () => {
    if (!uploadedFile || !previewData.length) {
      toast({
        title: "No file uploaded",
        description: "Please upload a file first",
        variant: "destructive"
      });
      return;
    }

    if (!columnMapping.selling_price) {
      toast({
        title: "Missing required mapping",
        description: "Please map the Selling Price column",
        variant: "destructive"
      });
      return;
    }

    // Parse full file data again
    parseFileSimply(uploadedFile).then(result => {
      onUpload(result, headers, columnMapping);
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileUp className="h-5 w-5" />
          Upload Selling Prices
        </CardTitle>
        <CardDescription>
          Upload a CSV/Excel file with ASIN/SKU and selling prices
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Dropzone */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50'
          } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <input {...getInputProps()} />
          <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          {isDragActive ? (
            <p className="text-sm">Drop the file here...</p>
          ) : (
            <>
              <p className="text-sm font-medium mb-1">
                {uploadedFile ? uploadedFile.name : 'Drag & drop file here'}
              </p>
              <p className="text-xs text-muted-foreground">
                Supports CSV, XLSX, XLS
              </p>
            </>
          )}
        </div>

        {/* Column Mapping */}
        {headers.length > 0 && (
          <div className="space-y-3 p-4 bg-muted/20 rounded-lg">
            <h4 className="text-sm font-medium">Map Columns</h4>
            
            <div className="space-y-2">
              <Label htmlFor="asin-col" className="text-xs">ASIN Column</Label>
              <Select
                value={columnMapping.asin}
                onValueChange={(value) => setColumnMapping({ ...columnMapping, asin: value })}
              >
                <SelectTrigger id="asin-col" className="h-9">
                  <SelectValue placeholder="Select ASIN column" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {headers.map(header => (
                    <SelectItem key={header} value={header}>{header}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sku-col" className="text-xs">SKU Column</Label>
              <Select
                value={columnMapping.sku}
                onValueChange={(value) => setColumnMapping({ ...columnMapping, sku: value })}
              >
                <SelectTrigger id="sku-col" className="h-9">
                  <SelectValue placeholder="Select SKU column" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {headers.map(header => (
                    <SelectItem key={header} value={header}>{header}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="price-col" className="text-xs">
                Selling Price Column <span className="text-red-500">*</span>
              </Label>
              <Select
                value={columnMapping.selling_price}
                onValueChange={(value) => setColumnMapping({ ...columnMapping, selling_price: value })}
              >
                <SelectTrigger id="price-col" className="h-9">
                  <SelectValue placeholder="Select price column" />
                </SelectTrigger>
                <SelectContent>
                  {headers.map(header => (
                    <SelectItem key={header} value={header}>{header}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="qty-col" className="text-xs">Quantity Column</Label>
              <Select
                value={columnMapping.quantity}
                onValueChange={(value) => setColumnMapping({ ...columnMapping, quantity: value })}
              >
                <SelectTrigger id="qty-col" className="h-9">
                  <SelectValue placeholder="Select quantity column (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (default: 1)</SelectItem>
                  {headers.map(header => (
                    <SelectItem key={header} value={header}>{header}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title-col" className="text-xs">Title Column</Label>
              <Select
                value={columnMapping.title}
                onValueChange={(value) => setColumnMapping({ ...columnMapping, title: value })}
              >
                <SelectTrigger id="title-col" className="h-9">
                  <SelectValue placeholder="Select title column (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {headers.map(header => (
                    <SelectItem key={header} value={header}>{header}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Preview */}
        {previewData.length > 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Preview: {previewData.length} of {previewData.length} rows shown
            </AlertDescription>
          </Alert>
        )}

        {/* Process Button */}
        {headers.length > 0 && (
          <Button
            onClick={handleProcess}
            className="w-full"
            disabled={!columnMapping.selling_price}
          >
            Process & Analyze
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
