import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useDropzone } from 'react-dropzone';
import { Upload, X, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { ReturnsColumnMapping } from './ReturnsColumnMapping';
import { ColumnMapping, UploadedReturnsData } from '@/types/amazon-returns';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ReturnsUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (data: UploadedReturnsData[], fileName: string) => Promise<void>;
}

export const ReturnsUploadDialog: React.FC<ReturnsUploadDialogProps> = ({
  open,
  onOpenChange,
  onUpload,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawData, setRawData] = useState<any[]>([]);
  const [mappings, setMappings] = useState<ColumnMapping>({});
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload');
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setFile(file);
    parseFile(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
    },
    multiple: false,
  });

  const parseFile = async (file: File) => {
    try {
      if (file.name.endsWith('.csv')) {
        Papa.parse(file, {
          header: true,
          complete: (results) => {
            setHeaders(results.meta.fields || []);
            setRawData(results.data);
            autoMapColumns(results.meta.fields || []);
            setStep('mapping');
          },
          error: (error) => {
            toast({
              title: 'Error parsing CSV',
              description: error.message,
              variant: 'destructive',
            });
          },
        });
      } else {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        const headers = jsonData[0] as string[];
        const rows = jsonData.slice(1).map((row: any) => {
          const obj: any = {};
          headers.forEach((header, index) => {
            obj[header] = row[index];
          });
          return obj;
        });

        setHeaders(headers);
        setRawData(rows);
        autoMapColumns(headers);
        setStep('mapping');
      }
    } catch (error: any) {
      toast({
        title: 'Error parsing file',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const autoMapColumns = (headers: string[]) => {
    const mappings: ColumnMapping = {};
    
    headers.forEach((header) => {
      const lowerHeader = header.toLowerCase();
      
      if (lowerHeader.includes('asin')) {
        mappings['asin'] = header;
      } else if (lowerHeader.includes('ship') && lowerHeader.includes('unit')) {
        mappings['shipped_units'] = header;
      } else if (lowerHeader.includes('return') && lowerHeader.includes('unit')) {
        mappings['returned_units'] = header;
      } else if (lowerHeader.includes('title') || lowerHeader.includes('product')) {
        mappings['product_title'] = header;
      } else if (lowerHeader.includes('note')) {
        mappings['notes'] = header;
      }
    });

    setMappings(mappings);
  };

  const validateMappings = () => {
    const required = ['asin', 'shipped_units', 'returned_units'];
    const missing = required.filter(field => !mappings[field]);
    
    if (missing.length > 0) {
      toast({
        title: 'Missing Required Fields',
        description: `Please map: ${missing.join(', ')}`,
        variant: 'destructive',
      });
      return false;
    }
    return true;
  };

  const handlePreview = () => {
    if (!validateMappings()) return;
    setStep('preview');
  };

  const getMappedData = (): UploadedReturnsData[] => {
    return rawData.map(row => ({
      asin: String(row[mappings['asin']] || '').trim(),
      product_title: mappings['product_title'] ? String(row[mappings['product_title']] || '').trim() : undefined,
      shipped_units: parseInt(row[mappings['shipped_units']] || '0'),
      returned_units: parseInt(row[mappings['returned_units']] || '0'),
      notes: mappings['notes'] ? String(row[mappings['notes']] || '').trim() : undefined,
    })).filter(item => item.asin && item.shipped_units >= 0 && item.returned_units >= 0);
  };

  const handleUpload = async () => {
    const mappedData = getMappedData();
    
    if (mappedData.length === 0) {
      toast({
        title: 'No valid data',
        description: 'No valid records found in the file',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    try {
      await onUpload(mappedData, file?.name || 'unknown');
      handleClose();
    } catch (error) {
      // Error handled in onUpload
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setHeaders([]);
    setRawData([]);
    setMappings({});
    setStep('upload');
    setUploading(false);
    onOpenChange(false);
  };

  const previewData = getMappedData().slice(0, 5);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {step === 'upload' && 'Upload Returns Data'}
            {step === 'mapping' && 'Map Columns'}
            {step === 'preview' && 'Preview Data'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {step === 'upload' && (
            <div className="space-y-4">
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                {isDragActive ? (
                  <p className="text-lg">Drop the file here...</p>
                ) : (
                  <>
                    <p className="text-lg mb-2">Drag & drop a file here, or click to select</p>
                    <p className="text-sm text-muted-foreground">
                      Supports .xlsx, .xls, and .csv files
                    </p>
                  </>
                )}
              </div>

              {file && (
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <FileSpreadsheet className="w-5 h-5 text-primary" />
                  <span className="flex-1 text-sm">{file.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFile(null);
                      setStep('upload');
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          )}

          {step === 'mapping' && (
            <div className="space-y-4">
              <ReturnsColumnMapping
                headers={headers}
                mappings={mappings}
                onMappingChange={setMappings}
              />
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Preview</h3>
                <p className="text-sm text-muted-foreground">
                  Showing first 5 records out of {getMappedData().length} total records
                </p>
              </div>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ASIN</TableHead>
                      <TableHead>Product Title</TableHead>
                      <TableHead>Shipped Units</TableHead>
                      <TableHead>Returned Units</TableHead>
                      <TableHead>Return Ratio (%)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.map((item, index) => {
                      const ratio = item.shipped_units > 0 
                        ? (item.returned_units / item.shipped_units * 100).toFixed(2)
                        : '0.00';
                      
                      return (
                        <TableRow key={index}>
                          <TableCell className="font-mono">{item.asin}</TableCell>
                          <TableCell>{item.product_title || '-'}</TableCell>
                          <TableCell>{item.shipped_units}</TableCell>
                          <TableCell>{item.returned_units}</TableCell>
                          <TableCell>{ratio}%</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}
        </div>

        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <div className="flex gap-2">
            {step === 'mapping' && (
              <>
                <Button variant="outline" onClick={() => setStep('upload')}>
                  Back
                </Button>
                <Button onClick={handlePreview}>
                  Preview Data
                </Button>
              </>
            )}
            {step === 'preview' && (
              <>
                <Button variant="outline" onClick={() => setStep('mapping')}>
                  Back
                </Button>
                <Button onClick={handleUpload} disabled={uploading}>
                  {uploading ? 'Uploading...' : `Upload ${getMappedData().length} Records`}
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
