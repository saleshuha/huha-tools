import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { ExcelData, ColumnMapping } from '@/types/excel';
import JSZip from 'jszip';

export const useExcelExport = () => {
  const { toast } = useToast();

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

      const maxRowsPerFile = 9900;
      const totalRows = mappedRows.length;
      
      // Helper function to convert array to CSV content
      const arrayToCSV = (data: string[][]) => {
        return data.map(row => 
          row.map(field => {
            if (field.includes(',') || field.includes('"') || field.includes('\n') || field.includes('\r')) {
              return `"${field.replace(/"/g, '""')}"`;
            }
            return field;
          }).join(',')
        ).join('\n');
      };

      const originalName = targetData.fileName.replace(/\.[^/.]+$/, '');

      if (totalRows <= maxRowsPerFile) {
        // Single file export
        const csvData = [targetData.headers, ...mappedRows];
        const csvContent = arrayToCSV(csvData);
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (link.download !== undefined) {
          const url = URL.createObjectURL(blob);
          link.setAttribute('href', url);
          link.setAttribute('download', `${originalName}_mapped.csv`);
          
          link.style.visibility = 'hidden';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          URL.revokeObjectURL(url);
        }
        
        toast({
          title: "CSV Export successful",
          description: `Exported ${totalRows} rows with ${Object.keys(mappings).length} column mappings to CSV format`,
        });
      } else {
        // Multiple files export - create ZIP
        const zip = new JSZip();
        let fileCount = 0;
        
        for (let i = 0; i < totalRows; i += maxRowsPerFile) {
          fileCount++;
          const chunk = mappedRows.slice(i, i + maxRowsPerFile);
          const csvData = [targetData.headers, ...chunk];
          const csvContent = arrayToCSV(csvData);
          
          const fileName = `${originalName}_mapped_part${fileCount}.csv`;
          zip.file(fileName, csvContent);
        }
        
        // Generate and download ZIP file
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const link = document.createElement('a');
        
        if (link.download !== undefined) {
          const url = URL.createObjectURL(zipBlob);
          link.setAttribute('href', url);
          link.setAttribute('download', `${originalName}_mapped_files.zip`);
          
          link.style.visibility = 'hidden';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          URL.revokeObjectURL(url);
        }
        
        toast({
          title: "ZIP Export successful",
          description: `Exported ${totalRows} rows in ${fileCount} CSV files with ${Object.keys(mappings).length} column mappings`,
        });
      }
      
    } catch (error) {
      console.error('Error during CSV export:', error);
      toast({
        title: "Export error",
        description: "Failed to export CSV file. Please try again.",
        variant: "destructive"
      });
    }
  }, [toast]);

  return { exportMappedData };
};
