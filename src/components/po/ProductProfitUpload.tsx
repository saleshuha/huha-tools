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
    model_number?: string;
    title?: string;
    quantity?: string;
    unit_cost?: string;
    currency_code?: string;
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
        if (lowerHeader.includes('model') || lowerHeader.includes('sku')) autoMapping.model_number = header;
        if (lowerHeader.includes('title') || lowerHeader.includes('name') || lowerHeader.includes('product')) autoMapping.title = header;
        if (lowerHeader.includes('qty') || lowerHeader.includes('quantity') || lowerHeader.includes('requested')) autoMapping.quantity = header;
        if (lowerHeader.includes('cost') || lowerHeader.includes('price') || lowerHeader.includes('unit')) autoMapping.unit_cost = header;
        if (lowerHeader.includes('currency') || lowerHeader.includes('code')) autoMapping.currency_code = header;
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

    if (!columnMapping.unit_cost) {
      toast({
        title: "Missing required mapping",
        description: "Please map the Unit Cost column",
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
    <div className="space-y-4">
      {/* Compact File Upload Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            {/* Dropzone - Compact */}
            <div
              {...getRootProps()}
              className={`flex-1 border-2 border-dashed rounded-lg p-4 cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <input {...getInputProps()} />
              <div className="flex items-center gap-3">
                <Upload className="h-8 w-8 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">
                    {uploadedFile ? uploadedFile.name : 'Drop file or click to upload'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    CSV, XLSX, XLS supported
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Column Mapping - Horizontal Grid */}
      {headers.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Column Mapping</CardTitle>
            <CardDescription className="text-xs">Map your file columns to required fields</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="asin-col" className="text-xs">ASIN</Label>
                <Select
                  value={columnMapping.asin}
                  onValueChange={(value) => setColumnMapping({ ...columnMapping, asin: value })}
                >
                  <SelectTrigger id="asin-col" className="h-8 text-xs">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {headers.map(header => (
                      <SelectItem key={header} value={header}>{header}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="model-col" className="text-xs">Model Number</Label>
                <Select
                  value={columnMapping.model_number}
                  onValueChange={(value) => setColumnMapping({ ...columnMapping, model_number: value })}
                >
                  <SelectTrigger id="model-col" className="h-8 text-xs">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {headers.map(header => (
                      <SelectItem key={header} value={header}>{header}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="title-col" className="text-xs">Title</Label>
                <Select
                  value={columnMapping.title}
                  onValueChange={(value) => setColumnMapping({ ...columnMapping, title: value })}
                >
                  <SelectTrigger id="title-col" className="h-8 text-xs">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {headers.map(header => (
                      <SelectItem key={header} value={header}>{header}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="qty-col" className="text-xs">Requested Qty</Label>
                <Select
                  value={columnMapping.quantity}
                  onValueChange={(value) => setColumnMapping({ ...columnMapping, quantity: value })}
                >
                  <SelectTrigger id="qty-col" className="h-8 text-xs">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (default: 1)</SelectItem>
                    {headers.map(header => (
                      <SelectItem key={header} value={header}>{header}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cost-col" className="text-xs">
                  Unit Cost <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={columnMapping.unit_cost}
                  onValueChange={(value) => setColumnMapping({ ...columnMapping, unit_cost: value })}
                >
                  <SelectTrigger id="cost-col" className="h-8 text-xs">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {headers.map(header => (
                      <SelectItem key={header} value={header}>{header}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="currency-col" className="text-xs">Currency Code</Label>
                <Select
                  value={columnMapping.currency_code}
                  onValueChange={(value) => setColumnMapping({ ...columnMapping, currency_code: value })}
                >
                  <SelectTrigger id="currency-col" className="h-8 text-xs">
                    <SelectValue placeholder="Select..." />
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

            {/* Process Button */}
            <div className="mt-4 flex items-center justify-between">
              {previewData.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {previewData.length} rows ready to process
                </p>
              )}
              <Button
                onClick={handleProcess}
                disabled={!columnMapping.unit_cost}
                className="ml-auto"
              >
                Process & Analyze
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
