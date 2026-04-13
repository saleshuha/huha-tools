import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileSpreadsheet, CheckCircle, XCircle, Trash2 } from 'lucide-react';
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
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<CreateOrder[]>([]);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [parsing, setParsing] = useState(false);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    const fileArray = Array.from(selectedFiles);
    const invalidFiles = fileArray.filter(f => !f.name.match(/\.(xlsx|xls|csv)$/i));
    if (invalidFiles.length > 0) {
      setError(`Invalid files: ${invalidFiles.map(f => f.name).join(', ')}. Only .xlsx, .xls, .csv allowed.`);
      return;
    }

    setFiles(fileArray);
    setError(null);
    setParsing(true);
    await parseAllFiles(fileArray);
    setParsing(false);
  };

  const parseAllFiles = async (fileList: File[]) => {
    try {
      setProgress(10);
      const allOrders: CreateOrder[] = [];

      for (let fi = 0; fi < fileList.length; fi++) {
        const file = fileList[fi];
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (jsonData.length < 2) continue;

        const rawHeaders = jsonData[0] as string[];
        const headerMap = new Map<string, number>();
        rawHeaders.forEach((header, index) => {
          if (header) {
            const normalized = header.toString().toLowerCase().trim().replace(/\s+/g, '_');
            headerMap.set(normalized, index);
          }
        });

        const rows = jsonData.slice(1) as any[][];

        const parsed = rows.map((row, index) => {
          const getValue = (synonyms: string[]): any => {
            for (const synonym of synonyms) {
              const idx = headerMap.get(synonym);
              if (idx !== undefined && row[idx] !== undefined && row[idx] !== null && row[idx] !== '') {
                return row[idx];
              }
            }
            return null;
          };

          const getKSAValue = (exactHeader: string, synonyms: string[] = []): any => {
            const exactIdx = headerMap.get(exactHeader.toLowerCase().replace(/\s+/g, '_'));
            if (exactIdx !== undefined && row[exactIdx] !== undefined && row[exactIdx] !== null && row[exactIdx] !== '') {
              return row[exactIdx];
            }
            return getValue(synonyms);
          };

          const costValue = getKSAValue('item_cost', ['cost', 'price', 'amount', 'total', 'value', 'unit_cost', 'unit_price']);
          const { amount, currency } = parseAmountCurrency(costValue, selectedCountry);

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
            order_id: getKSAValue('order_id', ['orderid', 'order_number']) || `ORDER_${Date.now()}_${fi}_${index}`,
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
          return order;
        }).filter(order => order.order_id);

        allOrders.push(...parsed);
        setProgress(10 + Math.round(((fi + 1) / fileList.length) * 80));
      }

      // Deduplicate by order_id — keep last occurrence
      const dedupMap = new Map<string, CreateOrder>();
      for (const order of allOrders) {
        dedupMap.set(order.order_id, order);
      }
      const uniqueOrders = Array.from(dedupMap.values());
      const dupes = allOrders.length - uniqueOrders.length;

      setDuplicateCount(dupes);
      setPreview(uniqueOrders);
      setProgress(100);
    } catch (error: any) {
      setError(`Error parsing files: ${error.message}`);
      setProgress(0);
    }
  };

  const parseAmountCurrency = (raw: unknown, country: 'UAE' | 'KSA'): { amount: number; currency: string } => {
    if (raw === null || raw === undefined || raw === '') return { amount: 0, currency: 'USD' };
    if (typeof raw === 'number') return { amount: raw, currency: 'USD' };

    const s = String(raw).trim();
    if (!s) return { amount: 0, currency: 'USD' };

    const patterns = [
      /^\s*\$\s*([0-9][0-9,]*(?:\.[0-9]+)?)\s*$/i,
      /^\s*(USD|AED|SAR)\s*([0-9][0-9,]*(?:\.[0-9]+)?)\s*$/i,
      /^\s*([0-9][0-9,]*(?:\.[0-9]+)?)\s*(USD|AED|SAR)\s*$/i,
      /^\s*([0-9][0-9,]*(?:\.[0-9]+)?)\s*$/i,
    ];

    for (const pattern of patterns) {
      const match = s.match(pattern);
      if (match) {
        let amount: number;
        let currency: string;
        if (pattern === patterns[0]) {
          amount = parseFloat(match[1].replace(/,/g, '')); currency = 'USD';
        } else if (pattern === patterns[1]) {
          currency = match[1].toUpperCase(); amount = parseFloat(match[2].replace(/,/g, ''));
        } else if (pattern === patterns[2]) {
          amount = parseFloat(match[1].replace(/,/g, '')); currency = match[2].toUpperCase();
        } else {
          amount = parseFloat(match[1].replace(/,/g, '')); currency = 'USD';
        }
        return { amount: isNaN(amount) ? 0 : amount, currency };
      }
    }

    const defaultCurrency = country === 'UAE' ? 'AED' : country === 'KSA' ? 'SAR' : 'USD';
    return { amount: 0, currency: defaultCurrency };
  };

  const handleImport = async () => {
    if (preview.length === 0) return;
    try {
      await onImportOrders(preview, false);
      reset();
      onOpenChange(false);
    } catch (error) {
      console.error('Import failed:', error);
    }
  };

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
    if (newFiles.length === 0) {
      setPreview([]);
      setProgress(0);
      setDuplicateCount(0);
    } else {
      parseAllFiles(newFiles);
    }
  };

  const reset = () => {
    setFiles([]);
    setPreview([]);
    setProgress(0);
    setError(null);
    setDuplicateCount(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Orders from Excel/CSV</DialogTitle>
          <DialogDescription>
            Upload one or more Excel/CSV files containing order data for {selectedCountry}. Duplicates across files will be removed automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* File Upload */}
          <div className="space-y-4">
            <Label htmlFor="file-upload">Select Files</Label>
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
              <div className="text-center">
                <FileSpreadsheet className="mx-auto h-12 w-12 text-muted-foreground" />
                <div className="mt-4">
                  <Label htmlFor="file-upload" className="cursor-pointer">
                    <span className="mt-2 block text-sm font-medium">Choose Excel or CSV files</span>
                  </Label>
                  <Input
                    id="file-upload"
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Supports .xlsx, .xls, and .csv — select multiple files at once
                </p>
              </div>
            </div>

            {/* File list */}
            {files.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">{files.length} file(s) selected</Label>
                {files.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm bg-muted/50 rounded px-2 py-1">
                    <FileSpreadsheet className="h-4 w-4 shrink-0" />
                    <span className="truncate flex-1">{f.name}</span>
                    <span className="text-muted-foreground text-xs">({Math.round(f.size / 1024)} KB)</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeFile(i)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Progress */}
          {parsing && progress > 0 && progress < 100 && (
            <div className="space-y-2">
              <Label>Processing files...</Label>
              <Progress value={progress} className="w-full" />
            </div>
          )}

          {/* Error */}
          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Preview */}
          {preview.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <Label>
                  {preview.length} unique orders from {files.length} file(s)
                  {duplicateCount > 0 && (
                    <span className="text-amber-500 ml-1">({duplicateCount} duplicates removed)</span>
                  )}
                </Label>
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
                  Expected columns: Order ID, Invoice ID, Shipment date, Invoice date, VAT ID, ASIN, SKU, Item Title, Quantity, Item Cost, Tax Rate, Warehouse Code, Status.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleImport} disabled={loading || preview.length === 0}>
              {loading ? 'Importing...' : `Import ${preview.length} Orders`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
