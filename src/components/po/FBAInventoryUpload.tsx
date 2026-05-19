import React, { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useDropzone } from 'react-dropzone';
import { Upload, Search, Trash2, Package, Hash, FileText, Loader2, Download, Warehouse, Files } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFBAInventory } from '@/hooks/useFBAInventory';
import { FBAInventoryItem } from '@/utils/fbaInventoryStorage';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { CompactStatBar } from '@/components/ui/compact-stat-bar';
import { ToolbarBar, ToolbarSpacer } from '@/components/ui/toolbar-bar';
import { DataTableWrapper, dataTableHeaderClass, dataTableHeadClass, dataTableRowClass, DataTableFooter } from '@/components/ui/data-table-wrapper';

type Mapping = { asin: string; quantity: string; sku: string; fnsku: string; title: string; condition: string };

const FBAInventoryUpload: React.FC = () => {
  const { toast } = useToast();
  const { fbaInventory, files, filesCount, totalItems, totalQuantity, lastModified, isLoading, append, deleteFile, clear } = useFBAInventory();

  const [searchQuery, setSearchQuery] = useState('');
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);
  const [showMappingDialog, setShowMappingDialog] = useState(false);
  const [pendingData, setPendingData] = useState<any[]>([]);
  const [pendingHeaders, setPendingHeaders] = useState<string[]>([]);
  const [pendingFileName, setPendingFileName] = useState<string>('');
  const [columnMapping, setColumnMapping] = useState<Mapping>({
    asin: '', quantity: '', sku: '', fnsku: '', title: '', condition: '',
  });

  const autoDetectMapping = useCallback((headers: string[]): Mapping => {
    const lower = headers.map(h => h.toLowerCase().trim());
    const asinIdx = lower.findIndex(h => h.includes('asin') || h === 'product id');
    const qtyIdx = lower.findIndex(h => h.includes('quantity') || h.includes('qty') || h.includes('afn-fulfillable-quantity') || h.includes('available') || h.includes('instock'));
    const skuIdx = lower.findIndex(h => (h.includes('sku') || h.includes('seller-sku')) && !h.includes('fnsku'));
    const fnskuIdx = lower.findIndex(h => h.includes('fnsku'));
    const titleIdx = lower.findIndex(h => h.includes('title') || h.includes('product-name') || h.includes('name'));
    const condIdx = lower.findIndex(h => h.includes('condition'));
    return {
      asin: asinIdx >= 0 ? headers[asinIdx] : '',
      quantity: qtyIdx >= 0 ? headers[qtyIdx] : '',
      sku: skuIdx >= 0 ? headers[skuIdx] : '',
      fnsku: fnskuIdx >= 0 ? headers[fnskuIdx] : '',
      title: titleIdx >= 0 ? headers[titleIdx] : '',
      condition: condIdx >= 0 ? headers[condIdx] : '',
    };
  }, []);

  const buildItems = (data: any[], mapping: Mapping): FBAInventoryItem[] => {
    const items: FBAInventoryItem[] = [];
    for (const row of data) {
      const asin = String(row[mapping.asin] || '').trim();
      const quantity = parseInt(String(row[mapping.quantity]).replace(/,/g, ''), 10);
      if (asin && !isNaN(quantity) && quantity >= 0) {
        items.push({
          asin,
          quantity,
          sku: mapping.sku ? String(row[mapping.sku] || '').trim() : undefined,
          fnsku: mapping.fnsku ? String(row[mapping.fnsku] || '').trim() : undefined,
          title: mapping.title ? String(row[mapping.title] || '').trim() : undefined,
          condition: mapping.condition ? String(row[mapping.condition] || '').trim() : undefined,
        });
      }
    }
    return items;
  };

  const parseFileRaw = async (file: File): Promise<{ data: any[]; headers: string[] }> => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension === 'csv' || extension === 'txt') {
      const text = await file.text();
      const result = Papa.parse(text, { header: true, skipEmptyLines: true });
      return { headers: result.meta.fields || [], data: result.data as any[] };
    }
    if (extension === 'xlsx' || extension === 'xls') {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
      if (!jsonData.length) return { headers: [], data: [] };
      const headers = jsonData[0].map(String);
      const data = jsonData.slice(1).map(row => {
        const obj: any = {};
        headers.forEach((h, i) => { obj[h] = row[i]; });
        return obj;
      });
      return { headers, data };
    }
    return { headers: [], data: [] };
  };

  const processData = useCallback(async (data: any[], mapping: Mapping, fName: string) => {
    if (!mapping.asin || !mapping.quantity) {
      toast({ title: 'Mapping required', description: 'ASIN and Quantity columns are required.', variant: 'destructive' });
      return;
    }
    const items = buildItems(data, mapping);
    if (items.length === 0) {
      toast({ title: 'No valid data', description: `${fName}: no valid rows found.`, variant: 'destructive' });
      return;
    }
    await append(items, fName);
    toast({ title: 'File imported', description: `${fName}: ${items.length} items (${items.reduce((s, i) => s + i.quantity, 0)} units).` });
  }, [append, toast]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!acceptedFiles.length) return;
    setBatchProgress({ current: 0, total: acceptedFiles.length });
    for (let i = 0; i < acceptedFiles.length; i++) {
      const file = acceptedFiles[i];
      setBatchProgress({ current: i + 1, total: acceptedFiles.length });
      try {
        const { data, headers } = await parseFileRaw(file);
        if (!data.length) {
          toast({ title: 'Empty file', description: `${file.name} contains no data.`, variant: 'destructive' });
          continue;
        }
        const auto = autoDetectMapping(headers);
        if (auto.asin && auto.quantity) {
          await processData(data, auto, file.name);
        } else {
          // Stop batch and ask for mapping for this file
          setPendingHeaders(headers);
          setPendingData(data);
          setPendingFileName(file.name);
          setColumnMapping(auto);
          setShowMappingDialog(true);
          if (i < acceptedFiles.length - 1) {
            toast({ title: 'Mapping needed', description: `Pausing batch. Map columns for ${file.name}, remaining files were skipped.`, variant: 'destructive' });
          }
          break;
        }
      } catch (err) {
        console.error('Error parsing file:', err);
        toast({ title: 'Parse error', description: `Failed to parse ${file.name}.`, variant: 'destructive' });
      }
    }
    setBatchProgress(null);
  }, [autoDetectMapping, processData, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/plain': ['.txt'],
    },
    multiple: true,
  });

  const filteredItems = fbaInventory.filter(item => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.asin?.toLowerCase().includes(q) ||
      item.sku?.toLowerCase().includes(q) ||
      item.fnsku?.toLowerCase().includes(q) ||
      item.title?.toLowerCase().includes(q)
    );
  });

  const handleExport = useCallback(() => {
    if (fbaInventory.length === 0) return;
    const csv = Papa.unparse(fbaInventory);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fba-inventory-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [fbaInventory]);

  const isProcessing = !!batchProgress;

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <Card className="border-dashed border-2 border-border/50 bg-muted/20">
        <CardContent className="p-6">
          <div
            {...getRootProps()}
            className={`flex flex-col items-center justify-center py-8 px-6 rounded-xl cursor-pointer transition-all duration-200 ${
              isDragActive ? 'bg-primary/10 border-primary' : 'hover:bg-muted/50'
            }`}
          >
            <input {...getInputProps()} />
            {isProcessing ? (
              <>
                <Loader2 className="h-10 w-10 text-primary animate-spin mb-2" />
                <p className="text-sm text-muted-foreground">
                  Processing {batchProgress!.current} of {batchProgress!.total}…
                </p>
              </>
            ) : (
              <>
                <Upload className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-base font-medium text-foreground mb-1">
                  {isDragActive ? 'Drop files here' : 'Drop one or more CSV/Excel files here or click to upload'}
                </p>
                <p className="text-xs text-muted-foreground">Multiple files supported · re-uploading a file refreshes its rows</p>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Compact Stat Bar */}
      {totalItems > 0 && (
        <CompactStatBar
          items={[
            { icon: Files, label: 'Files', value: filesCount },
            { icon: Hash, label: 'SKUs', value: totalItems },
            { icon: Warehouse, label: 'Total Units', value: totalQuantity, highlight: true },
            { icon: Package, label: 'Modified', value: lastModified ? format(new Date(lastModified), 'MMM d, HH:mm') : '-' },
          ]}
        />
      )}

      {/* Uploaded Files panel */}
      {filesCount > 0 && (
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Uploaded Files ({filesCount})
              </div>
            </div>
            <div className="rounded-lg border divide-y">
              {files.map(f => (
                <div key={f.fileName} className="flex items-center gap-3 px-3 py-2 text-xs">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="font-medium truncate flex-1" title={f.fileName}>{f.fileName}</span>
                  <Badge variant="secondary" className="font-mono">{f.itemCount.toLocaleString()} SKUs</Badge>
                  <Badge variant="default" className="font-mono">{f.totalQuantity.toLocaleString()} units</Badge>
                  <span className="text-muted-foreground hidden sm:inline w-28 text-right">
                    {f.lastModified ? format(new Date(f.lastModified), 'MMM d, HH:mm') : '-'}
                  </span>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this file?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Remove all {f.itemCount.toLocaleString()} rows from <span className="font-medium">{f.fileName}</span>. Other files stay intact. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteFile(f.fileName)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Delete File
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Toolbar */}
      {totalItems > 0 && (
        <ToolbarBar>
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by ASIN, SKU, FNSKU, or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-8 text-sm rounded-lg"
            />
          </div>
          <ToolbarSpacer />
          <span className="text-xs text-muted-foreground">{filteredItems.length} items</span>
          <Button variant="outline" size="sm" onClick={handleExport} className="h-8 text-xs gap-1.5 rounded-lg">
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="h-8 text-xs gap-1.5 rounded-lg">
                <Trash2 className="h-3.5 w-3.5" />
                Clear All
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear all FBA inventory data?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently deletes all {filesCount} file(s) and {totalItems.toLocaleString()} items. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={clear} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Clear All
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </ToolbarBar>
      )}

      {/* Data Table - Desktop */}
      {totalItems > 0 && (
        <>
          <DataTableWrapper className="hidden md:block">
            <Table>
              <TableHeader className={dataTableHeaderClass}>
                <TableRow>
                  <TableHead className={dataTableHeadClass}>ASIN</TableHead>
                  <TableHead className={dataTableHeadClass}>SKU</TableHead>
                  <TableHead className={dataTableHeadClass}>FNSKU</TableHead>
                  <TableHead className={dataTableHeadClass}>Title</TableHead>
                  <TableHead className={`${dataTableHeadClass} text-right`}>Quantity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.slice(0, 100).map((item, idx) => (
                  <TableRow key={`${item.asin}-${idx}`} className={dataTableRowClass(idx)}>
                    <TableCell className="font-mono text-sm">{item.asin}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{item.sku || '-'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground font-mono">{item.fnsku || '-'}</TableCell>
                    <TableCell className="text-sm max-w-[250px] truncate">{item.title || '-'}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={item.quantity > 0 ? 'default' : 'destructive'} className="font-mono">
                        {item.quantity.toLocaleString()}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filteredItems.length > 100 && (
              <DataTableFooter>
                <span>Showing first 100 of {filteredItems.length} items</span>
              </DataTableFooter>
            )}
          </DataTableWrapper>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-2">
            {filteredItems.slice(0, 50).map((item, idx) => (
              <div key={`mobile-${item.asin}-${idx}`} className="p-3 rounded-xl bg-card border border-border">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-sm font-medium">{item.asin}</span>
                  <Badge variant={item.quantity > 0 ? 'default' : 'destructive'} className="font-mono">
                    {item.quantity.toLocaleString()}
                  </Badge>
                </div>
                {item.title && <p className="text-xs text-muted-foreground truncate">{item.title}</p>}
                <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                  {item.sku && <span>SKU: {item.sku}</span>}
                  {item.fnsku && <span>FNSKU: {item.fnsku}</span>}
                </div>
              </div>
            ))}
            {filteredItems.length > 50 && (
              <p className="text-center text-xs text-muted-foreground py-2">
                Showing first 50 of {filteredItems.length} items
              </p>
            )}
          </div>
        </>
      )}

      {/* Empty State */}
      {!isLoading && totalItems === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Warehouse className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <p className="text-lg font-medium text-muted-foreground">No FBA inventory data</p>
            <p className="text-sm text-muted-foreground/70">Upload one or more CSV / Excel files to get started</p>
          </CardContent>
        </Card>
      )}

      {/* Column Mapping Dialog */}
      <Dialog open={showMappingDialog} onOpenChange={setShowMappingDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Map Columns — {pendingFileName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[400px] overflow-y-auto">
            <div className="space-y-2">
              <Label>ASIN Column *</Label>
              <Select value={columnMapping.asin} onValueChange={(v) => setColumnMapping(prev => ({ ...prev, asin: v }))}>
                <SelectTrigger><SelectValue placeholder="Select ASIN column" /></SelectTrigger>
                <SelectContent>
                  {pendingHeaders.map(h => (<SelectItem key={h} value={h}>{h}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quantity Column *</Label>
              <Select value={columnMapping.quantity} onValueChange={(v) => setColumnMapping(prev => ({ ...prev, quantity: v }))}>
                <SelectTrigger><SelectValue placeholder="Select Quantity column" /></SelectTrigger>
                <SelectContent>
                  {pendingHeaders.map(h => (<SelectItem key={h} value={h}>{h}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>SKU Column (optional)</Label>
              <Select value={columnMapping.sku || '__none__'} onValueChange={(v) => setColumnMapping(prev => ({ ...prev, sku: v === '__none__' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Select SKU column" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {pendingHeaders.map(h => (<SelectItem key={h} value={h}>{h}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>FNSKU Column (optional)</Label>
              <Select value={columnMapping.fnsku || '__none__'} onValueChange={(v) => setColumnMapping(prev => ({ ...prev, fnsku: v === '__none__' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Select FNSKU column" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {pendingHeaders.map(h => (<SelectItem key={h} value={h}>{h}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Title Column (optional)</Label>
              <Select value={columnMapping.title || '__none__'} onValueChange={(v) => setColumnMapping(prev => ({ ...prev, title: v === '__none__' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Select Title column" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {pendingHeaders.map(h => (<SelectItem key={h} value={h}>{h}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Condition Column (optional)</Label>
              <Select value={columnMapping.condition || '__none__'} onValueChange={(v) => setColumnMapping(prev => ({ ...prev, condition: v === '__none__' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Select Condition column" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {pendingHeaders.map(h => (<SelectItem key={h} value={h}>{h}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowMappingDialog(false)}>Cancel</Button>
              <Button
                onClick={async () => {
                  await processData(pendingData, columnMapping, pendingFileName);
                  setShowMappingDialog(false);
                  setPendingData([]);
                  setPendingHeaders([]);
                }}
                disabled={!columnMapping.asin || !columnMapping.quantity}
              >
                Import Data
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FBAInventoryUpload;
