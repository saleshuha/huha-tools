import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X, Upload, FileSpreadsheet, Clipboard, Trash2, Settings, Zap, Users, Activity, Clock, CheckCircle2 } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { Progress } from '@/components/ui/progress';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { SunskySKU } from '@/hooks/usePOTracker';
import { useUserProfile } from '@/hooks/useUserProfile';
import { ColumnMappingWizard } from '@/components/sales/ColumnMappingWizard';
import { ColumnMappingWizard as SKUColumnMappingWizard } from './SKUColumnMappingWizard';

interface AddSKUDialogProps {
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

export function AddSKUDialog({ onAddSKUs, isLoading }: AddSKUDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
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
      .sort((a, b) => a.size - b.size); // Process smaller files first
    
    if (sortedFiles.length === 0) {
      alert('Please upload Excel (.xlsx, .xls) or CSV files only');
      return;
    }

    setProcessQueue(sortedFiles);
    setCurrentFileIndex(0);
    
    // Start processing the first file for mapping
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

      // Extract headers and sample rows
      const headers = Object.keys(data[0]);
      const rows = data.slice(0, 100); // First 100 rows for mapping

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
      
      // Save the mapping for future use
      setSavedMappings(prev => ({ ...prev, [currentFileName]: mapping }));
      
      // Process the mapped data from first file
      await processFileWithMappings(mappedData, currentFileName);
      
      // Process remaining files with same mappings if multiple files
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
          // Apply saved mapping to this file's data
          const mappedData = data.map(row => {
            const processedRow: any = {};
            Object.entries(mapping).forEach(([expectedCol, headerCol]) => {
              let value = row[headerCol as string];
              
              // Convert numeric fields
              if (expectedCol === 'cost' || expectedCol === 'weight') {
                value = parseFloat(value) || 0;
              }
              
              // Clean string fields
              if (typeof value === 'string') {
                value = value.trim();
              }
              
              if (value !== undefined && value !== null && value !== '') {
                processedRow[expectedCol] = value;
              }
            });
            return processedRow;
          }).filter(row => row.sku_code); // Only include rows with SKU codes
          
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

    // Initialize thread progress
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
      // Split SKUs into chunks for each thread
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

      // Process chunks in parallel
      const threadPromises = chunks.map((chunk, threadIndex) => 
        processSkuChunk(chunk, threadIndex)
      );

      await Promise.all(threadPromises);

      setProgressLabel('All SKUs processed and saved successfully!');
      
      // Reset state
      setBulkSKUs([]);
      setIsOpen(false);
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
      
      // Update overall progress across all threads
      setProgress(prev => {
        const completedAcrossThreads = threadProgress.reduce((acc, t) => acc + t.processed, 0) + completed;
        const totalAcrossThreads = bulkSKUs.length;
        return (completedAcrossThreads / totalAcrossThreads) * 100;
      });
    };

    updateThreadProgress(0, chunk.length, `Thread ${threadIndex + 1}: Starting...`, 'processing');

    // Process and save SKUs individually
    const processedSKUs = [];
    for (let i = 0; i < chunk.length; i++) {
      const sku = chunk[i];
      
      try {
        updateThreadProgress(
          i, 
          chunk.length, 
          `Thread ${threadIndex + 1}: Saving ${sku.skuCode} (${i + 1}/${chunk.length})`,
          'processing'
        );

        // Convert to database format
        const dbSku = {
          sku_code: sku.skuCode,
          title: sku.title,
          description: sku.description,
          cost: sku.cost,
          weight: sku.weight,
          notes: sku.notes,
          country: profile?.country || 'UAE'
        };

        // Save individual SKU
        await onAddSKUs([dbSku]);
        processedSKUs.push(dbSku);
        
        updateThreadProgress(
          i + 1, 
          chunk.length, 
          `Thread ${threadIndex + 1}: Saved ${sku.skuCode} (${i + 1}/${chunk.length})`,
          'processing'
        );
        
        // Small delay to prevent overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
        
      } catch (error) {
        console.error(`Error saving SKU ${sku.skuCode}:`, error);
        updateThreadProgress(
          i + 1, 
          chunk.length, 
          `Thread ${threadIndex + 1}: Error saving ${sku.skuCode}`,
          'error'
        );
      }
    }

