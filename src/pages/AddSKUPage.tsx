import React, { useState, useRef, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { parseFileSimply } from '@/components/SimpleFileParser';
import { useSKUManager } from '@/hooks/useSKUManager';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useCountry } from '@/contexts/CountryContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Upload, FileText, AlertCircle, CheckCircle, Clock, Loader2, Download, X, MapPin, Trash2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ColumnMappingWizard } from '@/components/sales/ColumnMappingWizard';

interface ProcessingError {
  id: string;
  timestamp: string;
  file: string;
  error: string;
  rowsAffected: number;
  type: 'parsing' | 'validation' | 'save' | 'database';
}

interface ProcessingAnalytics {
  totalFilesProcessed: number;
  totalRowsProcessed: number;
  uniqueSkusFound: number;
  duplicatesFiltered: number;
  savedToDatabase: number;
  averageProcessingTimePerFile: number;
  largestFileProcessed: string;
  processingStartTime: number;
}

interface AddSKUPageProps {
  onAddSKUs?: (skus: any[]) => Promise<void>;
  isLoading?: boolean;
}


interface BulkProcessingSettings {
  batchSize: number;
  duplicateHandling: 'skip' | 'update' | 'error';
  validationLevel: 'basic' | 'strict';
  autoMapping: boolean;
}

