import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { NoonStoreManagement } from '@/components/NoonStoreManagement';
import { NoonProcessingOrdersTable } from '@/components/NoonProcessingOrdersTable';
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
    <div className="space-y-6">
      {/* Processing Orders Table - Main Focus */}
      <NoonProcessingOrdersTable />

      {/* Simple Upload Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <NoonStoreManagement 
            selectedStoreId={selectedStoreId}
            onStoreChange={setSelectedStoreId}
          />
        </div>
        <Button 
          onClick={handleFileSelect}
          disabled={uploading || !selectedStoreId}
          className="flex items-center gap-2"
        >
          <Upload className="h-4 w-4" />
          {uploading ? 'Uploading...' : 'Upload Orders File'}
        </Button>
      </div>
    </div>
  );
}