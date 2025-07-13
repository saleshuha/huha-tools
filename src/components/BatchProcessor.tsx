import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileUpload } from './FileUpload';
import { MappingMethodSelector } from './MappingMethodSelector';
import { DropdownMappingView } from './mapping/DropdownMappingView';
import { ClickConnectMappingView } from './mapping/ClickConnectMappingView';
import { useToast } from '@/hooks/use-toast';
import { useExcelExport } from '@/hooks/useExcelExport';
import { FileSpreadsheet, Play, Pause, RotateCcw, Download, CheckCircle, AlertCircle, Clock, ArrowLeft, Home } from 'lucide-react';
import { ExcelData, ColumnMapping } from '@/types/excel';
import { MappingMethod } from '@/types/mappingMethods';

interface BatchFile {
  id: string;
  data: ExcelData;
  status: 'pending' | 'processing' | 'completed' | 'error';
  mappings?: ColumnMapping;
  error?: string;
}

export const BatchProcessor = () => {
  const [targetData, setTargetData] = useState<ExcelData | null>(null);
  const [sourceFiles, setSourceFiles] = useState<BatchFile[]>([]);
  const [mappingMethod, setMappingMethod] = useState<MappingMethod>('dropdown');
  const [templateMappings, setTemplateMappings] = useState<ColumnMapping>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentFileIndex, setCurrentFileIndex] = useState<number>(-1);
  const [showMappingSetup, setShowMappingSetup] = useState(false);
  
  const { toast } = useToast();
  const { exportMappedData } = useExcelExport();

  const handleTargetUpload = useCallback((data: ExcelData) => {
    setTargetData(data);
    setTemplateMappings({});
    toast({
      title: "Target file uploaded",
      description: `${data.headers.length} columns detected in ${data.fileName}`,
    });
  }, [toast]);

  const handleSourceFilesUpload = useCallback((data: ExcelData) => {
    const newFile: BatchFile = {
      id: `${Date.now()}-${Math.random()}`,
      data,
      status: 'pending'
    };
    setSourceFiles(prev => [...prev, newFile]);
    toast({
      title: "Source file added",
      description: `${data.fileName} added to batch queue`,
    });
  }, [toast]);

  const removeSourceFile = useCallback((fileId: string) => {
    setSourceFiles(prev => prev.filter(file => file.id !== fileId));
  }, []);

  const clearAllFiles = useCallback(() => {
    setSourceFiles([]);
    setCurrentFileIndex(-1);
    setIsProcessing(false);
  }, []);

  const setupTemplateMappings = useCallback(() => {
    if (sourceFiles.length === 0) {
      toast({
        title: "No source files",
        description: "Please upload source files first",
        variant: "destructive"
      });
      return;
    }
    setShowMappingSetup(true);
  }, [sourceFiles.length, toast]);

  const createTemplateMapping = useCallback((sourceColumn: string, targetColumn: string) => {
    setTemplateMappings(prev => ({
      ...prev,
      [sourceColumn]: targetColumn
    }));
    
    toast({
      title: "Template mapping created",
      description: `${sourceColumn} → ${targetColumn}`,
    });
  }, [toast]);

  const removeTemplateMapping = useCallback((sourceColumn: string) => {
    setTemplateMappings(prev => {
      const newMappings = { ...prev };
      delete newMappings[sourceColumn];
      return newMappings;
    });
  }, []);

  const applyTemplateMappings = useCallback(() => {
    if (Object.keys(templateMappings).length === 0) {
      toast({
        title: "No mappings defined",
        description: "Please create template mappings first",
        variant: "destructive"
      });
      return;
    }
    setShowMappingSetup(false);
    setSourceFiles(prev => prev.map(file => ({
      ...file,
      mappings: templateMappings
    })));
    toast({
      title: "Template applied",
      description: "Mappings applied to all source files",
    });
  }, [templateMappings, toast]);

  const processFiles = useCallback(async () => {
    if (!targetData) {
      toast({
        title: "No target file",
        description: "Please upload a target file first",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    
    for (let i = 0; i < sourceFiles.length; i++) {
      const file = sourceFiles[i];
      if (file.status === 'completed') continue;

      setCurrentFileIndex(i);
      setSourceFiles(prev => prev.map((f, idx) => 
        idx === i ? { ...f, status: 'processing' } : f
      ));

      try {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate processing time
        
        const mappings = file.mappings || templateMappings;
        if (Object.keys(mappings).length === 0) {
          throw new Error('No mappings defined for this file');
        }

        // Export the file
        await exportMappedData(file.data, targetData, mappings);
        
        setSourceFiles(prev => prev.map((f, idx) => 
          idx === i ? { ...f, status: 'completed' } : f
        ));

        toast({
          title: "File processed",
          description: `${file.data.fileName} exported successfully`,
        });
      } catch (error) {
        setSourceFiles(prev => prev.map((f, idx) => 
          idx === i ? { 
            ...f, 
            status: 'error', 
            error: error instanceof Error ? error.message : 'Unknown error'
          } : f
        ));
        
        toast({
          title: "Processing failed",
          description: `Failed to process ${file.data.fileName}`,
          variant: "destructive"
        });
      }
    }

    setIsProcessing(false);
    setCurrentFileIndex(-1);
    
    toast({
      title: "Batch processing completed",
      description: "All files have been processed",
    });
  }, [sourceFiles, targetData, templateMappings, exportMappedData, toast]);

  const getStatusIcon = (status: BatchFile['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'processing':
        return <Clock className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: BatchFile['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'processing':
        return 'bg-blue-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-muted-foreground';
    }
  };

  const completedFiles = sourceFiles.filter(f => f.status === 'completed').length;
  const progress = sourceFiles.length > 0 ? (completedFiles / sourceFiles.length) * 100 : 0;

  if (showMappingSetup && sourceFiles.length > 0) {
    return (
      <div className="min-h-screen bg-gradient-surface p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header with Back Button */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => setShowMappingSetup(false)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Files
            </Button>
            <Link to="/">
              <Button variant="ghost" size="sm" className="flex items-center gap-2">
                <Home className="w-4 h-4" />
                Single File Mapper
              </Button>
            </Link>
          </div>

          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2">Setup Template Mappings</h1>
            <p className="text-muted-foreground">
              Create column mappings that will be applied to all source files
            </p>
          </div>

          <Card className="p-6">
            <div className="mb-4">
              <MappingMethodSelector
                selectedMethod={mappingMethod}
                onMethodChange={setMappingMethod}
              />
            </div>

            {mappingMethod === 'dropdown' ? (
              <DropdownMappingView
                sourceData={sourceFiles[0].data}
                targetData={targetData}
                mappings={templateMappings}
                onCreateMapping={createTemplateMapping}
                onRemoveMapping={removeTemplateMapping}
              />
            ) : (
              <ClickConnectMappingView
                sourceData={sourceFiles[0].data}
                targetData={targetData}
                mappings={templateMappings}
                onCreateMapping={createTemplateMapping}
                onRemoveMapping={removeTemplateMapping}
              />
            )}

            <div className="flex gap-4 mt-6">
              <Button onClick={applyTemplateMappings} disabled={Object.keys(templateMappings).length === 0}>
                Apply to All Files
              </Button>
              <Button variant="outline" onClick={() => setShowMappingSetup(false)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Files
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-surface p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header with Navigation */}
        <div className="flex items-center justify-between">
          <Link to="/">
            <Button variant="outline" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Single File Mapper
            </Button>
          </Link>
          <div className="text-center flex-1">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-primary shadow-soft mb-4">
              <FileSpreadsheet className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-4xl font-bold mb-2">Batch File Processor</h1>
            <p className="text-muted-foreground text-lg">
              Process multiple source files with the same target structure automatically
            </p>
          </div>
          <div className="w-32" /> {/* Spacer for center alignment */}
        </div>

        {/* File Uploads */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Target File */}
          <Card className="p-6">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-accent" />
              Target File Template
            </h3>
            {!targetData ? (
              <FileUpload
                onFileUpload={handleTargetUpload}
                title="Upload Target File"
                description="This structure will be used for all exports"
                accept=".xlsx,.xls"
                isTarget={true}
              />
            ) : (
              <div className="p-4 border border-border rounded-lg bg-muted/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FileSpreadsheet className="w-4 h-4 text-accent" />
                    <div>
                      <span className="font-medium">{targetData.fileName}</span>
                      <div className="text-sm text-muted-foreground">
                        {targetData.headers.length} columns
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTargetData(null)}
                    className="text-destructive hover:text-destructive"
                  >
                    Change
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {/* Source Files */}
          <Card className="p-6">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-primary" />
              Source Files ({sourceFiles.length})
            </h3>
            <FileUpload
              onFileUpload={handleSourceFilesUpload}
              title="Upload Source Files"
              description="Upload multiple files to process in batch"
              accept=".xlsx,.xls"
              multiple={true}
            />
          </Card>
        </div>

        {/* Progress and Controls */}
        {sourceFiles.length > 0 && (
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">Processing Queue</h3>
                <div className="flex gap-2">
                  <Button
                    onClick={setupTemplateMappings}
                    disabled={!targetData || isProcessing}
                    variant="outline"
                  >
                    Setup Mappings
                  </Button>
                  <Button
                    onClick={processFiles}
                    disabled={!targetData || Object.keys(templateMappings).length === 0 || isProcessing}
                    className="flex items-center gap-2"
                  >
                    <Play className="w-4 h-4" />
                    Start Processing
                  </Button>
                  <Button
                    onClick={clearAllFiles}
                    disabled={isProcessing}
                    variant="outline"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Clear All
                  </Button>
                </div>
              </div>

              {isProcessing && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      Progress: {completedFiles} of {sourceFiles.length} files
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {Math.round(progress)}%
                    </span>
                  </div>
                  <Progress value={progress} className="w-full" />
                </div>
              )}

              {Object.keys(templateMappings).length > 0 && (
                <Alert>
                  <AlertDescription>
                    Template mappings configured for {Object.keys(templateMappings).length} columns.
                    Ready to process files.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </Card>
        )}

        {/* File List */}
        {sourceFiles.length > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Files in Queue</h3>
            <div className="space-y-2">
              {sourceFiles.map((file, index) => (
                <div
                  key={file.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    currentFileIndex === index ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(file.status)}
                    <div>
                      <span className="font-medium">{file.data.fileName}</span>
                      <div className="text-sm text-muted-foreground">
                        {file.data.headers.length} columns
                        {file.error && (
                          <span className="text-red-500 ml-2">• {file.error}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge 
                      variant="outline" 
                      className={`${getStatusColor(file.status)} text-white border-transparent`}
                    >
                      {file.status}
                    </Badge>
                    {!isProcessing && file.status !== 'processing' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeSourceFile(file.id)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};