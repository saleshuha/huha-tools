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
import { useBatchExport, BatchFile } from '@/hooks/useBatchExport';
import { FileSpreadsheet, Download, CheckCircle, AlertCircle, Clock, ArrowLeft } from 'lucide-react';
import { ExcelData, ColumnMapping } from '@/types/excel';
import { MappingMethod } from '@/types/mappingMethods';

interface ProcessingBatchFile extends BatchFile {
  status: 'pending' | 'processing' | 'completed' | 'error';
  error?: string;
}

export const BatchProcessor = () => {
  const [targetData, setTargetData] = useState<ExcelData | null>(null);
  const [sourceFiles, setSourceFiles] = useState<ProcessingBatchFile[]>([]);
  const [mappingMethod, setMappingMethod] = useState<MappingMethod>('dropdown');
  const [templateMappings, setTemplateMappings] = useState<ColumnMapping>({});
  const [defaultValues, setDefaultValues] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [showMappingSetup, setShowMappingSetup] = useState(false);
  
  const { toast } = useToast();
  const { exportIndividualFiles } = useBatchExport();

  const handleTargetUpload = useCallback((data: ExcelData) => {
    setTargetData(data);
    setTemplateMappings({});
    setDefaultValues({});
    toast({
      title: "Target file uploaded",
      description: `${data.headers.length} columns detected in ${data.fileName}`,
    });
  }, [toast]);

  const handleSourceFilesUpload = useCallback((data: ExcelData) => {
    const newFile: ProcessingBatchFile = {
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

  const setDefaultValue = useCallback((targetColumn: string, value: string) => {
    setDefaultValues(prev => ({
      ...prev,
      [targetColumn]: value
    }));
  }, []);

  const removeDefaultValue = useCallback((targetColumn: string) => {
    setDefaultValues(prev => {
      const newDefaults = { ...prev };
      delete newDefaults[targetColumn];
      return newDefaults;
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
      mappings: templateMappings,
      defaultValues: defaultValues
    })));
    toast({
      title: "Template applied",
      description: "Mappings and default values applied to all source files",
    });
  }, [templateMappings, toast]);

  const exportAllFiles = useCallback(async () => {
    if (!targetData) {
      toast({
        title: "No target file",
        description: "Please upload a target file first",
        variant: "destructive"
      });
      return;
    }

    const filesWithMappings = sourceFiles.filter(file => 
      file.mappings && Object.keys(file.mappings).length > 0
    );

    if (filesWithMappings.length === 0) {
      toast({
        title: "No mapped files",
        description: "Please apply template mappings to source files first",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Process each file individually
      for (let i = 0; i < filesWithMappings.length; i++) {
        const file = filesWithMappings[i];
        
        setSourceFiles(prev => prev.map(f => 
          f.id === file.id ? { ...f, status: 'processing' } : f
        ));

        try {
          await exportIndividualFiles([file], targetData);
          
          setSourceFiles(prev => prev.map(f => 
            f.id === file.id ? { ...f, status: 'completed' } : f
          ));

          toast({
            title: "File exported",
            description: `${file.data.fileName} exported as individual zip`,
          });
        } catch (error) {
          setSourceFiles(prev => prev.map(f => 
            f.id === file.id ? { 
              ...f, 
              status: 'error', 
              error: error instanceof Error ? error.message : 'Export failed'
            } : f
          ));
        }
      }

      toast({
        title: "Batch export completed",
        description: `Successfully exported ${filesWithMappings.length} individual zip files`,
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Failed to export batch files. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  }, [sourceFiles, targetData, exportIndividualFiles, toast]);

  const getStatusIcon = (status: ProcessingBatchFile['status']) => {
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

  const getStatusColor = (status: ProcessingBatchFile['status']) => {
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
          <div className="flex items-center justify-between">
            <Button
              variant="default"
              onClick={() => setShowMappingSetup(false)}
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Files
            </Button>
            <Link to="/">
              <Button variant="ghost" size="sm" className="flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
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
                defaultValues={defaultValues}
                onCreateMapping={createTemplateMapping}
                onRemoveMapping={removeTemplateMapping}
                onSetDefaultValue={setDefaultValue}
                onRemoveDefaultValue={removeDefaultValue}
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
              <Button onClick={applyTemplateMappings} disabled={Object.keys(templateMappings).length === 0 && Object.keys(defaultValues).length === 0}>
                Apply to All Files
              </Button>
              <Button variant="default" onClick={() => setShowMappingSetup(false)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
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
        <div className="flex items-center justify-between">
          <div className="w-32" />
          <div className="text-center flex-1">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-primary shadow-soft mb-4">
              <FileSpreadsheet className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-4xl font-bold mb-2">Batch File Processor</h1>
            <p className="text-muted-foreground text-lg">
              Process multiple source files and export each as individual zip files
            </p>
          </div>
          <Link to="/">
            <Button variant="default" className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground">
              <ArrowLeft className="w-4 h-4" />
              Back to Single File Mapper
            </Button>
          </Link>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
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

          <Card className="p-6">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-primary" />
              Source Files ({sourceFiles.length})
            </h3>
            <FileUpload
              onFileUpload={handleSourceFilesUpload}
              title="Upload Source Files"
              description="Upload multiple files to process individually"
              accept=".xlsx,.xls"
              multiple={true}
            />
          </Card>
        </div>

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
                    onClick={exportAllFiles}
                    disabled={!targetData || (Object.keys(templateMappings).length === 0 && Object.keys(defaultValues).length === 0) || isProcessing}
                    className="flex items-center gap-2 bg-accent hover:bg-accent/90"
                  >
                    <Download className="w-4 h-4" />
                    Export Individual Zip Files
                  </Button>
                  <Button
                    onClick={clearAllFiles}
                    disabled={isProcessing}
                    variant="outline"
                  >
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

              {(Object.keys(templateMappings).length > 0 || Object.keys(defaultValues).length > 0) && (
                <Alert>
                  <AlertDescription>
                    Template configured: {Object.keys(templateMappings).length} column mappings, {Object.keys(defaultValues).length} default values.
                    Ready to export individual zip files.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </Card>
        )}

        {sourceFiles.length > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Files in Queue</h3>
            <div className="space-y-2">
              {sourceFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border"
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
