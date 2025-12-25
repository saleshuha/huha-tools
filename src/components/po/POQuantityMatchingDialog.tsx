import React, { useState, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDropzone } from 'react-dropzone';
import { parseFileSimply } from '@/components/SimpleFileParser';
import { 
  Search, Package, AlertTriangle, CheckCircle2, 
  XCircle, Download, Loader2, Image as ImageIcon,
  Copy, ClipboardList, Upload, FileSpreadsheet,
  ArrowRight, RotateCcw, X, Plus
} from 'lucide-react';
import { usePOQuantityMatching, MatchedItem, UploadedOrderItem } from '@/hooks/usePOQuantityMatching';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface POQuantityMatchingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preSelectedPOs?: string[];
}

interface ParsedFileData {
  id: string;
  file: File;
  data: any[];
  headers: string[];
  skuColumn: string;
  quantityColumn: string;
}

type Step = 'upload' | 'mapping' | 'results';

export const POQuantityMatchingDialog: React.FC<POQuantityMatchingDialogProps> = ({
  open,
  onOpenChange,
  preSelectedPOs = [],
}) => {
  const { toast } = useToast();
  
  // Step management
  const [currentStep, setCurrentStep] = useState<Step>('upload');
  
  // Multi-file upload state
  const [uploadedFiles, setUploadedFiles] = useState<ParsedFileData[]>([]);
  const [isParsingFile, setIsParsingFile] = useState(false);
  
  // Processed uploaded orders
  const [uploadedOrders, setUploadedOrders] = useState<UploadedOrderItem[]>([]);
  
  // Results state
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'partial' | 'fulfilled' | 'not_ordered'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sunskyFilter, setSunskyFilter] = useState<'all' | 'matched' | 'not_matched'>('matched');

  const { matchedItems, summary, poTotals, isLoading, hasUploadedData } = usePOQuantityMatching({
    selectedPOs: preSelectedPOs,
    statusFilter,
    searchQuery,
    uploadedOrders,
    sunskyFilter,
  });

  // Auto-detect columns
  const autoDetectColumns = useCallback((headers: string[]) => {
    const skuPatterns = ['sku', 'sku_code', 'skucode', 'model', 'model_number', 'modelnumber', 'item_code', 'itemcode', 'product_code'];
    const qtyPatterns = ['qty', 'quantity', 'ordered', 'ordered_qty', 'orderedqty', 'amount', 'count'];
    
    const lowerHeaders = headers.map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
    
    let detectedSku = '';
    let detectedQty = '';
    
    for (let i = 0; i < headers.length; i++) {
      const lowerHeader = lowerHeaders[i];
      if (!detectedSku && skuPatterns.some(p => lowerHeader.includes(p))) {
        detectedSku = headers[i];
      }
      if (!detectedQty && qtyPatterns.some(p => lowerHeader.includes(p))) {
        detectedQty = headers[i];
      }
    }
    
    return { detectedSku, detectedQty };
  }, []);

  // Handle file drop - supports multiple files
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    setIsParsingFile(true);
    
    try {
      const newFiles: ParsedFileData[] = [];
      
      for (const file of acceptedFiles) {
        // Check if file already uploaded
        if (uploadedFiles.some(f => f.file.name === file.name)) {
          toast({ title: 'Duplicate file', description: `${file.name} is already uploaded`, variant: 'destructive' });
          continue;
        }
        
        const data = await parseFileSimply(file);
        if (data.length > 0) {
          const headers = Object.keys(data[0]);
          const { detectedSku, detectedQty } = autoDetectColumns(headers);
          
          newFiles.push({
            id: `${file.name}-${Date.now()}`,
            file,
            data,
            headers,
            skuColumn: detectedSku,
            quantityColumn: detectedQty,
          });
        } else {
          toast({ title: 'Empty file', description: `No data found in ${file.name}`, variant: 'destructive' });
        }
      }
      
      if (newFiles.length > 0) {
        setUploadedFiles(prev => [...prev, ...newFiles]);
        setCurrentStep('mapping');
        toast({ 
          title: 'Files parsed', 
          description: `Added ${newFiles.length} file${newFiles.length > 1 ? 's' : ''} with ${newFiles.reduce((sum, f) => sum + f.data.length, 0)} total rows` 
        });
      }
    } catch (error) {
      console.error('File parsing error:', error);
      toast({ title: 'Parse error', description: 'Failed to parse the file', variant: 'destructive' });
    } finally {
      setIsParsingFile(false);
    }
  }, [autoDetectColumns, toast, uploadedFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 10,
    disabled: isParsingFile,
  });

  // Update column mapping for a specific file
  const updateFileMapping = useCallback((fileId: string, field: 'skuColumn' | 'quantityColumn', value: string) => {
    setUploadedFiles(prev => prev.map(f => 
      f.id === fileId ? { ...f, [field]: value } : f
    ));
  }, []);

  // Remove a file
  const removeFile = useCallback((fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  }, []);

  // Get total stats across all files
  const totalStats = useMemo(() => {
    return {
      fileCount: uploadedFiles.length,
      totalRows: uploadedFiles.reduce((sum, f) => sum + f.data.length, 0),
      allMapped: uploadedFiles.every(f => f.skuColumn && f.quantityColumn),
    };
  }, [uploadedFiles]);

  // Process mapping and run match
  const handleRunMatch = useCallback(() => {
    // Validate all files have mappings
    const unmappedFiles = uploadedFiles.filter(f => !f.skuColumn || !f.quantityColumn);
    if (unmappedFiles.length > 0) {
      toast({ 
        title: 'Missing column mappings', 
        description: `Please map both SKU and Quantity columns for: ${unmappedFiles.map(f => f.file.name).join(', ')}`, 
        variant: 'destructive' 
      });
      return;
    }
    
    const orders: UploadedOrderItem[] = [];
    
    // Combine all files' data
    uploadedFiles.forEach(fileData => {
      fileData.data.forEach(row => {
        const sku = String(row[fileData.skuColumn] || '').trim();
        const qty = parseInt(String(row[fileData.quantityColumn] || '0').replace(/[^0-9.-]/g, '')) || 0;
        
        if (sku && qty > 0) {
          orders.push({ sku, quantity: qty });
        }
      });
    });
    
    if (orders.length === 0) {
      toast({ title: 'No valid data', description: 'No valid SKU/Quantity pairs found in the files', variant: 'destructive' });
      return;
    }
    
    setUploadedOrders(orders);
    setCurrentStep('results');
    toast({ title: 'Matching complete', description: `Processed ${orders.length} order items from ${uploadedFiles.length} file${uploadedFiles.length > 1 ? 's' : ''}` });
  }, [uploadedFiles, toast]);

  // Reset to start over
  const handleReset = useCallback(() => {
    setCurrentStep('upload');
    setUploadedFiles([]);
    setUploadedOrders([]);
    setSearchQuery('');
    setStatusFilter('all');
    setSunskyFilter('all');
  }, []);

  // Export to CSV
  const handleExport = () => {
    const headers = ['SKU Code', 'Model Number', 'ASIN', 'Title', 'PO Numbers', 'Requested Qty', 'Ordered Qty', 'Pending Qty', 'Status'];
    const rows = matchedItems.map(item => [
      item.sku_code || '',
      item.model_number || '',
      item.asin || '',
      item.title || '',
      item.po_numbers.join(', '),
      item.requested_qty.toString(),
      item.ordered_qty.toString(),
      item.pending_qty.toString(),
      item.status,
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `po-quantity-matching-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    toast({ title: 'Exported', description: 'Report exported to CSV' });
  };

  // Copy pending items for supplier order
  const handleCopyPending = () => {
    const pendingItems = matchedItems.filter(i => i.pending_qty > 0);
    const text = pendingItems.map(i => `${i.sku_code || i.model_number || 'N/A'}\t${i.pending_qty}`).join('\n');
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied', description: `${pendingItems.length} pending items copied to clipboard` });
  };

  const getStatusBadge = (status: MatchedItem['status']) => {
    switch (status) {
      case 'fulfilled':
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20"><CheckCircle2 className="h-3 w-3 mr-1" />Fulfilled</Badge>;
      case 'partial':
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20"><AlertTriangle className="h-3 w-3 mr-1" />Partial</Badge>;
      case 'not_ordered':
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20"><XCircle className="h-3 w-3 mr-1" />Not Ordered</Badge>;
    }
  };

  const ItemImage = ({ item }: { item: MatchedItem }) => {
    const [error, setError] = useState(false);
    const imageUrl = item.image_url || item.sunsky_thumbnail;

    if (!imageUrl || error) {
      return (
        <div className="w-12 h-12 rounded-lg border border-dashed border-border/30 flex items-center justify-center bg-muted/20">
          <ImageIcon className="h-4 w-4 text-muted-foreground/50" />
        </div>
      );
    }

    return (
      <Popover>
        <PopoverTrigger asChild>
          <div className="w-12 h-12 rounded-lg border border-border/30 overflow-hidden cursor-pointer hover:border-primary/50 transition-all bg-background">
            <img 
              src={imageUrl} 
              alt={item.title || 'Product'} 
              className="w-full h-full object-contain"
              onError={() => setError(true)}
            />
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2">
          <img 
            src={imageUrl} 
            alt={item.title || 'Product'} 
            className="w-full h-auto object-contain rounded-lg"
          />
        </PopoverContent>
      </Popover>
    );
  };

  // Render upload step
  const renderUploadStep = () => (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <div
        {...getRootProps()}
        className={cn(
          "w-full max-w-lg border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all",
          isDragActive ? "border-primary bg-primary/5" : "border-border/40 hover:border-primary/50 hover:bg-muted/20",
          isParsingFile && "opacity-50 cursor-not-allowed"
        )}
      >
        <input {...getInputProps()} />
        {isParsingFile ? (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">Parsing files...</p>
          </div>
        ) : (
          <>
            <div className="p-4 bg-primary/10 rounded-full w-fit mx-auto mb-4">
              <Upload className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-medium mb-2">Upload Supplier Order Files</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Drag & drop or click to select files (up to 10)
            </p>
            <p className="text-xs text-muted-foreground">
              Supports: CSV, XLSX, XLS
            </p>
          </>
        )}
      </div>
      
      <div className="mt-6 text-center text-sm text-muted-foreground max-w-md">
        <p>Upload your supplier order files containing SKU/Model numbers and ordered quantities. You can upload multiple files from different suppliers.</p>
      </div>
    </div>
  );

  // Render mapping step
  const renderMappingStep = () => (
    <div className="flex-1 flex flex-col p-6 overflow-hidden">
      {/* Summary header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium">{totalStats.fileCount} file{totalStats.fileCount > 1 ? 's' : ''} uploaded</p>
            <p className="text-sm text-muted-foreground">{totalStats.totalRows.toLocaleString()} total rows</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleReset}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Clear All
        </Button>
      </div>
      
      {/* Files list with individual column mapping */}
      <ScrollArea className="flex-1 -mx-6 px-6">
        <div className="space-y-4">
          {uploadedFiles.map((fileData, index) => (
            <div 
              key={fileData.id} 
              className="p-4 bg-muted/30 rounded-lg border border-border/30"
            >
              {/* File header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-medium">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{fileData.file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {fileData.data.length} rows • {fileData.headers.length} columns
                    </p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => removeFile(fileData.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Column mapping */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">SKU / Model Number Column</label>
                  <Select 
                    value={fileData.skuColumn} 
                    onValueChange={(v) => updateFileMapping(fileData.id, 'skuColumn', v)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      {fileData.headers.map(header => (
                        <SelectItem key={header} value={header}>{header}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fileData.skuColumn && (
                    <p className="text-xs text-muted-foreground truncate">
                      Preview: {fileData.data.slice(0, 3).map(r => r[fileData.skuColumn]).filter(Boolean).join(', ')}
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Quantity Column</label>
                  <Select 
                    value={fileData.quantityColumn} 
                    onValueChange={(v) => updateFileMapping(fileData.id, 'quantityColumn', v)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      {fileData.headers.map(header => (
                        <SelectItem key={header} value={header}>{header}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fileData.quantityColumn && (
                    <p className="text-xs text-muted-foreground">
                      Preview: {fileData.data.slice(0, 3).map(r => r[fileData.quantityColumn]).filter(Boolean).join(', ')}
                    </p>
                  )}
                </div>
              </div>
              
              {/* Validation indicator */}
              {(!fileData.skuColumn || !fileData.quantityColumn) && (
                <div className="mt-3 flex items-center gap-2 text-amber-600 text-xs">
                  <AlertTriangle className="h-3 w-3" />
                  <span>Please map both columns</span>
                </div>
              )}
            </div>
          ))}
          
          {/* Add another file button */}
          <div
            {...getRootProps()}
            className={cn(
              "p-4 border-2 border-dashed rounded-lg text-center cursor-pointer transition-all",
              isDragActive ? "border-primary bg-primary/5" : "border-border/40 hover:border-primary/50 hover:bg-muted/20",
              isParsingFile && "opacity-50 cursor-not-allowed"
            )}
          >
            <input {...getInputProps()} />
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Plus className="h-4 w-4" />
              <span className="text-sm">Add Another File</span>
            </div>
          </div>
        </div>
      </ScrollArea>
      
      {/* PO Info - Read-only display of pre-selected POs */}
      <div className="mt-4 pt-4 border-t border-border/20">
        {preSelectedPOs.length > 0 ? (
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <ClipboardList className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Matching against {preSelectedPOs.length} PO{preSelectedPOs.length > 1 ? 's' : ''}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {preSelectedPOs.slice(0, 5).join(', ')}{preSelectedPOs.length > 5 ? `, +${preSelectedPOs.length - 5} more` : ''}
            </p>
          </div>
        ) : (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">No POs selected. Please close this dialog and select POs first.</p>
          </div>
        )}
      </div>
      
      {/* Action button */}
      <div className="mt-4 flex justify-end gap-3">
        <Button variant="outline" onClick={handleReset}>
          Cancel
        </Button>
        <Button 
          onClick={handleRunMatch}
          disabled={!totalStats.allMapped || uploadedFiles.length === 0 || preSelectedPOs.length === 0}
          className="min-w-[200px]"
        >
          Run Match ({totalStats.totalRows.toLocaleString()} rows)
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );

  // Render results step
  const renderResultsStep = () => (
    <>
      {/* PO Totals Header */}
      <div className="flex-shrink-0 py-2 px-3 bg-muted/30 rounded-lg mb-3 flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm">
          <span className="text-muted-foreground">Selected POs:</span>
          <span className="font-medium">{poTotals.po_count} POs</span>
          <span className="text-muted-foreground">•</span>
          <span className="font-medium">{poTotals.line_items.toLocaleString()} line items</span>
          <span className="text-muted-foreground">•</span>
          <span className="font-medium">{poTotals.total_units.toLocaleString()} units</span>
        </div>
        <div className="text-xs text-muted-foreground">
          From {uploadedFiles.length} file{uploadedFiles.length > 1 ? 's' : ''}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="flex-shrink-0 grid grid-cols-4 gap-3 py-3">
        <Card className="bg-muted/20 border-border/20">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-foreground">{summary.total_requested.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Requested</div>
          </CardContent>
        </Card>
        <Card className="bg-emerald-500/10 border-emerald-500/20">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-emerald-600">{summary.total_ordered.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Ordered</div>
          </CardContent>
        </Card>
        <Card className="bg-amber-500/10 border-amber-500/20">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-amber-600">{summary.total_pending.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Pending</div>
          </CardContent>
        </Card>
        <Card className="bg-primary/10 border-primary/20">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-primary">{summary.match_rate}%</div>
            <div className="text-xs text-muted-foreground">Match Rate</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Actions */}
      <div className="flex-shrink-0 flex items-center justify-between py-3 border-b border-border/20">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            New Match
          </Button>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search SKU, Model, ASIN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 w-64"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Items</SelectItem>
              <SelectItem value="pending">Pending Only</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
              <SelectItem value="fulfilled">Fulfilled</SelectItem>
              <SelectItem value="not_ordered">Not Ordered</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Sunsky Match Filter */}
          <div className="flex items-center gap-0.5 border border-border/40 rounded-lg p-0.5">
            <Button 
              variant={sunskyFilter === 'all' ? 'default' : 'ghost'} 
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setSunskyFilter('all')}
            >
              All
            </Button>
            <Button 
              variant={sunskyFilter === 'matched' ? 'default' : 'ghost'} 
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setSunskyFilter('matched')}
            >
              Sunsky
            </Button>
            <Button 
              variant={sunskyFilter === 'not_matched' ? 'default' : 'ghost'} 
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setSunskyFilter('not_matched')}
            >
              No Image
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCopyPending}>
            <Copy className="h-4 w-4 mr-2" />
            Copy Pending
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <ScrollArea className="h-[calc(90vh-320px)]">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : matchedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Package className="h-12 w-12 mb-3 opacity-50" />
              <p>No items found</p>
              <p className="text-sm">Try adjusting your filters or PO selection</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="w-16">Image</TableHead>
                  <TableHead>SKU / Model</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>PO(s)</TableHead>
                  <TableHead className="text-right">Requested</TableHead>
                  <TableHead className="text-right">Ordered</TableHead>
                  <TableHead className="text-right">Pending</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {matchedItems.map((item) => (
                  <TableRow key={item.id} className="group hover:bg-muted/30">
                    <TableCell>
                      <ItemImage item={item} />
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {item.sku_code && (
                          <div className="font-mono text-xs bg-muted/50 px-2 py-0.5 rounded inline-block">
                            {item.sku_code}
                          </div>
                        )}
                        {item.model_number && (
                          <div className="text-xs text-muted-foreground font-mono">
                            {item.model_number}
                          </div>
                        )}
                        {item.asin && (
                          <div className="text-xs text-primary/70 font-mono">
                            {item.asin}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm line-clamp-2">{item.title || '-'}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {item.po_numbers.slice(0, 3).map(po => (
                          <Badge key={po} variant="outline" className="text-xs font-mono">
                            {po}
                          </Badge>
                        ))}
                        {item.po_numbers.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{item.po_numbers.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {item.requested_qty}
                    </TableCell>
                    <TableCell className="text-right font-medium text-emerald-600">
                      {item.ordered_qty}
                    </TableCell>
                    <TableCell className={cn(
                      "text-right font-bold",
                      item.pending_qty > 0 ? "text-amber-600" : "text-muted-foreground"
                    )}>
                      {item.pending_qty}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(item.status)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </ScrollArea>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 flex items-center justify-between pt-3 border-t border-border/20">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>{matchedItems.length} items</span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            {summary.fulfilled_count} fulfilled
          </span>
          <span className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3 text-amber-600" />
            {summary.partial_count} partial
          </span>
          <span className="flex items-center gap-1">
            <XCircle className="h-3 w-3 text-red-600" />
            {summary.not_ordered_count} not ordered
          </span>
        </div>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Close
        </Button>
      </div>
    </>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <ClipboardList className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold">Quantity Matching Report</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  {currentStep === 'upload' && 'Upload your supplier order files'}
                  {currentStep === 'mapping' && 'Map columns for each file'}
                  {currentStep === 'results' && 'Compare requested vs ordered quantities'}
                </p>
              </div>
            </div>
            
            {/* Step indicator */}
            <div className="flex items-center gap-2">
              <div className={cn("w-2 h-2 rounded-full", currentStep === 'upload' ? "bg-primary" : "bg-muted")} />
              <div className={cn("w-2 h-2 rounded-full", currentStep === 'mapping' ? "bg-primary" : "bg-muted")} />
              <div className={cn("w-2 h-2 rounded-full", currentStep === 'results' ? "bg-primary" : "bg-muted")} />
            </div>
          </div>
        </DialogHeader>

        {currentStep === 'upload' && renderUploadStep()}
        {currentStep === 'mapping' && renderMappingStep()}
        {currentStep === 'results' && renderResultsStep()}
      </DialogContent>
    </Dialog>
  );
};
