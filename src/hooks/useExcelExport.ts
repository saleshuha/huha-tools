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
      const originalName = targetData.fileName.replace(/\.[^/.]+$/, '');
      const zip = new JSZip();
      const maxRowsPerFile = 9900;
      let fileCount = 1;

      // Split data into chunks of 9900 rows
      for (let i = 0; i < totalRows; i += maxRowsPerFile) {
        const endIndex = Math.min(i + maxRowsPerFile, totalRows);
        const chunkRows = mappedRows.slice(i, endIndex);
        
        // Create CSV with headers + chunk data
        const csvData = [targetData.headers, ...chunkRows];
        const csvContent = arrayToCSV(csvData);
        
        const fileName = `${originalName}_mapped_part${fileCount}.csv`;
        zip.file(fileName, csvContent);
        fileCount++;
      }

      // Download zip file
      await downloadZip(zip, `${originalName}_mapped_files.zip`);

      toast({
        title: "Export successful",
        description: `Exported ${totalRows} rows in ${fileCount - 1} CSV file(s) with ${Object.keys(mappings).length} column mappings`,
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
