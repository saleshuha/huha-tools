import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { ExcelData, ColumnMapping } from '@/types/excel';
import JSZip from 'jszip';

interface BatchFile {
  id: string;
  data: ExcelData;
  mappings: ColumnMapping;
}

export const useBatchExport = () => {
  const { toast } = useToast();

  // Helper function to get file size in bytes
  const getFileSizeInBytes = (content: string): number => {
    return new Blob([content]).size;
  };

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

  const exportBatchData = useCallback(async (
    sourceFiles: BatchFile[],
    targetData: ExcelData | null
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
      const maxZipSize = 49 * 1024 * 1024; // 49MB in bytes
      const originalName = targetData.fileName.replace(/\.[^/.]+$/, '');

      let currentZip = new JSZip();
      let zipCount = 1;
      let fileCount = 1;
      let totalRowsExported = 0;
      const zipPromises: Promise<void>[] = [];

      // Process all source files
      for (const sourceFile of sourceFiles) {
        const mappings = sourceFile.mappings;
        if (!mappings || Object.keys(mappings).length === 0) {
          continue;
        }

        // Prepare mapped data rows for this source file
        const mappedRows: string[][] = [];
        
        sourceFile.data.data.forEach(sourceRow => {
          const targetRow = new Array(targetData.headers.length).fill('');
          Object.entries(mappings).forEach(([sourceCol, targetCol]) => {
            const sourceIndex = sourceFile.data.headers.indexOf(sourceCol);
            const targetIndex = targetData.headers.indexOf(targetCol);
            if (sourceIndex !== -1 && targetIndex !== -1) {
              const value = sourceRow[sourceIndex];
              targetRow[targetIndex] = value !== undefined ? String(value) : '';
            }
          });
          mappedRows.push(targetRow);
        });

        // Add rows to current CSV data
        let currentCSVData = [targetData.headers];
        
        for (const row of mappedRows) {
          const testCSVData = [...currentCSVData, row];
          const csvContent = arrayToCSV(testCSVData);
          const csvSize = getFileSizeInBytes(csvContent);

          // Check if adding this row would exceed 49MB for a single CSV
          if (csvSize > maxZipSize && currentCSVData.length > 1) {
            // Save current CSV to zip
            const finalCSVContent = arrayToCSV(currentCSVData);
            const fileName = `${originalName}_mapped_part${fileCount}.csv`;
            
            // Check if adding this file would exceed zip size limit
            // Simple check: if current zip has files and this CSV is large, create new zip
            const currentZipKeys = Object.keys(currentZip.files);
            const csvSize = getFileSizeInBytes(finalCSVContent);
            
            if (currentZipKeys.length > 0 && csvSize > maxZipSize * 0.8) {
              // Download current zip and create new one
              zipPromises.push(downloadZip(currentZip, `${originalName}_mapped_files_${zipCount}.zip`));
              zipCount++;
              currentZip = new JSZip();
            }
            
            // Add file to zip
            currentZip.file(fileName, finalCSVContent);
            fileCount++;
            totalRowsExported += currentCSVData.length - 1; // Subtract header
            
            // Reset for next CSV with headers and current row
            currentCSVData = [targetData.headers, row];
          } else {
            // Add row to current CSV
            currentCSVData.push(row);
          }
        }

        // Handle remaining data from this source file
        if (currentCSVData.length > 1) {
          const finalCSVContent = arrayToCSV(currentCSVData);
          const fileName = `${originalName}_mapped_part${fileCount}.csv`;
          
          // Check if adding this file would exceed zip size limit
          // Simple check: if current zip has files and this CSV is large, create new zip
          const currentZipKeys = Object.keys(currentZip.files);
          const csvSize = getFileSizeInBytes(finalCSVContent);
          
          if (currentZipKeys.length > 0 && csvSize > maxZipSize * 0.8) {
            // Download current zip and create new one
            zipPromises.push(downloadZip(currentZip, `${originalName}_mapped_files_${zipCount}.zip`));
            zipCount++;
            currentZip = new JSZip();
          }
          
          // Add file to zip
          currentZip.file(fileName, finalCSVContent);
          fileCount++;
          totalRowsExported += currentCSVData.length - 1; // Subtract header
        }
      }

      // Download final zip if it has files
      if (Object.keys(currentZip.files).length > 0) {
        zipPromises.push(downloadZip(currentZip, `${originalName}_mapped_files_${zipCount}.zip`));
      }

      // Wait for all downloads to complete
      await Promise.all(zipPromises);

      toast({
        title: "Batch export successful",
        description: `Exported ${totalRowsExported} rows from ${sourceFiles.length} source files in ${zipCount} zip file(s)`,
      });
      
    } catch (error) {
      console.error('Error during batch export:', error);
      toast({
        title: "Export error",
        description: "Failed to export batch files. Please try again.",
        variant: "destructive"
      });
    }
  }, [toast]);

  return { exportBatchData };
};