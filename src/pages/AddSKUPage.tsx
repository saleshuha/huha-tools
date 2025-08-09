import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { parseFileSimply } from '@/components/SimpleFileParser';
import { useSKUManager } from '@/hooks/useSKUManager';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useCountry } from '@/contexts/CountryContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Loader2, MapPin, ArrowLeft } from 'lucide-react';
import { ColumnMappingWizard } from '@/components/sales/ColumnMappingWizard';
import { UploadModeSelector } from '@/components/file-upload/UploadModeSelector';
import { FileUploadArea } from '@/components/file-upload/FileUploadArea';
import { FileListDisplay } from '@/components/file-upload/FileListDisplay';
import { BulkProcessingSettingsPanel } from '@/components/file-upload/BulkProcessingSettings';
import { ProcessingProgress } from '@/components/file-upload/ProcessingProgress';
import { ProcessingAnalyticsDisplay } from '@/components/file-upload/ProcessingAnalytics';
import { ProcessingErrorsDisplay } from '@/components/file-upload/ProcessingErrors';
import { ProcessingStatusPanel } from '@/components/file-upload/ProcessingStatusPanel';
import { useBulkFileProcessor } from '@/hooks/useBulkFileProcessor';
import { AddSKUPageProps, BulkProcessingSettings, UploadMode } from '@/types/file-upload';
import { useBackgroundTasks } from '@/contexts/BackgroundTasksContext';

