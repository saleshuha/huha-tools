import React, { useState, useCallback } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent } from '@dnd-kit/core';
import { FileUpload } from './FileUpload';
import { ColumnMapper } from './ColumnMapper';
import { ExportOptions } from './ExportOptions';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, FileSpreadsheet, ArrowRight } from 'lucide-react';
import * as XLSX from 'xlsx';

export interface ExcelData {
  headers: string[];
  data: any[][];
  fileName: string;
  sheetNames?: string[];
  selectedSheet?: string;
  originalWorkbook?: any; // Store the original XLSX workbook for target files
}

export interface ColumnMapping {
  [sourceColumn: string]: string; // source column -> target column
}

export const ExcelMapper = () => {
  const [sourceData, setSourceData] = useState<ExcelData | null>(null);
  const [targetData, setTargetData] = useState<ExcelData | null>(null);
  const [mappings, setMappings] = useState<ColumnMapping>({});
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSourceUpload = useCallback((data: ExcelData) => {
    setSourceData(data);
    setMappings({}); // Reset mappings when new source is uploaded
    toast({
      title: "Source file uploaded",
      description: `${data.headers.length} columns detected in ${data.fileName}`,
    });
  }, [toast]);

  const handleTargetUpload = useCallback((data: ExcelData) => {
    setTargetData(data);
    setMappings({}); // Reset mappings when new target is uploaded
    toast({
      title: "Target file uploaded", 
      description: `${data.headers.length} columns detected in ${data.fileName}`,
    });
  }, [toast]);

  const handleDragStart = (event: DragStartEvent) => {
    setDraggedColumn(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && sourceData && targetData) {
      const sourceColumn = active.id as string;
      const targetColumn = over.id as string;
      
      // Check if source column exists and target column exists
      if (sourceData.headers.includes(sourceColumn) && targetData.headers.includes(targetColumn)) {
        setMappings(prev => ({
          ...prev,
          [sourceColumn]: targetColumn
        }));
        
        toast({
          title: "Mapping created",
          description: `${sourceColumn} → ${targetColumn}`,
        });
      }
    }
    
    setDraggedColumn(null);
  };

  const removeMapping = (sourceColumn: string) => {
    setMappings(prev => {
      const newMappings = { ...prev };
      delete newMappings[sourceColumn];
      return newMappings;
    });
    
    toast({
      title: "Mapping removed",
      description: `Removed mapping for ${sourceColumn}`,
    });
  };

  const exportMappedData = () => {
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

      // Export with original file name but add "_mapped" suffix
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
  };

  const mappingCount = Object.keys(mappings).length;
  const isReadyToExport = sourceData && targetData && mappingCount > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
            Excel Column Mapper
          </h1>
          <p className="text-muted-foreground text-lg">
            Upload two Excel files, map columns, and export transformed data
          </p>
        </div>

        {/* Progress Indicator */}
        <Card className="mb-8 p-6 bg-gradient-surface">
          <div className="flex items-center justify-center space-x-8">
            <div className="flex items-center space-x-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                sourceData ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                {sourceData ? <CheckCircle className="w-4 h-4" /> : <FileSpreadsheet className="w-4 h-4" />}
              </div>
              <span className={sourceData ? 'text-success font-medium' : 'text-muted-foreground'}>
                Source File
              </span>
              {sourceData && (
                <Badge variant="secondary" className="ml-2">
                  {sourceData.headers.length} columns
                </Badge>
              )}
            </div>

            <ArrowRight className="w-5 h-5 text-muted-foreground" />

            <div className="flex items-center space-x-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                targetData ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                {targetData ? <CheckCircle className="w-4 h-4" /> : <FileSpreadsheet className="w-4 h-4" />}
              </div>
              <span className={targetData ? 'text-success font-medium' : 'text-muted-foreground'}>
                Target File
              </span>
              {targetData && (
                <Badge variant="secondary" className="ml-2">
                  {targetData.headers.length} columns
                </Badge>
              )}
            </div>

            <ArrowRight className="w-5 h-5 text-muted-foreground" />

            <div className="flex items-center space-x-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                mappingCount > 0 ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                <span className="text-sm font-bold">{mappingCount}</span>
              </div>
              <span className={mappingCount > 0 ? 'text-success font-medium' : 'text-muted-foreground'}>
                Mappings
              </span>
            </div>
          </div>
        </Card>

        <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Source File Upload */}
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold flex items-center space-x-2">
                <FileSpreadsheet className="w-6 h-6 text-primary" />
                <span>Source File</span>
              </h2>
              <FileUpload
                onFileUpload={handleSourceUpload}
                title="Upload Source Excel File"
                description="Select the Excel file containing your source data"
                accept=".xlsx,.xls"
              />
              {sourceData && (
                <ColumnMapper
                  data={sourceData}
                  type="source"
                  mappings={mappings}
                  onRemoveMapping={removeMapping}
                />
              )}
            </div>

            {/* Target File Upload */}
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold flex items-center space-x-2">
                <FileSpreadsheet className="w-6 h-6 text-accent" />
                <span>Target File</span>
              </h2>
              <FileUpload
                onFileUpload={handleTargetUpload}
                title="Upload Target Excel File"
                description="Select the Excel file with your target column structure"
                accept=".xlsx,.xls"
                isTarget={true}
              />
              {targetData && (
                <ColumnMapper
                  data={targetData}
                  type="target"
                  mappings={mappings}
                  onRemoveMapping={removeMapping}
                />
              )}
            </div>
          </div>

          <DragOverlay>
            {draggedColumn && (
              <div className="column-card opacity-90 transform rotate-3 shadow-strong">
                <div className="font-medium text-primary">{draggedColumn}</div>
                <div className="text-sm text-muted-foreground">Dragging...</div>
              </div>
            )}
          </DragOverlay>
        </DndContext>

        {/* Export Section */}
        {(sourceData || targetData) && (
          <>
            <Separator className="my-8" />
            <ExportOptions
              isReady={isReadyToExport}
              mappingCount={mappingCount}
              sourceData={sourceData}
              targetData={targetData}
              onExport={exportMappedData}
            />
          </>
        )}
      </div>
    </div>
  );
};