import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { ExcelData, ColumnMapping } from '@/types/excel';
import JSZip from 'jszip';

export const useExcelExport = () => {
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

  const exportMappedData = useCallback(async (
    sourceData: ExcelData | null,
    targetData: ExcelData | null,
    mappings: ColumnMapping
  ) => {
    if (!sourceData || !targetData || Object.keys(mappings).length === 0) {
      toast({
        title: "Cannot export",
        description: "Please upload both files and create at least one mapping",
        variant: "destructive"
      });
      return;
    }

    try {
      // Prepare mapped data rows
      const mappedRows: string[][] = [];
      
      sourceData.data.forEach(sourceRow => {
        const targetRow = new Array(targetData.headers.length).fill('');
        Object.entries(mappings).forEach(([sourceCol, targetCol]) => {
          const sourceIndex = sourceData.headers.indexOf(sourceCol);
          const targetIndex = targetData.headers.indexOf(targetCol);
          if (sourceIndex !== -1 && targetIndex !== -1) {
            const value = sourceRow[sourceIndex];
            targetRow[targetIndex] = value !== undefined ? String(value) : '';
          }
        });
        mappedRows.push(targetRow);
      });

      const totalRows = mappedRows.length;
      const maxZipSize = 49 * 1024 * 1024; // 49MB in bytes
      const originalName = targetData.fileName.replace(/\.[^/.]+$/, '');

      // Create first CSV with headers
      let currentCSVData = [targetData.headers];
      let currentSize = getFileSizeInBytes(arrayToCSV(currentCSVData));
      let zipCount = 1;
      let fileCount = 1;
      let currentZip = new JSZip();
      const zipPromises: Promise<void>[] = [];

      for (let i = 0; i < totalRows; i++) {
        const newRow = mappedRows[i];
        const testCSVData = [...currentCSVData, newRow];
        const testSize = getFileSizeInBytes(arrayToCSV(testCSVData));

        // Check if adding this row would exceed 49MB
        if (testSize > maxZipSize && currentCSVData.length > 1) {
          // Save current CSV to zip
          const csvContent = arrayToCSV(currentCSVData);
          const fileName = `${originalName}_mapped_part${fileCount}.csv`;
          currentZip.file(fileName, csvContent);
          fileCount++;

          // Check if we need a new zip
          const zipSize = await currentZip.generateAsync({ type: 'uint8array' });
          if (zipSize.length > maxZipSize) {
            // Remove the last file from current zip and create new zip
            currentZip.remove(fileName);
            
            // Download current zip
            zipPromises.push(downloadZip(currentZip, `${originalName}_mapped_files_${zipCount}.zip`));
            zipCount++;
            
            // Create new zip with the file that didn't fit
            currentZip = new JSZip();
            currentZip.file(fileName, csvContent);
          }

          // Reset for next CSV
          currentCSVData = [targetData.headers, newRow];
          currentSize = getFileSizeInBytes(arrayToCSV(currentCSVData));
        } else {
          // Add row to current CSV
          currentCSVData.push(newRow);
          currentSize = testSize;
        }
      }

      // Handle remaining data
      if (currentCSVData.length > 1) {
        const csvContent = arrayToCSV(currentCSVData);
        const fileName = `${originalName}_mapped_part${fileCount}.csv`;
        currentZip.file(fileName, csvContent);
      }

      // Download final zip
      zipPromises.push(downloadZip(currentZip, `${originalName}_mapped_files_${zipCount}.zip`));

      // Wait for all downloads to complete
      await Promise.all(zipPromises);

      toast({
        title: "Export successful",
        description: `Exported ${totalRows} rows in ${zipCount} zip file(s) with ${Object.keys(mappings).length} column mappings`,
      });
      
    } catch (error) {
      console.error('Error during CSV export:', error);
      toast({
        title: "Export error",
        description: "Failed to export CSV file. Please try again.",
        variant: "destructive"
      });
    }
  }, [toast]);

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

  return { exportMappedData };
};
