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
      // Process all files and split output based on row limit
      const allMappedRows: string[][] = [];
      
      // Process each file
      for (const sourceFile of sourceFiles) {
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
          
          allMappedRows.push(targetRow);
        }
      }

      if (allMappedRows.length === 0) {
        toast({
          title: "No data to export",
          description: "No valid mapped data found",
          variant: "destructive"
        });
        return;
      }

      // Debug logging
      console.log('Total mapped rows:', allMappedRows.length);
      console.log('Row limit:', rowLimit);

      // Split all mapped rows into batches based on row limit
      const outputBatches: string[][][] = [];
      for (let i = 0; i < allMappedRows.length; i += rowLimit) {
        const batchRows = allMappedRows.slice(i, i + rowLimit);
        const batchData = [[...targetData.headers], ...batchRows];
        outputBatches.push(batchData);
        console.log(`Batch ${outputBatches.length}: ${batchRows.length} rows`);
      }

      console.log('Total batches created:', outputBatches.length);

      // Process each output batch
      for (let batchIndex = 0; batchIndex < outputBatches.length; batchIndex++) {
        const mappedData = outputBatches[batchIndex];

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
        const batchFileName = outputBatches.length === 1 ? 
          `merged_export.csv` : 
          `merged_export_batch_${batchIndex + 1}.csv`;
        
        zip.file(batchFileName, csvContent);

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const link = document.createElement('a');
        
        if (link.download !== undefined) {
          const url = URL.createObjectURL(zipBlob);
          link.setAttribute('href', url);
          link.setAttribute('download', 
            outputBatches.length === 1 ? 
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
        description: `Created ${outputBatches.length} merged file${outputBatches.length > 1 ? 's' : ''} based on ${rowLimit} row limit`,
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