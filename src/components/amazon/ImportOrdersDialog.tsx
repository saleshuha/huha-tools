import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileSpreadsheet, CheckCircle, XCircle } from 'lucide-react';
import { CreateOrder } from '@/types/amazon-fulfillment';
import { useCountry } from '@/contexts/CountryContext';
import * as XLSX from 'xlsx';

interface ImportOrdersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportOrders: (orders: CreateOrder[]) => Promise<any>;
  loading: boolean;
}

export const ImportOrdersDialog = ({ open, onOpenChange, onImportOrders, loading }: ImportOrdersDialogProps) => {
  const { selectedCountry } = useCountry();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<CreateOrder[]>([]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.match(/\.(xlsx|xls|csv)$/i)) {
      setError('Please select an Excel (.xlsx, .xls) or CSV file');
      return;
    }

    setFile(selectedFile);
    setError(null);
    parseFile(selectedFile);
  };

  const parseFile = async (file: File) => {
    try {
      setProgress(25);
      const arrayBuffer = await file.arrayBuffer();
      setProgress(50);
      
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      setProgress(75);
      
      if (jsonData.length < 2) {
        throw new Error('File must contain at least a header row and one data row');
      }

      const headers = (jsonData[0] as string[]).map(h => h?.toString().toLowerCase().trim());
      const rows = jsonData.slice(1) as any[][];

      const parsedOrders: CreateOrder[] = rows.map((row, index) => {
        console.log(`=== PROCESSING ROW ${index} ===`);
        console.log('Row data:', row);
        console.log('Headers:', headers);
        
        const costValue = getCellValue(row, headers, ['item_cost', 'cost', 'price', 'amount', 'total', 'value']);
        console.log(`Raw cost value for row ${index}:`, costValue, 'Type:', typeof costValue);
        
        const parsedCost = parseCostValue(costValue);
        console.log(`Final parsed cost for row ${index}:`, parsedCost);
        
        const order: CreateOrder = {
          order_id: getCellValue(row, headers, ['order_id', 'order id', 'orderid']) || `ORDER_${Date.now()}_${index}`,
          invoice_id: getCellValue(row, headers, ['invoice_id', 'invoice id', 'invoiceid']),
          asin: getCellValue(row, headers, ['asin']),
          sku: getCellValue(row, headers, ['sku']),
          item_title: getCellValue(row, headers, ['item_title', 'item title', 'title', 'product_name']),
          quantity: parseInt(getCellValue(row, headers, ['quantity', 'qty'])) || 1,
          item_cost: parsedCost,
          currency: getCellValue(row, headers, ['currency']) || 'USD',
          status: getCellValue(row, headers, ['status']) || 'Non Submitted',
          payment_status: getCellValue(row, headers, ['payment_status', 'payment status']) || 'pending',
          country: selectedCountry,
        };

        console.log(`Final order object for row ${index}:`, order);

        // Add optional fields if they exist
        const warehouseCode = getCellValue(row, headers, ['warehouse_code', 'warehouse']);
        if (warehouseCode) order.warehouse_code = warehouseCode;

        const vatId = getCellValue(row, headers, ['vat_id', 'vat']);
        if (vatId) order.vat_id = vatId;

        const paymentNotes = getCellValue(row, headers, ['payment_notes', 'notes']);
        if (paymentNotes) order.payment_notes = paymentNotes;

        return order;
      }).filter(order => order.order_id); // Filter out rows without order IDs

      setPreview(parsedOrders);
      setProgress(100);
    } catch (error: any) {
      setError(`Error parsing file: ${error.message}`);
      setProgress(0);
    }
  };

  const getCellValue = (row: any[], headers: string[], possibleNames: string[]): string => {
    for (const name of possibleNames) {
      const index = headers.indexOf(name);
      if (index !== -1 && row[index] !== undefined && row[index] !== null) {
        const value = row[index].toString().trim();
        console.log(`Found column "${name}" at index ${index} with value:`, row[index], 'cleaned:', value);
        return value;
      }
    }
    console.log(`No matching column found for:`, possibleNames, 'in headers:', headers);
    return '';
  };

  const parseCostValue = (value: any): number => {
    if (!value && value !== 0) return 0;
    
    // Convert to string and remove any whitespace
    let cleanValue = String(value).trim();
    
    if (!cleanValue || cleanValue === '' || cleanValue === 'null' || cleanValue === 'undefined') return 0;
    
    console.log('COST PARSING - Original value:', value, 'Type:', typeof value, 'Clean value:', cleanValue);
    
    // If it's already a number, return it
    if (typeof value === 'number') {
      console.log('Already a number:', value);
      return value;
    }
    
    // Just parse as a simple number (no currency symbols expected)
    const numericValue = parseFloat(cleanValue);
    console.log('Parsed numeric value:', numericValue);
    
    return isNaN(numericValue) ? 0 : numericValue;
  };

  const handleImport = async () => {
    if (preview.length === 0) return;
    
    try {
      await onImportOrders(preview);
      setFile(null);
      setPreview([]);
      setProgress(0);
      onOpenChange(false);
    } catch (error) {
      setError('Failed to import orders. Please try again.');
    }
  };

  const reset = () => {
    setFile(null);
    setPreview([]);
    setProgress(0);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => { onOpenChange(open); if (!open) reset(); }}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Orders from Excel/CSV</DialogTitle>
          <DialogDescription>
            Upload an Excel or CSV file containing order data for {selectedCountry}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* File Upload Section */}
          <div className="space-y-4">
            <Label htmlFor="file-upload">Select File</Label>
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
              <div className="text-center">
                <FileSpreadsheet className="mx-auto h-12 w-12 text-muted-foreground" />
                <div className="mt-4">
                  <Label htmlFor="file-upload" className="cursor-pointer">
                    <span className="mt-2 block text-sm font-medium">
                      Choose Excel or CSV file
                    </span>
                  </Label>
                  <Input
                    id="file-upload"
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Supports .xlsx, .xls, and .csv files
                </p>
              </div>
            </div>
            
            {file && (
              <div className="flex items-center gap-2 text-sm">
                <FileSpreadsheet className="h-4 w-4" />
                <span>{file.name}</span>
                <span className="text-muted-foreground">({Math.round(file.size / 1024)} KB)</span>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          {progress > 0 && progress < 100 && (
            <div className="space-y-2">
              <Label>Processing file...</Label>
              <Progress value={progress} className="w-full" />
            </div>
          )}

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Preview Section */}
          {preview.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <Label>Preview ({preview.length} orders found)</Label>
              </div>
              
              <div className="max-h-40 overflow-y-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-2">Order ID</th>
                      <th className="text-left p-2">ASIN</th>
                      <th className="text-left p-2">Title</th>
                      <th className="text-left p-2">Qty</th>
                      <th className="text-left p-2">Cost</th>
                      <th className="text-left p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(0, 5).map((order, index) => (
                      <tr key={index} className="border-b">
                        <td className="p-2">{order.order_id}</td>
                        <td className="p-2">{order.asin || '-'}</td>
                        <td className="p-2">{order.item_title || '-'}</td>
                        <td className="p-2">{order.quantity}</td>
                        <td className="p-2">{order.currency} {order.item_cost}</td>
                        <td className="p-2">{order.status}</td>
                      </tr>
                    ))}
                    {preview.length > 5 && (
                      <tr>
                        <td colSpan={6} className="p-2 text-center text-muted-foreground">
                          ... and {preview.length - 5} more rows
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <Alert>
                <Upload className="h-4 w-4" />
                <AlertDescription>
                  Expected columns: order_id (required), invoice_id, asin, sku, item_title, quantity, item_cost/cost/price (numeric only), currency (AED/USD/SAR), status, payment_status
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleImport} 
              disabled={loading || preview.length === 0}
            >
              {loading ? 'Importing...' : `Import ${preview.length} Orders`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};