export default function AddSKUPage({ onAddSKUs: propOnAddSKUs, isLoading: propIsLoading }: AddSKUPageProps = {}) {
  const { toast } = useToast();
  const { addSKUs } = useSKUManager();
  const { profile } = useUserProfile();
  const { selectedCountry } = useCountry();
  const { runBackgroundUpload } = useBackgroundTasks();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Main state
  const [uploadMode, setUploadMode] = useState<UploadMode>('bulk');
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [globalMapping, setGlobalMapping] = useState<any>(null);
  const [showMappingWizard, setShowMappingWizard] = useState(false);
  const [currentFileData, setCurrentFileData] = useState<{ headers: string[]; rows: any[][] } | null>(null);
  const [currentFileName, setCurrentFileName] = useState('');
  const [isBulkMapping, setIsBulkMapping] = useState(false);
  
  // Processing status state
  const [processingStatus, setProcessingStatus] = useState<{
    isProcessing: boolean;
    currentStep: string;
    currentFileIndex: number;
    totalFiles: number;
    currentFileName: string;
    overallProgress: number;
    status: 'idle' | 'parsing' | 'mapping' | 'uploading' | 'completed' | 'error';
    error?: string;
  }>({
    isProcessing: false,
    currentStep: '',
    currentFileIndex: 0,
    totalFiles: 0,
    currentFileName: '',
    overallProgress: 0,
    status: 'idle'
  });
  
  // Bulk processing settings
  const [bulkSettings, setBulkSettings] = useState<BulkProcessingSettings>({
    batchSize: 1000,
    duplicateHandling: 'skip',
    validationLevel: 'basic',
    autoMapping: true
  });

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

  // SKU adding function
  const onAddSKUs = useCallback(async (skus: any[]) => {
    console.log('🔄 onAddSKUs called with:', skus.length, 'SKUs');
    console.log('📝 Sample SKU data:', skus.slice(0, 2));
    
    try {
      // Add user_id to each SKU if not already present
      const skusWithUserId = skus.map(sku => ({
        ...sku,
        user_id: profile?.id
      }));
      
      // Use prop function if provided, otherwise use hook
      if (propOnAddSKUs) {
        await propOnAddSKUs(skusWithUserId);
      } else {
        await addSKUs(skusWithUserId);
      }
      console.log(`✅ Successfully added ${skus.length} SKUs to database`);
    } catch (error) {
      console.error('❌ Error adding SKUs:', error);
      throw error;
    }
  }, [addSKUs, propOnAddSKUs, profile?.id]);

  // Initialize bulk file processor
  const {
    fileStatuses,
    fileProgress,
    fileMappings,
    fileRowCounts,
    isProcessingBulk,
    bulkProgress,
    processingErrors,
    processingAnalytics,
    processBulkFiles,
    initializeFileStates,
    clearProcessingState,
    setFileStatuses,
    setFileMappings
  } = useBulkFileProcessor(selectedCountry, onAddSKUs);

  // Handle upload mode change
  const handleUploadModeChange = useCallback((mode: UploadMode) => {
    setUploadMode(mode);
    clearSelectedFiles();
  }, []);

  // Handle file upload
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    console.log(`Selected ${files.length} files:`, Array.from(files).map(f => ({ name: f.name, size: f.size })));
    
    setSelectedFiles(files);
    initializeFileStates(files);
    
    toast({
      title: "Files Selected",
      description: `${files.length} file(s) selected for processing.`,
      variant: "default"
    });
  }, [initializeFileStates, toast]);

  // Clear selected files
  const clearSelectedFiles = useCallback(() => {
    setSelectedFiles(null);
    clearProcessingState();
    setGlobalMapping(null);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [clearProcessingState]);

  // Handle bulk mapping
  const handleBulkMapping = useCallback(async () => {
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
      
      const data = await parseFileSimply(templateFile);
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
  }, [selectedFiles, toast]);

  // Handle mapping completion
  const handleMappingComplete = useCallback((mappedData: any) => {
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
  }, [currentFileName, selectedFiles, setFileStatuses, setFileMappings, toast]);

  // Handle bulk processing
  const handleBulkProcessing = useCallback(async () => {
    if (!selectedFiles || !globalMapping) return;
    
    // Initialize processing status
    setProcessingStatus({
      isProcessing: true,
      currentStep: 'Starting file processing...',
      currentFileIndex: 0,
      totalFiles: selectedFiles.length,
      currentFileName: '',
      overallProgress: 0,
      status: 'parsing'
    });
    
    // Show initial processing toast
    toast({
      title: "Starting File Processing",
      description: `Beginning to process ${selectedFiles.length} files...`,
      variant: "default"
    });
    
    console.log('🚀 Starting bulk processing with:', {
      fileCount: selectedFiles.length,
      mapping: globalMapping
    });
    
    try {
      // Prepare SKU data for background processing
      const skuData: any[] = [];
      
      console.log('📋 Starting file processing loop...');
      
      // Parse all files and collect SKU data
      for (let fileIndex = 0; fileIndex < selectedFiles.length; fileIndex++) {
        const file = selectedFiles[fileIndex];
        console.log(`📄 Processing file ${fileIndex + 1}/${selectedFiles.length}: ${file.name}`);
        
        // Update processing status
        setProcessingStatus(prev => ({
          ...prev,
          currentStep: `Parsing file ${fileIndex + 1} of ${selectedFiles.length}`,
          currentFileIndex: fileIndex + 1,
          currentFileName: file.name,
          overallProgress: (fileIndex / selectedFiles.length) * 80 // 80% for parsing, 20% for upload
        }));
        
        // Show progress toast for each file
        toast({
          title: `Processing File ${fileIndex + 1}/${selectedFiles.length}`,
          description: `Parsing ${file.name}...`,
          variant: "default"
        });
        
        try {
          const data = await parseFileSimply(file);
          console.log(`✅ File parsed successfully: ${file.name}, rows: ${data?.length || 0}`);
          
          if (data && data.length > 0) {
            // Update status to mapping
            setProcessingStatus(prev => ({
              ...prev,
              currentStep: `Mapping data from ${file.name}`,
              status: 'mapping'
            }));
            
            console.log(`📊 Processing ${data.length} rows from ${file.name}`);
            console.log(`🔍 Sample raw row:`, data[0]);
            console.log(`🗺️ Current mapping:`, globalMapping);
            
            const mappedRows = data.map((row: any, rowIndex: number) => {
              const mappedRow: any = {
                country: selectedCountry,
                user_id: profile?.id
              };
              
              // Map the columns according to the global mapping
              Object.entries(globalMapping as Record<string, string>).forEach(([expectedCol, actualCol]) => {
                if (actualCol && row[actualCol as string] !== undefined) {
                  let value = row[actualCol as string];
                  
                  // Convert weight and cost to numbers if needed
                  if (expectedCol === 'weight' || expectedCol === 'cost') {
                    value = parseFloat(value) || 0;
                  }
                  
                  // Map to the correct column names for the database
                  if (expectedCol === 'sku') {
                    mappedRow['sku_code'] = value;
                  } else if (expectedCol === 'cost') {
                    mappedRow['cost'] = value;
                  } else {
                    mappedRow[expectedCol] = value;
                  }
                }
              });
              
              // Log first few mapped rows for debugging
              if (skuData.length + rowIndex < 3) {
                console.log(`📝 Mapped row ${skuData.length + rowIndex + 1}:`, mappedRow);
              }
              
              return mappedRow;
            });
            
            console.log(`➕ Adding ${mappedRows.length} mapped rows to skuData`);
            skuData.push(...mappedRows);
            console.log(`📊 Current total SKUs: ${skuData.length}`);
            
          } else {
            console.warn(`⚠️ No data found in file: ${file.name}`);
          }
        } catch (fileError) {
          console.error(`❌ Error processing file ${file.name}:`, fileError);
          setProcessingStatus(prev => ({
            ...prev,
            status: 'error',
            error: `Error processing ${file.name}: ${fileError instanceof Error ? fileError.message : 'Unknown error'}`
          }));
        }
      }
      
      console.log(`✅ File processing complete. Total SKUs collected: ${skuData.length}`);
      console.log(`🔍 Sample final SKU:`, skuData[0]);
      
      if (skuData.length === 0) {
        console.error('💥 No SKU data collected from any files');
        setProcessingStatus(prev => ({
          ...prev,
          status: 'error',
          error: 'No valid SKU data found in any of the selected files'
        }));
        toast({
          title: "No Data Found",
          description: "No valid SKU data found in the selected files.",
          variant: "destructive"
        });
        return;
      }
      
      // Update status to uploading
      setProcessingStatus(prev => ({
        ...prev,
        currentStep: `Starting background upload of ${skuData.length} SKUs...`,
        status: 'uploading',
        overallProgress: 80
      }));
      
      // Start background upload
      console.log('🔄 About to start background upload with:', {
        skuCount: skuData.length,
        sampleSku: skuData[0],
        onAddSKUsType: typeof onAddSKUs,
        runBackgroundUploadType: typeof runBackgroundUpload
      });
      
      console.log('⏳ Calling runBackgroundUpload...');
      await runBackgroundUpload(
        skuData,
        onAddSKUs,
        2 // thread count
      );
      console.log('✅ runBackgroundUpload completed');
      
      // Update status to completed
      setProcessingStatus(prev => ({
        ...prev,
        currentStep: `Successfully uploaded ${skuData.length} SKUs`,
        status: 'completed',
        overallProgress: 100
      }));
      
      // Clear local state and show success
      clearSelectedFiles();
      setGlobalMapping(null);
      
      toast({
        title: "Background Upload Started",
        description: `Processing ${skuData.length} SKUs in the background. Check the sidebar progress indicator.`,
        variant: "default"
      });
      
      // Reset processing status after a delay
      setTimeout(() => {
        setProcessingStatus({
          isProcessing: false,
          currentStep: '',
          currentFileIndex: 0,
          totalFiles: 0,
          currentFileName: '',
          overallProgress: 0,
          status: 'idle'
        });
      }, 5000);
      
    } catch (error) {
      console.error('❌ Error in handleBulkProcessing:', error);
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      
      setProcessingStatus(prev => ({
        ...prev,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error occurred during processing'
      }));
      
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to start background upload",
        variant: "destructive"
      });
    }
  }, [selectedFiles, globalMapping, selectedCountry, runBackgroundUpload, onAddSKUs, clearSelectedFiles, toast, profile?.id]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Back Button */}
      <div className="flex items-center gap-4 mb-6">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => window.history.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Add SKUs from Files - Redesigned
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Upload Mode Selection */}
          <UploadModeSelector 
            uploadMode={uploadMode}
            onUploadModeChange={handleUploadModeChange}
          />

          {/* File Upload */}
          <div className="space-y-4">
            <FileUploadArea
              uploadMode={uploadMode}
              selectedFiles={selectedFiles}
              fileInputRef={fileInputRef}
              onFileUpload={handleFileUpload}
              onClearFiles={clearSelectedFiles}
            />
            
            {selectedFiles && selectedFiles.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {selectedFiles.length} file(s) selected
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleBulkMapping}
                      disabled={isBulkMapping || isProcessingBulk}
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
                        onClick={handleBulkProcessing}
                        disabled={isProcessingBulk || !globalMapping}
                        variant="default"
                        className="bg-primary hover:bg-primary/90"
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
                
                
                {/* Processing Status Panel */}
                <ProcessingStatusPanel
                  isProcessing={processingStatus.isProcessing}
                  currentStep={processingStatus.currentStep}
                  currentFileIndex={processingStatus.currentFileIndex}
                  totalFiles={processingStatus.totalFiles}
                  currentFileName={processingStatus.currentFileName}
                  overallProgress={processingStatus.overallProgress}
                  status={processingStatus.status}
                  error={processingStatus.error}
                />
                
                {/* Processing Progress and Status */}
                <ProcessingProgress
                  isProcessingBulk={isProcessingBulk}
                  bulkProgress={bulkProgress}
                  globalMapping={globalMapping}
                  selectedFilesLength={selectedFiles?.length || 0}
                />
                
                {/* Bulk Processing Settings */}
                <BulkProcessingSettingsPanel
                  settings={bulkSettings}
                  onSettingsChange={setBulkSettings}
                  selectedCountry={selectedCountry}
                />
                
                {/* Processing Analytics */}
                <ProcessingAnalyticsDisplay analytics={processingAnalytics} />
                
                {/* File List */}
                <FileListDisplay
                  selectedFiles={selectedFiles}
                  fileStatuses={fileStatuses}
                  fileProgress={fileProgress}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Mapping Wizard */}
      {showMappingWizard && currentFileData && (
        <ColumnMappingWizard
          fileData={currentFileData}
          expectedColumns={['sku', 'title', 'cost', 'weight']}
          onMappingComplete={handleMappingComplete}
        />
      )}

      {/* Processing Errors */}
      <ProcessingErrorsDisplay errors={processingErrors} />
    </div>
  );
}