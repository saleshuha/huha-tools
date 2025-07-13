import React, { useState, useCallback } from 'react';
import { DndContext, DragOverlay } from '@dnd-kit/core';
import { FileUpload } from './FileUpload';
import { ColumnMapper } from './ColumnMapper';
import { ExportOptions } from './ExportOptions';
import { MappingProgressIndicator } from './MappingProgressIndicator';
import { MappingMethodSelector } from './MappingMethodSelector';
import { DropdownMappingView } from './mapping/DropdownMappingView';
import { ClickConnectMappingView } from './mapping/ClickConnectMappingView';
import { TableMappingView } from './mapping/TableMappingView';
import { AutoSuggestMappingView } from './mapping/AutoSuggestMappingView';
import { useToast } from '@/hooks/use-toast';
import { useExcelExport } from '@/hooks/useExcelExport';
import { useMappingHandlers } from '@/hooks/useMappingHandlers';
import { Separator } from '@/components/ui/separator';
import { FileSpreadsheet } from 'lucide-react';
import { ExcelData, ColumnMapping } from '@/types/excel';
import { MappingMethod } from '@/types/mappingMethods';

export const ExcelMapper = () => {
  const [sourceData, setSourceData] = useState<ExcelData | null>(null);
  const [targetData, setTargetData] = useState<ExcelData | null>(null);
  const [mappings, setMappings] = useState<ColumnMapping>({});
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [mappingMethod, setMappingMethod] = useState<MappingMethod>('drag-drop');
  const { toast } = useToast();
  const { exportMappedData } = useExcelExport();

  const { handleDragStart, handleDragEnd, removeMapping } = useMappingHandlers({
    sourceData,
    targetData,
    setMappings,
    setDraggedColumn
  });

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

  const onExport = useCallback(() => {
    exportMappedData(sourceData, targetData, mappings);
  }, [exportMappedData, sourceData, targetData, mappings]);

  const createMapping = useCallback((sourceColumn: string, targetColumn: string) => {
    setMappings(prev => ({
      ...prev,
      [sourceColumn]: targetColumn
    }));
    
    toast({
      title: "Mapping created",
      description: `${sourceColumn} → ${targetColumn}`,
    });
  }, [toast]);

  const renderMappingInterface = () => {
    if (!sourceData) return null;

    switch (mappingMethod) {
      case 'dropdown':
        return (
          <DropdownMappingView
            sourceData={sourceData}
            targetData={targetData}
            mappings={mappings}
            onCreateMapping={createMapping}
            onRemoveMapping={removeMapping}
          />
        );
      
      case 'click-connect':
        return (
          <ClickConnectMappingView
            sourceData={sourceData}
            targetData={targetData}
            mappings={mappings}
            onCreateMapping={createMapping}
            onRemoveMapping={removeMapping}
          />
        );
      
      case 'table':
        return (
          <TableMappingView
            sourceData={sourceData}
            targetData={targetData}
            mappings={mappings}
            onCreateMapping={createMapping}
            onRemoveMapping={removeMapping}
          />
        );
      
      case 'auto-suggest':
        return (
          <AutoSuggestMappingView
            sourceData={sourceData}
            targetData={targetData}
            mappings={mappings}
            onCreateMapping={createMapping}
            onRemoveMapping={removeMapping}
          />
        );
      
      case 'drag-drop':
      default:
        return (
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
        );
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
        <MappingProgressIndicator
          sourceData={sourceData}
          targetData={targetData}
          mappingCount={mappingCount}
        />

        {/* Mapping Method Selector */}
        <MappingMethodSelector
          selectedMethod={mappingMethod}
          onMethodChange={setMappingMethod}
        />

        {/* File Upload Section - only show for drag-drop or when no files uploaded */}
        {(mappingMethod === 'drag-drop' || !sourceData || !targetData) && (
          <div className="grid lg:grid-cols-2 gap-8 mb-8">
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
            </div>
          </div>
        )}

        {/* Mapping Interface */}
        {mappingMethod === 'drag-drop' ? (
          <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            {renderMappingInterface()}
            <DragOverlay>
              {draggedColumn && (
                <div className="column-card opacity-90 transform rotate-3 shadow-strong">
                  <div className="font-medium text-primary">{draggedColumn}</div>
                  <div className="text-sm text-muted-foreground">Dragging...</div>
                </div>
              )}
            </DragOverlay>
          </DndContext>
        ) : (
          renderMappingInterface()
        )}

        {/* Export Section */}
        {(sourceData || targetData) && (
          <>
            <Separator className="my-8" />
            <ExportOptions
              isReady={isReadyToExport}
              mappingCount={mappingCount}
              sourceData={sourceData}
              targetData={targetData}
              onExport={onExport}
            />
          </>
        )}
      </div>
    </div>
  );
};