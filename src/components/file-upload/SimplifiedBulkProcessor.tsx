import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { parseFileSimply } from '@/components/SimpleFileParser';

export interface SimplifiedProcessingState {
  status: 'idle' | 'processing' | 'complete' | 'error';
  currentFile: string;
  currentFileIndex: number;
  totalFiles: number;
  progress: number; // 0-100
  message: string;
  errors: string[];
}

/**
 * Simplified bulk file processor
 * Processes files sequentially with clear progress tracking
 */
export const useSimplifiedBulkProcessor = (
  selectedCountry: string,
  onSaveData: (data: any[]) => Promise<void>
) => {
  const { toast } = useToast();
  const [state, setState] = useState<SimplifiedProcessingState>({
    status: 'idle',
    currentFile: '',
    currentFileIndex: 0,
    totalFiles: 0,
    progress: 0,
    message: '',
    errors: []
  });

  const processFiles = useCallback(async (
    files: File[],
    mapping: any
  ) => {
    if (!files || files.length === 0) {
      toast({
        title: "No Files",
        description: "Please select files to process.",
        variant: "destructive"
      });
      return;
    }

    if (!mapping) {
      toast({
        title: "No Mapping",
        description: "Please complete column mapping first.",
        variant: "destructive"
      });
      return;
    }

    setState({
      status: 'processing',
      currentFile: '',
      currentFileIndex: 0,
      totalFiles: files.length,
      progress: 0,
      message: 'Starting processing...',
      errors: []
    });

    const errors: string[] = [];
    let successCount = 0;

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        setState(prev => ({
          ...prev,
          currentFile: file.name,
          currentFileIndex: i + 1,
          message: `Processing ${file.name} (${i + 1}/${files.length})...`
        }));

        try {
          // Parse file
          const data = await parseFileSimply(file);
          
          if (!data || data.length === 0) {
            throw new Error('No data found in file');
          }

          // Map data
          const mappedData = data.map(row => {
            const mapped: any = {
              country: selectedCountry,
              currency: selectedCountry === 'KSA' ? 'SAR' : 'AED',
              notes: `Imported from ${file.name}`
            };

            // Apply mapping
            Object.entries(mapping).forEach(([targetField, sourceColumn]) => {
              if (sourceColumn && typeof sourceColumn === 'string') {
                mapped[targetField] = row[sourceColumn] || null;
              }
            });

            return mapped;
          }).filter(row => {
            // Basic validation
            return row.sku_code && row.sku_code.toString().trim();
          });

          // Save to database
          if (mappedData.length > 0) {
            await onSaveData(mappedData);
            successCount++;
          }

          // Update progress
          const progress = Math.round(((i + 1) / files.length) * 100);
          setState(prev => ({ ...prev, progress }));

        } catch (error) {
          const errorMsg = `${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          console.error(`Error processing ${file.name}:`, error);
          // Continue with next file
        }
      }

      // Complete
      setState({
        status: 'complete',
        currentFile: '',
        currentFileIndex: files.length,
        totalFiles: files.length,
        progress: 100,
        message: `Complete: ${successCount}/${files.length} files processed`,
        errors
      });

      toast({
        title: "Processing Complete",
        description: `Successfully processed ${successCount} of ${files.length} files.`,
        variant: successCount === files.length ? "default" : "destructive"
      });

    } catch (error) {
      setState(prev => ({
        ...prev,
        status: 'error',
        message: error instanceof Error ? error.message : 'Processing failed',
        errors: [...prev.errors, error instanceof Error ? error.message : 'Unknown error']
      }));

      toast({
        title: "Processing Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    }
  }, [selectedCountry, onSaveData, toast]);

  const reset = useCallback(() => {
    setState({
      status: 'idle',
      currentFile: '',
      currentFileIndex: 0,
      totalFiles: 0,
      progress: 0,
      message: '',
      errors: []
    });
  }, []);

  return {
    state,
    processFiles,
    reset
  };
};
