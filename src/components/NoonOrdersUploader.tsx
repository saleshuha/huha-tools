import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NoonStoreManagement } from '@/components/NoonStoreManagement';
import { NoonProcessingOrdersTable } from '@/components/NoonProcessingOrdersTable';
import { useNoonStores } from '@/hooks/useNoonStores';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, X, Store, Package } from 'lucide-react';
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
            throw new Error(`Missing required headers: ${missingHeaders.join(', ')}`);
          }

          // Helper function to convert Excel serial date to ISO string
          const convertExcelDate = (value: any): string | null => {
            if (!value) return null;
            
            // If it's already a string that looks like a date, return it
            if (typeof value === 'string' && (value.includes('-') || value.includes('/'))) {
              return value;
            }
            
            // If it's a number (Excel serial date), convert it
            if (typeof value === 'number') {
              // Excel epoch starts at January 1, 1900
              // But Excel treats 1900 as a leap year (which it wasn't), so we need to account for that
              const excelEpoch = new Date(1899, 11, 30); // December 30, 1899
              const days = Math.floor(value);
              const fractionalDay = value - days;
              const milliseconds = Math.round(fractionalDay * 24 * 60 * 60 * 1000);
              
              const date = new Date(excelEpoch.getTime() + days * 24 * 60 * 60 * 1000 + milliseconds);
              return date.toISOString();
            }
            
            return null;
          };

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
                  value = value.toString().toLowerCase() === 'true' || value === 1;
                } else if (['order_received_at', 'fulfillment_timestamp', 'shipment_created_at', 'target_ready_at'].includes(header)) {
                  // Convert date fields from Excel serial format to ISO string
                  value = convertExcelDate(value);
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

          resolve(orders);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsBinaryString(file);
    });
  }, []);

  const handleFileUpload = async (file: File) => {
    if (!selectedStoreId) {
      toast({
        title: "Store Required",
        description: "Please select a store before uploading orders",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    
    try {
      const orders = await parseFile(file);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Prepare orders for database insert
      const ordersToInsert = orders.map(order => {
        const { user: orderUser, ...orderWithoutUser } = order;
        return {
          ...orderWithoutUser,
          user_id: user.id,
          selected_store_id: selectedStoreId,
          file_name: file.name,
          file_upload_date: new Date().toISOString(),
          shipment_user: orderUser,
          quantity: order.quantity || 1,
          order_country_code: order.order_country_code || 'UAE'
        };
      });

      const { error } = await supabase
        .from('noon_processing_orders')
        .insert(ordersToInsert);

      if (error) throw error;

      toast({
        title: "Upload Successful",
        description: `Successfully uploaded ${ordersToInsert.length} orders`,
      });

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

  const handleFileSelect = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls,.csv';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handleFileUpload(file);
      }
    };
    input.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      {/* Enhanced Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,hsl(var(--primary)/0.08),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,hsl(var(--emerald)/0.06),transparent_50%)]" />
        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary via-emerald to-sky shadow-glow"></div>
      </div>
      
      <Tabs defaultValue="orders" className="w-full relative z-10">
        <div className="bg-card/80 backdrop-blur-sm border-b border-border/60">
          <div className="app-container py-6">
            {/* Simple Centered Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-3 mb-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 shadow-lg">
                  <Package className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-foreground">
                    Noon Orders Processing
                  </h1>
                  <p className="text-muted-foreground text-lg">
                    Upload and manage your order files
                  </p>
                </div>
              </div>
            </div>
            
            {/* Centered Tabs */}
            <div className="flex justify-center">
              <TabsList className="grid w-full max-w-md grid-cols-2 bg-muted/50 p-1 h-auto">
                <TabsTrigger 
                  value="orders" 
                  className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-200"
                >
                  <Package className="h-4 w-4" />
                  Processing Orders
                </TabsTrigger>
                <TabsTrigger 
                  value="stores" 
                  className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-200"
                >
                  <Store className="h-4 w-4" />
                  Store Management
                </TabsTrigger>
              </TabsList>
            </div>
          </div>
        </div>

        <div className="app-container py-8 space-y-6">
          <TabsContent value="orders" className="space-y-6 mt-0">
            {/* Enhanced Control Bar */}
            <Card className="border-0 shadow-lg bg-gradient-to-r from-card via-card/95 to-card backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    {/* Simple Store Dropdown */}
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Store className="h-5 w-5 text-primary" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-foreground">Select Store</label>
                        <select
                          value={selectedStoreId}
                          onChange={(e) => setSelectedStoreId(e.target.value)}
                          className="px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm min-w-[200px] focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-colors"
                        >
                          <option value="">Choose a store...</option>
                          {stores.map((store) => (
                            <option key={store.id} value={store.id}>
                              {store.name} ({store.country})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Upload Button */}
                  <Button 
                    onClick={handleFileSelect}
                    disabled={uploading || !selectedStoreId}
                    className="bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary shadow-lg hover:shadow-primary/25 transition-all duration-200"
                    size="lg"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {uploading ? 'Uploading...' : 'Upload Orders File'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Processing Orders Table */}
            <NoonProcessingOrdersTable selectedStoreId={selectedStoreId} />
          </TabsContent>

          <TabsContent value="stores" className="space-y-6 mt-0">
            {/* Store Management */}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-card via-card/95 to-card backdrop-blur-sm">
              <CardHeader className="border-b border-border/50 bg-gradient-to-r from-muted/30 to-muted/10">
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Store className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-foreground">Noon Store Management</div>
                    <div className="text-sm text-muted-foreground">Configure and manage your Noon store connections</div>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <NoonStoreManagement 
                  selectedStoreId={selectedStoreId}
                  onStoreChange={setSelectedStoreId}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}