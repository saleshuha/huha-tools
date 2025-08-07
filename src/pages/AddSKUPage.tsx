import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X, Upload, FileSpreadsheet, Clipboard, Trash2, Settings, Zap, Users, Activity, Clock, CheckCircle2, ArrowLeft } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { Progress } from '@/components/ui/progress';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { SunskySKU } from '@/hooks/usePOTracker';
import { useUserProfile } from '@/hooks/useUserProfile';
import { ColumnMappingWizard } from '@/components/sales/ColumnMappingWizard';
import { ColumnMappingWizard as SKUColumnMappingWizard } from '@/components/po/SKUColumnMappingWizard';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface AddSKUPageProps {
  onAddSKUs: (skus: Omit<SunskySKU, 'id' | 'created_at' | 'updated_at' | 'user_id'>[]) => Promise<void>;
  isLoading: boolean;
}

interface BulkSKU {
  skuCode: string;
  title: string;
  description: string;
  cost: number;
  weight: number;
  notes: string;
}

interface ThreadProgress {
  id: number;
  progress: number;
  label: string;
  status: 'waiting' | 'processing' | 'completed' | 'error';
  processed: number;
  total: number;
}

export function AddSKUPage({ onAddSKUs, isLoading }: AddSKUPageProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('bulk');
  const [bulkSKUs, setBulkSKUs] = useState<BulkSKU[]>([]);
  const [pasteData, setPasteData] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [threadCount, setThreadCount] = useState(2);
  const [threadProgress, setThreadProgress] = useState<ThreadProgress[]>([]);
  const [isShowingThreads, setIsShowingThreads] = useState(false);

  // File processing states
  const [processQueue, setProcessQueue] = useState<File[]>([]);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [savedMappings, setSavedMappings] = useState<any>({});
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  
  // Column mapping states
  const [showMappingWizard, setShowMappingWizard] = useState(false);
  const [currentFileData, setCurrentFileData] = useState<any>(null);
  const [currentFileName, setCurrentFileName] = useState('');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  
  const { profile } = useUserProfile();

  // SKU columns for mapping
  const skuColumns = ['sku_code', 'title', 'description', 'cost', 'weight', 'notes'];

  const getCurrencySymbol = (country: string | undefined) => {
    switch (country) {
      case 'KSA': return 'SAR';
      case 'UAE': return 'AED';
      default: return 'USD';
    }
  };

  const currencySymbol = getCurrencySymbol(profile?.country);

  // Initialize single SKU form
  const [singleSKU, setSingleSKU] = useState<BulkSKU>({
    skuCode: '',
    title: '',
    description: '',
    cost: 0,
    weight: 0,
    notes: ''
  });

  // File upload handlers
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const sortedFiles = acceptedFiles
      .filter(file => file.name.match(/\.(xlsx|xls|csv)$/i))
      .sort((a, b) => a.size - b.size);
    
    if (sortedFiles.length === 0) {
      alert('Please upload Excel (.xlsx, .xls) or CSV files only');
      return;
    }

    setProcessQueue(sortedFiles);
    setCurrentFileIndex(0);
    
    if (sortedFiles.length > 0) {
      processFirstFileForMapping(sortedFiles[0], sortedFiles);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv']
    },
    multiple: true
  });

  const processFirstFileForMapping = async (file: File, allFiles: File[]) => {
    try {
      setProgressLabel(`Reading ${file.name} for column mapping...`);
      const data = await parseFileQuietly(file);
      
      if (!data || data.length === 0) {
        throw new Error('No data found in file');
      }

      const headers = Object.keys(data[0]);
      const rows = data.slice(0, 100);

      setCurrentFileData({
        headers,
        rows: rows.map(row => headers.map(header => row[header]))
      });
      setCurrentFileName(file.name);
      setPendingFiles(allFiles);
      setShowMappingWizard(true);
      setIsProcessingQueue(false);

    } catch (error) {
      console.error('Error processing file for mapping:', error);
      setProgressLabel('Error reading file');
      setIsProcessingQueue(false);
    }
  };

  const handleMappingComplete = async (mappedData: any[], mapping: any) => {
    try {
      setShowMappingWizard(false);
      setIsProcessingQueue(true);
      
      setSavedMappings(prev => ({ ...prev, [currentFileName]: mapping }));
      
      await processFileWithMappings(mappedData, currentFileName);
      
      if (pendingFiles.length > 1) {
        setProgressLabel(`Processing remaining ${pendingFiles.length - 1} files with saved mapping...`);
        await processRemainingFilesWithSavedMappings(pendingFiles.slice(1), mapping);
      }
      
      setProgressLabel('All files processed successfully!');
      
    } catch (error) {
      console.error('Error in mapping completion:', error);
      setProgressLabel('Error processing files');
    } finally {
      setIsProcessingQueue(false);
      setCurrentFileData(null);
      setPendingFiles([]);
    }
  };

  const handleSaveMapping = (name: string, mapping: any) => {
    setSavedMappings(prev => ({ ...prev, [name]: mapping }));
  };

  const processRemainingFilesWithSavedMappings = async (remainingFiles: File[], mapping: any) => {
    for (let i = 0; i < remainingFiles.length; i++) {
      const file = remainingFiles[i];
      setCurrentFileIndex(i + 1);
      setProgress(((i + 1) / remainingFiles.length) * 100);
      setProgressLabel(`Processing file ${i + 2}/${pendingFiles.length}: ${file.name}`);
      
      try {
        const data = await parseFileQuietly(file);
        if (data && data.length > 0) {
          const mappedData = data.map(row => {
            const processedRow: any = {};
            Object.entries(mapping).forEach(([expectedCol, headerCol]) => {
              let value = row[headerCol as string];
              
              if (expectedCol === 'cost' || expectedCol === 'weight') {
                value = parseFloat(value) || 0;
              }
              
              if (typeof value === 'string') {
                value = value.trim();
              }
              
              if (value !== undefined && value !== null && value !== '') {
                processedRow[expectedCol] = value;
              }
            });
            return processedRow;
          }).filter(row => row.sku_code);
          
          await processFileWithMappings(mappedData, file.name);
        }
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
      }
    }
  };

  const parseFileQuietly = async (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      if (file.name.toLowerCase().endsWith('.csv')) {
        Papa.parse(file, {
          header: true,
          complete: (results) => resolve(results.data),
          error: (error) => reject(error)
        });
      } else {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet);
            resolve(jsonData);
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsArrayBuffer(file);
      }
    });
  };

  const processFileWithMappings = async (data: any[], fileName: string) => {
    const newSKUs: BulkSKU[] = data
      .filter(row => row.sku_code && row.sku_code.toString().trim())
      .map(row => ({
        skuCode: row.sku_code?.toString().trim() || '',
        title: row.title?.toString().trim() || '',
        description: row.description?.toString().trim() || '',
        cost: typeof row.cost === 'number' ? row.cost : (parseFloat(row.cost) || 0),
        weight: typeof row.weight === 'number' ? row.weight : (parseFloat(row.weight) || 0),
        notes: row.notes?.toString().trim() || `Imported from ${fileName}`
      }));

    setBulkSKUs(prev => [...prev, ...newSKUs]);
  };

  // Bulk form handlers
  const addBulkSKU = () => {
    if (singleSKU.skuCode.trim()) {
      setBulkSKUs(prev => [...prev, { ...singleSKU }]);
      setSingleSKU({
        skuCode: '',
        title: '',
        description: '',
        cost: 0,
        weight: 0,
        notes: ''
      });
    }
  };

  const removeBulkSKU = (index: number) => {
    setBulkSKUs(prev => prev.filter((_, i) => i !== index));
  };

  // Parse pasted data
  const handlePasteData = () => {
    if (!pasteData.trim()) return;

    const lines = pasteData.trim().split('\n');
    const newSKUs: BulkSKU[] = [];

    lines.forEach(line => {
      const parts = line.split('\t').map(part => part.trim());
      if (parts.length >= 1 && parts[0]) {
        newSKUs.push({
          skuCode: parts[0] || '',
          title: parts[1] || '',
          description: parts[2] || '',
          cost: parseFloat(parts[3]) || 0,
          weight: parseFloat(parts[4]) || 0,
          notes: parts[5] || ''
        });
      }
    });

    setBulkSKUs(prev => [...prev, ...newSKUs]);
    setPasteData('');
  };

  // Multi-threaded save handler
  const handleSaveAll = async () => {
    if (bulkSKUs.length === 0) return;

    setIsProcessing(true);
    setIsShowingThreads(true);
    setProgress(0);
    setProgressLabel(`Preparing ${threadCount} threads for processing ${bulkSKUs.length} SKUs...`);

    const initialThreads: ThreadProgress[] = Array.from({ length: threadCount }, (_, i) => ({
      id: i,
      progress: 0,
      label: `Thread ${i + 1}: Ready`,
      status: 'waiting',
      processed: 0,
      total: 0
    }));
    setThreadProgress(initialThreads);

    try {
      const chunkSize = Math.ceil(bulkSKUs.length / threadCount);
      const chunks: BulkSKU[][] = [];
      
      for (let i = 0; i < threadCount; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, bulkSKUs.length);
        if (start < bulkSKUs.length) {
          chunks.push(bulkSKUs.slice(start, end));
        }
      }

      setProgressLabel(`Processing ${bulkSKUs.length} SKUs across ${chunks.length} threads...`);

      const threadPromises = chunks.map((chunk, threadIndex) => 
        processSkuChunk(chunk, threadIndex)
      );

      await Promise.all(threadPromises);

      setProgressLabel('All SKUs processed and saved successfully!');
      
      setBulkSKUs([]);
      setIsShowingThreads(false);
      
    } catch (error) {
      console.error('Error saving SKUs:', error);
    } finally {
      setIsProcessing(false);
      setProgress(0);
      setProgressLabel('');
    }
  };

  // Process a chunk of SKUs for a specific thread
  const processSkuChunk = async (chunk: BulkSKU[], threadIndex: number) => {
    const updateThreadProgress = (completed: number, total: number, label: string, status: ThreadProgress['status']) => {
      setThreadProgress(prev => prev.map(thread => 
        thread.id === threadIndex 
          ? { 
              ...thread, 
              progress: (completed / total) * 100,
              label,
              status,
              processed: completed,
              total
            }
          : thread
      ));
      
      setProgress(prev => {
        const completedAcrossThreads = threadProgress.reduce((acc, t) => acc + t.processed, 0) + completed;
        const totalAcrossThreads = bulkSKUs.length;
        return (completedAcrossThreads / totalAcrossThreads) * 100;
      });
    };

    updateThreadProgress(0, chunk.length, `Thread ${threadIndex + 1}: Starting bulk processing...`, 'processing');

    try {
      const dbSkus = chunk.map(sku => ({
        sku_code: sku.skuCode,
        title: sku.title,
        description: sku.description,
        cost: sku.cost,
        weight: sku.weight,
        notes: sku.notes,
        country: profile?.country || 'UAE'
      }));

      updateThreadProgress(
        0, 
        chunk.length, 
        `Thread ${threadIndex + 1}: Processing ${chunk.length} SKUs in bulk...`,
        'processing'
      );

      await onAddSKUs(dbSkus);
      
      updateThreadProgress(
        chunk.length, 
        chunk.length, 
        `Thread ${threadIndex + 1}: Successfully processed ${chunk.length} SKUs!`,
        'completed'
      );

      return dbSkus;
      
    } catch (error) {
      console.error(`Error in thread ${threadIndex + 1}:`, error);
      
      updateThreadProgress(
        0, 
        chunk.length, 
        `Thread ${threadIndex + 1}: Bulk failed, trying individual inserts...`,
        'processing'
      );

      const processedSKUs = [];
      for (let i = 0; i < chunk.length; i++) {
        const sku = chunk[i];
        
        try {
          const dbSku = {
            sku_code: sku.skuCode,
            title: sku.title,
            description: sku.description,
            cost: sku.cost,
            weight: sku.weight,
            notes: sku.notes,
            country: profile?.country || 'UAE'
          };

          await onAddSKUs([dbSku]);
          processedSKUs.push(dbSku);
          
          updateThreadProgress(
            i + 1, 
            chunk.length, 
            `Thread ${threadIndex + 1}: Saved ${sku.skuCode} (${i + 1}/${chunk.length})`,
            'processing'
          );
          
        } catch (individualError: any) {
          if (individualError?.message?.includes('duplicate key') || 
              individualError?.code === '23505') {
            console.log(`SKU ${sku.skuCode} already exists, skipping...`);
          } else {
            console.error(`Error saving SKU ${sku.skuCode}:`, individualError);
          }
          
          updateThreadProgress(
            i + 1, 
            chunk.length, 
            `Thread ${threadIndex + 1}: Processed ${sku.skuCode} (${i + 1}/${chunk.length})`,
            'processing'
          );
        }
      }

      updateThreadProgress(
        chunk.length, 
        chunk.length, 
        `Thread ${threadIndex + 1}: Completed ${processedSKUs.length}/${chunk.length} SKUs!`,
        processedSKUs.length === chunk.length ? 'completed' : 'error'
      );
      
      return processedSKUs;
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => navigate('/po-tracker')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to PO Tracker
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Add SKUs</h1>
          <p className="text-muted-foreground">
            Bulk upload and manage SKU data with advanced processing options
          </p>
        </div>
      </div>

      {/* Column Mapping Wizard */}
      {showMappingWizard && currentFileData && (
        <Dialog open={showMappingWizard} onOpenChange={() => {}}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Map Columns for {currentFileName}</DialogTitle>
              <DialogDescription>
                Map the columns from your file to the required SKU fields
              </DialogDescription>
            </DialogHeader>
            
            <SKUColumnMappingWizard
              fileData={currentFileData}
              expectedColumns={skuColumns}
              onMappingComplete={handleMappingComplete}
              onSaveMapping={handleSaveMapping}
              savedMappings={savedMappings}
            />
          </DialogContent>
        </Dialog>
      )}

      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="bulk" className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              File Upload
            </TabsTrigger>
            <TabsTrigger value="paste" className="flex items-center gap-2">
              <Clipboard className="h-4 w-4" />
              Paste Data
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Manual Entry
            </TabsTrigger>
          </TabsList>

          {/* File Upload Tab */}
          <TabsContent value="bulk" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Upload Excel/CSV Files
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div 
                  {...getRootProps()} 
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                    isDragActive 
                      ? 'border-primary bg-primary/5' 
                      : 'border-muted-foreground/25 hover:border-primary/50'
                  }`}
                >
                  <input {...getInputProps()} />
                  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <div className="space-y-2">
                    <p className="text-lg font-medium">
                      {isDragActive ? 'Drop files here...' : 'Drag & drop files here'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      or click to select Excel (.xlsx, .xls) or CSV files
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Multiple files supported • Column mapping included
                    </p>
                  </div>
                </div>
                
                {isProcessingQueue && (
                  <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="h-4 w-4 animate-spin" />
                      <span className="font-medium">Processing Files...</span>
                    </div>
                    <Progress value={progress} className="mb-2" />
                    <p className="text-sm text-muted-foreground">{progressLabel}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Paste Data Tab */}
          <TabsContent value="paste" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clipboard className="h-5 w-5" />
                  Paste Tab-Separated Data
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="paste-data">Paste your data (tab-separated)</Label>
                  <Textarea
                    id="paste-data"
                    placeholder="Paste tab-separated data here (SKU Code | Title | Description | Cost | Weight | Notes)"
                    value={pasteData}
                    onChange={(e) => setPasteData(e.target.value)}
                    className="min-h-[120px] font-mono text-sm"
                  />
                </div>
                <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded">
                  <p className="font-medium mb-1">Expected format (tab-separated):</p>
                  <p>SKU001 | Product Title | Description | 10.50 | 0.5 | Notes</p>
                </div>
                <Button onClick={handlePasteData} disabled={!pasteData.trim()}>
                  Process Pasted Data
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Manual Entry Tab */}
          <TabsContent value="manual" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Add Single SKU
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sku-code">SKU Code *</Label>
                    <Input
                      id="sku-code"
                      value={singleSKU.skuCode}
                      onChange={(e) => setSingleSKU(prev => ({ ...prev, skuCode: e.target.value }))}
                      placeholder="Enter SKU code"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={singleSKU.title}
                      onChange={(e) => setSingleSKU(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Product title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cost">Cost ({currencySymbol})</Label>
                    <Input
                      id="cost"
                      type="number"
                      step="0.01"
                      value={singleSKU.cost || ''}
                      onChange={(e) => setSingleSKU(prev => ({ ...prev, cost: parseFloat(e.target.value) || 0 }))}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="weight">Weight (kg)</Label>
                    <Input
                      id="weight"
                      type="number"
                      step="0.01"
                      value={singleSKU.weight || ''}
                      onChange={(e) => setSingleSKU(prev => ({ ...prev, weight: parseFloat(e.target.value) || 0 }))}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={singleSKU.description}
                    onChange={(e) => setSingleSKU(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Product description"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Input
                    id="notes"
                    value={singleSKU.notes}
                    onChange={(e) => setSingleSKU(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Additional notes"
                  />
                </div>
                <Button onClick={addBulkSKU} disabled={!singleSKU.skuCode.trim()}>
                  Add to List
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* SKU List */}
        {bulkSKUs.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Badge variant="secondary">{bulkSKUs.length}</Badge>
                  SKUs Ready for Processing
                </CardTitle>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label htmlFor="thread-count">Threads:</Label>
                  <Select value={threadCount.toString()} onValueChange={(value) => setThreadCount(parseInt(value))}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="4">4</SelectItem>
                      <SelectItem value="8">8</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={() => setBulkSKUs([])} variant="outline" size="sm">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="max-h-64 overflow-y-auto border rounded">
                  {bulkSKUs.map((sku, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border-b last:border-b-0">
                      <div className="flex-1 grid grid-cols-6 gap-2 text-sm">
                        <span className="font-mono font-medium">{sku.skuCode}</span>
                        <span className="truncate">{sku.title}</span>
                        <span className="truncate text-muted-foreground">{sku.description}</span>
                        <span>{sku.cost > 0 ? `${sku.cost} ${currencySymbol}` : '-'}</span>
                        <span>{sku.weight > 0 ? `${sku.weight} kg` : '-'}</span>
                        <span className="truncate text-muted-foreground">{sku.notes}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeBulkSKU(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Processing UI */}
                {isProcessing && (
                  <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-primary animate-pulse" />
                      <span className="font-medium">Multi-threaded Processing Active</span>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Overall Progress</span>
                        <span>{Math.round(progress)}%</span>
                      </div>
                      <Progress value={progress} />
                      <p className="text-sm text-muted-foreground">{progressLabel}</p>
                    </div>

                    {isShowingThreads && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Users className="h-4 w-4" />
                          Thread Status
                        </div>
                        <div className="grid gap-2">
                          {threadProgress.map((thread) => (
                            <div key={thread.id} className="flex items-center gap-3 p-2 bg-background rounded border">
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                {thread.status === 'completed' && <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />}
                                {thread.status === 'processing' && <Activity className="h-4 w-4 text-blue-500 animate-spin flex-shrink-0" />}
                                {thread.status === 'waiting' && <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                                {thread.status === 'error' && <X className="h-4 w-4 text-red-500 flex-shrink-0" />}
                                <span className="text-sm truncate">{thread.label}</span>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="text-xs text-muted-foreground">
                                  {thread.processed}/{thread.total}
                                </span>
                                <div className="w-16">
                                  <Progress value={thread.progress} className="h-2" />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button 
                    onClick={handleSaveAll} 
                    disabled={isProcessing || isLoading || bulkSKUs.length === 0}
                    className="flex items-center gap-2"
                  >
                    {isProcessing ? (
                      <Activity className="h-4 w-4 animate-spin" />
                    ) : (
                      <Zap className="h-4 w-4" />
                    )}
                    Save All SKUs ({bulkSKUs.length})
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default AddSKUPage;