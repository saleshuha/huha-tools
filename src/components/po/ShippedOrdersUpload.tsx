import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useDropzone } from 'react-dropzone';
import { Upload, FileUp, Search, Trash2, Package, Hash, FileText, Loader2, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useShippedOrders } from '@/hooks/useShippedOrders';
import { ShippedOrder } from '@/utils/shippedOrdersStorage';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

const ShippedOrdersUpload: React.FC = () => {
  const { toast } = useToast();
  const { shippedOrders, totalItems, totalQuantity, lastModified, fileName, isLoading, save, clear, reload } = useShippedOrders();

  const [searchQuery, setSearchQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showMappingDialog, setShowMappingDialog] = useState(false);
  const [pendingData, setPendingData] = useState<any[]>([]);
  const [pendingHeaders, setPendingHeaders] = useState<string[]>([]);
  const [pendingFileName, setPendingFileName] = useState<string>('');
  const [columnMapping, setColumnMapping] = useState<{ asin: string; quantity: string; sku: string; title: string }>({
    asin: '',
    quantity: '',
    sku: '',
    title: '',
  });

  // Auto-detect column mapping
  const autoDetectMapping = useCallback((headers: string[]) => {
    const lowerHeaders = headers.map(h => h.toLowerCase().trim());
    
    const asinIndex = lowerHeaders.findIndex(h => h.includes('asin') || h === 'product id');
    const qtyIndex = lowerHeaders.findIndex(h => 
      h.includes('quantity') || h.includes('qty') || h.includes('shipped') || h.includes('units')
    );
    const skuIndex = lowerHeaders.findIndex(h => h.includes('sku') && !h.includes('fnsku'));
    const titleIndex = lowerHeaders.findIndex(h => h.includes('title') || h.includes('product name') || h.includes('name'));

    return {
      asin: asinIndex >= 0 ? headers[asinIndex] : '',
      quantity: qtyIndex >= 0 ? headers[qtyIndex] : '',
      sku: skuIndex >= 0 ? headers[skuIndex] : '',
      title: titleIndex >= 0 ? headers[titleIndex] : '',
    };
  }, []);

  // Parse file
  const parseFile = useCallback(async (file: File) => {
    setIsProcessing(true);
    try {
      const extension = file.name.split('.').pop()?.toLowerCase();
      let data: any[] = [];
      let headers: string[] = [];

      if (extension === 'csv' || extension === 'txt') {
        const text = await file.text();
        const result = Papa.parse(text, { header: true, skipEmptyLines: true });
        headers = result.meta.fields || [];
        data = result.data;
      } else if (extension === 'xlsx' || extension === 'xls') {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
        
        if (jsonData.length > 0) {
          headers = jsonData[0].map(String);
          data = jsonData.slice(1).map(row => {
            const obj: any = {};
            headers.forEach((h, i) => {
              obj[h] = row[i];
            });
            return obj;
          });
        }
      }

      if (data.length === 0) {
        toast({ title: 'Empty file', description: 'The file contains no data.', variant: 'destructive' });
        setIsProcessing(false);
        return;
      }

      const autoMapping = autoDetectMapping(headers);
      setPendingHeaders(headers);
      setPendingData(data);
      setPendingFileName(file.name);
      setColumnMapping(autoMapping);

      // If we have required fields auto-detected, process directly
      if (autoMapping.asin && autoMapping.quantity) {
        processData(data, autoMapping, file.name);
      } else {
        setShowMappingDialog(true);
      }
    } catch (error) {
      console.error('Error parsing file:', error);
      toast({ title: 'Parse error', description: 'Failed to parse the file.', variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  }, [autoDetectMapping, toast]);

  // Process data with mapping
  const processData = useCallback(async (data: any[], mapping: typeof columnMapping, fName: string) => {
    if (!mapping.asin || !mapping.quantity) {
      toast({ title: 'Mapping required', description: 'ASIN and Quantity columns are required.', variant: 'destructive' });
      return;
    }

    const items: ShippedOrder[] = [];
    for (const row of data) {
      const asin = String(row[mapping.asin] || '').trim();
      const qtyRaw = row[mapping.quantity];
      const quantity = parseInt(String(qtyRaw).replace(/,/g, ''), 10);

      if (asin && !isNaN(quantity) && quantity > 0) {
        items.push({
          asin,
          quantity,
          sku: mapping.sku ? String(row[mapping.sku] || '').trim() : undefined,
          title: mapping.title ? String(row[mapping.title] || '').trim() : undefined,
        });
      }
    }

    if (items.length === 0) {
      toast({ title: 'No valid data', description: 'No valid rows found with ASIN and quantity.', variant: 'destructive' });
      return;
    }

    await save(items, fName);
    setShowMappingDialog(false);
    setPendingData([]);
    setPendingHeaders([]);
    toast({ title: 'Data imported', description: `${items.length} items with ${items.reduce((s, i) => s + i.quantity, 0)} total quantity.` });
  }, [save, toast]);

  // Dropzone
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      parseFile(acceptedFiles[0]);
    }
  }, [parseFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/plain': ['.txt'],
    },
    multiple: false,
  });

  // Filtered items
  const filteredItems = shippedOrders.filter(item => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.asin?.toLowerCase().includes(query) ||
      item.sku?.toLowerCase().includes(query) ||
      item.title?.toLowerCase().includes(query)
    );
  });

  // Export to CSV
  const handleExport = useCallback(() => {
    if (shippedOrders.length === 0) return;
    const csv = Papa.unparse(shippedOrders);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shipped-orders-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [shippedOrders]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Shipped Orders</h2>
          <p className="text-sm text-muted-foreground">Upload shipped order data to track quantities by ASIN</p>
        </div>
      </div>

      {/* Upload Area */}
      <Card className="border-dashed border-2 border-border/50 bg-muted/20">
        <CardContent className="p-6">
          <div
            {...getRootProps()}
            className={`flex flex-col items-center justify-center py-10 px-6 rounded-xl cursor-pointer transition-all duration-200 ${
              isDragActive ? 'bg-primary/10 border-primary' : 'hover:bg-muted/50'
            }`}
          >
            <input {...getInputProps()} />
            {isProcessing ? (
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
            ) : (
              <Upload className="h-12 w-12 text-muted-foreground mb-4" />
            )}
            <p className="text-lg font-medium text-foreground mb-1">
              {isDragActive ? 'Drop the file here' : 'Drop CSV/Excel file here or click to upload'}
            </p>
            <p className="text-sm text-muted-foreground">Supports .csv, .xlsx, .xls files</p>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {totalItems > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Hash className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total ASINs</p>
                <p className="text-xl font-bold text-foreground">{totalItems.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Package className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Quantity</p>
                <p className="text-xl font-bold text-foreground">{totalQuantity.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Source File</p>
                <p className="text-sm font-medium text-foreground truncate max-w-[150px]" title={fileName}>{fileName || '-'}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <FileUp className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Last Modified</p>
                <p className="text-sm font-medium text-foreground">
                  {lastModified ? format(new Date(lastModified), 'MMM d, yyyy HH:mm') : '-'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Actions and Search */}
      {totalItems > 0 && (
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by ASIN, SKU, or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear All
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear all shipped orders data?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all {totalItems} items. This action cannot be undone.
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
          </div>
        </div>
      )}

      {/* Data Table */}
      {totalItems > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="max-h-[500px] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                  <TableRow>
                    <TableHead className="font-semibold">ASIN</TableHead>
                    <TableHead className="font-semibold">SKU</TableHead>
                    <TableHead className="font-semibold">Title</TableHead>
                    <TableHead className="font-semibold text-right">Quantity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.slice(0, 100).map((item, idx) => (
                    <TableRow key={`${item.asin}-${idx}`}>
                      <TableCell className="font-mono text-sm">{item.asin}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{item.sku || '-'}</TableCell>
                      <TableCell className="text-sm max-w-[300px] truncate" title={item.title}>{item.title || '-'}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary" className="font-mono">{item.quantity.toLocaleString()}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {filteredItems.length > 100 && (
              <div className="p-3 text-center text-sm text-muted-foreground border-t">
                Showing first 100 of {filteredItems.length} items
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && totalItems === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Package className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <p className="text-lg font-medium text-muted-foreground">No shipped orders data</p>
            <p className="text-sm text-muted-foreground/70">Upload a CSV or Excel file to get started</p>
          </CardContent>
        </Card>
      )}

      {/* Column Mapping Dialog */}
      <Dialog open={showMappingDialog} onOpenChange={setShowMappingDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Map Columns</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>ASIN Column *</Label>
              <Select value={columnMapping.asin} onValueChange={(v) => setColumnMapping(prev => ({ ...prev, asin: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select ASIN column" />
                </SelectTrigger>
                <SelectContent>
                  {pendingHeaders.map(h => (
                    <SelectItem key={h} value={h}>{h}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quantity Column *</Label>
              <Select value={columnMapping.quantity} onValueChange={(v) => setColumnMapping(prev => ({ ...prev, quantity: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Quantity column" />
                </SelectTrigger>
                <SelectContent>
                  {pendingHeaders.map(h => (
                    <SelectItem key={h} value={h}>{h}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>SKU Column (optional)</Label>
              <Select value={columnMapping.sku || '__none__'} onValueChange={(v) => setColumnMapping(prev => ({ ...prev, sku: v === '__none__' ? '' : v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select SKU column" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {pendingHeaders.map(h => (
                    <SelectItem key={h} value={h}>{h}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Title Column (optional)</Label>
              <Select value={columnMapping.title || '__none__'} onValueChange={(v) => setColumnMapping(prev => ({ ...prev, title: v === '__none__' ? '' : v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Title column" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {pendingHeaders.map(h => (
                    <SelectItem key={h} value={h}>{h}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowMappingDialog(false)}>Cancel</Button>
            <Button onClick={() => processData(pendingData, columnMapping, pendingFileName)} disabled={!columnMapping.asin || !columnMapping.quantity}>
              Import Data
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ShippedOrdersUpload;
