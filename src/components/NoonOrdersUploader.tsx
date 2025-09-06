import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { NoonStoreManagement } from '@/components/NoonStoreManagement';
import { useNoonStores } from '@/hooks/useNoonStores';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, X } from 'lucide-react';
import * as XLSX from 'xlsx';

// Expected headers for Noon orders
const EXPECTED_HEADERS = [
  'order_nr', 'order_status', 'quantity', 'order_received_at', 'purchase_item_nr',
  'order_country_code', 'manifest_nr', 'shipment_nr', 'fulfillment_timestamp',
  'shipment_created_by', 'user', 'shipment_created_at', 'id_warehouse_configuration',
  'target_ready_at', 'item_status', 'is_reprintable', 'is_printed', 'mp_code',
  'sku', 'partner_sku', 'title', 'title_ar', 'brand_code', 'image_key',
  'parent_sku', 'size', 'pbarcodes'
];

interface NoonOrderData {
  order_nr: string;
  order_status?: string;
  quantity?: number;
  order_received_at?: string;
  purchase_item_nr: string;
  order_country_code?: string;
  manifest_nr?: string;
  shipment_nr?: string;
  fulfillment_timestamp?: string;
  shipment_created_by?: string;
  user?: string;
  shipment_created_at?: string;
  id_warehouse_configuration?: string;
  target_ready_at?: string;
  item_status?: string;
  is_reprintable?: boolean;
  is_printed?: boolean;
  mp_code?: string;
  sku?: string;
  partner_sku?: string;
  title?: string;
  title_ar?: string;
  brand_code?: string;
  image_key?: string;
  parent_sku?: string;
  size?: string;
  pbarcodes?: string;
}