export default function AddSKUPage({ onAddSKUs: propOnAddSKUs, isLoading: propIsLoading }: AddSKUPageProps = {}) {
  const { toast } = useToast();
  const { addSKUs } = useSKUManager();
  const { profile } = useUserProfile();
  const { selectedCountry } = useCountry();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Enhanced state management
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [fileStatuses, setFileStatuses] = useState<Record<string, 'pending' | 'processing' | 'completed' | 'error' | 'mapped'>>({});
  const [fileProgress, setFileProgress] = useState<Record<string, number>>({});
  const [fileMappings, setFileMappings] = useState<Record<string, any>>({});
  const [fileRowCounts, setFileRowCounts] = useState<Record<string, { total: number; processed: number }>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [isBulkMapping, setIsBulkMapping] = useState(false);
  const [showMappingWizard, setShowMappingWizard] = useState(false);
  const [currentFileData, setCurrentFileData] = useState<{ headers: string[]; rows: any[][] } | null>(null);
  const [currentFileName, setCurrentFileName] = useState('');
  const [processingErrors, setProcessingErrors] = useState<ProcessingError[]>([]);
  const [processingAnalytics, setProcessingAnalytics] = useState<ProcessingAnalytics>({
    totalFilesProcessed: 0,
    totalRowsProcessed: 0,
    uniqueSkusFound: 0,
    duplicatesFiltered: 0,
    savedToDatabase: 0,
    averageProcessingTimePerFile: 0,
    largestFileProcessed: '',
    processingStartTime: 0
  });

  // Bulk processing settings
  const [bulkSettings, setBulkSettings] = useState<BulkProcessingSettings>({
    batchSize: 1000,
    duplicateHandling: 'skip',
    validationLevel: 'basic',
    autoMapping: true
  });

  // Processing state
  const [globalMapping, setGlobalMapping] = useState<any>(null);
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [uploadMode, setUploadMode] = useState<'single' | 'bulk'>('bulk');

  // Load existing SKUs for duplicate detection
  const { data: existingSKUs = [], isLoading: isLoadingSkus } = useQuery({
    queryKey: ['sunsky_skus', profile?.id, selectedCountry],
    queryFn: async () => {
      if (!profile?.id) return [];
      
      const { data, error } = await supabase
        .from('sunsky_skus')
        .select('sku_code, country')
        .eq('country', selectedCountry);
      
      if (error) {
        console.error('Error loading existing SKUs:', error);
        return [];
      }
      
      return data || [];
    },
    enabled: !!profile?.id
  });

  // Create a Set for fast duplicate lookup
  const [existingSkuSet, setExistingSkus] = useState<Set<string>>(new Set());

  React.useEffect(() => {
    if (existingSKUs.length > 0) {
      const skuSet = new Set<string>();
      existingSKUs.forEach(sku => {
        skuSet.add(`${sku.sku_code}_${sku.country}`);
      });
      setExistingSkus(skuSet);
      console.log(`Loaded ${skuSet.size} existing SKUs for duplicate detection`);
    }
  }, [existingSKUs]);

  const parseFileQuietly = parseFileSimply;

  const onAddSKUs = useCallback(async (skus: any[]) => {
    try {
      // Use prop function if provided, otherwise use hook
      if (propOnAddSKUs) {
        await propOnAddSKUs(skus);
      } else {
        await addSKUs(skus);
      }
      console.log(`Successfully added ${skus.length} SKUs to database`);
    } catch (error) {
      console.error('Error adding SKUs:', error);
      throw error;
    }
  }, [addSKUs, propOnAddSKUs]);

  const processMappedFile = async (file: File, mapping: any) => {
    const fileStartTime = Date.now();
    console.log(`🚀 Starting processing for file: ${file.name}`);
    
    try {
      setFileStatuses(prev => ({ ...prev, [file.name]: 'processing' }));
      setFileProgress(prev => ({ ...prev, [file.name]: 0 }));

      // Parse file data
      const data = await parseFileQuietly(file);
      if (!data || data.length === 0) {
        throw new Error('No data found in file');
      }

      setFileRowCounts(prev => ({ 
        ...prev, 
        [file.name]: { total: data.length, processed: 0 } 
      }));

      // Process in batches for better performance
      const batchSize = bulkSettings.batchSize;
      let processedCount = 0;
      let savedCount = 0;
      let duplicateCount = 0;
      let errorCount = 0;

      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, Math.min(i + batchSize, data.length));
        
        // Map and validate batch
        const mappedBatch = batch.map(row => {
          const mappedRow: any = {};
          Object.entries(mapping).forEach(([expectedCol, sourceCol]) => {
            let value = row[sourceCol as string];
            
            // Type conversion
            if (expectedCol === 'cost' || expectedCol === 'weight') {
              value = parseFloat(value) || 0;
            }
            
            if (typeof value === 'string') {
              value = value.trim();
            }
            
            if (value !== undefined && value !== null && value !== '') {
              mappedRow[expectedCol] = value;
            }
          });
          
          // Add metadata
          mappedRow.country = selectedCountry;
          mappedRow.notes = mappedRow.notes || `Imported from ${file.name}`;
          
          return mappedRow;
        }).filter(row => row.sku_code && row.sku_code.toString().trim());

        // Handle duplicates based on settings
        const uniqueBatch = [];
        const batchDuplicates = [];

        for (const row of mappedBatch) {
          const skuKey = `${row.sku_code}_${row.country}`;
          
          if (existingSkuSet.has(skuKey)) {
            if (bulkSettings.duplicateHandling === 'skip') {
              batchDuplicates.push(row.sku_code);
              continue;
            } else if (bulkSettings.duplicateHandling === 'error') {
              throw new Error(`Duplicate SKU found: ${row.sku_code}`);
            }
            // 'update' handling would require additional logic
          }
          
          existingSkuSet.add(skuKey);
          uniqueBatch.push(row);
        }

        // Save batch to database
        if (uniqueBatch.length > 0) {
          try {
            await onAddSKUs(uniqueBatch);
            savedCount += uniqueBatch.length;
            console.log(`✅ Saved batch of ${uniqueBatch.length} SKUs from ${file.name}`);
          } catch (error) {
            console.error(`❌ Failed to save batch from ${file.name}:`, error);
            errorCount += uniqueBatch.length;
            
            setProcessingErrors(prev => [...prev, {
              id: `${Date.now()}-${file.name}-batch-${i}`,
              timestamp: new Date().toISOString(),
              file: file.name,
              error: `Batch save failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
              rowsAffected: uniqueBatch.length,
              type: 'database'
            }]);
          }
        }

        duplicateCount += batchDuplicates.length;
        processedCount += batch.length;

        // Update progress
        const progress = Math.round((processedCount / data.length) * 100);
        setFileProgress(prev => ({ ...prev, [file.name]: progress }));
        setFileRowCounts(prev => ({ 
          ...prev, 
          [file.name]: { ...prev[file.name], processed: processedCount } 
        }));

        // Small delay to prevent UI blocking
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 1));
        }
      }

      // Update analytics
      const processingTime = Date.now() - fileStartTime;
      setProcessingAnalytics(prev => ({
        ...prev,
        totalFilesProcessed: prev.totalFilesProcessed + 1,
        totalRowsProcessed: prev.totalRowsProcessed + data.length,
        uniqueSkusFound: prev.uniqueSkusFound + savedCount,
        duplicatesFiltered: prev.duplicatesFiltered + duplicateCount,
        savedToDatabase: prev.savedToDatabase + savedCount,
        averageProcessingTimePerFile: ((prev.averageProcessingTimePerFile * prev.totalFilesProcessed) + processingTime) / (prev.totalFilesProcessed + 1),
        largestFileProcessed: file.size > 1024 * 1024 && file.name || prev.largestFileProcessed
      }));

      setFileStatuses(prev => ({ ...prev, [file.name]: 'completed' }));
      setFileProgress(prev => ({ ...prev, [file.name]: 100 }));

      console.log(`🎉 Completed processing ${file.name}: ${savedCount} saved, ${duplicateCount} duplicates, ${errorCount} errors`);

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`💥 Error processing ${file.name}:`, errorMsg);
      
      setFileStatuses(prev => ({ ...prev, [file.name]: 'error' }));
      setProcessingErrors(prev => [...prev, {
        id: `${Date.now()}-${file.name}`,
        timestamp: new Date().toISOString(),
        file: file.name,
        error: errorMsg,
        rowsAffected: 0,
        type: 'parsing'
      }]);
    }
  };

  const processBulkFiles = async () => {
    if (!selectedFiles || !globalMapping) {
      toast({
        title: "Missing Requirements",
        description: "Please select files and complete mapping first.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessingBulk(true);
    setBulkProgress(0);
    
    const files = Array.from(selectedFiles);
    const startTime = Date.now();
    
    setProcessingAnalytics(prev => ({
      ...prev,
      processingStartTime: startTime,
      totalFilesProcessed: 0,
      totalRowsProcessed: 0,
      uniqueSkusFound: 0,
      duplicatesFiltered: 0,
      savedToDatabase: 0
    }));

    try {
      console.log(`🚀 Starting bulk processing of ${files.length} files...`);
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        await processMappedFile(file, globalMapping);
        
        // Update bulk progress
        const progress = Math.round(((i + 1) / files.length) * 100);
        setBulkProgress(progress);
      }

      const totalTime = Date.now() - startTime;
      const completedFiles = Object.values(fileStatuses).filter(status => status === 'completed').length;
      const errorFiles = Object.values(fileStatuses).filter(status => status === 'error').length;

      toast({
        title: "Bulk Processing Complete",
        description: `Processed ${files.length} files in ${(totalTime / 1000).toFixed(1)}s. ${completedFiles} successful, ${errorFiles} errors.`,
        variant: completedFiles === files.length ? "default" : "destructive"
      });

      console.log(`🎉 Bulk processing complete: ${completedFiles}/${files.length} files successful`);

    } catch (error) {
      console.error('💥 Bulk processing failed:', error);
      toast({
        title: "Bulk Processing Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsProcessingBulk(false);
    }
  };

  const handleBulkMapping = async () => {
    if (!selectedFiles || selectedFiles.length === 0) {
      toast({
        title: "No Files Selected",
        description: "Please select files first before mapping columns.",
        variant: "destructive"
      });
      return;
    }

    setIsBulkMapping(true);

    try {
      const selectedFileObjects = Array.from(selectedFiles);
      const templateFile = selectedFileObjects[0];
      console.log('🗺️ Starting bulk mapping with template file:', templateFile.name);
      
      const data = await parseFileQuietly(templateFile);
      console.log('Template file parsing result:', {
        dataExists: !!data,
        dataLength: data?.length || 0,
        sampleData: data?.slice(0, 2) || 'No data'
      });
      
      if (!data || data.length === 0) {
        console.error('Template file data check failed:', {
          data,
          dataLength: data?.length,
          fileName: templateFile.name,
          fileSize: templateFile.size
        });
        throw new Error(`No data found in template file ${templateFile.name}. Please check the file format and ensure it contains data.`);
      }

      const headers = Object.keys(data[0]).sort();
      console.log('📋 Template file headers:', headers);
      
      setCurrentFileData({
        headers,
        rows: data.map(row => headers.map(header => row[header]))
      });
      
      setCurrentFileName(templateFile.name);
      setShowMappingWizard(true);
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred during bulk mapping';
      console.error('💥 Bulk mapping error:', errorMsg);
      
      toast({
        title: "Bulk Mapping Failed",
        description: errorMsg,
        variant: "destructive"
      });
    } finally {
      setIsBulkMapping(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    console.log(`Selected ${files.length} files:`, Array.from(files).map(f => ({ name: f.name, size: f.size })));
    
    setSelectedFiles(files);
    
    // Initialize file states
    const initialStatuses: Record<string, 'pending'> = {};
    const initialProgress: Record<string, number> = {};
    const initialRowCounts: Record<string, { total: number; processed: number }> = {};
    
    Array.from(files).forEach(file => {
      initialStatuses[file.name] = 'pending';
      initialProgress[file.name] = 0;
      initialRowCounts[file.name] = { total: 0, processed: 0 };
    });
    
    setFileStatuses(initialStatuses);
    setFileProgress(initialProgress);
    setFileRowCounts(initialRowCounts);
    setProcessingErrors([]);
    
    toast({
      title: "Files Selected",
      description: `${files.length} file(s) selected for processing.`,
      variant: "default"
    });
  };

  const clearSelectedFiles = () => {
    setSelectedFiles(null);
    setFileStatuses({});
    setFileProgress({});
    setFileMappings({});
    setFileRowCounts({});
    setProcessingErrors([]);
    setProcessingAnalytics({
      totalFilesProcessed: 0,
      totalRowsProcessed: 0,
      uniqueSkusFound: 0,
      duplicatesFiltered: 0,
      savedToDatabase: 0,
      averageProcessingTimePerFile: 0,
      largestFileProcessed: '',
      processingStartTime: 0
    });
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Add SKUs from Files - Fixed Parser
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Upload Mode Selection */}
          <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/50">
            <label className="text-sm font-medium">Upload Mode:</label>
            <Select
              value={uploadMode}
              onValueChange={(value: 'single' | 'bulk') => {
                setUploadMode(value);
                clearSelectedFiles();
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Select mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Single File</SelectItem>
                <SelectItem value="bulk">Bulk Files</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* File Upload */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Input
                ref={fileInputRef}
                type="file"
                multiple={uploadMode === 'bulk'}
                accept=".csv,.xlsx,.xls"
                onChange={handleFileUpload}
                className="flex-1"
              />
              {selectedFiles && selectedFiles.length > 0 && (
                <Button variant="outline" onClick={clearSelectedFiles}>
                  <X className="h-4 w-4" />
                  Clear
                </Button>
              )}
            </div>
            
            {selectedFiles && selectedFiles.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {selectedFiles.length} file(s) selected
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleBulkMapping}
                      disabled={isBulkMapping || isProcessing}
                      variant="outline"
                    >
                      {isBulkMapping ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Setting up mapping...
                        </>
                      ) : (
                        <>
                      <MapPin className="h-4 w-4 mr-2" />
                      Bulk Map Columns
                    </>
                  )}
                </Button>
                
                {globalMapping && (
                  <Button 
                    onClick={processBulkFiles}
                    disabled={isProcessingBulk || !globalMapping}
                    variant="default"
                  >
                    {isProcessingBulk ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing... ({bulkProgress}%)
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Process All Files
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
            
            {/* Bulk Processing Settings */}
            <Card className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium">Batch Size</label>
                  <Select
                    value={bulkSettings.batchSize.toString()}
                    onValueChange={(value) => setBulkSettings(prev => ({ ...prev, batchSize: parseInt(value) }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="500">500 rows</SelectItem>
                      <SelectItem value="1000">1,000 rows</SelectItem>
                      <SelectItem value="2000">2,000 rows</SelectItem>
                      <SelectItem value="5000">5,000 rows</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Duplicate Handling</label>
                  <Select
                    value={bulkSettings.duplicateHandling}
                    onValueChange={(value: 'skip' | 'update' | 'error') => 
                      setBulkSettings(prev => ({ ...prev, duplicateHandling: value }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="skip">Skip Duplicates</SelectItem>
                      <SelectItem value="update">Update Existing</SelectItem>
                      <SelectItem value="error">Error on Duplicate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Validation Level</label>
                  <Select
                    value={bulkSettings.validationLevel}
                    onValueChange={(value: 'basic' | 'strict') => 
                      setBulkSettings(prev => ({ ...prev, validationLevel: value }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Basic Validation</SelectItem>
                      <SelectItem value="strict">Strict Validation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Country</label>
                  <Select value={selectedCountry} disabled>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UAE">UAE</SelectItem>
                      <SelectItem value="KSA">KSA</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>
            
            {/* Bulk Progress */}
            {isProcessingBulk && (
              <Card className="p-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Overall Progress</span>
                    <span>{bulkProgress}%</span>
                  </div>
                  <Progress value={bulkProgress} className="w-full" />
                </div>
              </Card>
            )}
            
            {/* Processing Analytics */}
            {processingAnalytics.totalFilesProcessed > 0 && (
              <Card className="p-4">
                <CardTitle className="text-lg mb-3">Processing Summary</CardTitle>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="font-medium text-muted-foreground">Files Processed</div>
                    <div className="text-2xl font-bold">{processingAnalytics.totalFilesProcessed}</div>
                  </div>
                  <div>
                    <div className="font-medium text-muted-foreground">Rows Processed</div>
                    <div className="text-2xl font-bold">{processingAnalytics.totalRowsProcessed.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="font-medium text-muted-foreground">SKUs Saved</div>
                    <div className="text-2xl font-bold text-green-600">{processingAnalytics.savedToDatabase.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="font-medium text-muted-foreground">Duplicates Filtered</div>
                    <div className="text-2xl font-bold text-orange-600">{processingAnalytics.duplicatesFiltered.toLocaleString()}</div>
                  </div>
                </div>
              </Card>
            )}
            
            {/* File List */}
            <div className="space-y-2">
                  {Array.from(selectedFiles).map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{file.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {fileStatuses[file.name] === 'pending' && (
                          <Badge variant="secondary">
                            <Clock className="h-3 w-3 mr-1" />
                            Pending
                          </Badge>
                        )}
                        {fileStatuses[file.name] === 'processing' && (
                          <div className="flex items-center gap-2">
                            <Progress value={fileProgress[file.name]} className="w-20" />
                            <Badge variant="secondary">
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              Processing
                            </Badge>
                          </div>
                        )}
                        {fileStatuses[file.name] === 'completed' && (
                          <Badge variant="default">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Completed
                          </Badge>
                        )}
                        {fileStatuses[file.name] === 'error' && (
                          <Badge variant="destructive">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Error
                          </Badge>
                        )}
                        {fileStatuses[file.name] === 'mapped' && (
                          <Badge variant="outline">
                            <MapPin className="h-3 w-3 mr-1" />
                            Mapped
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Mapping Wizard */}
      {showMappingWizard && currentFileData && (
        <ColumnMappingWizard
          fileData={currentFileData}
          expectedColumns={['sku_code', 'title', 'description', 'cost', 'weight', 'notes']}
          onMappingComplete={(mappedData) => {
            setShowMappingWizard(false);
            
            // Extract and save the global mapping for all files
            const mapping = mappedData?.mapping || mappedData;
            setGlobalMapping(mapping);
            setFileMappings(prev => ({ ...prev, [currentFileName]: mapping }));
            setFileStatuses(prev => ({ ...prev, [currentFileName]: 'mapped' }));
            
            // Mark all files as mapped since we're using global mapping
            if (selectedFiles) {
              const newStatuses: Record<string, 'mapped'> = {};
              Array.from(selectedFiles).forEach(file => {
                newStatuses[file.name] = 'mapped';
              });
              setFileStatuses(prev => ({ ...prev, ...newStatuses }));
            }
            
            toast({
              title: "Mapping Complete",
              description: `Column mapping saved and applied to all ${selectedFiles?.length || 0} files. Ready to process!`,
              variant: "default"
            });
            
            console.log('🗺️ Global mapping saved:', mapping);
          }}
        />
      )}

      {/* Processing Errors */}
      {processingErrors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Processing Errors ({processingErrors.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {processingErrors.map((error, index) => (
                <Alert key={error.id} variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>{error.file}:</strong> {error.error}
                    {error.rowsAffected > 0 && (
                      <span className="text-sm ml-2">({error.rowsAffected} rows affected)</span>
                    )}
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(error.timestamp).toLocaleTimeString()} - {error.type}
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}