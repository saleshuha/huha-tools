import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useNoonOrders } from '@/hooks/useNoonOrders';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import * as XLSX from 'xlsx';

const EXPECTED_HEADERS = [
  'order_nr', 'order_status', 'quantity', 'order_received_at', 'purchase_item_nr', 
  'order_country_code', 'manifest_nr', 'shipment_nr', 'fulfillment_timestamp', 
  'shipment_created_by', 'user', 'shipment_created_at', 'id_warehouse_configuration', 
  'target_ready_at', 'item_status', 'is_reprintable', 'is_printed', 'mp_code', 
  'sku', 'partner_sku', 'title', 'title_ar', 'brand_code', 'image_key', 
  'parent_sku', 'size', 'pbarcodes'
];

interface NoonStore {
  id: string;
  name: string;
  partner_id: string | null;
  country: string;
}

interface NoonOrdersUploadProps {
  onUploadComplete?: () => void;
}

export function NoonOrdersUpload({ onUploadComplete }: NoonOrdersUploadProps) {
  const { uploadOrders, uploading } = useNoonOrders();
  const [preview, setPreview] = useState<any[] | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [stores, setStores] = useState<NoonStore[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>('none');

  // Load noon stores on component mount
  React.useEffect(() => {
    const loadStores = async () => {
      try {
        const { data, error } = await supabase
          .from('noon_stores')
          .select('id, name, partner_id, country')
          .order('country', { ascending: true })
          .order('name', { ascending: true });

        if (error) throw error;
        setStores(data || []);
      } catch (error) {
        console.error('Error loading stores:', error);
      }
    };

    loadStores();
  }, []);

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
          
          // Validate headers
          const errors: string[] = [];
          const missingHeaders = EXPECTED_HEADERS.filter(h => !headers.includes(h));
          if (missingHeaders.length > 0) {
            errors.push(`Missing required headers: ${missingHeaders.join(', ')}`);
          }

          // Convert rows to objects
              const orders = rows
                .filter(row => row.some(cell => cell !== null && cell !== undefined && cell !== ''))
                .map((row, index) => {
                  const order: any = {};
                  headers.forEach((header, i) => {
                    if (EXPECTED_HEADERS.includes(header)) {
                      let value = row[i];
                      
                      // Convert boolean fields
                      if (header === 'is_reprintable' || header === 'is_printed') {
                        value = value === true || value === 'true' || value === 1 || value === '1';
                      }
                      
                      // Convert numeric fields
                      if (header === 'quantity' && value) {
                        value = parseInt(value) || 1;
                      }
                      
                      // Convert date fields
                      if ((header.includes('_at') || header.includes('_date') || header === 'fulfillment_timestamp') && value !== null && value !== undefined && value !== '') {
                        try {
                          if (typeof value === 'number') {
                            console.log(`Converting Excel date for ${header}:`, value);
                            // Excel date serial number conversion
                            // Days since January 1, 1900 (Excel's epoch)
                            const excelEpoch = new Date(1900, 0, 1); // January 1, 1900
                            const msPerDay = 24 * 60 * 60 * 1000;
                            
                            // Excel has a bug: it treats 1900 as a leap year (it's not)
                            // So for dates after Feb 28, 1900, we need to subtract 1 day
                            let adjustedDays = value;
                            if (value > 59) {
                              adjustedDays = value - 1;
                            }
                            
                            const excelDate = new Date(excelEpoch.getTime() + (adjustedDays - 1) * msPerDay);
                            
                            // Validate the date is reasonable (between 1900 and 2100)
                            if (excelDate.getFullYear() >= 1900 && excelDate.getFullYear() <= 2100 && !isNaN(excelDate.getTime())) {
                              value = excelDate.toISOString();
                              console.log(`Converted Excel date ${header} from ${adjustedDays} to:`, value);
                            } else {
                              console.warn(`Invalid Excel date range for ${header}:`, value, excelDate);
                              value = null;
                            }
                          } else if (typeof value === 'string' && value.trim()) {
                            console.log(`Parsing string date for ${header}:`, value);
                            const parsedDate = new Date(value);
                            if (!isNaN(parsedDate.getTime())) {
                              value = parsedDate.toISOString();
                              console.log(`Converted string date to:`, value);
                            } else {
                              console.warn(`Invalid date string for ${header}:`, value);
                              value = null;
                            }
                          } else {
                            value = null;
                          }
                        } catch (e) {
                          console.error(`Failed to parse date for ${header}:`, value, e);
                          value = null;
                        }
                      }
                      
                      order[header] = value || null;
                    }
                  });

                  // Validate required fields
                  if (!order.order_nr) {
                    errors.push(`Row ${index + 2}: Missing order_nr`);
                  }
                  if (!order.purchase_item_nr) {
                    errors.push(`Row ${index + 2}: Missing purchase_item_nr`);
                  }
                  if (!order.order_country_code) {
                    order.order_country_code = 'UAE'; // Default value
                  }
                  if (!order.quantity) {
                    order.quantity = 1; // Default value
                  }

                  return order;
                });

              // Check for duplicate purchase_item_nr within the uploaded data
              const purchaseItemNumbers = orders.map(order => order.purchase_item_nr).filter(Boolean);
              const duplicatePurchaseItems = purchaseItemNumbers.filter((item, index) => 
                purchaseItemNumbers.indexOf(item) !== index
              );
              
              if (duplicatePurchaseItems.length > 0) {
                const uniqueDuplicates = [...new Set(duplicatePurchaseItems)];
                errors.push(`Duplicate Purchase Item Numbers found in upload: ${uniqueDuplicates.join(', ')}`);
              }

              console.log('=== UPLOAD VALIDATION ===');
              console.log('Total orders parsed:', orders.length);
              console.log('Purchase Item Numbers:', purchaseItemNumbers);
              console.log('Duplicate Purchase Items:', duplicatePurchaseItems);
              console.log('Validation errors:', errors);

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
      // Add noon_store_id to orders if selected
      const ordersWithStore = preview.map(order => ({
        ...order,
        noon_store_id: selectedStore && selectedStore !== 'none' ? selectedStore : null
      }));
      await uploadOrders(ordersWithStore, fileName);
      setUploadProgress(100);
      setPreview(null);
      setFileName('');
      setSelectedStore('none');
      onUploadComplete?.();
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  const clearPreview = () => {
    setPreview(null);
    setFileName('');
    setValidationErrors([]);
    setUploadProgress(0);
    setSelectedStore('none');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Noon Orders
        </CardTitle>
        <CardDescription>
          Upload your noon orders from Excel or CSV file. Purchase Item Numbers must be unique.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Store Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Select Store (Optional)</label>
          <Select value={selectedStore} onValueChange={setSelectedStore}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a store..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Store Selected</SelectItem>
              {stores.map((store) => (
                <SelectItem key={store.id} value={store.id}>
                  {store.name} ({store.country})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Select a store to associate with these orders. You can filter stores by country.
          </p>
        </div>

        {/* Debug section to check existing orders and authentication */}
        <div className="space-y-2">
          <Button 
            variant="outline" 
            onClick={async () => {
              try {
                // Check authentication status
                const { data: userData, error: userError } = await supabase.auth.getUser();
                console.log('=== AUTHENTICATION STATUS ===');
                console.log('User data:', userData?.user?.id);
                console.log('Auth error:', userError);
                
                if (userData?.user) {
                  // Check if there are ANY orders for this user
                  const { data: userOrders, error: userOrdersError } = await supabase
                    .from('noon_orders') 
                    .select('id, order_nr, purchase_item_nr, user_id, created_at')
                    .eq('user_id', userData.user.id);
                    
                  console.log('=== USER ORDERS ===');
                  console.log('User orders:', userOrders);
                  console.log('User orders error:', userOrdersError);
                  console.log('User orders count:', userOrders?.length || 0);
                  
                  // Check if there are ANY orders in the database (might be from different users)
                  const { data: allOrders, error: allOrdersError } = await supabase
                    .from('noon_orders')
                    .select('id, order_nr, purchase_item_nr, user_id, created_at')
                    .limit(10);
                    
                  console.log('=== ALL ORDERS IN DATABASE ===');
                  console.log('All orders:', allOrders);
                  console.log('All orders error:', allOrdersError);
                  console.log('Total orders count:', allOrders?.length || 0);
                  
                  // Check current session
                  const { data: session } = await supabase.auth.getSession();
                  console.log('=== SESSION INFO ===');
                  console.log('Session:', session?.session ? 'Active' : 'None');
                  console.log('Session user:', session?.session?.user?.id);
                } else {
                  console.log('=== NO USER AUTHENTICATED ===');
                }
              } catch (err) {
                console.error('Debug check failed:', err);
              }
            }}
          >
            🔍 Debug: Check Orders & Auth
          </Button>
          <p className="text-xs text-muted-foreground">
            Click to check console for detailed debugging information about orders and authentication
          </p>
        </div>

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
              <div className="grid grid-cols-4 gap-2 p-2 bg-muted text-sm font-medium">
                <div>Purchase Item #</div>
                <div>Partner SKU</div>
                <div>Quantity</div>
                <div>Status</div>
              </div>
              {preview.slice(0, 10).map((order, index) => (
                <div key={index} className="grid grid-cols-4 gap-2 p-2 border-t text-sm">
                  <div className="font-mono">{order.purchase_item_nr}</div>
                  <div>{order.partner_sku || 'N/A'}</div>
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
