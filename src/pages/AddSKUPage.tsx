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
import { useBackgroundTasks } from '@/contexts/BackgroundTasksContext';
import { useToast } from '@/components/ui/use-toast';

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
  const [threadCount, setThreadCount] = useState(2);

  // File processing states
  const [processQueue, setProcessQueue] = useState<File[]>([]);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [savedMappings, setSavedMappings] = useState<any>({});
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  const [fileStatuses, setFileStatuses] = useState<Record<string, 'pending' | 'mapping' | 'mapped' | 'processing' | 'completed' | 'error'>>({});
  const [fileProgress, setFileProgress] = useState<Record<string, number>>({});
  const [fileMappings, setFileMappings] = useState<Record<string, any>>({});
  
  // Column mapping states
  const [showMappingWizard, setShowMappingWizard] = useState(false);
  const [currentFileData, setCurrentFileData] = useState<any>(null);
  const [currentFileName, setCurrentFileName] = useState('');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  
  const { profile } = useUserProfile();
  const { runBackgroundUpload } = useBackgroundTasks();
  const { toast } = useToast();

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
    console.log('Files dropped:', acceptedFiles.map(f => ({ name: f.name, size: f.size })));
    
    const sortedFiles = acceptedFiles
      .filter(file => file.name.match(/\.(xlsx|xls|csv)$/i))
      .sort((a, b) => a.size - b.size);
    
    console.log('Filtered and sorted files:', sortedFiles.map(f => ({ name: f.name, size: f.size })));
    
    if (sortedFiles.length === 0) {
      toast({
        title: "Invalid Files",
        description: "Please upload Excel (.xlsx, .xls) or CSV files only",
        variant: "destructive"
      });
      return;
    }

    // Add new files to existing queue
    setProcessQueue(prev => [...prev, ...sortedFiles]);
    
    // Initialize file statuses for new files
    const newStatuses: Record<string, 'pending' | 'mapping' | 'mapped' | 'processing' | 'completed' | 'error'> = {};
    sortedFiles.forEach(file => {
      newStatuses[file.name] = 'pending';
    });
    setFileStatuses(prev => ({ ...prev, ...newStatuses }));
    
    console.log('Files added to queue, total files:', processQueue.length + sortedFiles.length);
    
    toast({
      title: "Files Added",
      description: `${sortedFiles.length} files added to queue. Use individual buttons to map and process each file.`,
    });
  }, [processQueue]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv']
    },
    multiple: true
  });

  // Individual file mapping handler
  const startFileMapping = async (file: File) => {
    console.log('Starting mapping for file:', file.name);
    setFileStatuses(prev => ({ ...prev, [file.name]: 'mapping' }));
    
    try {
      const data = await parseFileQuietly(file);
      console.log('Parsed file data:', { 
        rowCount: data?.length || 0, 
        headers: data?.[0] ? Object.keys(data[0]) : []
      });
      
      if (!data || data.length === 0) {
        throw new Error('No data found in file');
      }

      const headers = Object.keys(data[0]).sort();
      console.log('File headers:', headers);
      
      setCurrentFileData({
        headers,
        rows: data.map(row => headers.map(header => row[header]))
      });
      setCurrentFileName(file.name);
      setShowMappingWizard(true);

    } catch (error) {
      console.error('Error parsing file:', error);
      setFileStatuses(prev => ({ ...prev, [file.name]: 'error' }));
      toast({
        title: "Parsing Error",
        description: `Failed to parse ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    }
  };

  // Individual file processing handler
  const startFileProcessing = async (file: File) => {
    const mapping = fileMappings[file.name];
    if (!mapping) {
      toast({
        title: "No Mapping",
        description: `Please map columns for ${file.name} first`,
        variant: "destructive"
      });
      return;
    }

    console.log('=== STARTING FILE PROCESSING ===');
    console.log('File name:', file.name);
    console.log('File mapping:', mapping);
    console.log('onAddSKUs function:', typeof onAddSKUs);
    
    setFileStatuses(prev => ({ ...prev, [file.name]: 'processing' }));
    setFileProgress(prev => ({ ...prev, [file.name]: 0 }));
    
    try {
      const data = await parseFileQuietly(file);
      console.log(`File ${file.name} parsed successfully with ${data?.length || 0} rows`);
      
      if (data && data.length > 0) {
        console.log('Sample parsed data (first 3 rows):', data.slice(0, 3));
        
        const mappedData = data.map((row, index) => {
          // Update progress periodically
          if (index % 100 === 0) {
            const progress = Math.round((index / data.length) * 90); // Save 10% for database save
            setFileProgress(prev => ({ ...prev, [file.name]: progress }));
          }
          
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
        }).filter(row => row.sku_code && row.sku_code.toString().trim());

        console.log(`Mapped and filtered data: ${mappedData.length} valid rows`);
        console.log('Sample mapped data (first 3 rows):', mappedData.slice(0, 3));

        // Convert to database format
        const dbSkus = mappedData.map(row => ({
          sku_code: row.sku_code?.toString().trim() || '',
          title: row.title?.toString().trim() || '',
          description: row.description?.toString().trim() || '',
          cost: typeof row.cost === 'number' ? row.cost : (parseFloat(row.cost) || 0),
          weight: typeof row.weight === 'number' ? row.weight : (parseFloat(row.weight) || 0),
          notes: row.notes?.toString().trim() || `Imported from ${file.name}`,
          country: profile?.country || 'UAE'
        }));

        console.log(`Prepared ${dbSkus.length} SKUs for database save`);
        console.log('Sample DB SKUs (first 3):', dbSkus.slice(0, 3));
        console.log('User profile country:', profile?.country);
        
        setFileProgress(prev => ({ ...prev, [file.name]: 90 }));
        
        if (dbSkus.length > 0) {
          console.log('=== CALLING onAddSKUs FUNCTION ===');
          console.log('Function type:', typeof onAddSKUs);
          console.log('About to save SKUs to database...');
          
          try {
            await onAddSKUs(dbSkus);
            console.log(`✅ SUCCESS: ${dbSkus.length} SKUs saved to database for ${file.name}`);
            
            setFileProgress(prev => ({ ...prev, [file.name]: 100 }));
            setFileStatuses(prev => ({ ...prev, [file.name]: 'completed' }));
            
            toast({
              title: "File Processed Successfully",
              description: `${file.name}: ${dbSkus.length} SKUs saved to database`,
            });
          } catch (saveError) {
            console.error('❌ DATABASE SAVE ERROR:', saveError);
            console.error('Error details:', {
              message: saveError instanceof Error ? saveError.message : 'Unknown error',
              stack: saveError instanceof Error ? saveError.stack : undefined,
              skuCount: dbSkus.length,
              fileName: file.name
            });
            
            setFileStatuses(prev => ({ ...prev, [file.name]: 'error' }));
            setFileProgress(prev => ({ ...prev, [file.name]: 0 }));
            
            toast({
              title: "Database Save Failed",
              description: `Failed to save SKUs from ${file.name}: ${saveError instanceof Error ? saveError.message : 'Unknown database error'}`,
              variant: "destructive"
            });
            return; // Exit early on save error
          }
        } else {
          console.error(`❌ No valid SKUs found to save for ${file.name}`);
          throw new Error('No valid SKUs found to save');
        }
      } else {
        console.error(`❌ No data found in file: ${file.name}`);
        throw new Error('No data found in file');
      }
    } catch (error) {
      console.error(`❌ ERROR processing file ${file.name}:`, error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        fileName: file.name
      });
      
      setFileStatuses(prev => ({ ...prev, [file.name]: 'error' }));
      setFileProgress(prev => ({ ...prev, [file.name]: 0 }));
      
      toast({
        title: "Processing Error",
        description: `Failed to process ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    }
  };

  const processAllFilesWithMapping = async (files: File[], mapping: any) => {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setCurrentFileIndex(i + 1);
      
      // Update file status to processing
      setFileStatuses(prev => ({ ...prev, [file.name]: 'processing' }));
      
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
          
          // Save each file to database immediately
          const dbSkus = mappedData.map(row => ({
            sku_code: row.sku_code?.toString().trim() || '',
            title: row.title?.toString().trim() || '',
            description: row.description?.toString().trim() || '',
            cost: typeof row.cost === 'number' ? row.cost : (parseFloat(row.cost) || 0),
            weight: typeof row.weight === 'number' ? row.weight : (parseFloat(row.weight) || 0),
            notes: row.notes?.toString().trim() || `Imported from ${file.name}`,
            country: profile?.country || 'UAE'
          }));
          
          if (dbSkus.length > 0) {
            await onAddSKUs(dbSkus);
            toast({
              title: "File Saved",
              description: `${file.name}: ${dbSkus.length} SKUs saved to database`,
            });
          }
          
          // Mark file as completed
          setFileStatuses(prev => ({ ...prev, [file.name]: 'completed' }));
        }
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
        // Mark file as error
        setFileStatuses(prev => ({ ...prev, [file.name]: 'error' }));
      }
      
      // Small delay between files to show progress
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  };

  const handleMappingComplete = async (mappedData: any[], mapping: any) => {
    try {
      setShowMappingWizard(false);
      
      // Save mapping for this file
      setFileMappings(prev => ({ ...prev, [currentFileName]: mapping }));
      setFileStatuses(prev => ({ ...prev, [currentFileName]: 'mapped' }));
      
      toast({
        title: "Mapping Saved",
        description: `Column mapping saved for ${currentFileName}. Click "Process" to save to database.`,
      });
      
    } catch (error) {
      console.error('Error saving mapping:', error);
      setFileStatuses(prev => ({ ...prev, [currentFileName]: 'error' }));
      toast({
        title: "Mapping Error",
        description: "Error occurred while saving column mapping",
        variant: "destructive"
      });
    } finally {
      setCurrentFileData(null);
      setCurrentFileName('');
    }
  };

  const handleSaveMapping = (name: string, mapping: any) => {
    setSavedMappings(prev => ({ ...prev, [name]: mapping }));
  };

  const processRemainingFilesInQueue = async (remainingFiles: File[], mapping: any) => {
    console.log('Processing remaining files:', remainingFiles.map(f => f.name));
    
    for (let i = 0; i < remainingFiles.length; i++) {
      const file = remainingFiles[i];
      setCurrentFileIndex(i + 2); // +2 since first file is already processed
      
      setFileStatuses(prev => ({ ...prev, [file.name]: 'processing' }));
      
      try {
        console.log(`Processing file ${i + 1}/${remainingFiles.length}:`, file.name);
        const data = await parseFileQuietly(file);
        console.log(`File ${file.name} parsed with ${data?.length || 0} rows`);
        
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
          }).filter(row => row.sku_code && row.sku_code.toString().trim());
          
          console.log(`Mapped data for ${file.name}:`, mappedData.length, 'valid rows');
          
          // Save each file to database immediately
          const dbSkus = mappedData.map(row => ({
            sku_code: row.sku_code?.toString().trim() || '',
            title: row.title?.toString().trim() || '',
            description: row.description?.toString().trim() || '',
            cost: typeof row.cost === 'number' ? row.cost : (parseFloat(row.cost) || 0),
            weight: typeof row.weight === 'number' ? row.weight : (parseFloat(row.weight) || 0),
            notes: row.notes?.toString().trim() || `Imported from ${file.name}`,
            country: profile?.country || 'UAE'
          }));
          
          console.log(`Saving ${dbSkus.length} SKUs from ${file.name} to database`);
          
          if (dbSkus.length > 0) {
            await onAddSKUs(dbSkus);
            toast({
              title: "File Saved",
              description: `${file.name}: ${dbSkus.length} SKUs saved to database`,
            });
          }
          
          setFileStatuses(prev => ({ ...prev, [file.name]: 'completed' }));
        } else {
          console.warn(`No data found in file: ${file.name}`);
          setFileStatuses(prev => ({ ...prev, [file.name]: 'error' }));
        }
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
        setFileStatuses(prev => ({ ...prev, [file.name]: 'error' }));
      }
      
      // Small delay between files
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  };

  const parseFileQuietly = async (file: File): Promise<any[]> => {
    console.log('Parsing file:', file.name, 'Type:', file.type, 'Size:', file.size);
    
    return new Promise((resolve, reject) => {
      if (file.name.toLowerCase().endsWith('.csv')) {
        console.log('Parsing as CSV file');
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            console.log('CSV parse results:', {
              rowCount: results.data.length,
              errors: results.errors,
              meta: results.meta,
              sampleData: results.data.slice(0, 3)
            });
            resolve(results.data);
          },
          error: (error) => {
            console.error('CSV parse error:', error);
            reject(error);
          }
        });
      } else {
        console.log('Parsing as Excel file');
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            console.log('Excel workbook sheets:', workbook.SheetNames);
            
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });
            console.log('Excel parse results:', {
              rowCount: jsonData.length,
              sampleData: jsonData.slice(0, 3),
              headers: jsonData[0] ? Object.keys(jsonData[0]) : []
            });
            resolve(jsonData);
          } catch (error) {
            console.error('Excel parse error:', error);
            reject(error);
          }
        };
        reader.onerror = () => {
          console.error('File reader error');
          reject(new Error('Failed to read file'));
        };
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

  // Background save handler
  const handleSaveAll = async () => {
    if (bulkSKUs.length === 0) return;

    try {
      const dbSkus = bulkSKUs.map(sku => ({
        sku_code: sku.skuCode,
        title: sku.title,
        description: sku.description,
        cost: sku.cost,
        weight: sku.weight,
        notes: sku.notes,
        country: profile?.country || 'UAE'
      }));

      // Start background upload - no need to wait for it
      runBackgroundUpload(dbSkus, onAddSKUs, threadCount);
      
      // Clear the form immediately and show success message
      setBulkSKUs([]);
      
      toast({
        title: "Upload Started",
        description: `${bulkSKUs.length} SKUs queued for background processing. You can navigate to other pages while this completes.`,
      });
      
    } catch (error) {
      console.error('Error starting background upload:', error);
      toast({
        title: "Upload Error",
        description: "Failed to start background upload process.",
        variant: "destructive"
      });
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
        <Dialog open={showMappingWizard} onOpenChange={setShowMappingWizard}>
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
              </CardContent>
            </Card>

            {/* File Queue Display */}
            {processQueue.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    File Processing Queue ({processQueue.length} files)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {processQueue.map((file, index) => {
                      const status = fileStatuses[file.name] || 'pending';
                      const progress = fileProgress[file.name] || 0;
                      const hasMapping = !!fileMappings[file.name];
                      
                      return (
                        <div
                          key={`${file.name}-${index}`}
                          className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                            status === 'completed'
                              ? 'bg-green-50 border-green-200'
                              : status === 'processing'
                              ? 'bg-blue-50 border-blue-200'
                              : status === 'mapped'
                              ? 'bg-yellow-50 border-yellow-200'
                              : status === 'mapping'
                              ? 'bg-purple-50 border-purple-200'
                              : status === 'error'
                              ? 'bg-red-50 border-red-200'
                              : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <div className="flex items-center gap-2">
                              {status === 'completed' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                              {status === 'processing' && <Clock className="h-4 w-4 animate-spin text-blue-600" />}
                              {status === 'mapped' && <Settings className="h-4 w-4 text-yellow-600" />}
                              {status === 'mapping' && <Settings className="h-4 w-4 animate-pulse text-purple-600" />}
                              {status === 'pending' && <Clock className="h-4 w-4 text-gray-400" />}
                              {status === 'error' && <X className="h-4 w-4 text-red-600" />}
                            </div>
                            
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm font-medium">
                                  {file.name.length > 30 ? `${file.name.substring(0, 30)}...` : file.name}
                                </span>
                                
                                <Badge variant="outline" className="text-xs">
                                  {(file.size / 1024).toFixed(1)}KB
                                </Badge>
                                
                                {hasMapping && (
                                  <Badge variant="secondary" className="text-xs">
                                    Mapped
                                  </Badge>
                                )}
                              </div>
                              
                              {status === 'processing' && (
                                <div className="mt-2">
                                  <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                                    <span>Processing...</span>
                                    <span>{progress}%</span>
                                  </div>
                                  <Progress value={progress} className="h-1.5" />
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {!hasMapping && status !== 'mapping' && status !== 'error' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => startFileMapping(file)}
                                disabled={status === 'processing' || status === 'completed'}
                              >
                                <Settings className="h-3 w-3 mr-1" />
                                Map
                              </Button>
                            )}
                            
                            {hasMapping && !['processing', 'completed'].includes(status) && (
                              <Button
                                size="sm"
                                onClick={() => startFileProcessing(file)}
                                disabled={['processing', 'mapping'].includes(status)}
                              >
                                <Zap className="h-3 w-3 mr-1" />
                                Process
                              </Button>
                            )}
                            
                            {status === 'error' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => startFileMapping(file)}
                              >
                                <Settings className="h-3 w-3 mr-1" />
                                Retry
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {processQueue.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <FileSpreadsheet className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No files uploaded yet. Drop files above to start.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
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

                <Button 
                  onClick={handleSaveAll} 
                  disabled={isLoading || bulkSKUs.length === 0}
                  className="flex items-center gap-2"
                >
                  <Zap className="h-4 w-4" />
                  Start Background Upload ({bulkSKUs.length} SKUs)
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default AddSKUPage;