    updateThreadProgress(chunk.length, chunk.length, `Thread ${threadIndex + 1}: Completed ${processedSKUs.length} SKUs!`, 'completed');
    return processedSKUs;
  };

  return (
    <>
      {/* Column Mapping Wizard */}
      {showMappingWizard && currentFileData && (
        <Dialog open={showMappingWizard} onOpenChange={() => {}}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>Map Columns - {currentFileName}</DialogTitle>
              <DialogDescription>
                Map the columns from your file to the SKU fields. This mapping will be applied to all uploaded files.
              </DialogDescription>
            </DialogHeader>
            <SKUColumnMappingWizard
              fileData={currentFileData}
              expectedColumns={skuColumns}
              onMappingComplete={handleMappingComplete}
              savedMappings={savedMappings}
              onSaveMapping={handleSaveMapping}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Main Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add SKUs
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Sunsky SKUs</DialogTitle>
          <DialogDescription>
            Add new SKUs to your Sunsky supplier database with multi-threaded processing
          </DialogDescription>
        </DialogHeader>

        {/* Progress indicator */}
        {(isProcessing || isProcessingQueue) && (
          <div className="space-y-4 mb-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{progressLabel}</span>
              <Badge variant="outline">{Math.round(progress)}%</Badge>
            </div>
            <Progress value={progress} className="w-full" />
            
            {/* Thread Progress */}
            {isShowingThreads && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center text-sm">
                    <Users className="h-4 w-4 mr-2" />
                    Thread Progress ({threadCount} threads)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {threadProgress.map((thread) => (
                    <div key={thread.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center">
                          {thread.status === 'waiting' && <Clock className="h-3 w-3 mr-1 text-gray-500" />}
                          {thread.status === 'processing' && <Activity className="h-3 w-3 mr-1 text-blue-500 animate-pulse" />}
                          {thread.status === 'completed' && <CheckCircle2 className="h-3 w-3 mr-1 text-green-500" />}
                          {thread.status === 'error' && <X className="h-3 w-3 mr-1 text-red-500" />}
                          {thread.label}
                        </span>
                        <span className="flex items-center space-x-2">
                          <span>{thread.processed}/{thread.total}</span>
                          <span>{Math.round(thread.progress)}%</span>
                        </span>
                      </div>
                      <Progress value={thread.progress} className="h-1" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="bulk">Bulk Entry</TabsTrigger>
            <TabsTrigger value="paste">Paste Data</TabsTrigger>
            <TabsTrigger value="files">File Upload</TabsTrigger>
          </TabsList>

          <TabsContent value="bulk" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>SKU Code *</Label>
                <Input
                  value={singleSKU.skuCode}
                  onChange={(e) => setSingleSKU(prev => ({ ...prev, skuCode: e.target.value }))}
                  placeholder="Enter SKU code"
                />
              </div>
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={singleSKU.title}
                  onChange={(e) => setSingleSKU(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Product title"
                />
              </div>
              <div className="space-y-2">
                <Label>Cost ({currencySymbol})</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={singleSKU.cost || ''}
                  onChange={(e) => setSingleSKU(prev => ({ ...prev, cost: parseFloat(e.target.value) || 0 }))}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Weight (g)</Label>
                <Input
                  type="number"
                  value={singleSKU.weight || ''}
                  onChange={(e) => setSingleSKU(prev => ({ ...prev, weight: parseFloat(e.target.value) || 0 }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Description</Label>
                <Textarea
                  value={singleSKU.description}
                  onChange={(e) => setSingleSKU(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Product description"
                  rows={2}
                />
              </div>
            </div>
            <Button 
              onClick={addBulkSKU} 
              disabled={!singleSKU.skuCode.trim()}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add to List
            </Button>
          </TabsContent>

          <TabsContent value="paste" className="space-y-4">
            <div className="space-y-2">
              <Label>Paste Tab-Separated Data</Label>
              <Textarea
                value={pasteData}
                onChange={(e) => setPasteData(e.target.value)}
                placeholder="SKU Code	Title	Description	Cost	Weight	Notes"
                rows={8}
              />
              <p className="text-sm text-muted-foreground">
                Paste data with columns: SKU Code, Title, Description, Cost, Weight, Notes (tab-separated)
              </p>
            </div>
            <Button 
              onClick={handlePasteData} 
              disabled={!pasteData.trim()}
              className="w-full"
            >
              <Clipboard className="h-4 w-4 mr-2" />
              Parse Data
            </Button>
          </TabsContent>

          <TabsContent value="files" className="space-y-4">
            <div 
              {...getRootProps()} 
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-semibold mb-2">Upload Excel or CSV Files</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {isDragActive ? 'Drop files here...' : 'Drag & drop files here, or click to browse'}
              </p>
              <Button variant="outline">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Choose Files
              </Button>
            </div>
            
            {processQueue.length > 0 && (
              <div className="space-y-2">
                <Label>Files in Queue ({processQueue.length})</Label>
                <div className="space-y-1">
                  {processQueue.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="text-sm">{file.name}</span>
                      <Badge variant={index <= currentFileIndex ? 'default' : 'secondary'}>
                        {index < currentFileIndex ? 'Processed' : index === currentFileIndex ? 'Processing' : 'Pending'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* SKU List */}
        {bulkSKUs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>SKUs to Add ({bulkSKUs.length})</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setBulkSKUs([])}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Clear All
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {bulkSKUs.map((sku, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">{sku.skuCode}</Badge>
                        <span className="font-medium">{sku.title}</span>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                        {sku.cost > 0 && <span>{sku.cost.toFixed(2)} {currencySymbol}</span>}
                        {sku.weight > 0 && <span>{sku.weight}g</span>}
                      </div>
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
            </CardContent>
          </Card>
        )}

        <DialogFooter className="flex flex-col space-y-3">
          {/* Thread Configuration */}
          {bulkSKUs.length > 0 && (
            <div className="flex items-center justify-between w-full p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Zap className="h-4 w-4 text-primary" />
                <Label htmlFor="thread-count" className="text-sm font-medium">
                  Processing Threads:
                </Label>
                <Select 
                  value={threadCount.toString()} 
                  onValueChange={(value) => setThreadCount(parseInt(value))}
                  disabled={isProcessing}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="4">4</SelectItem>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="8">8</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Badge variant="secondary" className="text-xs">
                ~{Math.ceil(bulkSKUs.length / threadCount)} SKUs per thread
              </Badge>
            </div>
          )}
          
          <div className="flex justify-between w-full">
            <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isProcessing}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveAll} 
              disabled={bulkSKUs.length === 0 || isProcessing}
              className="min-w-[120px]"
            >
              {isProcessing ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                  Processing...
                </div>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add {bulkSKUs.length} SKUs
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}