export function NoonOrdersUploader() {
  const [preview, setPreview] = useState<NoonOrderData[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  
  const { stores } = useNoonStores();
  const { toast } = useToast();

  // Parse uploaded file
  const parseFile = useCallback(async (file: File): Promise<NoonOrderData[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
          
          if (jsonData.length < 2) {
            throw new Error('File must contain at least header and one data row');
          }

          const headers = jsonData[0];
          const rows = jsonData.slice(1);

          // Validate headers
          const missingHeaders = EXPECTED_HEADERS.filter(h => !headers.includes(h));
          const errors: string[] = [];
          
          if (missingHeaders.length > 0) {
            errors.push(`Missing required headers: ${missingHeaders.join(', ')}`);
          }

          if (errors.length > 0) {
            setValidationErrors(errors);
            reject(new Error(errors.join('; ')));
            return;
          }

          // Parse rows into objects
          const orders = rows.map((row, index) => {
            const order: any = {};
            headers.forEach((header, i) => {
              if (EXPECTED_HEADERS.includes(header)) {
                let value = row[i];
                
                // Handle specific data type conversions
                if (header === 'quantity' && value) {
                  value = parseInt(value) || 1;
                } else if (['is_reprintable', 'is_printed'].includes(header) && value) {
                  value = value.toString().toLowerCase() === 'true';
                } else if (value && typeof value === 'string') {
                  value = value.trim();
                }
                
                order[header] = value;
              }
            });
            
            // Validate required fields
            if (!order.order_nr || !order.purchase_item_nr) {
              throw new Error(`Row ${index + 2}: Missing required fields (order_nr or purchase_item_nr)`);
            }
            
            return order;
          });

          setValidationErrors([]);
          resolve(orders);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsBinaryString(file);
    });
  }, []);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setFileName(file.name);
    setUploadProgress(0);
    
    try {
      const orders = await parseFile(file);
      setPreview(orders);
      toast({
        title: "File Parsed Successfully",
        description: `Found ${orders.length} orders in the file`,
      });
    } catch (error) {
      toast({
        title: "File Parse Error",
        description: error instanceof Error ? error.message : 'Failed to parse file',
        variant: "destructive"
      });
    }
  }, [parseFile, toast]);

  const handleUpload = async () => {
    if (!selectedStoreId) {
      toast({
        title: "Store Required",
        description: "Please select a store before uploading orders",
        variant: "destructive"
      });
      return;
    }

    if (preview.length === 0) {
      toast({
        title: "No Data",
        description: "Please upload a file first",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Prepare orders for database insert - exclude 'user' field as it maps to 'shipment_user'
      const ordersToInsert = preview.map(order => {
        const { user: orderUser, ...orderWithoutUser } = order; // Exclude 'user' field and rename it
        return {
          ...orderWithoutUser,
          user_id: user.id,
          selected_store_id: selectedStoreId,
          file_name: fileName,
          shipment_user: orderUser, // Map original 'user' field to 'shipment_user'
          // Ensure required fields have defaults
          quantity: order.quantity || 1,
          order_country_code: order.order_country_code || 'UAE'
        };
      });

      // Insert in batches to show progress
      const batchSize = 100;
      let inserted = 0;

      for (let i = 0; i < ordersToInsert.length; i += batchSize) {
        const batch = ordersToInsert.slice(i, i + batchSize);
        
        const { error } = await supabase
          .from('noon_orders')
          .insert(batch);

        if (error) throw error;
        
        inserted += batch.length;
        setUploadProgress((inserted / ordersToInsert.length) * 100);
      }

      toast({
        title: "Upload Successful",
        description: `Successfully uploaded ${inserted} orders`,
      });

      // Clear form
      setPreview([]);
      setFileName('');
      setUploadProgress(0);
      setSelectedStoreId('');

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : 'Failed to upload orders',
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const clearPreview = () => {
    setPreview([]);
    setFileName('');
    setValidationErrors([]);
    setUploadProgress(0);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv']
    },
    multiple: false
  });

  return (
    <div className="space-y-6">
      {/* Store Management */}
      <NoonStoreManagement 
        selectedStoreId={selectedStoreId}
        onStoreChange={setSelectedStoreId}
      />

      {/* File Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Noon Orders File
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* File Drop Zone */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-primary/5'
            }`}
          >
            <input {...getInputProps()} />
            <FileSpreadsheet className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            {isDragActive ? (
              <p className="text-lg font-medium">Drop the file here...</p>
            ) : (
              <div>
                <p className="text-lg font-medium mb-2">
                  Drag & drop your Noon orders file here, or click to select
                </p>
                <p className="text-sm text-muted-foreground">
                  Supports Excel (.xlsx, .xls) and CSV files
                </p>
              </div>
            )}
          </div>

          {/* Expected Headers Info */}
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-2">Expected Headers:</h4>
            <div className="flex flex-wrap gap-1">
              {EXPECTED_HEADERS.map((header) => (
                <Badge key={header} variant="outline" className="text-xs">
                  {header}
                </Badge>
              ))}
            </div>
          </div>

          {/* File Preview */}
          {preview.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="font-medium">File: {fileName}</span>
                  <Badge>{preview.length} orders</Badge>
                </div>
                <Button variant="ghost" size="sm" onClick={clearPreview}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Upload Progress */}
              {uploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Uploading orders...</span>
                    <span>{Math.round(uploadProgress)}%</span>
                  </div>
                  <Progress value={uploadProgress} />
                </div>
              )}

              {/* Preview Table */}
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted p-3 font-medium">Preview (First 5 rows)</div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-2 text-xs">Order Nr</th>
                        <th className="text-left p-2 text-xs">Purchase Item Nr</th>
                        <th className="text-left p-2 text-xs">SKU</th>
                        <th className="text-left p-2 text-xs">Title</th>
                        <th className="text-left p-2 text-xs">Quantity</th>
                        <th className="text-left p-2 text-xs">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.slice(0, 5).map((order, index) => (
                        <tr key={index} className="border-b">
                          <td className="p-2 text-xs">{order.order_nr}</td>
                          <td className="p-2 text-xs">{order.purchase_item_nr}</td>
                          <td className="p-2 text-xs">{order.sku || 'N/A'}</td>
                          <td className="p-2 text-xs max-w-[200px] truncate">{order.title || 'N/A'}</td>
                          <td className="p-2 text-xs">{order.quantity || 1}</td>
                          <td className="p-2 text-xs">{order.order_status || 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Upload Actions */}
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={clearPreview} disabled={uploading}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleUpload} 
                  disabled={uploading || !selectedStoreId}
                  className="bg-primary hover:bg-primary/90"
                >
                  {uploading ? 'Uploading...' : `Upload ${preview.length} Orders`}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}