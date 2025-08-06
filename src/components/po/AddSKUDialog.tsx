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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Upload, Type, Trash2, ArrowRight, X, FileSpreadsheet, CheckCircle } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { SunskySKU } from '@/hooks/usePOTracker';
import { ExcelData, ColumnMapping } from '@/types/excel';

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
  
  // File processing queue and mapping state
  const [fileQueue, setFileQueue] = useState<File[]>([]);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [parsedFileData, setParsedFileData] = useState<ExcelData | null>(null);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping>({});
  const [showMapping, setShowMapping] = useState(false);
  
  // Progress state
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');

  // Robust CSV parsing function that handles Arabic text and quoted values
  const parseCsvForMapping = async (file: File): Promise<ExcelData> => {
    console.log('Starting CSV parsing for:', file.name);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          console.log('FileReader onload triggered');
          const text = e.target?.result as string;
          console.log('File content length:', text?.length);
          
          if (!text) {
            console.error('No text content found');
            throw new Error('Failed to read file content');
          }
          
          // Robust CSV parsing that handles quoted values and Arabic text
          const parseCSVLine = (line: string): string[] => {
            const result: string[] = [];
            let current = '';
            let inQuotes = false;
            let i = 0;
            
            while (i < line.length) {
              const char = line[i];
              
              if (char === '"') {
                // Handle escaped quotes
                if (inQuotes && line[i + 1] === '"') {
                  current += '"';
                  i += 2;
                  continue;
                }
                inQuotes = !inQuotes;
              } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
              } else {
                current += char;
              }
              i++;
            }
            
            // Add the last field
            result.push(current.trim());
            return result;
          };
          
          const lines = text.split(/\r?\n/).filter(line => line.trim());
          console.log('Number of lines found:', lines.length);
          
          if (lines.length === 0) {
            console.error('File appears to be empty');
            throw new Error('File is empty');
          }
          
          // Parse headers using robust method
          const headers = parseCSVLine(lines[0]).map(col => col.replace(/^"|"$/g, ''));
          console.log('Headers found:', headers);
          
          // Parse data rows using robust method
          const data = lines.slice(1).map(line => {
            const row = parseCSVLine(line).map(col => col.replace(/^"|"$/g, ''));
            return row;
          });
          
          console.log('Data rows:', data.length);
          console.log('First few data rows:');
          data.slice(0, 3).forEach((row, i) => {
            console.log(`Data row ${i}:`, row);
            console.log(`  Row length: ${row.length}, Headers length: ${headers.length}`);
          });
          
          const result = {
            headers,
            data,
            fileName: file.name
          };
          
          console.log('CSV parsing completed successfully:', result);
          resolve(result);
        } catch (error) {
          console.error('Error in CSV parsing:', error);
          reject(error);
        }
      };
      
      reader.onerror = (error) => {
        console.error('FileReader error:', error);
        reject(new Error('Failed to read file'));
      };
      
      console.log('Starting to read file as text with UTF-8 encoding');
      reader.readAsText(file, 'UTF-8'); // Explicitly specify UTF-8 encoding for Arabic text
    });
  };

  // Excel parsing function  
  const parseExcelForMapping = async (file: File): Promise<ExcelData> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const buffer = e.target?.result as ArrayBuffer;
          if (!buffer) throw new Error('Failed to read file content');
          
          const workbook = XLSX.read(buffer, { type: 'buffer' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          
          if (!firstSheet) throw new Error('No sheets found in Excel file');
          
          const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' }) as any[][];
          if (data.length === 0) throw new Error('Sheet is empty');
          
          const headers = data[0].map(header => String(header).trim());
          const rows = data.slice(1);
          
          resolve({
            headers,
            data: rows,
            fileName: file.name
          });
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read Excel file'));
      reader.readAsArrayBuffer(file);
    });
  };

  // File processing function
  const processFileForMapping = async (file: File) => {
    console.log('processFileForMapping called with file:', file.name);
    setIsProcessing(true);
    setProgress(0);
    setProgressLabel(`Reading ${file.name}...`);
    
    try {
      const fileSize = (file.size / (1024 * 1024)).toFixed(2);
      
      if (file.size > 15 * 1024 * 1024) {
        setProgressLabel(`File ${file.name} is too large (${fileSize}MB). Maximum size is 15MB.`);
        return;
      }

      let fileData: ExcelData;
      
      if (file.name.toLowerCase().endsWith('.csv')) {
        fileData = await parseCsvForMapping(file);
      } else if (file.name.toLowerCase().match(/\.(xlsx|xls)$/)) {
        fileData = await parseExcelForMapping(file);
      } else {
        setProgressLabel(`Unsupported file type: ${file.name}`);
        return;
      }

      setParsedFileData(fileData);
      setShowMapping(true);
      setProgressLabel(`File parsed successfully. Please map columns.`);
      console.log('File parsed, showing mapping interface. Headers:', fileData.headers);
      console.log('Setting showMapping to true. Current showMapping state will be:', true);
      
    } catch (error) {
      console.error('Error processing file:', error);
      setProgressLabel(`Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
    } finally {
      setIsProcessing(false);
      setProgress(100);
    }
  };

  // Function to handle file upload
  const handleFileUpload = async (files: File[]) => {
    console.log('handleFileUpload called with files:', files);
    if (files.length === 0) {
      console.log('No files provided');
      return;
    }
    
    console.log('Setting file queue and processing first file');
    
    // Reset all state before processing new files
    setBulkSKUs([]);
    setColumnMappings({});
    setParsedFileData(null);
    setShowMapping(false);
    setIsProcessing(false);
    setProgress(0);
    setProgressLabel('');
    
    setFileQueue(files);
    setCurrentFileIndex(0);
    
    // Start processing first file
    try {
      await processFileForMapping(files[0]);
    } catch (error) {
      console.error('Error in processFileForMapping:', error);
    }
  };

  // ALL HOOKS MUST BE CALLED HERE - AT THE TOP LEVEL
  // Dropzone hook
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleFileUpload,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    multiple: true
  });

  // Target columns for SKU mapping
  const targetColumns = ['SKU', 'Title', 'Cost', 'Weight'];
  const targetData: ExcelData = {
    headers: targetColumns,
    data: [],
    fileName: 'Target SKU Format'
  };

  const handleCreateMapping = (sourceColumn: string, targetColumn: string) => {
    setColumnMappings(prev => ({
      ...prev,
      [sourceColumn]: targetColumn
    }));
  };

  const handleRemoveMapping = (sourceColumn: string) => {
    setColumnMappings(prev => {
      const newMappings = { ...prev };
      delete newMappings[sourceColumn];
      return newMappings;
    });
  };

  const processCurrentFileWithMapping = async () => {
    if (!parsedFileData || Object.keys(columnMappings).length === 0) return;
    
    setIsProcessing(true);
    setProgress(0);
    setProgressLabel('Processing file with column mapping...');
    
    const newSKUs: Omit<SunskySKU, 'id' | 'created_at' | 'updated_at' | 'user_id'>[] = [];
    
    try {
      // Create reverse mapping for easier lookup
      const reverseMapping: { [key: string]: string } = {};
      Object.entries(columnMappings).forEach(([sourceCol, targetCol]) => {
        reverseMapping[targetCol] = sourceCol;
      });
      
      // Get column indices
      const skuIndex = parsedFileData.headers.findIndex(h => h === reverseMapping['SKU']);
      const titleIndex = parsedFileData.headers.findIndex(h => h === reverseMapping['Title']);
      const costIndex = parsedFileData.headers.findIndex(h => h === reverseMapping['Cost']);
      const weightIndex = parsedFileData.headers.findIndex(h => h === reverseMapping['Weight']);
      
      console.log('=== COLUMN MAPPING DEBUG ===');
      console.log('Headers found in CSV:', parsedFileData.headers);
      console.log('Column mappings:', columnMappings);
      console.log('Reverse mapping:', reverseMapping);
      console.log('Column indices - SKU:', skuIndex, 'Title:', titleIndex, 'Cost:', costIndex, 'Weight:', weightIndex);
      console.log('Sample data rows:');
      parsedFileData.data.slice(0, 3).forEach((row, i) => {
        console.log(`Row ${i}:`, row);
        console.log(`  SKU (index ${skuIndex}):`, row[skuIndex]);
        console.log(`  Title (index ${titleIndex}):`, row[titleIndex]);
        console.log(`  Cost (index ${costIndex}):`, row[costIndex]);
        console.log(`  Weight (index ${weightIndex}):`, row[weightIndex]);
      });
      console.log('============================');
      
      if (skuIndex === -1) {
        setProgressLabel('Error: SKU column mapping is required');
        return;
      }
      
      // Process data
      const totalRows = parsedFileData.data.length;
      const batchSize = 100;
      
      for (let i = 0; i < totalRows; i += batchSize) {
        const batch = parsedFileData.data.slice(i, Math.min(i + batchSize, totalRows));
        
        batch.forEach(row => {
          if (row && row[skuIndex]) {
            // Helper function to parse numeric values safely
            const parseNumericValue = (value: any): number | undefined => {
              if (!value || value === '') return undefined;
              const cleanedValue = String(value).trim().replace(/[^0-9.-]/g, '');
              const parsed = parseFloat(cleanedValue);
              return isNaN(parsed) ? undefined : parsed;
            };

            const sku = {
              sku_code: String(row[skuIndex]).trim(),
              title: titleIndex !== -1 && row[titleIndex] ? String(row[titleIndex]).trim() : undefined,
              cost: costIndex !== -1 && row[costIndex] ? parseNumericValue(row[costIndex]) : undefined,
              weight: weightIndex !== -1 && row[weightIndex] ? parseNumericValue(row[weightIndex]) : undefined
            };

            console.log('Processing SKU:', sku); // Debug log
            newSKUs.push(sku);
          }
        });
        
        const processed = Math.min(i + batchSize, totalRows);
        setProgress((processed / totalRows) * 100);
        setProgressLabel(`Processing: ${processed}/${totalRows} rows`);
        
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      // Add to bulk SKUs
      setBulkSKUs(prev => [...prev, ...newSKUs]);
      setProgressLabel(`Successfully processed ${newSKUs.length} SKUs`);
      
      // Move to next file or reset
      const nextIndex = currentFileIndex + 1;
      if (nextIndex < fileQueue.length) {
        setCurrentFileIndex(nextIndex);
        setColumnMappings({});
        setParsedFileData(null);
        setShowMapping(false);
        
        // Process next file
        setTimeout(() => {
          processFileForMapping(fileQueue[nextIndex]);
        }, 1000);
      } else {
        // All files processed
        setShowMapping(false);
        setFileQueue([]);
        setCurrentFileIndex(0);
        setColumnMappings({});
        setParsedFileData(null);
      }
      
    } catch (error) {
      console.error('Error processing mapped data:', error);
      setProgressLabel(`Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
    } finally {
      setIsProcessing(false);
      if (currentFileIndex >= fileQueue.length - 1) {
        setProgress(0);
        setProgressLabel('');
      }
    }
  };

  const skipCurrentFile = () => {
    const nextIndex = currentFileIndex + 1;
    if (nextIndex < fileQueue.length) {
      setCurrentFileIndex(nextIndex);
      setColumnMappings({});
      setParsedFileData(null);
      setShowMapping(false);
      processFileForMapping(fileQueue[nextIndex]);
    } else {
      // All files processed/skipped
      setShowMapping(false);
      setFileQueue([]);
      setCurrentFileIndex(0);
      setColumnMappings({});
      setParsedFileData(null);
    }
  };

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
            {!showMapping ? (
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
                    Upload CSV or Excel files with SKU data. Files will be processed one by one with column mapping.
                  </p>
                  <Badge variant="outline" className="mt-2">
                    Required columns: SKU, Title, Cost, Weight
                  </Badge>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {/* File Queue Status */}
                {fileQueue.length > 1 && (
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <FileSpreadsheet className="h-4 w-4" />
                          <span className="text-sm font-medium">
                            Processing file {currentFileIndex + 1} of {fileQueue.length}
                          </span>
                        </div>
                        <Badge variant="secondary">
                          {fileQueue.length - currentFileIndex - 1} remaining
                        </Badge>
                      </div>
                      <div className="mt-2">
                        <p className="text-xs text-muted-foreground">
                          Current: {parsedFileData?.fileName}
                        </p>
                        {fileQueue.length > currentFileIndex + 1 && (
                          <p className="text-xs text-muted-foreground">
                            Next: {fileQueue[currentFileIndex + 1]?.name}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Column Mapping Interface */}
                {parsedFileData && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <span>Map Columns for {parsedFileData.fileName}</span>
                        <Badge variant="secondary">
                          {Object.keys(columnMappings).length} mapped
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="text-sm text-muted-foreground mb-4">
                        Map your file columns to the required SKU fields. At minimum, SKU column is required.
                      </div>

                      {/* Show CSV Preview */}
                      {parsedFileData && parsedFileData.data.length > 0 && (
                        <div className="mb-4 p-3 border rounded-lg bg-muted/20">
                          <h4 className="text-sm font-medium mb-2">CSV Preview (first row):</h4>
                          <div className="text-xs space-y-1">
                            {parsedFileData.headers.map((header, index) => (
                              <div key={index} className="flex justify-between">
                                <span className="font-medium">{header}:</span>
                                <span className="text-muted-foreground">
                                  {parsedFileData.data[0] && parsedFileData.data[0][index] ? 
                                    String(parsedFileData.data[0][index]).substring(0, 50) + 
                                    (String(parsedFileData.data[0][index]).length > 50 ? '...' : '') 
                                    : 'N/A'
                                  }
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Target Columns */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        {targetColumns.map((targetCol) => (
                          <div key={targetCol} className="p-3 border rounded-lg bg-muted/30">
                            <div className="flex items-center space-x-2">
                              <Badge variant={targetCol === 'SKU' ? 'default' : 'outline'}>
                                {targetCol}
                              </Badge>
                              {targetCol === 'SKU' && <span className="text-xs text-red-500">*Required</span>}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Column Mappings */}
                      <div className="space-y-3">
                        {parsedFileData.headers.map((sourceColumn) => (
                          <div key={sourceColumn} className="flex items-center space-x-4 p-3 border rounded-lg">
                            <div className="flex-1">
                              <Badge variant="outline">{sourceColumn}</Badge>
                            </div>
                            
                            <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            
                            <div className="flex-1">
                              <Select
                                value={columnMappings[sourceColumn] || ''}
                                onValueChange={(value) => {
                                  if (value) {
                                    handleCreateMapping(sourceColumn, value);
                                  }
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select target column" />
                                </SelectTrigger>
                                <SelectContent>
                                  {targetColumns.map((targetColumn) => (
                                    <SelectItem key={targetColumn} value={targetColumn}>
                                      {targetColumn}
                                      {targetColumn === 'SKU' && <span className="text-red-500 ml-1">*</span>}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            
                            {columnMappings[sourceColumn] && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveMapping(sourceColumn)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex justify-between items-center pt-4">
                        <Button
                          variant="outline"
                          onClick={skipCurrentFile}
                          disabled={isProcessing}
                        >
                          Skip This File
                        </Button>
                        
                        <div className="flex space-x-2">
                          <Button
                            onClick={processCurrentFileWithMapping}
                            disabled={isProcessing || !columnMappings[Object.keys(columnMappings).find(k => columnMappings[k] === 'SKU') || '']}
                            className="flex items-center space-x-2"
                          >
                            <CheckCircle className="h-4 w-4" />
                            <span>Process File</span>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {bulkSKUs.length > 0 && !showMapping && (
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
                  {bulkSKUs.map((sku, index) => {
                    console.log(`SKU ${index}:`, sku); // Debug log
                    return (
                      <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">{sku.sku_code}</Badge>
                          <span className="text-sm">{sku.title || 'No title'}</span>
                          {(typeof sku.cost === 'number' && !isNaN(sku.cost)) && (
                            <Badge variant="secondary">${sku.cost.toFixed(2)}</Badge>
                          )}
                          {(typeof sku.weight === 'number' && !isNaN(sku.weight)) && (
                            <Badge variant="outline">{sku.weight.toFixed(2)}g</Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            Debug: cost={typeof sku.cost === 'number' ? sku.cost.toFixed(2) : sku.cost}, weight={typeof sku.weight === 'number' ? sku.weight.toFixed(2) : sku.weight}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeBulkSKU(index)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    );
                  })}
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