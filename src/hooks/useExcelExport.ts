import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { ExcelData, ColumnMapping } from '@/types/excel';

export const useExcelExport = () => {
  const { toast } = useToast();

  const exportMappedData = useCallback((
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
      // Create CSV data
      const csvData: string[][] = [];
      
      // Add header row
      csvData.push(targetData.headers);
      
      // Add data rows
      sourceData.data.forEach(sourceRow => {
        const targetRow = new Array(targetData.headers.length).fill('');
        Object.entries(mappings).forEach(([sourceCol, targetCol]) => {
          const sourceIndex = sourceData.headers.indexOf(sourceCol);
          const targetIndex = targetData.headers.indexOf(targetCol);
          if (sourceIndex !== -1 && targetIndex !== -1) {
            const value = sourceRow[sourceIndex];
            // Handle values that might contain commas, quotes, or newlines
            targetRow[targetIndex] = value !== undefined ? String(value) : '';
          }
        });
        csvData.push(targetRow);
      });

      // Convert to CSV format
      const csvContent = csvData.map(row => 
        row.map(field => {
          // Escape fields that contain commas, quotes, or newlines
          if (field.includes(',') || field.includes('"') || field.includes('\n') || field.includes('\r')) {
            return `"${field.replace(/"/g, '""')}"`;
          }
          return field;
        }).join(',')
      ).join('\n');

      // Create and download the CSV file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        
        // Generate filename
        const originalName = targetData.fileName.replace(/\.[^/.]+$/, '');
        const exportFileName = `${originalName}_mapped.csv`;
        link.setAttribute('download', exportFileName);
        
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up the URL object
        URL.revokeObjectURL(url);
      }
      
      toast({
        title: "CSV Export successful",
        description: `Exported ${sourceData.data.length} rows with ${Object.keys(mappings).length} column mappings to CSV format`,
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

  return { exportMappedData };
};
