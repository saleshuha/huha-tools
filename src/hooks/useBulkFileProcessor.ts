import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { parseFileSimply } from '@/components/SimpleFileParser';
import { 
  ProcessingError, 
  ProcessingAnalytics, 
  BulkProcessingSettings,
  FileStatus,
  FileProgress,
  FileRowCounts,
  FileMappings
} from '@/types/file-upload';

export const useBulkFileProcessor = (
  selectedCountry: string,
  onAddSKUs: (skus: any[]) => Promise<void>
) => {
  const { toast } = useToast();
  
  // Processing state
  const [fileStatuses, setFileStatuses] = useState<FileStatus>({});
  const [fileProgress, setFileProgress] = useState<FileProgress>({});
  const [fileMappings, setFileMappings] = useState<FileMappings>({});
  const [fileRowCounts, setFileRowCounts] = useState<FileRowCounts>({});
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
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

  const processMappedFile = useCallback(async (
    file: File, 
    mapping: any, 
    bulkSettings: BulkProcessingSettings,
    existingSkuSet: Set<string>
  ) => {
    const fileStartTime = Date.now();
    console.log(`🚀 Starting processing for file: ${file.name}`);
    
    try {
      setFileStatuses(prev => ({ ...prev, [file.name]: 'processing' }));
      setFileProgress(prev => ({ ...prev, [file.name]: 0 }));

      // Parse file data
      const data = await parseFileSimply(file);
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
            
            // Type conversion based on expected column
            if (expectedCol === 'cost' && value) {
              value = parseFloat(value) || 0;
            } else if (expectedCol === 'weight' && value) {
              value = parseFloat(value) || 0;
            }
            
            if (typeof value === 'string') {
              value = value.trim();
            }
            
            if (value !== undefined && value !== null && value !== '') {
              mappedRow[expectedCol] = value;
            }
          });
          
          // Ensure required fields are present
          if (!mappedRow.sku_code) {
            // Try common SKU field names if mapping didn't work
            mappedRow.sku_code = row.id || row.sku || row.product_id || row.item_code;
          }
          
          // Add metadata
          mappedRow.country = selectedCountry;
          mappedRow.currency = 'AED';
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
  }, [selectedCountry, onAddSKUs]);

  const processBulkFiles = useCallback(async (
    selectedFiles: FileList | null,
    globalMapping: any,
    bulkSettings: BulkProcessingSettings,
    existingSkuSet: Set<string>
  ) => {
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
        await processMappedFile(file, globalMapping, bulkSettings, existingSkuSet);
        
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
  }, [processMappedFile, toast]);

  const initializeFileStates = useCallback((files: FileList) => {
    const initialStatuses: FileStatus = {};
    const initialProgress: FileProgress = {};
    const initialRowCounts: FileRowCounts = {};
    
    Array.from(files).forEach(file => {
      initialStatuses[file.name] = 'pending';
      initialProgress[file.name] = 0;
      initialRowCounts[file.name] = { total: 0, processed: 0 };
    });
    
    setFileStatuses(initialStatuses);
    setFileProgress(initialProgress);
    setFileRowCounts(initialRowCounts);
    setProcessingErrors([]);
  }, []);

  const clearProcessingState = useCallback(() => {
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
  }, []);

  return {
    // State
    fileStatuses,
    fileProgress,
    fileMappings,
    fileRowCounts,
    isProcessingBulk,
    bulkProgress,
    processingErrors,
    processingAnalytics,
    
    // Actions
    processBulkFiles,
    initializeFileStates,
    clearProcessingState,
    setFileStatuses,
    setFileMappings
  };
};