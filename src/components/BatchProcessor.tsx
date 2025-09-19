import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileUpload } from './FileUpload';
import { MappingMethodSelector } from './MappingMethodSelector';
import { DropdownMappingView } from './mapping/DropdownMappingView';
import { ClickConnectMappingView } from './mapping/ClickConnectMappingView';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';

import { useToast } from '@/hooks/use-toast';
import { useBatchExport, BatchFile } from '@/hooks/useBatchExport';
import { FileSpreadsheet, Download, CheckCircle, AlertCircle, Clock, ArrowLeft, Upload, X, Loader2 } from 'lucide-react';
import { ExcelData, ColumnMapping } from '@/types/excel';
import { MappingMethod } from '@/types/mappingMethods';

interface ProcessingBatchFile extends BatchFile {
  status: 'pending' | 'processing' | 'completed' | 'error';
  error?: string;
}

interface UploadState {
  total: number;
  completed: number;
  failed: number;
  isUploading: boolean;
  errors: { fileName: string; error: string }[];
}

export const BatchProcessor = () => {
  const [targetData, setTargetData] = useState<ExcelData | null>(null);
  const [sourceFiles, setSourceFiles] = useState<ProcessingBatchFile[]>([]);
  const [mappingMethod, setMappingMethod] = useState<MappingMethod>('dropdown');
  const [templateMappings, setTemplateMappings] = useState<ColumnMapping>({});
  const [defaultValues, setDefaultValues] = useState<Record<string, string>>({});
  const [pretextValues, setPretextValues] = useState<Record<string, string>>({});
  const [rowLimit, setRowLimit] = useState<number>(10000);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showMappingSetup, setShowMappingSetup] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>({
    total: 0,
    completed: 0,
    failed: 0,
    isUploading: false,
    errors: []
  });
  
  const { toast } = useToast();
  const { exportMergedFiles } = useBatchExport();

  const handleTargetUpload = useCallback((data: ExcelData) => {
    setTargetData(data);
    setTemplateMappings({});
    setDefaultValues({});
    setPretextValues({});
    toast({
      title: "Target file uploaded",
      description: `${data.headers.length} columns detected in ${data.fileName}`,
    });
  }, [toast]);

  const processFileAsync = useCallback(async (file: File): Promise<ExcelData> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const fileData = e.target?.result;
          const fileExtension = file.name.toLowerCase().split('.').pop();
          
          if (fileExtension === 'csv') {
            const csvText = typeof fileData === 'string' ? fileData : new TextDecoder().decode(new Uint8Array(fileData as ArrayBuffer));
            const lines = csvText.split('\n').filter(line => line.trim());
            if (lines.length === 0) {
              reject(new Error('CSV file is empty'));
              return;
            }
            
            const parseCSVLine = (line: string) => {
              const result = [];
              let current = '';
              let inQuotes = false;
              
              for (let i = 0; i < line.length; i++) {
                const char = line[i];
                if (char === '"') {
                  inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                  result.push(current.trim());
                  current = '';
                } else {
                  current += char;
                }
              }
              result.push(current.trim());
              return result;
            };
            
            const jsonData = lines.map(line => parseCSVLine(line));
            const headers = jsonData[0].map((header: any) => 
              header ? String(header).replace(/^"(.*)"$/, '$1').trim() : `Column_${jsonData[0].indexOf(header) + 1}`
            );
            const rowData = jsonData.slice(1).map(row => 
              row.map(cell => typeof cell === 'string' ? cell.replace(/^"(.*)"$/, '$1') : cell)
            );
            
            resolve({
              headers,
              data: rowData,
              fileName: file.name,
              sheetNames: ['Sheet1'],
              selectedSheet: 'Sheet1'
            });
          } else {
            const workbook = XLSX.read(fileData, { 
              type: 'binary', 
              cellStyles: true,
              cellFormula: true,
              cellHTML: false,
              cellNF: true
            });
            
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
            
            if (jsonData.length === 0) {
              reject(new Error('File is empty'));
              return;
            }

            const headers = jsonData[0].map((header: any) => 
              header ? String(header).trim() : `Column_${jsonData[0].indexOf(header) + 1}`
            );
            const rowData = jsonData.slice(1);
            
            resolve({
              headers,
              data: rowData,
              fileName: file.name,
              sheetNames: workbook.SheetNames,
              selectedSheet: sheetName
            });
          }
        } catch (error) {
          reject(new Error(`Failed to parse ${file.name.toLowerCase().endsWith('.csv') ? 'CSV' : 'Excel'} file`));
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      
      if (file.name.toLowerCase().endsWith('.csv')) {
        reader.readAsText(file);
      } else {
        reader.readAsBinaryString(file);
      }
    });
  }, []);

  const processBatchFiles = useCallback(async (files: File[]) => {
    const BATCH_SIZE = 5; // Process 5 files at a time
    const results: ProcessingBatchFile[] = [];
    
    setUploadState({
      total: files.length,
      completed: 0,
      failed: 0,
      isUploading: true,
      errors: []
    });

    // Process files in batches to prevent browser freezing
    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);
      
      const batchPromises = batch.map(async (file, index) => {
        try {
          const data = await processFileAsync(file);
          const newFile: ProcessingBatchFile = {
            id: `${Date.now()}-${Math.random()}-${i + index}`,
            data,
            status: 'pending'
          };
          
          setUploadState(prev => ({
            ...prev,
            completed: prev.completed + 1
          }));
          
          return newFile;
        } catch (error) {
          setUploadState(prev => ({
            ...prev,
            completed: prev.completed + 1,
            failed: prev.failed + 1,
            errors: [...prev.errors, {
              fileName: file.name,
              error: error instanceof Error ? error.message : 'Unknown error'
            }]
          }));
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.filter(Boolean) as ProcessingBatchFile[]);
      
      // Small delay between batches to prevent overwhelming the browser
      if (i + BATCH_SIZE < files.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    setSourceFiles(prev => [...prev, ...results]);
    setUploadState(prev => ({ ...prev, isUploading: false }));
    
    toast({
      title: "Batch upload completed",
      description: `${results.length} files processed successfully${uploadState.failed > 0 ? `, ${uploadState.failed} failed` : ''}`,
    });
  }, [processFileAsync, toast, uploadState.failed]);

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

  const setPretextValue = useCallback((sourceColumn: string, value: string) => {
    setPretextValues(prev => ({
      ...prev,
      [sourceColumn]: value
    }));
  }, []);

  const removePretextValue = useCallback((sourceColumn: string) => {
    setPretextValues(prev => {
      const newPretext = { ...prev };
      delete newPretext[sourceColumn];
      return newPretext;
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
      defaultValues: defaultValues,
      pretextValues: pretextValues
    })));
    toast({
      title: "Template applied",
      description: "Mappings and default values applied to all source files",
    });
  }, [templateMappings, defaultValues, pretextValues, toast]);

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
      // Mark all files as processing
      setSourceFiles(prev => prev.map(f => ({ ...f, status: 'processing' })));

      await exportMergedFiles(filesWithMappings, targetData, rowLimit, defaultValues);
      
      // Mark all files as completed
      setSourceFiles(prev => prev.map(f => ({ ...f, status: 'completed' })));

      toast({
        title: "Batch export completed", 
        description: `Successfully exported merged files based on ${rowLimit} row limit`,
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
  }, [sourceFiles, targetData, exportMergedFiles, toast]);

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
                pretextValues={pretextValues}
                onCreateMapping={createTemplateMapping}
                onRemoveMapping={removeTemplateMapping}
                onSetDefaultValue={setDefaultValue}
                onRemoveDefaultValue={removeDefaultValue}
                onSetPretextValue={setPretextValue}
                onRemovePretextValue={removePretextValue}
              />
            ) : (
              <ClickConnectMappingView
                sourceData={sourceFiles[0].data}
                targetData={targetData}
                mappings={templateMappings}
                defaultValues={defaultValues}
                pretextValues={pretextValues}
                onCreateMapping={createTemplateMapping}
                onRemoveMapping={removeTemplateMapping}
                onSetDefaultValue={setDefaultValue}
                onRemoveDefaultValue={removeDefaultValue}
                onSetPretextValue={setPretextValue}
                onRemovePretextValue={removePretextValue}
              />
            )}

            <div className="flex gap-4 mt-6">
              <Button onClick={applyTemplateMappings} disabled={Object.keys(templateMappings).length === 0 && Object.keys(defaultValues).length === 0 && Object.keys(pretextValues).length === 0}>
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
            
            <BatchFileUploadZone 
              onBatchUpload={processBatchFiles}
              uploadState={uploadState}
              disabled={uploadState.isUploading}
            />
            
            {/* Fallback single file upload */}
            <div className="mt-4 pt-4 border-t border-border">
              <FileUpload
                onFileUpload={handleSourceFilesUpload}
                title="Single File Upload"
                description="Upload one file at a time (fallback method)"
                accept=".xlsx,.xls"
                multiple={false}
              />
            </div>
          </Card>
        </div>

        {sourceFiles.length > 0 && (
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">Processing Queue</h3>
                <div className="flex gap-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="rowLimit" className="text-sm font-medium">
                      Row Limit:
                    </Label>
                    <Input
                      id="rowLimit"
                      type="number"
                      min="1000"
                      max="100000"
                      step="1000"
                      value={rowLimit}
                      onChange={(e) => setRowLimit(Number(e.target.value))}
                      className="w-24 text-sm"
                    />
                  </div>
                  <Button
                    onClick={setupTemplateMappings}
                    disabled={!targetData || isProcessing}
                    variant="outline"
                  >
                    Setup Mappings
                  </Button>
                  <Button
                    onClick={exportAllFiles}
                    disabled={!targetData || (Object.keys(templateMappings).length === 0 && Object.keys(defaultValues).length === 0 && Object.keys(pretextValues).length === 0) || isProcessing}
                    className="flex items-center gap-2 bg-accent hover:bg-accent/90"
                  >
                    <Download className="w-4 h-4" />
                    Export Merged Files
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

              {(Object.keys(templateMappings).length > 0 || Object.keys(defaultValues).length > 0 || Object.keys(pretextValues).length > 0) && (
                <Alert>
                  <AlertDescription>
                    Template configured: {Object.keys(templateMappings).length} column mappings, {Object.keys(defaultValues).length} default values, {Object.keys(pretextValues).length} pretext values.
                    Files will be merged based on {rowLimit} row limit per export.
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

// Enhanced batch file upload component for handling large numbers of files
interface BatchFileUploadZoneProps {
  onBatchUpload: (files: File[]) => void;
  uploadState: UploadState;
  disabled: boolean;
}

const BatchFileUploadZone: React.FC<BatchFileUploadZoneProps> = ({ 
  onBatchUpload, 
  uploadState, 
  disabled 
}) => {
  const { getRootProps, getInputProps, isDragActive, acceptedFiles } = useDropzone({
    onDrop: onBatchUpload,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv']
    },
    multiple: true,
    disabled,
    maxSize: 1024 * 1024 * 1024 // 1GB per file
  });

  const uploadProgress = uploadState.total > 0 ? (uploadState.completed / uploadState.total) * 100 : 0;

  return (
    <div className="space-y-4">
      <Card
        {...getRootProps()}
        className={`p-8 border-2 border-dashed cursor-pointer transition-all duration-200 ${
          isDragActive 
            ? 'border-primary bg-primary/5' 
            : disabled
              ? 'border-muted bg-muted/20 cursor-not-allowed opacity-60'
              : 'border-border hover:border-primary/50 hover:bg-muted/30'
        }`}
      >
        <input {...getInputProps()} />
        
        <div className="text-center space-y-4">
          {uploadState.isUploading ? (
            <>
              <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
              <div className="space-y-2">
                <p className="font-semibold text-lg">Processing Files...</p>
                <p className="text-muted-foreground">
                  {uploadState.completed} of {uploadState.total} files processed
                </p>
                <Progress value={uploadProgress} className="w-full max-w-md mx-auto" />
                <p className="text-sm text-muted-foreground">
                  {Math.round(uploadProgress)}% complete
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                <Upload className="w-8 h-8 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">Bulk File Upload</h3>
                <p className="text-muted-foreground">
                  {isDragActive 
                    ? 'Drop your files here...' 
                    : 'Drag & drop multiple Excel/CSV files here, or click to browse'}
                </p>
                <p className="text-sm text-muted-foreground">
                  Supports .xlsx, .xls, and .csv files • Processes up to 1000+ files efficiently
                </p>
              </div>
              <Button 
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                disabled={disabled}
              >
                <Upload className="w-4 h-4 mr-2" />
                Choose Files
              </Button>
            </>
          )}
        </div>
      </Card>

      {/* Upload Results */}
      {(uploadState.completed > 0 || uploadState.errors.length > 0) && (
        <Alert>
          <AlertDescription>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">Upload Summary:</span>
                <div className="flex gap-4 text-sm">
                  <span className="text-green-600">
                    ✓ {uploadState.completed - uploadState.failed} successful
                  </span>
                  {uploadState.failed > 0 && (
                    <span className="text-red-600">✗ {uploadState.failed} failed</span>
                  )}
                </div>
              </div>
              
              {uploadState.errors.length > 0 && (
                <div className="mt-2 pt-2 border-t border-border">
                  <p className="text-sm font-medium text-destructive mb-1">Failed Files:</p>
                  <div className="space-y-1 max-h-24 overflow-y-auto">
                    {uploadState.errors.map((error, index) => (
                      <div key={index} className="text-xs text-muted-foreground">
                        <span className="font-medium">{error.fileName}:</span> {error.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
