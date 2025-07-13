import { useCallback } from 'react';
import * as XLSX from 'xlsx';
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

    if (!targetData.originalWorkbook) {
      // Fallback to simple export if original workbook not available
      const mappedData: any[][] = [];
      mappedData.push(targetData.headers);
      
      sourceData.data.forEach(sourceRow => {
        const targetRow = new Array(targetData.headers.length).fill('');
        Object.entries(mappings).forEach(([sourceCol, targetCol]) => {
          const sourceIndex = sourceData.headers.indexOf(sourceCol);
          const targetIndex = targetData.headers.indexOf(targetCol);
          if (sourceIndex !== -1 && targetIndex !== -1) {
            targetRow[targetIndex] = sourceRow[sourceIndex] || '';
          }
        });
        mappedData.push(targetRow);
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(mappedData);
      XLSX.utils.book_append_sheet(wb, ws, 'Mapped Data');
      XLSX.writeFile(wb, 'mapped_data.xlsx');
      
      toast({
        title: "Export successful",
        description: `Exported ${sourceData.data.length} rows with ${Object.keys(mappings).length} column mappings`,
      });
      return;
    }

    try {
      // Use the original workbook directly (no cloning to avoid any structure changes)
      const targetWorkbook = targetData.originalWorkbook;
      
      // Use the selected sheet or first sheet
      const sheetName = targetData.selectedSheet || targetWorkbook.SheetNames[0];
      const targetWorksheet = targetWorkbook.Sheets[sheetName];
      
      // Get header row index (default to 0 if not specified)
      const headerRowIndex = (targetData as any).headerRowIndex || 0;
      const dataStartRow = headerRowIndex + 1;
      
      // Copy-paste approach: Only update existing cell values, never modify structure
      sourceData.data.forEach((sourceRow, rowIndex) => {
        Object.entries(mappings).forEach(([sourceCol, targetCol]) => {
          const sourceIndex = sourceData.headers.indexOf(sourceCol);
          const targetIndex = targetData.headers.indexOf(targetCol);
          
          if (sourceIndex !== -1 && targetIndex !== -1 && sourceRow[sourceIndex] !== undefined) {
            const cellAddress = XLSX.utils.encode_cell({ 
              r: dataStartRow + rowIndex, 
              c: targetIndex 
            });
            
            // Only update value if cell exists, otherwise create minimal cell
            if (targetWorksheet[cellAddress]) {
              // Preserve everything, only change the value (true copy-paste behavior)
              targetWorksheet[cellAddress].v = sourceRow[sourceIndex];
              if (targetWorksheet[cellAddress].w !== undefined) {
                targetWorksheet[cellAddress].w = String(sourceRow[sourceIndex] || '');
              }
            } else {
              // Create minimal cell only with value (Excel will handle formatting)
              targetWorksheet[cellAddress] = {
                v: sourceRow[sourceIndex],
                t: typeof sourceRow[sourceIndex] === 'number' ? 'n' : 's'
              };
            }
          }
        });
      });

      // Don't modify the range - keep it exactly as original

      // Export with original file name but add \"_mapped\" suffix
      const originalName = targetData.fileName.replace(/\.[^/.]+$/, '');
      const extension = targetData.fileName.match(/\.[^/.]+$/)?.[0] || '.xlsx';
      const exportFileName = `${originalName}_mapped${extension}`;

      // Write the file with all original formatting preserved
      XLSX.writeFile(targetWorkbook, exportFileName);
      
      toast({
        title: "Export successful",
        description: `Exported ${sourceData.data.length} rows with original target file formatting preserved`,
      });
    } catch (error) {
      console.error('Error during export:', error);
      toast({
        title: "Export error",
        description: "Failed to preserve formatting. Try again.",
        variant: "destructive"
      });
    }
  }, [toast]);

  return { exportMappedData };
};
