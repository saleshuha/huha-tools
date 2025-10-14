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
import { Upload, Loader2, MapPin, ArrowLeft, AlertCircle } from 'lucide-react';
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


export default function AddSKUPage({ onAddSKUs: propOnAddSKUs, isLoading: propIsLoading }: AddSKUPageProps = {}) {
  const { toast } = useToast();
  const { addSKUs, isLoading: isAddingSkus } = useSKUManager();
  const { profile } = useUserProfile();
  const { selectedCountry } = useCountry();
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
    autoMapping: true,
    threadCount: 4 // Default to 4 threads for better performance
  });

  // Load existing SKUs for duplicate detection
  const { data: existingSKUs = [], isLoading: isLoadingSkus } = useQuery({
    queryKey: ['sunsky_skus', profile?.id, selectedCountry],
    queryFn: async () => {
      if (!profile?.id) return [];
      
      const { data, error } = await supabase
        .from('sunsky_skus')
        .select('sku_code, country')
        .eq('country' as any, selectedCountry as any);
      
      if (error) {
        console.error('Error loading existing SKUs:', error);
        return [];
      }
      
      return (data || []) as any;
    },
    enabled: !!profile?.id
  });

  // Create a Set for fast duplicate lookup
  const [existingSkuSet, setExistingSkus] = useState<Set<string>>(new Set());

    React.useEffect(() => {
    if (existingSKUs.length > 0) {
      const skuSet = new Set<string>();
      (existingSKUs as any).forEach((sku: any) => {
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

  // Handle bulk processing with queue-based approach
  const handleBulkProcessing = useCallback(async () => {
    if (!selectedFiles || !globalMapping) {
      console.warn('❌ Missing requirements for bulk processing');
      return;
    }

    try {
      console.log('🚀 Starting queue-based bulk processing...', { 
        fileCount: selectedFiles.length,
        mappingKeys: Object.keys(globalMapping)
      });
      
      // Initialize file states in the queue
      initializeFileStates(selectedFiles);
      
      // Start bulk processing with queue system
      await processBulkFiles(
        selectedFiles,
        globalMapping,
        bulkSettings,
        existingSkuSet
      );
      
      // Clear the selected files and mapping after completion
      clearSelectedFiles();
      setGlobalMapping(null);
      
      console.log('✅ Queue-based bulk processing completed');
      
    } catch (error) {
      console.error('❌ Bulk processing failed:', error);
      toast({
        title: "Processing Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred during processing.",
        variant: "destructive"
      });
    }
  }, [selectedFiles, globalMapping, processBulkFiles, initializeFileStates, clearSelectedFiles, toast, bulkSettings, existingSkuSet]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-8">
        {/* Header Section with Back Button */}
        <div className="relative">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => window.history.back()}
                  className="flex items-center gap-2 hover:bg-secondary transition-all duration-200"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                <div className="h-6 w-px bg-border"></div>
                <div>
                  <h1 className="text-2xl font-bold text-primary">
                    Add SKUs from Files
                  </h1>
                  <p className="text-sm text-muted-foreground">Upload and process your inventory files efficiently</p>
                </div>
              </div>
              <Upload className="h-8 w-8 text-primary" />
            </div>
          </div>
        </div>

        {/* Main Content Card */}
        <Card className="border border-border shadow-lg bg-card">
          <CardHeader className="border-b border-border bg-muted/30">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                <Upload className="h-5 w-5 text-primary" />
              </div>
              File Processing Center
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {/* Upload Mode Selection */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-xs">1</div>
                Select Processing Mode
              </div>
              <div className="ml-8 bg-muted/30 p-3 rounded-lg border border-border">
                <UploadModeSelector 
                  uploadMode={uploadMode}
                  onUploadModeChange={handleUploadModeChange}
                />
              </div>
            </div>

            {/* File Upload Section */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-xs">2</div>
                Upload Your Files
              </div>
              <div className="ml-8 bg-muted/30 p-3 rounded-lg border border-border">
                <FileUploadArea
                  uploadMode={uploadMode}
                  selectedFiles={selectedFiles}
                  fileInputRef={fileInputRef}
                  onFileUpload={handleFileUpload}
                  onClearFiles={clearSelectedFiles}
                />
              </div>
            </div>
              
              {selectedFiles && selectedFiles.length > 0 && (
                <div className="space-y-3">
                  {/* Processing Controls */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-xs">3</div>
                      Configure & Process
                    </div>
                    <div className="ml-8 bg-muted/30 p-3 rounded-lg border border-border">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-success/10 border border-success/20">
                            <span className="text-sm font-medium text-success">
                              {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <Button 
                            onClick={handleBulkMapping}
                            disabled={isBulkMapping || isProcessingBulk}
                            variant="outline"
                            className="transition-all duration-200 border-primary/20 hover:border-primary/40"
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
                              disabled={isProcessingBulk || !globalMapping || isAddingSkus}
                              variant="default"
                              className="bg-primary hover:bg-primary/90 transition-all duration-200"
                            >
                              {isProcessingBulk ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Processing...
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
                    </div>
                  </div>
                  
                  {/* Processing Status Panel */}
                  <div className="bg-gradient-to-r from-muted/30 to-transparent p-4 rounded-xl border border-border/50">
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
                  </div>
                  
                  {/* Bulk Processing Settings */}
                  <div className="bg-gradient-to-r from-accent/5 to-transparent p-4 rounded-xl border border-border/50">
                    <BulkProcessingSettingsPanel
                      settings={bulkSettings}
                      onSettingsChange={setBulkSettings}
                      selectedCountry={selectedCountry}
                    />
                  </div>
                  
                  {/* Processing Analytics */}
                  <div className="bg-gradient-to-r from-primary/5 to-transparent p-4 rounded-xl border border-border/50">
                    <ProcessingAnalyticsDisplay analytics={processingAnalytics} />
                  </div>
                  
                  {/* File List */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-primary font-semibold text-xs">4</div>
                      File Processing Queue
                    </div>
                    <div className="ml-10 bg-gradient-to-r from-muted/50 to-transparent p-4 rounded-xl border border-border/50">
                      <FileListDisplay
                        selectedFiles={selectedFiles}
                        fileStatuses={fileStatuses}
                        fileProgress={fileProgress}
                        fileRowCounts={fileRowCounts}
                      />
                    </div>
                  </div>
                </div>
              )}
          </CardContent>
        </Card>

        {/* Mapping Wizard */}
        {showMappingWizard && currentFileData && (
          <div className="animate-fade-in">
            <Card className="border-0 shadow-[var(--shadow-strong)] bg-card/90 backdrop-blur-sm">
              <CardHeader className="border-b border-border/50 bg-gradient-to-r from-accent/5 via-transparent to-primary/5">
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-accent/20 to-primary/20 border border-accent/20">
                    <MapPin className="h-5 w-5 text-accent" />
                  </div>
                  Column Mapping Wizard
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <ColumnMappingWizard
                  fileData={currentFileData}
                  expectedColumns={['sku', 'title', 'cost', 'weight']}
                  onMappingComplete={handleMappingComplete}
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Processing Errors */}
        {processingErrors.length > 0 && (
          <div className="animate-fade-in">
            <Card className="border-destructive/20 bg-destructive/5 backdrop-blur-sm">
              <CardHeader className="border-b border-destructive/20">
                <CardTitle className="flex items-center gap-3 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  Processing Errors
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <ProcessingErrorsDisplay errors={processingErrors} />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}