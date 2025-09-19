import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { ExcelData, ColumnMapping } from '@/types/excel';
import JSZip from 'jszip';

export interface BatchFile {
  id: string;
  data: ExcelData;
  mappings?: ColumnMapping;
  defaultValues?: Record<string, string>;
  pretextValues?: Record<string, string>;
}

export const useBatchExport = () => {
  const { toast } = useToast();

  const exportMergedFiles = useCallback(async (
    sourceFiles: BatchFile[],
    targetData: ExcelData | null,
    rowLimit: number = 10000,
    templateDefaultValues?: Record<string, string>
  ) => {
    if (!targetData || sourceFiles.length === 0) {
      toast({
        title: "Cannot export",
        description: "Please upload target file and source files with mappings",
        variant: "destructive"
      });
      return;
    }

    try {
      // Group files into batches based on row count limit
      const batches: BatchFile[][] = [];
      let currentBatch: BatchFile[] = [];
      let currentRowCount = 1; // Start with 1 for header row

      for (const sourceFile of sourceFiles) {
        const fileRowCount = sourceFile.data.data.length;
        
        // If adding this file would exceed the limit, start a new batch
        if (currentRowCount + fileRowCount > rowLimit && currentBatch.length > 0) {
          batches.push([...currentBatch]);
          currentBatch = [sourceFile];
          currentRowCount = 1 + fileRowCount; // header + file rows
        } else {
          currentBatch.push(sourceFile);
          currentRowCount += fileRowCount; // Add rows from this file
        }
      }

      // Add the last batch if it has files
      if (currentBatch.length > 0) {
        batches.push(currentBatch);
      }

      // Process each batch
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        const mappedData: string[][] = [];
        
        // Add header row
        mappedData.push([...targetData.headers]);

        // Process each file in the batch
        for (const sourceFile of batch) {
          const mappings = sourceFile.mappings;
          
          if (!mappings || Object.keys(mappings).length === 0) {
            continue;
          }

          // Process each row of source data
          for (const sourceRow of sourceFile.data.data) {
            const targetRow = new Array(targetData.headers.length).fill('');
            
            // Apply column mappings with optional pretext
            Object.entries(mappings).forEach(([sourceCol, targetCol]) => {
              const sourceIndex = sourceFile.data.headers.indexOf(sourceCol);
              const targetIndex = targetData.headers.indexOf(targetCol);
              if (sourceIndex !== -1 && targetIndex !== -1) {
                let value = sourceRow[sourceIndex];
                value = value !== undefined ? String(value) : '';
                
                // Add pretext if defined
                if (sourceFile.pretextValues && sourceFile.pretextValues[sourceCol]) {
                  value = sourceFile.pretextValues[sourceCol] + value;
                }
                
                targetRow[targetIndex] = value;
              }
            });
            
            // Apply default values for unmapped columns
            const fileDefaultValues = sourceFile.defaultValues || {};
            const allDefaultValues = { ...templateDefaultValues, ...fileDefaultValues };
            
            // Apply defaults to all empty columns
            targetData.headers.forEach((header, index) => {
              if ((targetRow[index] === '' || targetRow[index] === null || targetRow[index] === undefined) && allDefaultValues[header]) {
                targetRow[index] = allDefaultValues[header];
              }
            });
            
            mappedData.push(targetRow);
          }
        }

        if (mappedData.length <= 1) { // Only header, no data
          continue;
        }

        // Create CSV content for this batch
        const csvContent = mappedData.map(row => 
          row.map(field => {
            const fieldStr = String(field);
            if (fieldStr.includes(',') || fieldStr.includes('"') || fieldStr.includes('\n') || fieldStr.includes('\r')) {
              return `"${fieldStr.replace(/"/g, '""')}"`;
            }
            return fieldStr;
          }).join(',')
        ).join('\n');

        // Create and download zip for this batch
        const zip = new JSZip();
        const batchFileName = batches.length === 1 ? 
          `merged_export.csv` : 
          `merged_export_batch_${batchIndex + 1}.csv`;
        
        zip.file(batchFileName, csvContent);

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const link = document.createElement('a');
        
        if (link.download !== undefined) {
          const url = URL.createObjectURL(zipBlob);
          link.setAttribute('href', url);
          link.setAttribute('download', 
            batches.length === 1 ? 
              'merged_export.zip' : 
              `merged_export_batch_${batchIndex + 1}.zip`
          );
          
          link.style.visibility = 'hidden';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          URL.revokeObjectURL(url);
        }
      }

      toast({
        title: "Export completed",
        description: `Created ${batches.length} merged file${batches.length > 1 ? 's' : ''} based on ${rowLimit} row limit`,
      });

    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export failed",
        description: "Failed to export merged files. Please try again.",
        variant: "destructive"
      });
      throw error;
    }
  }, [toast]);

  return {
    exportMergedFiles
  };
};