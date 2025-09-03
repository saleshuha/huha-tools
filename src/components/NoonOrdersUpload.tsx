import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useNoonOrders } from '@/hooks/useNoonOrders';
import * as XLSX from 'xlsx';

const EXPECTED_HEADERS = [
  'order_nr', 'order_status', 'quantity', 'order_received_at', 'purchase_item_nr', 
  'order_country_code', 'manifest_nr', 'shipment_nr', 'fulfillment_timestamp', 
  'shipment_created_by', 'shipment_user', 'shipment_created_at', 'id_warehouse_configuration', 
  'target_ready_at', 'item_status', 'is_reprintable', 'is_printed', 'mp_code', 
  'sku', 'partner_sku', 'title', 'title_ar', 'brand_code', 'image_key', 
  'parent_sku', 'size', 'pbarcodes'
];

interface NoonOrdersUploadProps {
  onUploadComplete?: () => void;
  selectedStoreId?: string;
}

export function NoonOrdersUpload({ onUploadComplete, selectedStoreId }: NoonOrdersUploadProps) {
  const { uploadOrders, uploading } = useNoonOrders();
  const [preview, setPreview] = useState<any[] | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const parseFile = useCallback(async (file: File) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          let workbook: XLSX.WorkBook;
          
          if (file.name.endsWith('.csv')) {
            workbook = XLSX.read(data, { type: 'binary' });
          } else {
            workbook = XLSX.read(data, { type: 'array' });
          }
          
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          if (jsonData.length === 0) {
            reject(new Error('File is empty'));
            return;
          }

          const headers = jsonData[0] as string[];
          const rows = jsonData.slice(1) as any[][];
          
          // Validate headers - only check for critical headers, allow flexible uploads
          const errors: string[] = [];
          const criticalHeaders = ['order_nr', 'purchase_item_nr']; // Only require essential identifiers
          const missingCriticalHeaders = criticalHeaders.filter(h => !headers.includes(h));
          if (missingCriticalHeaders.length > 0) {
            errors.push(`Missing critical headers: ${missingCriticalHeaders.join(', ')}`);
          }

          // Convert rows to objects
          const orders = rows
            .filter(row => row.some(cell => cell !== null && cell !== undefined && cell !== ''))
            .map((row, index) => {
              const order: any = {};
              headers.forEach((header, i) => {
                // Map CSV 'user' field to database 'shipment_user' field (represents Noon platform user)
                const dbHeader = header === 'user' ? 'shipment_user' : header;
                
                if (EXPECTED_HEADERS.includes(dbHeader) || header === 'user') {
                  let value = row[i];
                  
                  // Convert and preserve all field values, including empty ones
                  if (header === 'is_reprintable' || header === 'is_printed') {
                    value = value === true || value === 'true' || value === 1 || value === '1';
                  } else if (header === 'quantity' && value !== null && value !== undefined && value !== '') {
                    value = parseInt(value) || 1;
                  } else if ((header.includes('_at') || header.includes('_date') || header.includes('_timestamp')) && value !== null && value !== undefined && value !== '') {
                    try {
                      if (typeof value === 'number') {
                        // Excel date serial number - convert to JavaScript date
                        // Excel epoch starts from 1900-01-01, JavaScript from 1970-01-01
                        // Excel serial number = days since 1900-01-01 (with leap year bug correction)
                        const excelDate = new Date((value - 25569) * 86400 * 1000);
                        if (!isNaN(excelDate.getTime()) && excelDate.getFullYear() > 1900 && excelDate.getFullYear() < 2100) {
                          value = excelDate.toISOString();
                        } else {
                          value = null;
                        }
                      } else if (typeof value === 'string' && value.trim() !== '') {
                        // Handle various string date formats including MM/DD/YYYY HH:MM
                        const trimmedValue = value.trim();
                        const parsedDate = new Date(trimmedValue);
                        if (!isNaN(parsedDate.getTime()) && parsedDate.getFullYear() > 1900 && parsedDate.getFullYear() < 2100) {
                          value = parsedDate.toISOString();
                        } else {
                          value = null;
                        }
                      } else {
                        value = null;
                      }
                    } catch (e) {
                      // If date parsing fails, set to null instead of keeping invalid value
                      console.warn(`Failed to parse date for ${header}:`, value, e);
                      value = null;
                    }
                  }
                  
                  // Store value as-is, including empty strings and nulls for future updates
                  order[dbHeader] = value === undefined || value === '' ? null : value;
                }
              });

              // Validate only critical required fields - allow empty fields for future updates
              if (!order.order_nr) {
                errors.push(`Row ${index + 2}: Missing order_nr (required for identification)`);
              }
              if (!order.purchase_item_nr) {
                errors.push(`Row ${index + 2}: Missing purchase_item_nr (required for identification)`);
              }
              
              // Set defaults only for essential fields, leave others as null/empty if not provided
              if (!order.order_country_code) {
                order.order_country_code = 'UAE'; // Default country for processing
              }
              if (!order.quantity && order.quantity !== 0) {
                order.quantity = 1; // Default quantity for processing
              }

              return order;
            });

          setValidationErrors(errors);
          resolve(orders);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      
      if (file.name.endsWith('.csv')) {
        reader.readAsBinaryString(file);
      } else {
        reader.readAsArrayBuffer(file);
      }
    });
  }, []);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    try {
      setFileName(file.name);
      setValidationErrors([]);
      const orders = await parseFile(file);
      setPreview(orders as any[]);
    } catch (error) {
      console.error('Error parsing file:', error);
      setValidationErrors([error instanceof Error ? error.message : 'Failed to parse file']);
    }
  }, [parseFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    multiple: false
  });

  const handleUpload = async () => {
    if (!preview) return;

    try {
      setUploadProgress(0);
      setValidationErrors([]); // Clear previous errors
      const result = await uploadOrders(preview, fileName, selectedStoreId);
      setUploadProgress(100);
      setPreview(null);
      setFileName('');
      onUploadComplete?.();
    } catch (error) {
      console.error('Upload failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload orders';
      setValidationErrors([errorMessage]);
      setUploadProgress(0);
    }
  };

  const clearPreview = () => {
    setPreview(null);
    setFileName('');
    setValidationErrors([]);
    setUploadProgress(0);
    setProcessingStats(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Noon Orders
        </CardTitle>
        <CardDescription>
          Upload your noon orders from Excel or CSV file. Empty fields are preserved for future updates with additional data.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {validationErrors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                {validationErrors.map((error, index) => (
                  <div key={index}>{error}</div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {!preview ? (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragActive ? 'border-primary bg-primary/10' : 'border-muted-foreground/25 hover:border-primary'}
            `}
          >
            <input {...getInputProps()} />
            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">
              {isDragActive ? 'Drop the file here' : 'Drop your file here or click to browse'}
            </p>
            <p className="text-sm text-muted-foreground">
              Supports CSV, XLS, and XLSX files
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Preview: {fileName}</p>
                <p className="text-sm text-muted-foreground">
                  {preview.length} orders ready for upload
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={clearPreview}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleUpload} 
                  disabled={uploading || validationErrors.length > 0}
                >
                  {uploading ? 'Uploading...' : 'Upload Orders'}
                </Button>
              </div>
            </div>

            {uploading && (
              <Progress value={uploadProgress} className="w-full" />
            )}

            <div className="max-h-64 overflow-auto border rounded-lg">
              <div className="grid grid-cols-5 gap-2 p-2 bg-muted text-sm font-medium">
                <div>Order #</div>
                <div>Purchase Item #</div>
                <div>Partner SKU</div>
                <div>Quantity</div>
                <div>Status</div>
              </div>
              {preview.slice(0, 10).map((order, index) => (
                <div key={index} className="grid grid-cols-5 gap-2 p-2 border-t text-sm">
                  <div className="font-mono text-xs">{order.order_nr}</div>
                  <div className="font-mono text-xs">{order.purchase_item_nr}</div>
                  <div className="text-xs">{order.partner_sku || 'N/A'}</div>
                  <div>{order.quantity}</div>
                  <div>
                    <Badge variant="outline">{order.order_status || 'Pending'}</Badge>
                  </div>
                </div>
              ))}
              {preview.length > 10 && (
                <div className="p-2 text-center text-sm text-muted-foreground border-t">
                  ... and {preview.length - 10} more orders
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-4 p-3 bg-muted rounded-lg">
          <h4 className="font-medium mb-2">Expected Headers:</h4>
          <div className="grid grid-cols-3 gap-1 text-xs">
            {EXPECTED_HEADERS.map(header => (
              <Badge key={header} variant="secondary" className="text-xs">
                {header}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
