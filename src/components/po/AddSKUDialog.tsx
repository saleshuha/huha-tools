import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Plus, Upload, Type, Trash2 } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { SunskySKU } from '@/hooks/usePOTracker';

interface AddSKUDialogProps {
  onAddSKUs: (skus: Omit<SunskySKU, 'id' | 'created_at' | 'updated_at' | 'user_id'>[]) => Promise<void>;
  isLoading: boolean;
}

export function AddSKUDialog({ onAddSKUs, isLoading }: AddSKUDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('manual');
  
  // Manual form state
  const [manualSKU, setManualSKU] = useState({
    sku_code: '',
    title: '',
    cost: '',
    weight: ''
  });

  // Bulk SKUs state
  const [bulkSKUs, setBulkSKUs] = useState<Omit<SunskySKU, 'id' | 'created_at' | 'updated_at' | 'user_id'>[]>([]);
  const [pasteData, setPasteData] = useState('');
  
  // Progress state
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');

  // ALL HOOKS MUST BE CALLED HERE - AT THE TOP LEVEL
  // Dropzone hook - using hoisted function declaration
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleFileUpload,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    multiple: true
  });

  // Function declarations (these are hoisted so can be referenced above)
  async function handleFileUpload(files: File[]) {
    setIsProcessing(true);
    setProgress(0);
    setProgressLabel('Starting file processing...');
    
    try {
      for (const file of files) {
        const fileSize = (file.size / (1024 * 1024)).toFixed(2); // MB
        console.log(`Processing file: ${file.name}, Size: ${fileSize}MB`);
        
        // Limit file size to 15MB to prevent memory issues
        if (file.size > 15 * 1024 * 1024) {
          setProgressLabel(`File ${file.name} is too large (${fileSize}MB). Maximum size is 15MB.`);
          continue;
        }
        
        setProgressLabel(`Reading ${file.name} (${fileSize}MB)...`);
        
        const newSKUs: Omit<SunskySKU, 'id' | 'created_at' | 'updated_at' | 'user_id'>[] = [];
        
        if (file.name.toLowerCase().endsWith('.csv')) {
          await processCsvFileStreaming(file, newSKUs);
        } else if (file.name.toLowerCase().match(/\.(xlsx|xls)$/)) {
          await processExcelFileStreaming(file, newSKUs);
        } else {
          setProgressLabel(`Unsupported file type: ${file.name}`);
          continue;
        }
        
        console.log(`Processed ${newSKUs.length} SKUs from ${file.name}`);
        
        // Add SKUs in smaller batches to prevent UI freezing
        const batchSize = 500;
        for (let i = 0; i < newSKUs.length; i += batchSize) {
          const batch = newSKUs.slice(i, i + batchSize);
          setBulkSKUs(prev => [...prev, ...batch]);
          
          setProgressLabel(`Adding batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(newSKUs.length/batchSize)} to UI...`);
          
          // Allow UI to update between batches
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        setProgressLabel(`Successfully loaded ${newSKUs.length} SKUs from ${file.name}`);
      }
    } catch (error) {
      console.error('Error processing file:', error);
      setProgressLabel(`Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
    } finally {
      setIsProcessing(false);
      setProgress(100);
      // Clear progress after 3 seconds
      setTimeout(() => {
        setProgress(0);
        setProgressLabel('');
      }, 3000);
    }
  }

  async function processCsvFileStreaming(file: File, newSKUs: Omit<SunskySKU, 'id' | 'created_at' | 'updated_at' | 'user_id'>[]) {
    return new Promise<void>((resolve, reject) => {
      const reader = new FileReader();
      let processedRows = 0;
      let totalEstimatedRows = 0;
      
      reader.onload = async (e) => {
        try {
          const text = e.target?.result as string;
          if (!text) throw new Error('Failed to read file content');
          
          const lines = text.split('\n');
          totalEstimatedRows = lines.length;
          console.log(`CSV file has ${totalEstimatedRows} lines`);
          
          const chunkSize = 100; // Smaller chunks for better responsiveness
          
          for (let i = 1; i < lines.length; i += chunkSize) { // Skip header
            const chunk = lines.slice(i, Math.min(i + chunkSize, lines.length));
            
            // Process chunk
            chunk.forEach((line, index) => {
              const trimmedLine = line.trim();
              if (!trimmedLine) return;
              
              try {
                const columns = trimmedLine.split(',').map(col => col.trim().replace(/^"|"$/g, ''));
                if (columns.length >= 1 && columns[0]) {
                  newSKUs.push({
                    sku_code: columns[0],
                    title: columns[1] || undefined,
                    description: columns[2] || undefined,
                    cost: columns[3] ? parseFloat(columns[3]) : undefined,
                    weight: columns[4] ? parseFloat(columns[4]) : undefined,
                    notes: columns[5] || undefined
                  });
                }
              } catch (rowError) {
                console.warn(`Error processing row ${i + index}:`, rowError);
              }
            });
            
            processedRows = i + chunk.length;
            const progressValue = (processedRows / totalEstimatedRows) * 100;
            setProgress(Math.min(progressValue, 95));
            setProgressLabel(`Processing CSV: ${processedRows}/${totalEstimatedRows} rows (${newSKUs.length} valid SKUs)`);
            
            // Yield control every 1000 rows
            if (i % 1000 === 0) {
              await new Promise(resolve => setTimeout(resolve, 5));
            }
          }
          
          setProgress(100);
          resolve();
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  async function processExcelFileStreaming(file: File, newSKUs: Omit<SunskySKU, 'id' | 'created_at' | 'updated_at' | 'user_id'>[]) {
    return new Promise<void>((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const buffer = e.target?.result as ArrayBuffer;
          if (!buffer) throw new Error('Failed to read file content');
          
          setProgressLabel('Parsing Excel file...');
          
          const workbook = XLSX.read(buffer, { type: 'buffer' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          
          if (!firstSheet) throw new Error('No sheets found in Excel file');
          
          // Convert to JSON in streaming fashion
          const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' }) as any[][];
          
          console.log(`Excel file has ${data.length} rows`);
          
          const totalRows = data.length;
          const chunkSize = 100; // Smaller chunks
          
          for (let i = 1; i < totalRows; i += chunkSize) { // Skip header
            const chunk = data.slice(i, Math.min(i + chunkSize, totalRows));
            
            // Process chunk
            chunk.forEach((row, index) => {
              if (!row || !row[0]) return;
              
              try {
                newSKUs.push({
                  sku_code: String(row[0]).trim(),
                  title: row[1] ? String(row[1]).trim() : undefined,
                  description: row[2] ? String(row[2]).trim() : undefined,
                  cost: row[3] ? parseFloat(String(row[3])) : undefined,
                  weight: row[4] ? parseFloat(String(row[4])) : undefined,
                  notes: row[5] ? String(row[5]).trim() : undefined
                });
              } catch (rowError) {
                console.warn(`Error processing Excel row ${i + index}:`, rowError);
              }
            });
            
            const processedRows = i + chunk.length;
            const progressValue = (processedRows / totalRows) * 100;
            setProgress(Math.min(progressValue, 95));
            setProgressLabel(`Processing Excel: ${processedRows}/${totalRows} rows (${newSKUs.length} valid SKUs)`);
            
            // Yield control every 1000 rows
            if (i % 1000 === 0) {
              await new Promise(resolve => setTimeout(resolve, 5));
            }
          }
          
          setProgress(100);
          resolve();
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read Excel file'));
      reader.readAsArrayBuffer(file);
    });
  }

  const handleManualAdd = async () => {
    if (!manualSKU.sku_code.trim()) return;

    const newSKU = {
      sku_code: manualSKU.sku_code.trim(),
      title: manualSKU.title.trim() || undefined,
      cost: manualSKU.cost ? parseFloat(manualSKU.cost) : undefined,
      weight: manualSKU.weight ? parseFloat(manualSKU.weight) : undefined
    };

    await onAddSKUs([newSKU]);
    setManualSKU({ sku_code: '', title: '', cost: '', weight: '' });
    setIsOpen(false);
  };

  const handleBulkAdd = async () => {
    if (bulkSKUs.length === 0) return;
    
    setIsProcessing(true);
    setProgress(0);
    setProgressLabel(`Adding ${bulkSKUs.length} SKUs...`);
    
    try {
      const batchSize = 50; // Process in batches of 50
      const batches = [];
      
      for (let i = 0; i < bulkSKUs.length; i += batchSize) {
        batches.push(bulkSKUs.slice(i, i + batchSize));
      }
      
      for (let i = 0; i < batches.length; i++) {
        await onAddSKUs(batches[i]);
        const progressValue = ((i + 1) / batches.length) * 100;
        setProgress(progressValue);
        setProgressLabel(`Processing batch ${i + 1} of ${batches.length}...`);
        
        // Small delay to show progress
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      setBulkSKUs([]);
      setIsOpen(false);
    } finally {
      setIsProcessing(false);
      setProgress(0);
      setProgressLabel('');
    }
  };

  const handlePasteProcess = () => {
    if (!pasteData.trim()) return;

    const lines = pasteData.split('\n').filter(line => line.trim());
    const newSKUs: Omit<SunskySKU, 'id' | 'created_at' | 'updated_at' | 'user_id'>[] = [];

    lines.forEach(line => {
      const columns = line.split('\t').map(col => col.trim()); // Tab-separated
      if (columns.length >= 1 && columns[0]) {
        newSKUs.push({
          sku_code: columns[0],
          title: columns[1] || undefined,
          description: columns[2] || undefined,
          cost: columns[3] ? parseFloat(columns[3]) : undefined,
          weight: columns[4] ? parseFloat(columns[4]) : undefined,
          notes: columns[5] || undefined
        });
      }
    });

    setBulkSKUs(prev => [...prev, ...newSKUs]);
    setPasteData('');
  };



  const removeBulkSKU = (index: number) => {
    setBulkSKUs(prev => prev.filter((_, i) => i !== index));
  };

  return (
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
            Add new SKUs to your Sunsky supplier database
          </DialogDescription>
        </DialogHeader>

        {/* Progress indicator */}
        {isProcessing && (
          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{progressLabel}</span>
              <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="manual">Manual Entry</TabsTrigger>
            <TabsTrigger value="bulk">Bulk Upload</TabsTrigger>
            <TabsTrigger value="paste">Paste Data</TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sku_code">SKU Code *</Label>
                <Input
                  id="sku_code"
                  value={manualSKU.sku_code}
                  onChange={(e) => setManualSKU(prev => ({ ...prev, sku_code: e.target.value }))}
                  placeholder="Enter SKU code"
                />
              </div>
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={manualSKU.title}
                  onChange={(e) => setManualSKU(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Product title"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cost">Cost</Label>
                <Input
                  id="cost"
                  type="number"
                  step="0.01"
                  value={manualSKU.cost}
                  onChange={(e) => setManualSKU(prev => ({ ...prev, cost: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="weight">Weight (grams)</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.01"
                  value={manualSKU.weight}
                  onChange={(e) => setManualSKU(prev => ({ ...prev, weight: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
            </div>
            <Button 
              onClick={handleManualAdd} 
              disabled={!manualSKU.sku_code.trim() || isLoading}
              className="w-full"
            >
              Add SKU
            </Button>
          </TabsContent>

          <TabsContent value="bulk" className="space-y-4">
            <Card 
              {...getRootProps()} 
              className={`border-2 border-dashed cursor-pointer transition-colors ${
                isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
              }`}
            >
              <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                <input {...getInputProps()} />
                <Upload className={`h-10 w-10 mb-3 ${isDragActive ? 'text-primary' : 'text-muted-foreground'}`} />
                <h3 className="text-lg font-semibold mb-2">
                  {isDragActive ? 'Drop files here' : 'Upload SKU Files'}
                </h3>
                <p className="text-muted-foreground mb-4">
                  CSV or Excel files with format: SKU Code, Title, Description, Cost, Weight, Notes
                </p>
              </CardContent>
            </Card>

            {bulkSKUs.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">Ready to Add ({bulkSKUs.length} SKUs)</h4>
                  <Button
                    onClick={handleBulkAdd}
                    disabled={isLoading || isProcessing}
                  >
                    Add All SKUs
                  </Button>
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {bulkSKUs.map((sku, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">{sku.sku_code}</Badge>
                        <span className="text-sm">{sku.title || 'No title'}</span>
                        {sku.cost && <Badge variant="secondary">${sku.cost}</Badge>}
                        {sku.weight && <Badge variant="outline">{sku.weight}kg</Badge>}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeBulkSKU(index)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="paste" className="space-y-4">
            <div>
              <Label htmlFor="paste_data">Paste SKU Data</Label>
              <Textarea
                id="paste_data"
                value={pasteData}
                onChange={(e) => setPasteData(e.target.value)}
                placeholder="Paste tab-separated data:&#10;SKU123&#9;Product Title&#9;Product Description&#9;15.99&#9;2.5&#9;Notes&#10;SKU456&#9;Another Title&#9;Another Description&#9;25.50&#9;1.2&#9;More notes"
                rows={6}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Format: Each line should contain: SKU Code [TAB] Title [TAB] Description [TAB] Cost [TAB] Weight [TAB] Notes
              </p>
            </div>
            <Button 
              onClick={handlePasteProcess}
              disabled={!pasteData.trim()}
              variant="outline"
              className="w-full"
            >
              <Type className="h-4 w-4 mr-2" />
              Process Pasted Data
            </Button>

            {bulkSKUs.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">Ready to Add ({bulkSKUs.length} SKUs)</h4>
                  <Button
                    onClick={handleBulkAdd}
                    disabled={isLoading || isProcessing}
                  >
                    Add All SKUs
                  </Button>
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {bulkSKUs.map((sku, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">{sku.sku_code}</Badge>
                        <span className="text-sm">{sku.title || 'No title'}</span>
                        {sku.cost && <Badge variant="secondary">${sku.cost}</Badge>}
                        {sku.weight && <Badge variant="outline">{sku.weight}kg</Badge>}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeBulkSKU(index)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}