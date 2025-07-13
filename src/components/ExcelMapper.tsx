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
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, X } from 'lucide-react';
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

  const clearSourceData = useCallback(() => {
    setSourceData(null);
    setMappings({});
    toast({
      title: "Source file cleared",
      description: "Source file has been removed",
    });
  }, [toast]);

  const clearTargetData = useCallback(() => {
    setTargetData(null);
    setMappings({});
    toast({
      title: "Target file cleared", 
      description: "Target file has been removed",
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
          <div className="grid lg:grid-cols-2 gap-10 animate-slide-up">
            {/* Source File Upload */}
            <div className="space-y-8">
              <div className="glass-container p-6 animate-fade-in-scale">
                <div className="card-header-gradient p-4 -m-6 mb-6 rounded-t-2xl">
                  <h2 className="text-2xl font-bold flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-primary/20">
                      <FileSpreadsheet className="w-6 h-6 text-primary" />
                    </div>
                    <span className="bg-gradient-primary bg-clip-text text-transparent">Source File</span>
                  </h2>
                  <p className="text-muted-foreground mt-2">Upload your source Excel file to begin mapping</p>
                </div>
                <FileUpload
                  onFileUpload={handleSourceUpload}
                  title="Upload Source Excel File"
                  description="Select the Excel file containing your source data"
                  accept=".xlsx,.xls"
                />
                {sourceData && (
                  <div className="mt-6 animate-bounce-in">
                    <ColumnMapper
                      data={sourceData}
                      type="source"
                      mappings={mappings}
                      onRemoveMapping={removeMapping}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Target File Upload */}
            <div className="space-y-8">
              <div className="glass-container p-6 animate-fade-in-scale">
                <div className="card-header-gradient p-4 -m-6 mb-6 rounded-t-2xl">
                  <h2 className="text-2xl font-bold flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-accent/20">
                      <FileSpreadsheet className="w-6 h-6 text-accent" />
                    </div>
                    <span className="bg-gradient-accent bg-clip-text text-transparent">Target File</span>
                  </h2>
                  <p className="text-muted-foreground mt-2">Upload your target Excel file structure</p>
                </div>
                <FileUpload
                  onFileUpload={handleTargetUpload}
                  title="Upload Target Excel File"
                  description="Select the Excel file with your target column structure"
                  accept=".xlsx,.xls"
                  isTarget={true}
                />
                {targetData && (
                  <div className="mt-6 animate-bounce-in">
                    <ColumnMapper
                      data={targetData}
                      type="target"
                      mappings={mappings}
                      onRemoveMapping={removeMapping}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        );
    }
  };

  const mappingCount = Object.keys(mappings).length;
  const isReadyToExport = sourceData && targetData && mappingCount > 0;

  return (
    <div className="min-h-screen bg-gradient-surface p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Clean Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-primary shadow-soft mb-4">
            <FileSpreadsheet className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Excel Column Mapper
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Upload Excel files, map columns, and export transformed data
          </p>
        </div>

        {/* Progress Indicator */}
        <MappingProgressIndicator
          sourceData={sourceData}
          targetData={targetData}
          mappingCount={mappingCount}
        />

        {/* Initial File Upload Section - for drag-drop or when no files */}
        {!sourceData || !targetData ? (
          <div className="grid lg:grid-cols-2 gap-8 mb-8">
            {/* Source File Upload */}
            <div className="glass-container p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold flex items-center space-x-2">
                  <FileSpreadsheet className="w-5 h-5 text-primary" />
                  <span>Source File</span>
                </h2>
                {sourceData && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearSourceData}
                    className="text-destructive hover:text-destructive"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
              {!sourceData ? (
                <FileUpload
                  onFileUpload={handleSourceUpload}
                  title="Upload Source Excel File"
                  description="Select the Excel file containing your source data"
                  accept=".xlsx,.xls"
                />
              ) : (
                <div className="p-4 border border-border rounded-lg bg-muted/50">
                  <div className="flex items-center space-x-2">
                    <FileSpreadsheet className="w-4 h-4 text-primary" />
                    <span className="font-medium">{sourceData.fileName}</span>
                    <span className="text-sm text-muted-foreground">
                      ({sourceData.headers.length} columns)
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Target File Upload */}
            <div className="glass-container p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold flex items-center space-x-2">
                  <FileSpreadsheet className="w-5 h-5 text-accent" />
                  <span>Target File</span>
                </h2>
                {targetData && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearTargetData}
                    className="text-destructive hover:text-destructive"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
              {!targetData ? (
                <FileUpload
                  onFileUpload={handleTargetUpload}
                  title="Upload Target Excel File"
                  description="Select the Excel file with your target column structure"
                  accept=".xlsx,.xls"
                  isTarget={true}
                />
              ) : (
                <div className="p-4 border border-border rounded-lg bg-muted/50">
                  <div className="flex items-center space-x-2">
                    <FileSpreadsheet className="w-4 h-4 text-accent" />
                    <span className="font-medium">{targetData.fileName}</span>
                    <span className="text-sm text-muted-foreground">
                      ({targetData.headers.length} columns)
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Mapping Method Selector - only show after both files are uploaded */}
            <div className="glass-container p-6">
              <h2 className="text-xl font-semibold mb-4">Choose Mapping Method</h2>
              <MappingMethodSelector
                selectedMethod={mappingMethod}
                onMethodChange={setMappingMethod}
              />
            </div>

            {/* Mapping Interface */}
            {mappingMethod === 'drag-drop' ? (
              <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                {renderMappingInterface()}
                <DragOverlay>
                  {draggedColumn && (
                    <div className="glass-container p-4 opacity-95 transform rotate-6 shadow-medium">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 rounded-full bg-primary"></div>
                        <div>
                          <div className="font-semibold text-primary">{draggedColumn}</div>
                          <div className="text-sm text-accent font-medium">Dragging to target...</div>
                        </div>
                      </div>
                    </div>
                  )}
                </DragOverlay>
              </DndContext>
            ) : (
              renderMappingInterface()
            )}
          </>
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