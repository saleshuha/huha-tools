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
import { useCurrencyConverter } from '@/hooks/useCurrencyConverter';
import * as XLSX from 'xlsx';

interface ImportOrdersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportOrders: (orders: CreateOrder[]) => Promise<any>;
  loading: boolean;
}

export const ImportOrdersDialog = ({ open, onOpenChange, onImportOrders, loading }: ImportOrdersDialogProps) => {
  const { selectedCountry } = useCountry();
  const { convertCurrency, formatCurrency, exchangeRates, loading: currencyLoading } = useCurrencyConverter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<CreateOrder[]>([]);
  const [viewingCurrency, setViewingCurrency] = useState<'USD' | 'AED' | 'SAR'>(
    selectedCountry === 'UAE' ? 'AED' : selectedCountry === 'KSA' ? 'SAR' : 'USD'
  );

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

        // Parse cost with all possible synonyms
        const costValue = getValue(['item_cost', 'cost', 'price', 'amount', 'total', 'value', 'unit_cost', 'unit_price']);
        const currencyValue = getValue(['currency', 'curr']);
        
        console.log(`Row ${index} - Raw cost: ${costValue}, Currency column: ${currencyValue}`);
        
        const { amount, currency } = parseAmountCurrency(costValue, selectedCountry, currencyValue);
        
        console.log(`Row ${index} - Parsed: ${amount} ${currency}, Converting to: ${viewingCurrency}`);
        console.log(`Row ${index} - Exchange rates available:`, exchangeRates);
        console.log(`Row ${index} - Currency converter loading:`, currencyLoading);
        
        let convertedCost = amount;
        if (currency !== viewingCurrency) {
          console.log(`Row ${index} - Calling convertCurrency(${amount}, "${currency}", "${viewingCurrency}")`);
          convertedCost = convertCurrency(amount, currency, viewingCurrency);
          console.log(`Row ${index} - Conversion result: ${convertedCost}`);
        } else {
          console.log(`Row ${index} - No conversion needed, currencies match`);
        }
        
        console.log(`Row ${index} - Final cost: ${convertedCost} ${viewingCurrency}`);
        
        const order: CreateOrder = {
          order_id: getValue(['order_id', 'order_id', 'orderid', 'order_number']) || `ORDER_${Date.now()}_${index}`,
          invoice_id: getValue(['invoice_id', 'invoice_id', 'invoiceid', 'invoice_number']) || '',
          asin: getValue(['asin']) || '',
          sku: getValue(['sku']) || '',
          item_title: getValue(['item_title', 'item_title', 'title', 'product_name', 'product_title', 'name']) || '',
          quantity: parseInt(getValue(['quantity', 'qty', 'amount', 'count'])) || 1,
          item_cost: convertedCost,
          currency: viewingCurrency,
          status: getValue(['status']) || 'Non Submitted',
          payment_status: getValue(['payment_status', 'payment_status']) || 'pending',
          country: selectedCountry,
        };

        // Add optional fields
        const warehouseCode = getValue(['warehouse_code', 'warehouse']);
        if (warehouseCode) order.warehouse_code = warehouseCode;

        const vatId = getValue(['vat_id', 'vat']);
        if (vatId) order.vat_id = vatId;

        const paymentNotes = getValue(['payment_notes', 'notes']);
        if (paymentNotes) order.payment_notes = paymentNotes;

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

  const parseAmountCurrency = (raw: unknown, selectedCountry: 'UAE' | 'KSA', currencyFromColumn?: string): { amount: number; currency: string } => {
    if (raw === null || raw === undefined || raw === '') return { amount: 0, currency: 'USD' };
    
    console.log(`parseAmountCurrency - Raw input: "${raw}", currencyFromColumn: "${currencyFromColumn}"`);

    // If Excel gave us a numeric cell, don't default to country currency - use USD as neutral default
    if (typeof raw === 'number') {
      const detectedCurrency = currencyFromColumn ? currencyFromColumn.toUpperCase() : 'USD';
      console.log(`parseAmountCurrency - Numeric value: ${raw}, using currency: ${detectedCurrency}`);
      return { amount: raw, currency: detectedCurrency };
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
          // For plain numbers, prioritize currency column, then USD as neutral default
          currency = currencyFromColumn ? currencyFromColumn.toUpperCase() : 'USD';
        }

        console.log(`parseAmountCurrency - Detected: ${amount} ${currency}`);
        return { amount, currency };
      }
    }

    console.log(`parseAmountCurrency - No pattern matched, defaulting to USD`);
    return { amount: 0, currency: 'USD' };
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

          {/* Currency Selection - Always visible */}
          <div className="space-y-2">
            <Label htmlFor="viewing-currency">Viewing Currency</Label>
            <Select
              value={viewingCurrency}
              onValueChange={(value: 'USD' | 'AED' | 'SAR') => {
                setViewingCurrency(value);
                if (file) parseFile(file); // Re-parse with new currency
              }}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background border border-border shadow-md z-50">
                <SelectItem value="USD">USD ($)</SelectItem>
                <SelectItem value="AED">AED (د.إ)</SelectItem>
                <SelectItem value="SAR">SAR (ر.س)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              All costs will be converted to this currency for viewing
            </p>
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
                        <td className="p-2">{formatCurrency(order.item_cost || 0, order.currency || 'USD')}</td>
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
                  Expected columns: order_id (required), invoice_id, asin, sku, item_title, quantity, item_cost/cost/price (supports $6.40, AED19.56, SAR25.00 formats), status, payment_status. Costs will be auto-converted to your viewing currency.
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