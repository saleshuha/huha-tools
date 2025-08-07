import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trash2, Download, Upload, FileSpreadsheet, Edit3, Settings, Archive } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import JSZip from "jszip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface FileData {
  id: string;
  name: string;
  headers: string[];
  data: string[][];
  type: 'csv' | 'excel';
}

interface ColumnReplacement {
  id: string;
  columnName: string;
  oldValue: string;
  newValue: string;
  replaceAll: boolean;
}

interface ProcessedFileData extends FileData {
  processedData: string[][];
}

type ProcessingStep = 'idle' | 'processing' | 'compression-settings' | 'compressing' | 'export-settings' | 'exporting';

interface ProgressState {
  step: ProcessingStep;
  progress: number;
  currentFile?: string;
  message?: string;
}

const BulkColumnEditor = () => {
  const [files, setFiles] = useState<FileData[]>([]);
  const [replacements, setReplacements] = useState<ColumnReplacement[]>([]);
  const [processedFiles, setProcessedFiles] = useState<ProcessedFileData[]>([]);
  const [compressedZip, setCompressedZip] = useState<JSZip | null>(null);
  
  // Progress tracking
  const [progressState, setProgressState] = useState<ProgressState>({
    step: 'idle',
    progress: 0
  });
  
  // Dialog states
  const [showCompressionDialog, setShowCompressionDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [compressionLevel, setCompressionLevel] = useState<number>(6);
  
  // Export settings
  const [exportMode, setExportMode] = useState<'volume' | 'count'>('volume');
  const [targetSize, setTargetSize] = useState<string>('');
  const [maxFiles, setMaxFiles] = useState<string>('');
  
  const { toast } = useToast();

  const processFile = async (file: File, fileName?: string): Promise<FileData | null> => {
    try {
      const actualFileName = fileName || file.name;
      let data: string[][];
      let headers: string[];
      const fileType = actualFileName.toLowerCase().endsWith('.csv') ? 'csv' : 'excel';

      if (fileType === 'csv') {
        const text = await file.text();
        const parsed = Papa.parse(text, { header: false });
        data = parsed.data as string[][];
        headers = data[0] || [];
        data = data.slice(1);
      } else {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        data = jsonData as string[][];
        headers = data[0] || [];
        data = data.slice(1);
      }

      return {
        id: Math.random().toString(36).substr(2, 9),
        name: actualFileName,
        headers,
        data,
        type: fileType
      };
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to process file: ${fileName || file.name}`,
        variant: "destructive"
      });
      return null;
    }
  };

  const extractZipFile = async (file: File): Promise<FileData[]> => {
    const extractedFiles: FileData[] = [];
    
    try {
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(file);
      
      for (const [fileName, zipEntry] of Object.entries(zipContent.files)) {
        if (zipEntry.dir) continue;
        
        const fileExtension = fileName.toLowerCase();
        if (fileExtension.endsWith('.csv') || 
            fileExtension.endsWith('.xlsx') || 
            fileExtension.endsWith('.xls')) {
          
          const fileBlob = await zipEntry.async('blob');
          const extractedFile = new File([fileBlob], fileName);
          const processedFile = await processFile(extractedFile, fileName);
          
          if (processedFile) {
            extractedFiles.push(processedFile);
          }
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to extract ZIP file: ${file.name}`,
        variant: "destructive"
      });
    }
    
    return extractedFiles;
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const newFiles: FileData[] = [];
    let totalProcessed = 0;

    for (const file of acceptedFiles) {
      const fileName = file.name.toLowerCase();
      
      if (fileName.endsWith('.zip')) {
        toast({
          title: "Extracting ZIP",
          description: `Extracting files from ${file.name}...`,
        });
        
        const extractedFiles = await extractZipFile(file);
        newFiles.push(...extractedFiles);
        totalProcessed += extractedFiles.length;
      } else {
        const processedFile = await processFile(file);
        if (processedFile) {
          newFiles.push(processedFile);
          totalProcessed++;
        }
      }
    }

    setFiles(prev => [...prev, ...newFiles]);
    toast({
      title: "Files processed",
      description: `${totalProcessed} file(s) processed successfully`
    });
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/zip': ['.zip']
    },
    multiple: true
  });

  const addReplacement = () => {
    const newReplacement: ColumnReplacement = {
      id: Math.random().toString(36).substr(2, 9),
      columnName: '',
      oldValue: '',
      newValue: '',
      replaceAll: true
    };
    setReplacements(prev => [...prev, newReplacement]);
  };

  const updateReplacement = (id: string, field: keyof ColumnReplacement, value: string | boolean) => {
    setReplacements(prev => 
      prev.map(rep => 
        rep.id === id ? { ...rep, [field]: value } : rep
      )
    );
  };

  const removeReplacement = (id: string) => {
    setReplacements(prev => prev.filter(rep => rep.id !== id));
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(file => file.id !== id));
  };

  // Step 1: Process files with text replacements
  const startProcessing = async () => {
    if (files.length === 0 || replacements.length === 0) {
      toast({
        title: "Error",
        description: "Please upload files and add at least one replacement rule",
        variant: "destructive"
      });
      return;
    }

    setProgressState({
      step: 'processing',
      progress: 0,
      message: 'Processing files...'
    });

    try {
      const processed: ProcessedFileData[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProgressState(prev => ({
          ...prev,
          progress: Math.round((i / files.length) * 100),
          currentFile: file.name,
          message: `Processing ${file.name}...`
        }));

        let processedData = [...file.data];

        // Apply all replacements to this file
        for (const replacement of replacements) {
          if (!replacement.columnName || !replacement.oldValue) continue;

          const columnIndex = file.headers.indexOf(replacement.columnName);
          if (columnIndex === -1) continue;

          processedData = processedData.map(row => {
            const newRow = [...row];
            const cellValue = newRow[columnIndex] || '';
            
            if (replacement.replaceAll) {
              newRow[columnIndex] = cellValue.replace(new RegExp(replacement.oldValue, 'g'), replacement.newValue);
            } else {
              if (cellValue === replacement.oldValue) {
                newRow[columnIndex] = replacement.newValue;
              }
            }
            
            return newRow;
          });
        }

        processed.push({
          ...file,
          processedData
        });

        // Small delay to show progress
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      setProcessedFiles(processed);
      setProgressState({
        step: 'compression-settings',
        progress: 100,
        message: 'Processing complete'
      });
      setShowCompressionDialog(true);

      toast({
        title: "Success",
        description: "Files processed successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process files",
        variant: "destructive"
      });
      setProgressState({
        step: 'idle',
        progress: 0
      });
    }
  };

  // Step 2: Compress files with selected compression level
  const startCompression = async () => {
    setShowCompressionDialog(false);
    setProgressState({
      step: 'compressing',
      progress: 0,
      message: 'Compressing files...'
    });

    try {
      const zip = new JSZip();

      for (let i = 0; i < processedFiles.length; i++) {
        const file = processedFiles[i];
        setProgressState(prev => ({
          ...prev,
          progress: Math.round((i / processedFiles.length) * 100),
          currentFile: file.name,
          message: `Compressing ${file.name}...`
        }));

        // Convert back to CSV
        const csvContent = [file.headers, ...file.processedData]
          .map(row => row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(','))
          .join('\n');

        const fileName = file.name.replace(/\.(xlsx?|csv)$/i, '_edited.csv');
        zip.file(fileName, csvContent);

        // Small delay to show progress
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      setCompressedZip(zip);
      setProgressState({
        step: 'export-settings',
        progress: 100,
        message: 'Compression complete'
      });
      setShowExportDialog(true);

      toast({
        title: "Success",
        description: "Files compressed successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to compress files",
        variant: "destructive"
      });
      setProgressState({
        step: 'idle',
        progress: 0
      });
    }
  };

  // Step 3: Export compressed files
  const handleExport = async () => {
    if (!compressedZip) return;

    setShowExportDialog(false);
    setProgressState({
      step: 'exporting',
      progress: 0,
      message: 'Exporting files...'
    });

    try {
      setProgressState(prev => ({
        ...prev,
        progress: 50,
        message: 'Generating download...'
      }));

      const zipBlob = await compressedZip.generateAsync({ 
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: {
          level: compressionLevel
        }
      });

      setProgressState(prev => ({
        ...prev,
        progress: 80,
        message: 'Preparing download...'
      }));

      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'bulk_edited_files.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setProgressState({
        step: 'idle',
        progress: 100,
        message: 'Export complete'
      });

      toast({
        title: "Success",
        description: "Files exported successfully"
      });

      // Reset state
      setCompressedZip(null);
      setTargetSize('');
      setMaxFiles('');
      
      setTimeout(() => {
        setProgressState({
          step: 'idle',
          progress: 0
        });
      }, 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export files",
        variant: "destructive"
      });
      setProgressState({
        step: 'idle',
        progress: 0
      });
    }
  };

  const getAvailableColumns = () => {
    const allColumns = new Set<string>();
    files.forEach(file => {
      file.headers.forEach(header => allColumns.add(header));
    });
    return Array.from(allColumns);
  };

  const getStepTitle = (step: ProcessingStep) => {
    switch (step) {
      case 'processing': return 'Processing Files';
      case 'compression-settings': return 'Compression Settings';
      case 'compressing': return 'Compressing Files';
      case 'export-settings': return 'Export Settings';
      case 'exporting': return 'Exporting Files';
      default: return '';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Page Header */}
        <div className="border-b border-border pb-4">
          <h1 className="text-2xl font-semibold text-foreground mb-1">
            Bulk Column Text Editor
          </h1>
          <p className="text-sm text-muted-foreground">
            Upload multiple CSV/Excel files and replace text in entire columns across your inventory data
          </p>
        </div>

        {/* Progress Indicator */}
        {progressState.step !== 'idle' && (
          <Card className="border border-border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-medium">
                <Settings className="h-5 w-5 text-primary" />
                {getStepTitle(progressState.step)}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-foreground">{progressState.message}</span>
                  <span className="text-muted-foreground font-medium">{progressState.progress}%</span>
                </div>
                <Progress value={progressState.progress} className="w-full" />
                {progressState.currentFile && (
                  <p className="text-sm text-muted-foreground">
                    Current: {progressState.currentFile}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* File Upload Area */}
        <Card className="border border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <Upload className="h-5 w-5 text-primary" />
              Upload Files
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                isDragActive
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <input {...getInputProps()} />
              <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              {isDragActive ? (
                <p className="text-lg text-primary">Drop files here...</p>
              ) : (
                <div>
                  <p className="text-lg mb-2">Drag & drop CSV, Excel, or ZIP files here</p>
                  <p className="text-sm text-muted-foreground">ZIP files will be automatically extracted • or click to select files</p>
                </div>
              )}
            </div>

            {files.length > 0 && (
              <div className="mt-4 space-y-2">
                <h3 className="font-semibold">Uploaded Files ({files.length})</h3>
                {files.map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileSpreadsheet className="h-4 w-4" />
                      <span className="font-medium">{file.name}</span>
                      <Badge variant="secondary">{file.headers.length} columns</Badge>
                      <Badge variant="outline">{file.data.length} rows</Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(file.id)}
                      disabled={progressState.step !== 'idle'}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Replacement Rules */}
        <Card className="border border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <Edit3 className="h-5 w-5 text-primary" />
              Text Replacement Rules
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Button onClick={addReplacement} className="mb-4" disabled={progressState.step !== 'idle'}>
              Add Replacement Rule
            </Button>

            <div className="space-y-4">
              {replacements.map((replacement, index) => (
                <div key={replacement.id} className="p-4 border rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">Rule {index + 1}</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeReplacement(replacement.id)}
                      disabled={progressState.step !== 'idle'}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <Label htmlFor={`column-${replacement.id}`}>Column Name</Label>
                      <Select
                        value={replacement.columnName}
                        onValueChange={(value) => updateReplacement(replacement.id, 'columnName', value)}
                        disabled={progressState.step !== 'idle'}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select column" />
                        </SelectTrigger>
                        <SelectContent>
                          {getAvailableColumns().map((column) => (
                            <SelectItem key={column} value={column}>
                              {column}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor={`old-${replacement.id}`}>Find Text</Label>
                      <Input
                        id={`old-${replacement.id}`}
                        value={replacement.oldValue}
                        onChange={(e) => updateReplacement(replacement.id, 'oldValue', e.target.value)}
                        placeholder="Text to find"
                        disabled={progressState.step !== 'idle'}
                      />
                    </div>

                    <div>
                      <Label htmlFor={`new-${replacement.id}`}>Replace With</Label>
                      <Input
                        id={`new-${replacement.id}`}
                        value={replacement.newValue}
                        onChange={(e) => updateReplacement(replacement.id, 'newValue', e.target.value)}
                        placeholder="Replacement text"
                        disabled={progressState.step !== 'idle'}
                      />
                    </div>

                    <div>
                      <Label htmlFor={`mode-${replacement.id}`}>Replace Mode</Label>
                      <Select
                        value={replacement.replaceAll ? 'all' : 'exact'}
                        onValueChange={(value) => updateReplacement(replacement.id, 'replaceAll', value === 'all')}
                        disabled={progressState.step !== 'idle'}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Replace all occurrences</SelectItem>
                          <SelectItem value="exact">Exact match only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {replacements.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No replacement rules added. Click "Add Replacement Rule" to start.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Process Button */}
        <div className="flex justify-center">
          <Button
            onClick={startProcessing}
            disabled={progressState.step !== 'idle' || files.length === 0 || replacements.length === 0}
            size="lg"
            className="gap-2"
          >
            <Download className="h-5 w-5" />
            {progressState.step !== 'idle' ? "Processing..." : "Start Processing"}
          </Button>
        </div>

        {/* Compression Settings Dialog */}
        <AlertDialog open={showCompressionDialog} onOpenChange={setShowCompressionDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Compression Settings
              </AlertDialogTitle>
              <AlertDialogDescription>
                Files have been processed successfully. Choose compression level:
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <Label htmlFor="compression-level">Compression Level</Label>
              <Select
                value={compressionLevel.toString()}
                onValueChange={(value) => setCompressionLevel(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 - Fastest (Largest file)</SelectItem>
                  <SelectItem value="3">3 - Fast</SelectItem>
                  <SelectItem value="6">6 - Standard (Recommended)</SelectItem>
                  <SelectItem value="9">9 - Maximum (Smallest file)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setShowCompressionDialog(false);
                setProgressState({ step: 'idle', progress: 0 });
              }}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction onClick={startCompression}>
                <Archive className="h-4 w-4 mr-2" />
                Compress Files
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Export Settings Dialog */}
        <AlertDialog open={showExportDialog} onOpenChange={setShowExportDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Export Settings
              </AlertDialogTitle>
              <AlertDialogDescription>
                Files have been compressed successfully. Configure export options:
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="export-mode">Export Mode</Label>
                <Select
                  value={exportMode}
                  onValueChange={(value) => setExportMode(value as 'volume' | 'count')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="volume">Split by file size (MB)</SelectItem>
                    <SelectItem value="count">Split by file count</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {exportMode === 'volume' && (
                <div>
                  <Label htmlFor="export-target-size">Maximum Size per Archive (MB)</Label>
                  <Input
                    id="export-target-size"
                    value={targetSize}
                    onChange={(e) => setTargetSize(e.target.value)}
                    placeholder="e.g., 10"
                    type="number"
                    min="1"
                  />
                </div>
              )}
              
              {exportMode === 'count' && (
                <div>
                  <Label htmlFor="export-max-files">Maximum Files per Archive</Label>
                  <Input
                    id="export-max-files"
                    value={maxFiles}
                    onChange={(e) => setMaxFiles(e.target.value)}
                    placeholder="e.g., 50"
                    type="number"
                    min="1"
                  />
                </div>
              )}
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setShowExportDialog(false);
                setProgressState({ step: 'idle', progress: 0 });
                setCompressedZip(null);
                setTargetSize('');
                setMaxFiles('');
              }}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export Files
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default BulkColumnEditor;