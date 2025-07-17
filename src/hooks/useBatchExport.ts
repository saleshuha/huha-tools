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

      // Step 1: Process ALL files first
      toast({
        title: "Processing files...",
        description: "Mapping all source files, please wait",
      });

      const allMappedData: string[][] = [];
      let totalRowsProcessed = 0;

      // Process all files completely first
      for (const sourceFile of sourceFiles) {
        const mappings = sourceFile.mappings;
        
        if (!mappings || Object.keys(mappings).length === 0) {
          continue;
        }

        // Process this source file's data
        for (const sourceRow of sourceFile.data.data) {
          const targetRow = new Array(targetData.headers.length).fill('');
          Object.entries(mappings).forEach(([sourceCol, targetCol]) => {
            const sourceIndex = sourceFile.data.headers.indexOf(sourceCol);
            const targetIndex = targetData.headers.indexOf(targetCol);
            if (sourceIndex !== -1 && targetIndex !== -1) {
              const value = sourceRow[sourceIndex];
              targetRow[targetIndex] = value !== undefined ? String(value) : '';
            }
          });
          allMappedData.push(targetRow);
        }

        totalRowsProcessed += sourceFile.data.data.length;
      }

      if (allMappedData.length === 0) {
        toast({
          title: "No data to export",
          description: "Please check your mappings and try again",
          variant: "destructive"
        });
        return;
      }

      // Step 2: Create zip files from processed data
      toast({
        title: "Creating export files...",
        description: `Creating zip files from ${totalRowsProcessed} processed rows`,
      });

      const zipPromises: Promise<void>[] = [];
      let zipCount = 1;
      let currentZip = new JSZip();
      let currentZipSize = 0;
      let currentCSVData = [targetData.headers];
      let fileCount = 1;

      // Process all mapped data into zip files
      for (let i = 0; i < allMappedData.length; i++) {
        const row = allMappedData[i];
        const testCSVData = [...currentCSVData, row];
        const csvContent = arrayToCSV(testCSVData);
        const csvSize = getFileSizeInBytes(csvContent);

        // If adding this row would make CSV too large, finalize current CSV
        if (csvSize > maxZipSize && currentCSVData.length > 1) {
          const finalCSVContent = arrayToCSV(currentCSVData);
          const fileName = `${originalName}_mapped_part${fileCount}.csv`;
          const finalCSVSize = getFileSizeInBytes(finalCSVContent);

          // If adding this CSV would exceed zip limit, create new zip
          if (currentZipSize + finalCSVSize > maxZipSize && Object.keys(currentZip.files).length > 0) {
            zipPromises.push(downloadZip(currentZip, `${originalName}_batch_${zipCount}.zip`));
            zipCount++;
            currentZip = new JSZip();
            currentZipSize = 0;
          }

          // Add CSV to current zip
          currentZip.file(fileName, finalCSVContent);
          currentZipSize += finalCSVSize;
          fileCount++;

          // Start new CSV with headers and current row
          currentCSVData = [targetData.headers, row];
        } else {
          // Add row to current CSV
          currentCSVData.push(row);
        }
      }

      // Handle final CSV if it has data
      if (currentCSVData.length > 1) {
        const finalCSVContent = arrayToCSV(currentCSVData);
        const fileName = `${originalName}_mapped_part${fileCount}.csv`;
        const finalCSVSize = getFileSizeInBytes(finalCSVContent);

        // If adding this CSV would exceed zip limit, create new zip
        if (currentZipSize + finalCSVSize > maxZipSize && Object.keys(currentZip.files).length > 0) {
          zipPromises.push(downloadZip(currentZip, `${originalName}_batch_${zipCount}.zip`));
          zipCount++;
          currentZip = new JSZip();
        }

        // Add final CSV to zip
        currentZip.file(fileName, finalCSVContent);
      }

      // Download final zip if it has files
      if (Object.keys(currentZip.files).length > 0) {
        zipPromises.push(downloadZip(currentZip, `${originalName}_batch_${zipCount}.zip`));
      }

      // Download all zip files
      await Promise.all(zipPromises);

      toast({
        title: "Batch export successful",
        description: `Exported ${totalRowsProcessed} rows from ${sourceFiles.length} source files in ${zipCount} zip file(s)`,
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