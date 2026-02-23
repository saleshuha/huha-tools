import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNoonStores, NoonStore } from '@/hooks/useNoonStores';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileSpreadsheet, Clock, Package, Store, CheckCircle, AlertCircle, CloudUpload } from 'lucide-react';
import * as XLSX from 'xlsx';

const EXPECTED_HEADERS = ['order_nr', 'order_status', 'quantity', 'order_received_at', 'purchase_item_nr', 'order_country_code', 'manifest_nr', 'shipment_nr', 'fulfillment_timestamp', 'shipment_created_by', 'user', 'shipment_created_at', 'id_warehouse_configuration', 'target_ready_at', 'item_status', 'is_reprintable', 'is_printed', 'mp_code', 'sku', 'partner_sku', 'title', 'title_ar', 'brand_code', 'image_key', 'parent_sku', 'size', 'pbarcodes'];

interface RecentUpload {
  fileName: string;
  rowCount: number;
  storeName: string;
  date: string;
  status: 'success' | 'error';
}

interface NoonUploadTabProps {
  stores: NoonStore[];
  selectedStoreId: string;
  onStoreChange: (id: string) => void;
}

export function NoonUploadTab({ stores, selectedStoreId, onStoreChange }: NoonUploadTabProps) {
  const [uploading, setUploading] = useState(false);
  const [recentUploads, setRecentUploads] = useState<RecentUpload[]>([]);
  const { toast } = useToast();

  const convertExcelDate = (value: any): string | null => {
    if (!value) return null;
    if (typeof value === 'string' && (value.includes('-') || value.includes('/'))) return value;
    if (typeof value === 'number') {
      const excelEpoch = new Date(1899, 11, 30);
      const days = Math.floor(value);
      const fractionalDay = value - days;
      const milliseconds = Math.round(fractionalDay * 24 * 60 * 60 * 1000);
      const date = new Date(excelEpoch.getTime() + days * 24 * 60 * 60 * 1000 + milliseconds);
      return date.toISOString();
    }
    return null;
  };

  const parseFile = useCallback(async (file: File) => {
    return new Promise<any[]>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
          if (jsonData.length < 2) throw new Error('File must contain at least header and one data row');
          const headers = jsonData[0];
          const rows = jsonData.slice(1);
          const missingHeaders = EXPECTED_HEADERS.filter(h => !headers.includes(h));
          if (missingHeaders.length > 0) throw new Error(`Missing required headers: ${missingHeaders.join(', ')}`);

          const orders = rows.map((row, index) => {
            const order: any = {};
            headers.forEach((header: string, i: number) => {
              if (EXPECTED_HEADERS.includes(header)) {
                let value = row[i];
                if (header === 'quantity' && value) value = parseInt(value) || 1;
                else if (['is_reprintable', 'is_printed'].includes(header) && value) value = value.toString().toLowerCase() === 'true' || value === 1;
                else if (['order_received_at', 'fulfillment_timestamp', 'shipment_created_at', 'target_ready_at'].includes(header)) value = convertExcelDate(value);
                else if (value && typeof value === 'string') value = value.trim();
                order[header] = value;
              }
            });
            if (!order.order_nr || !order.purchase_item_nr) throw new Error(`Row ${index + 2}: Missing required fields`);
            return order;
          });
          resolve(orders);
        } catch (error) { reject(error); }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsBinaryString(file);
    });
  }, []);

  const handleFileUpload = async (file: File) => {
    if (!selectedStoreId) {
      toast({ title: "Store Required", description: "Please select a store before uploading orders", variant: "destructive" });
      return;
    }
    const storeName = stores.find(s => s.id === selectedStoreId)?.name || 'Unknown';
    setUploading(true);
    try {
      const orders = await parseFile(file);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

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
          order_country_code: order.order_country_code || 'UAE',
        };
      });

      const { error } = await supabase.from('noon_processing_orders').insert(ordersToInsert as any);
      if (error) throw error;

      setRecentUploads(prev => [{ fileName: file.name, rowCount: ordersToInsert.length, storeName, date: new Date().toISOString(), status: 'success' as const }, ...prev].slice(0, 10));
      toast({ title: "Upload Successful", description: `Successfully uploaded ${ordersToInsert.length} orders` });
    } catch (error) {
      console.error('Upload error:', error);
      setRecentUploads(prev => [{ fileName: file.name, rowCount: 0, storeName, date: new Date().toISOString(), status: 'error' as const }, ...prev].slice(0, 10));
      toast({ title: "Upload Failed", description: error instanceof Error ? error.message : 'Failed to upload orders', variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) handleFileUpload(acceptedFiles[0]);
  }, [selectedStoreId, stores]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'], 'application/vnd.ms-excel': ['.xls'], 'text/csv': ['.csv'] },
    multiple: false,
    disabled: uploading,
  });

  const todayUploads = recentUploads.filter(u => new Date(u.date).toDateString() === new Date().toDateString());
  const totalOrdersUploaded = recentUploads.filter(u => u.status === 'success').reduce((a, b) => a + b.rowCount, 0);
  const selectedStore = stores.find(s => s.id === selectedStoreId);

  return (
    <div className="space-y-4">
      {/* Stat Bar */}
      <div className="flex flex-wrap items-center gap-3 p-2.5 rounded-xl bg-card border border-border">
        <div className="flex items-center gap-2 px-3 py-1.5">
          <div className="w-2 h-2 rounded-full bg-primary" />
          <span className="text-xs text-muted-foreground">Files Today</span>
          <span className="text-sm font-semibold text-foreground">{todayUploads.length}</span>
        </div>
        <div className="w-px h-6 bg-border" />
        <div className="flex items-center gap-2 px-3 py-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-xs text-muted-foreground">Orders Uploaded</span>
          <span className="text-sm font-semibold text-foreground">{totalOrdersUploaded}</span>
        </div>
        <div className="w-px h-6 bg-border" />
        <div className="flex items-center gap-2 px-3 py-1.5">
          <div className="w-2 h-2 rounded-full bg-yellow-500" />
          <span className="text-xs text-muted-foreground">Store</span>
          <span className="text-sm font-semibold text-foreground">{selectedStore?.name || 'None'}</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-card border border-border">
        <div className="flex items-center gap-2">
          <Store className="h-4 w-4 text-muted-foreground" />
          <select
            value={selectedStoreId}
            onChange={e => onStoreChange(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-border bg-background text-foreground text-sm min-w-[180px] focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
          >
            <option value="">Choose a store...</option>
            {stores.map(store => (
              <option key={store.id} value={store.id}>{store.name} ({store.country})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Drag & Drop Upload Zone */}
      <div
        {...getRootProps()}
        className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
          isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/20'
        } ${uploading ? 'opacity-50 pointer-events-none' : ''} ${!selectedStoreId ? 'opacity-50' : ''}`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-3">
          <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center">
            <CloudUpload className={`h-7 w-7 ${isDragActive ? 'text-primary' : 'text-muted-foreground'}`} />
          </div>
          {uploading ? (
            <p className="text-sm text-muted-foreground">Uploading and processing...</p>
          ) : isDragActive ? (
            <p className="text-sm font-medium text-primary">Drop the file here</p>
          ) : (
            <>
              <p className="text-sm font-medium text-foreground">
                {selectedStoreId ? 'Drag & drop your Noon orders file here' : 'Select a store first'}
              </p>
              <p className="text-xs text-muted-foreground">Supports .xlsx, .xls, .csv files</p>
            </>
          )}
        </div>
      </div>

      {/* Recent Uploads Table */}
      {recentUploads.length > 0 && (
        <div className="border border-border rounded-xl overflow-hidden bg-card">
          <div className="hidden md:block">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/40">
                  <th className="text-left p-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">File Name</th>
                  <th className="text-left p-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rows</th>
                  <th className="text-left p-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Store</th>
                  <th className="text-left p-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date</th>
                  <th className="text-left p-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentUploads.map((upload, i) => (
                  <tr key={i} className={`border-t border-border/30 transition-colors hover:bg-muted/20 ${i % 2 === 0 ? '' : 'bg-muted/10'}`}>
                    <td className="p-3 text-sm font-medium text-foreground flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="truncate max-w-[200px]">{upload.fileName}</span>
                    </td>
                    <td className="p-3 text-sm text-foreground">{upload.rowCount}</td>
                    <td className="p-3 text-sm text-muted-foreground">{upload.storeName}</td>
                    <td className="p-3 text-sm text-muted-foreground">{new Date(upload.date).toLocaleString()}</td>
                    <td className="p-3">
                      {upload.status === 'success' ? (
                        <Badge variant="default" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/10">
                          <CheckCircle className="h-3 w-3 mr-1" /> Success
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/10">
                          <AlertCircle className="h-3 w-3 mr-1" /> Error
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile card layout */}
          <div className="md:hidden divide-y divide-border/30">
            {recentUploads.map((upload, i) => (
              <div key={i} className="p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground truncate max-w-[200px]">{upload.fileName}</span>
                  {upload.status === 'success' ? (
                    <Badge variant="default" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/10 text-xs">Success</Badge>
                  ) : (
                    <Badge variant="destructive" className="text-xs">Error</Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{upload.rowCount} rows</span>
                  <span>•</span>
                  <span>{upload.storeName}</span>
                  <span>•</span>
                  <span>{new Date(upload.date).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {recentUploads.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
            <Upload className="h-7 w-7 text-muted-foreground/60" />
          </div>
          <p className="text-sm font-medium text-foreground">No recent uploads</p>
          <p className="text-xs text-muted-foreground mt-1">Upload a Noon orders file to get started</p>
        </div>
      )}
    </div>
  );
}
