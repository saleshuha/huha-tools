import React, { useState, useRef, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
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

export default function AddSKUPage({ onAddSKUs: propOnAddSKUs, isLoading: propIsLoading }: AddSKUPageProps = {}) {
  const { toast } = useToast();
  const { addSKUs } = useSKUManager();
  const { profile } = useUserProfile();
  const { selectedCountry } = useCountry();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State management
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
      // Use the first selected file as the template for mapping
      const selectedFileObjects = Array.from(selectedFiles);
      const templateFile = selectedFileObjects[0];
      console.log('Starting bulk mapping with template file:', templateFile.name);
      
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
      console.log('Template file headers:', headers);
      
      setCurrentFileData({
        headers,
        rows: data.map(row => headers.map(header => row[header]))
      });
      
      setCurrentFileName(templateFile.name);
      setShowMappingWizard(true);
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred during bulk mapping';
      console.error('Bulk mapping error:', errorMsg);
      
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
          {/* File Upload */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Input
                ref={fileInputRef}
                type="file"
                multiple
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
                  </div>
                </div>
                
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
            // Extract mapping from mappedData if available
            const mapping = mappedData?.mapping || {};
            setFileMappings(prev => ({ ...prev, [currentFileName]: mapping }));
            setFileStatuses(prev => ({ ...prev, [currentFileName]: 'mapped' }));
            
            
            toast({
              title: "Mapping Saved",
              description: `Column mapping saved for ${currentFileName}`,
              variant: "default"
            });
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