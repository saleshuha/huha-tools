import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, FileSpreadsheet, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

interface Props {
  selectedYear: number;
  selectedMonth: number;
  country: string;
  onUpload: (rows: { asin: string; sku?: string; title?: string; shipped_qty: number }[], year: number, month: number, country: string) => Promise<void>;
  isLocked: boolean;
}

const MONTH_NAMES = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Parse file into raw 2D array (no headers applied) */
const parseFileRaw = (file: File): Promise<string[][]> => {
  const fileName = file.name.toLowerCase();
  const isCSV = fileName.endsWith('.csv') || file.type.includes('csv');

  return new Promise((resolve, reject) => {
    if (isCSV) {
      Papa.parse(file, {
        header: false,
        skipEmptyLines: true,
        complete: (results) => resolve((results.data as string[][]).filter(r => r.some(c => c?.toString().trim()))),
        error: (err) => reject(new Error(err.message)),
      });
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const wb = XLSX.read(data, { type: 'array', raw: false });
          const sheet = wb.Sheets[wb.SheetNames[0]];
          const rows: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false, blankrows: false });
          resolve(rows.filter(r => r.some(c => c?.toString().trim())));
        } catch (err: any) {
          reject(new Error(err.message));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    }
  });
};

/** Apply header row to raw data, returning objects */
const applyHeaderRow = (rawRows: string[][], headerRowIndex: number): { headers: string[]; data: Record<string, string>[] } => {
  if (headerRowIndex >= rawRows.length) return { headers: [], data: [] };
  const headers = rawRows[headerRowIndex].map(h => (h ?? '').toString().trim()).filter(Boolean);
  const dataRows = rawRows.slice(headerRowIndex + 1);
  const data = dataRows.map(row => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = (row[i] ?? '').toString(); });
    return obj;
  }).filter(obj => Object.values(obj).some(v => v.trim()));
  return { headers, data };
};

