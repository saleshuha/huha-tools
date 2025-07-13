import React, { useState, useCallback } from 'react';
import { FileUpload } from './FileUpload';
import { ExportOptions } from './ExportOptions';
import { MappingProgressIndicator } from './MappingProgressIndicator';
import { MappingMethodSelector } from './MappingMethodSelector';
import { DropdownMappingView } from './mapping/DropdownMappingView';
import { ClickConnectMappingView } from './mapping/ClickConnectMappingView';
import { useToast } from '@/hooks/use-toast';
import { useExcelExport } from '@/hooks/useExcelExport';

import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, X, RotateCcw } from 'lucide-react';
import { ExcelData, ColumnMapping } from '@/types/excel';
import { MappingMethod } from '@/types/mappingMethods';

export const ExcelMapper = () => {
  const [sourceData, setSourceData] = useState<ExcelData | null>(null);
  const [targetData, setTargetData] = useState<ExcelData | null>(null);
  const [mappings, setMappings] = useState<ColumnMapping>({});
  const [mappingMethod, setMappingMethod] = useState<MappingMethod>('dropdown');
  const { toast } = useToast();
  const { exportMappedData } = useExcelExport();

  const removeMapping = useCallback((sourceColumn: string) => {
    setMappings(prev => {
      const newMappings = { ...prev };
      delete newMappings[sourceColumn];
      return newMappings;
    });
  }, []);

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
      default:
        return (
          <ClickConnectMappingView
            sourceData={sourceData}
            targetData={targetData}
            mappings={mappings}
            onCreateMapping={createMapping}
            onRemoveMapping={removeMapping}
          />
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
            {/* File Status and Clear Options - always visible when both files uploaded */}
            <div className="grid lg:grid-cols-2 gap-8 mb-6">
              {/* Source File Status */}
              <div className="glass-container p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FileSpreadsheet className="w-4 h-4 text-primary" />
                    <div>
                      <span className="font-medium text-sm">Source: {sourceData.fileName}</span>
                      <div className="text-xs text-muted-foreground">
                        {sourceData.headers.length} columns
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearSourceData}
                    className="text-destructive hover:text-destructive"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Change
                  </Button>
                </div>
              </div>

              {/* Target File Status */}
              <div className="glass-container p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FileSpreadsheet className="w-4 h-4 text-accent" />
                    <div>
                      <span className="font-medium text-sm">Target: {targetData.fileName}</span>
                      <div className="text-xs text-muted-foreground">
                        {targetData.headers.length} columns
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearTargetData}
                    className="text-destructive hover:text-destructive"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Change
                  </Button>
                </div>
              </div>
            </div>

            {/* Mapping Method Selector - only show after both files are uploaded */}
            <MappingMethodSelector
              selectedMethod={mappingMethod}
              onMethodChange={setMappingMethod}
            />

            {/* Reset/Back Button */}
            <div className="flex justify-center mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setSourceData(null);
                  setTargetData(null);
                  setMappings({});
                  setMappingMethod('dropdown');
                }}
                className="flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Start Over
              </Button>
            </div>

            {/* Mapping Interface */}
            {renderMappingInterface()}
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