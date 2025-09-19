
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

  // Helper function to convert array to CSV content
  const arrayToCSV = (data: string[][]): string => {
    return data.map(row => 
      row.map(field => {
        if (field.includes(',') || field.includes('"') || field.includes('\n') || field.includes('\r')) {
          return `"${field.replace(/"/g, '""')}"`;
        }
        return field;
      }).join(',')
    ).join('\n');
  };

  // Helper function to download zip
  const downloadZip = async (zip: JSZip, fileName: string): Promise<void> => {
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(zipBlob);
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
    }
  };

  const exportIndividualFiles = useCallback(async (
    sourceFiles: BatchFile[],
    targetData: ExcelData | null,
    defaultValues?: Record<string, string>
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
      for (const sourceFile of sourceFiles) {
        const mappings = sourceFile.mappings;
        
        if (!mappings || Object.keys(mappings).length === 0) {
          continue;
        }

        // Process this source file's data
        const mappedData: string[][] = [];
        const fileDefaultValues = sourceFile.defaultValues || defaultValues || {};
        
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
          Object.entries(fileDefaultValues).forEach(([targetCol, defaultValue]) => {
            const targetIndex = targetData.headers.indexOf(targetCol);
            if (targetIndex !== -1 && !targetRow[targetIndex]) {
              targetRow[targetIndex] = defaultValue;
            }
          });
          
          mappedData.push(targetRow);
        }

        if (mappedData.length === 0) {
          continue;
        }

        // Create individual zip file for this source file
        const zip = new JSZip();
        const originalName = sourceFile.data.fileName.replace(/\.[^/.]+$/, '');
        const maxRowsPerFile = 9900;
        const totalRows = mappedData.length;
        let fileCount = 1;

        // Split data into chunks of 9900 rows
        for (let i = 0; i < totalRows; i += maxRowsPerFile) {
          const endIndex = Math.min(i + maxRowsPerFile, totalRows);
          const rowsChunk = mappedData.slice(i, endIndex);
          
          // Create CSV with headers + data chunk
          const csvData = [targetData.headers, ...rowsChunk];
          const csvContent = arrayToCSV(csvData);
          
          // Create filename for this part
          const csvFileName = totalRows > maxRowsPerFile 
            ? `${originalName}_mapped_part${fileCount}.csv`
            : `${originalName}_mapped.csv`;
          
          zip.file(csvFileName, csvContent);
          fileCount++;
        }

        // Download individual zip file
        const zipFileName = `${originalName}_export.zip`;
        await downloadZip(zip, zipFileName);
      }
      
    } catch (error) {
      console.error('Error during individual file export:', error);
      toast({
        title: "Export error",
        description: "Failed to export files. Please try again.",
        variant: "destructive"
      });
    }
  }, [toast]);

  return { exportIndividualFiles };
};
