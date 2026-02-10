import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Upload, FileSpreadsheet, ArrowRight, X } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { DFOrderItem } from './types';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DFUploadStepProps {
  onComplete: (orders: DFOrderItem[]) => void;
}

export function DFUploadStep({ onComplete }: DFUploadStepProps) {
  const [orders, setOrders] = useState<DFOrderItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState('');
  const { toast } = useToast();

  const parseFile = useCallback(async (file: File) => {
    setUploading(true);
    setProgress(10);
    setFileName(file.name);

    try {
      let data: any[] = [];
      if (file.name.toLowerCase().endsWith('.csv')) {
        const text = await file.text();
        const result = Papa.parse(text, { header: true, skipEmptyLines: true });
        data = result.data;
      } else {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        data = XLSX.utils.sheet_to_json(worksheet);
      }

      setProgress(50);

      const formattedOrders: DFOrderItem[] = data.map((row: any) => ({
        orderId: row['Order ID'] || '',
        orderStatus: row['Order Status'] || '',
        warehouseCode: row['Warehouse Code'] || '',
        orderPlaceDate: row['Order Place Date'] || '',
        requiredShipDate: row['Required Ship Date'] || '',
        shipMethod: row['Ship Method'] || '',
        shipToName: row['Ship To Name'] || '',
        shipToCity: row['Ship To City'] || '',
        shipToState: row['Ship To State'] || '',
        shipToCountry: row['Ship To Country or Region'] || '',
        sku: row['SKU'] || '',
        asin: row['ASIN'] || '',
        itemTitle: row['Item Title'] || '',
        itemQuantity: parseInt(row['Item Quantity']) || 1,
        itemCost: row['Item Cost'] || '',
        sourceFile: file.name,
      })).filter(o => o.orderId);

      setProgress(70);

      // Save to DB
      const { data: { user } } = await supabase.auth.getUser();
      if (user && formattedOrders.length > 0) {
        const orderIds = formattedOrders.map(o => o.orderId);
        const { data: existing } = await supabase
          .from('order_imports')
          .select('order_id')
          .eq('user_id', user.id)
          .in('order_id', orderIds);

        const existingIds = new Set((existing || []).map((o: any) => o.order_id));
        const newOrders = formattedOrders.filter(o => !existingIds.has(o.orderId));

        if (newOrders.length > 0) {
          const records = newOrders.map(order => ({
            user_id: user.id,
            order_id: order.orderId,
            order_status: order.orderStatus,
            warehouse_code: order.warehouseCode,
            order_place_date: order.orderPlaceDate,
            required_ship_date: order.requiredShipDate,
            ship_method: order.shipMethod,
            ship_to_name: order.shipToName,
            ship_to_city: order.shipToCity,
            ship_to_state: order.shipToState,
            ship_to_country: order.shipToCountry,
            sku: order.sku,
            asin: order.asin,
            item_title: order.itemTitle,
            item_quantity: order.itemQuantity,
            item_cost: order.itemCost,
            source_file: file.name,
          }));

          const batchSize = 500;
          for (let i = 0; i < records.length; i += batchSize) {
            await supabase.from('order_imports').insert(records.slice(i, i + batchSize));
          }
        }
      }

      setProgress(100);
      setOrders(formattedOrders);

      toast({
        title: 'Upload Complete',
        description: `Parsed ${formattedOrders.length} orders from ${file.name}`,
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({ title: 'Upload Error', description: error.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => files[0] && parseFile(files[0]),
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 1,
    disabled: uploading,
  });

  if (orders.length === 0) {
    return (
      <Card className="border-dashed border-2 border-muted-foreground/20">
        <CardContent className="p-8">
          <div
            {...getRootProps()}
            className={`flex flex-col items-center justify-center gap-4 py-12 cursor-pointer rounded-lg transition-colors ${
              isDragActive ? 'bg-primary/5' : 'hover:bg-muted/50'
            }`}
          >
            <input {...getInputProps()} />
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Upload className="w-8 h-8 text-primary" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-lg font-medium">Drop your orders file here</p>
              <p className="text-sm text-muted-foreground">CSV or XLSX — Amazon DF format</p>
            </div>
            {uploading && (
              <div className="w-full max-w-xs space-y-2">
                <Progress value={progress} />
                <p className="text-xs text-center text-muted-foreground">Processing {fileName}...</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="w-5 h-5 text-primary" />
              <div>
                <CardTitle className="text-base">{fileName}</CardTitle>
                <CardDescription>{orders.length} orders loaded</CardDescription>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => { setOrders([]); setFileName(''); }}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Preview table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Preview (first 10 rows)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-2 font-medium">Order ID</th>
                  <th className="text-left p-2 font-medium">SKU</th>
                  <th className="text-left p-2 font-medium">ASIN</th>
                  <th className="text-left p-2 font-medium">Title</th>
                  <th className="text-center p-2 font-medium">Qty</th>
                  <th className="text-left p-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 10).map((order, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-2 font-mono text-xs">{order.orderId}</td>
                    <td className="p-2 font-mono text-xs">{order.sku || '—'}</td>
                    <td className="p-2 font-mono text-xs">{order.asin || '—'}</td>
                    <td className="p-2 max-w-[200px] truncate">{order.itemTitle || '—'}</td>
                    <td className="p-2 text-center">{order.itemQuantity}</td>
                    <td className="p-2 text-xs text-muted-foreground">{order.orderPlaceDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => onComplete(orders)} className="gap-2">
          Continue to Source Matching <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