export function MonthlyUploadPanel({ selectedYear, selectedMonth, country, onUpload, isLocked }: Props) {
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [headerRow, setHeaderRow] = useState(0);
  const [asinCol, setAsinCol] = useState('');
  const [skuCol, setSkuCol] = useState('');
  const [titleCol, setTitleCol] = useState('');
  const [qtyCol, setQtyCol] = useState('');
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState('');
  const { toast } = useToast();

  const autoDetectColumns = (cols: string[]) => {
    const lower = cols.map(c => c.toLowerCase());
    const asinIdx = lower.findIndex(c => c.includes('asin'));
    const skuIdx = lower.findIndex(c => c.includes('sku') || c.includes('seller-sku'));
    const titleIdx = lower.findIndex(c => c.includes('title') || c.includes('product'));
    const qtyIdx = lower.findIndex(c => c.includes('ship') || c.includes('qty') || c.includes('quantity') || c.includes('units'));
    setAsinCol(asinIdx >= 0 ? cols[asinIdx] : '');
    setSkuCol(skuIdx >= 0 ? cols[skuIdx] : '');
    setTitleCol(titleIdx >= 0 ? cols[titleIdx] : '');
    setQtyCol(qtyIdx >= 0 ? cols[qtyIdx] : '');
  };

  const applyHeader = useCallback((rows: string[][], rowIdx: number) => {
    const { headers: cols, data } = applyHeaderRow(rows, rowIdx);
    setHeaders(cols);
    setParsedRows(data);
    autoDetectColumns(cols);
  }, []);

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    try {
      const rows = await parseFileRaw(file);
      if (rows.length === 0) {
        toast({ title: 'Empty file', variant: 'destructive' });
        return;
      }
      setRawRows(rows);
      setHeaderRow(0);
      applyHeader(rows, 0);
    } catch (err: any) {
      toast({ title: 'Parse error', description: err.message, variant: 'destructive' });
    }
  }, [toast, applyHeader]);

  const handleHeaderRowChange = (val: string) => {
    const idx = parseInt(val);
    setHeaderRow(idx);
    applyHeader(rawRows, idx);
  };

  const mappedRows = parsedRows.map(r => ({
    asin: String(r[asinCol] || '').trim(),
    sku: skuCol ? String(r[skuCol] || '').trim() : undefined,
    title: titleCol ? String(r[titleCol] || '').trim() : undefined,
    shipped_qty: parseInt(String(r[qtyCol] || '0').replace(/,/g, '')) || 0,
  })).filter(r => r.asin && r.shipped_qty >= 0);

  const handleUpload = async () => {
    if (!asinCol || !qtyCol) {
      toast({ title: 'Map ASIN and Shipped Qty columns', variant: 'destructive' });
      return;
    }
    if (mappedRows.length === 0) {
      toast({ title: 'No valid rows', variant: 'destructive' });
      return;
    }
    setUploading(true);
    try {
      await onUpload(mappedRows, selectedYear, selectedMonth, country);
      setParsedRows([]);
      setHeaders([]);
      setFileName('');
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  if (isLocked) {
    return (
      <Card className="border border-green-300 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
        <CardContent className="p-6 text-center">
          <Check className="h-8 w-8 mx-auto text-green-600 mb-2" />
          <p className="text-sm font-medium text-foreground">
            Data for {MONTH_NAMES[selectedMonth]} {selectedYear} ({country}) is uploaded & locked
          </p>
          <p className="text-xs text-muted-foreground mt-1">Unlock from the calendar to re-upload</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Upload className="h-4 w-4" />
          Upload Data — {MONTH_NAMES[selectedMonth]} {selectedYear} ({country})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* File input + header row */}
        <div className="flex items-center gap-3 flex-wrap">
          <Input type="file" accept=".csv,.xlsx,.xls" onChange={handleFile} className="max-w-xs" />
          {fileName && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <FileSpreadsheet className="h-3 w-3" /> {fileName}
            </span>
          )}
          {rawRows.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-foreground whitespace-nowrap">Header Row:</label>
              <Select value={String(headerRow)} onValueChange={handleHeaderRowChange}>
                <SelectTrigger className="h-8 w-24 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {rawRows.slice(0, Math.min(20, rawRows.length)).map((row, i) => (
                    <SelectItem key={i} value={String(i)}>Row {i + 1}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                {rawRows[headerRow]?.slice(0, 3).join(', ')}…
              </span>
            </div>
          )}
        </div>

        {/* Column mapping */}
        {headers.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">ASIN Column *</label>
              <Select value={asinCol} onValueChange={setAsinCol}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">Shipped Qty Column *</label>
              <Select value={qtyCol} onValueChange={setQtyCol}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">SKU Column</label>
              <Select value={skuCol} onValueChange={setSkuCol}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent><SelectItem value="__none__">None</SelectItem>{headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">Title Column</label>
              <Select value={titleCol} onValueChange={setTitleCol}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent><SelectItem value="__none__">None</SelectItem>{headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Preview */}
        {mappedRows.length > 0 && (
          <>
            <div className="text-xs text-muted-foreground">{mappedRows.length} rows ready • Total shipped: {mappedRows.reduce((s, r) => s + r.shipped_qty, 0).toLocaleString()}</div>
            <div className="max-h-48 overflow-auto border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">ASIN</TableHead>
                    <TableHead className="text-xs">SKU</TableHead>
                    <TableHead className="text-xs">Title</TableHead>
                    <TableHead className="text-xs text-right">Shipped Qty</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mappedRows.slice(0, 20).map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs font-mono">{r.asin}</TableCell>
                      <TableCell className="text-xs">{r.sku || '-'}</TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate">{r.title || '-'}</TableCell>
                      <TableCell className="text-xs text-right">{r.shipped_qty}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {mappedRows.length > 20 && <p className="text-xs text-muted-foreground">Showing 20 of {mappedRows.length} rows</p>}
            <Button onClick={handleUpload} disabled={uploading} className="w-full">
              {uploading ? 'Uploading...' : `Upload ${mappedRows.length} ASINs & Lock Month`}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
