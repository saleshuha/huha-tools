import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileSpreadsheet, CheckCircle, XCircle } from 'lucide-react';
import { CreateOrder } from '@/types/amazon-fulfillment';
import { useCountry } from '@/contexts/CountryContext';
import * as XLSX from 'xlsx';

interface ImportOrdersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportOrders: (orders: CreateOrder[], clearOldData?: boolean) => Promise<any>;
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

      // Build normalized header index map
      const rawHeaders = jsonData[0] as string[];
      const headerMap = new Map<string, number>();
      
      rawHeaders.forEach((header, index) => {
        if (header) {
          const normalized = header.toString().toLowerCase().trim().replace(/\s+/g, '_');
          headerMap.set(normalized, index);
        }
      });

      console.log('Header mapping:', Object.fromEntries(headerMap));
      
      const rows = jsonData.slice(1) as any[][];
      
      const parsedOrders: CreateOrder[] = rows.map((row, index) => {
        const getValue = (synonyms: string[]): any => {
          for (const synonym of synonyms) {
            const idx = headerMap.get(synonym);
            if (idx !== undefined && row[idx] !== undefined && row[idx] !== null && row[idx] !== '') {
              return row[idx];
            }
          }
          return null;
        };

        // KSA-specific header mapping with exact names
        const getKSAValue = (exactHeader: string, synonyms: string[] = []): any => {
          // First try exact header match
          const exactIdx = headerMap.get(exactHeader.toLowerCase().replace(/\s+/g, '_'));
          if (exactIdx !== undefined && row[exactIdx] !== undefined && row[exactIdx] !== null && row[exactIdx] !== '') {
            return row[exactIdx];
          }
          
          // Then try synonyms
          return getValue(synonyms);
        };

        // Parse cost with currency detection
        const costValue = getKSAValue('item_cost', ['cost', 'price', 'amount', 'total', 'value', 'unit_cost', 'unit_price']);
        const { amount, currency } = parseAmountCurrency(costValue, selectedCountry);
        
        // Parse dates
        const parseDate = (dateValue: any): string | undefined => {
          if (!dateValue) return undefined;
          try {
            const date = new Date(dateValue);
            return isNaN(date.getTime()) ? undefined : date.toISOString().split('T')[0];
          } catch {
            return undefined;
          }
        };

        const order: CreateOrder = {
          order_id: getKSAValue('order_id', ['orderid', 'order_number']) || `ORDER_${Date.now()}_${index}`,
          invoice_id: getKSAValue('invoice_id', ['invoiceid', 'invoice_number']) || '',
          shipment_date: parseDate(getKSAValue('shipment_date', ['ship_date', 'shipped_date'])),
          invoice_date: parseDate(getKSAValue('invoice_date', ['inv_date'])),
          vat_id: getKSAValue('vat_id', ['vat']) || '',
          asin: getKSAValue('asin') || '',
          sku: getKSAValue('sku') || '',
          item_title: getKSAValue('item_title', ['title', 'product_name', 'product_title', 'name']) || '',
          quantity: parseInt(getKSAValue('quantity', ['qty', 'count'])) || 1,
          item_cost: amount,
          tax_rate: parseFloat(getKSAValue('tax_rate', ['tax', 'vat_rate'])) || 0,
          warehouse_code: getKSAValue('warehouse_code', ['warehouse']) || '',
          status: getKSAValue('status') || 'Non Submitted',
          currency: currency,
          country: selectedCountry,
          payment_status: 'pending',
        };

        console.log(`Row ${index + 1} parsed:`, order);
        return order;
      }).filter(order => order.order_id);

      console.log('Parsed orders:', parsedOrders);
      setPreview(parsedOrders);
      setProgress(100);
    } catch (error: any) {
      setError(`Error parsing file: ${error.message}`);
      setProgress(0);
    }
  };

  const parseAmountCurrency = (raw: unknown, selectedCountry: 'UAE' | 'KSA'): { amount: number; currency: string } => {
    if (raw === null || raw === undefined || raw === '') return { amount: 0, currency: 'USD' };
    
    console.log(`parseAmountCurrency - Raw input: "${raw}"`);

    // If Excel gave us a numeric cell, use USD as neutral default
    if (typeof raw === 'number') {
      console.log(`parseAmountCurrency - Numeric value: ${raw}, using USD`);
      return { amount: raw, currency: 'USD' };
    }

    const s = String(raw).trim();
    if (!s) return { amount: 0, currency: 'USD' };

    // Enhanced currency detection patterns
    // Handles: "$6.40", "USD6.40", "AED19.56", "SAR25.00", "6.40 USD", "19.56AED", etc.
    const patterns = [
      /^\s*\$\s*([0-9][0-9,]*(?:\.[0-9]+)?)\s*$/i, // $6.40
      /^\s*(USD|AED|SAR)\s*([0-9][0-9,]*(?:\.[0-9]+)?)\s*$/i, // USD6.40, AED19.56
      /^\s*([0-9][0-9,]*(?:\.[0-9]+)?)\s*(USD|AED|SAR)\s*$/i, // 6.40 USD, 19.56AED
      /^\s*([0-9][0-9,]*(?:\.[0-9]+)?)\s*$/i // Plain number
    ];

    for (const pattern of patterns) {
      const match = s.match(pattern);
      if (match) {
        let amount: number;
        let currency: string;

        if (pattern === patterns[0]) { // Dollar pattern
          amount = parseFloat(match[1].replace(/,/g, ''));
          currency = 'USD';
        } else if (pattern === patterns[1]) { // Currency prefix
          currency = match[1].toUpperCase();
          amount = parseFloat(match[2].replace(/,/g, ''));
        } else if (pattern === patterns[2]) { // Currency suffix
          amount = parseFloat(match[1].replace(/,/g, ''));
          currency = match[2].toUpperCase();
        } else { // Plain number
          amount = parseFloat(match[1].replace(/,/g, ''));
          currency = 'USD'; // Default to USD for plain numbers
        }

        const numericValue = isNaN(amount) ? 0 : amount;
        console.log(`parseAmountCurrency - Detected: ${numericValue} ${currency}`);
        return { amount: numericValue, currency };
      }
    }
    
    // Default currency based on country if no currency detected
    const defaultCurrency = selectedCountry === 'UAE' ? 'AED' : selectedCountry === 'KSA' ? 'SAR' : 'USD';
    
    console.log(`parseAmountCurrency - No pattern matched, using default: ${defaultCurrency}`);
    
    return { 
      amount: 0, 
      currency: defaultCurrency
    };
  };

  const handleImport = async () => {
    if (preview.length === 0) return;
    
    try {
      // Import new orders (will be added to existing data via upsert)
      await onImportOrders(preview, false); // Pass false to keep existing data
      setFile(null);
      setPreview([]);
      setProgress(0);
      onOpenChange(false);
    } catch (error) {
      console.error('Import failed:', error);
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
                        <td className="p-2">{(order.item_cost || 0).toFixed(2)} {order.currency || 'USD'}</td>
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
                  Expected columns: Order ID, Invoice ID, Shipment date, Invoice date, VAT ID, ASIN, SKU, Item Title, Quantity, Item Cost, Tax Rate, Warehouse Code, Status. Costs will be stored as-is from the file. Importing will clear all existing data for {selectedCountry}.
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