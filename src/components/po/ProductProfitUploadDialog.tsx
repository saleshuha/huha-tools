import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Trash2 } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { parseFileSimply } from '@/components/SimpleFileParser';
import { useToast } from '@/hooks/use-toast';

interface ProductProfitUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (data: any[], headers: string[], columnMapping: any) => void;
}

export const ProductProfitUploadDialog: React.FC<ProductProfitUploadDialogProps> = ({ 
  open, 
  onOpenChange, 
  onUpload 
}) => {
  const { toast } = useToast();
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
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

  const resetState = () => {
    setUploadedFile(null);
    setHeaders([]);
    setPreviewData([]);
    setColumnMapping({});
  };

  const onDrop = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setIsProcessing(true);

    try {
      const result = await parseFileSimply(file);
      
      if (!result || result.length === 0) {
        throw new Error('No data found in file');
      }

      const fileHeaders = Object.keys(result[0]);
      setHeaders(fileHeaders);
      setPreviewData(result);
      setUploadedFile(file);

      // Auto-map columns
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

    onUpload(previewData, headers, columnMapping);
    onOpenChange(false);
    resetState();
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!newOpen) resetState();
      onOpenChange(newOpen);
    }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Product Data</DialogTitle>
          <DialogDescription>
            Upload a file with selling prices to analyze profitability
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 cursor-pointer transition-colors text-center ${
              isDragActive
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <input {...getInputProps()} />
            <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm font-medium">
              {uploadedFile ? uploadedFile.name : 'Drop file or click to upload'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {uploadedFile && previewData.length > 0
                ? `${previewData.length} rows loaded`
                : 'CSV, XLSX, XLS supported'}
            </p>
          </div>

          {/* Clear button */}
          {uploadedFile && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={resetState}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear File
            </Button>
          )}

          {/* Column Mapping */}
          {headers.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Column Mapping</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">ASIN</Label>
                  <Select
                    value={columnMapping.asin || ''}
                    onValueChange={(value) => setColumnMapping({ ...columnMapping, asin: value === 'none' ? undefined : value })}
                  >
                    <SelectTrigger className="h-8 text-xs">
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
                  <Label className="text-xs">Model Number</Label>
                  <Select
                    value={columnMapping.model_number || ''}
                    onValueChange={(value) => setColumnMapping({ ...columnMapping, model_number: value === 'none' ? undefined : value })}
                  >
                    <SelectTrigger className="h-8 text-xs">
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
                  <Label className="text-xs">Title</Label>
                  <Select
                    value={columnMapping.title || ''}
                    onValueChange={(value) => setColumnMapping({ ...columnMapping, title: value === 'none' ? undefined : value })}
                  >
                    <SelectTrigger className="h-8 text-xs">
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
                  <Label className="text-xs">Quantity</Label>
                  <Select
                    value={columnMapping.quantity || ''}
                    onValueChange={(value) => setColumnMapping({ ...columnMapping, quantity: value === 'none' ? undefined : value })}
                  >
                    <SelectTrigger className="h-8 text-xs">
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
                  <Label className="text-xs">
                    Unit Cost <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={columnMapping.unit_cost || ''}
                    onValueChange={(value) => setColumnMapping({ ...columnMapping, unit_cost: value })}
                  >
                    <SelectTrigger className="h-8 text-xs">
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
                  <Label className="text-xs">Currency Code</Label>
                  <Select
                    value={columnMapping.currency_code || ''}
                    onValueChange={(value) => setColumnMapping({ ...columnMapping, currency_code: value === 'none' ? undefined : value })}
                  >
                    <SelectTrigger className="h-8 text-xs">
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

              <div className="flex justify-end pt-2">
                <Button
                  onClick={handleProcess}
                  disabled={!columnMapping.unit_cost}
                >
                  Process & Analyze
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
