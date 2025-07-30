import { useState, useCallback } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { ScrollArea } from './ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Checkbox } from './ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Progress } from './ui/progress';
import { FileUp, Download, Settings, Trash2, RefreshCw, Database, FileText, Edit3, Columns, FolderOpen, FileArchive, CheckSquare, Square } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';

interface CSVFile {
  name: string;
  data: any[][];
  headers: string[];
  fileName: string;
  zipSource: string;
  selected?: boolean;
}

interface ColumnEdit {
  column: string;
  newValue: string;
  applyToRows?: 'all' | 'empty' | 'specific';
  specificRows?: number[];
}

interface ExportOptions {
  compressionLevel: number;
  splitMethod: 'size' | 'files';
  maxSizeMB: number;
  maxFiles: number;
}

export function CsvBatchEditor() {
  const [csvFiles, setCsvFiles] = useState<CSVFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<CSVFile | null>(null);
  const [processing, setProcessing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [columnEdits, setColumnEdits] = useState<ColumnEdit[]>([]);
  const [newColumnEdit, setNewColumnEdit] = useState<ColumnEdit>({
    column: '',
    newValue: '',
    applyToRows: 'all'
  });
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    compressionLevel: 6,
    splitMethod: 'size',
    maxSizeMB: 50,
    maxFiles: 100
  });
  const { toast } = useToast();

  // Get selected files for operations
  const selectedFiles = csvFiles.filter(file => file.selected);
  const allSelected = csvFiles.length > 0 && csvFiles.every(file => file.selected);
  const someSelected = csvFiles.some(file => file.selected);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setProcessing(true);
    const newCSVFiles: CSVFile[] = [];

    try {
      for (const file of acceptedFiles) {
        if (file.name.toLowerCase().endsWith('.zip')) {
          const zip = new JSZip();
          const zipContent = await zip.loadAsync(file);

          for (const [fileName, zipEntry] of Object.entries(zipContent.files)) {
            if (!zipEntry.dir && (fileName.toLowerCase().endsWith('.csv') || fileName.toLowerCase().endsWith('.xlsx') || fileName.toLowerCase().endsWith('.xls'))) {
              const fileData = await zipEntry.async('arraybuffer');
              
              let data: any[][];
              let headers: string[];

              if (fileName.toLowerCase().endsWith('.csv')) {
                const text = new TextDecoder().decode(fileData);
                const lines = text.split('\n').filter(line => line.trim());
                data = lines.map(line => line.split(',').map(cell => cell.trim().replace(/^"|"$/g, '')));
                headers = data[0] || [];
                data = data.slice(1);
              } else {
                // Handle Excel files
                const workbook = XLSX.read(fileData, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                data = jsonData as any[][];
                headers = data[0] || [];
                data = data.slice(1);
              }

              newCSVFiles.push({
                name: fileName,
                data: data,
                headers: headers,
                fileName: fileName,
                zipSource: file.name,
                selected: true
              });
            }
          }
        } else if (file.name.toLowerCase().endsWith('.csv') || file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls')) {
          // Handle individual files
          const fileData = await file.arrayBuffer();
          
          let data: any[][];
          let headers: string[];

          if (file.name.toLowerCase().endsWith('.csv')) {
            const text = new TextDecoder().decode(fileData);
            const lines = text.split('\n').filter(line => line.trim());
            data = lines.map(line => line.split(',').map(cell => cell.trim().replace(/^"|"$/g, '')));
            headers = data[0] || [];
            data = data.slice(1);
          } else {
            const workbook = XLSX.read(fileData, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            data = jsonData as any[][];
            headers = data[0] || [];
            data = data.slice(1);
          }

          newCSVFiles.push({
            name: file.name,
            data: data,
            headers: headers,
            fileName: file.name,
            zipSource: 'Direct Upload',
            selected: true
          });
        }
      }

      setCsvFiles(prev => [...prev, ...newCSVFiles]);
      
      if (newCSVFiles.length > 0) {
        setSelectedFile(newCSVFiles[0]);
        toast({
          title: "Files Processed",
          description: `Successfully loaded ${newCSVFiles.length} CSV/Excel files from ${acceptedFiles.length} file(s)`
        });
      } else {
        toast({
          title: "No Files Found",
          description: "No CSV or Excel files found in the uploaded zip files",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error processing files:', error);
      toast({
        title: "Processing Error",
        description: "Failed to process uploaded files",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/zip': ['.zip'],
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    multiple: true
  });

  const addColumnEdit = () => {
    if (!newColumnEdit.column || !selectedFile) {
      toast({
        title: "Invalid Edit",
        description: "Please select a column and enter a new value",
        variant: "destructive"
      });
      return;
    }

    setColumnEdits(prev => [...prev, { ...newColumnEdit }]);
    setNewColumnEdit({
      column: '',
      newValue: '',
      applyToRows: 'all'
    });

    toast({
      title: "Column Edit Added",
      description: `Added edit for column "${newColumnEdit.column}"`
    });
  };

  const removeColumnEdit = (index: number) => {
    setColumnEdits(prev => prev.filter((_, i) => i !== index));
  };

  const applyColumnEdits = () => {
    if (!selectedFile || columnEdits.length === 0) {
      toast({
        title: "No Edits",
        description: "No column edits to apply",
        variant: "destructive"
      });
      return;
    }

    const updatedData = [...selectedFile.data];
    
    columnEdits.forEach(edit => {
      const columnIndex = selectedFile.headers.indexOf(edit.column);
      if (columnIndex === -1) return;

      updatedData.forEach((row, rowIndex) => {
        if (edit.applyToRows === 'all' || 
           (edit.applyToRows === 'empty' && (!row[columnIndex] || row[columnIndex] === '')) ||
           (edit.applyToRows === 'specific' && edit.specificRows?.includes(rowIndex))) {
          row[columnIndex] = edit.newValue;
        }
      });
    });

    const updatedFile = { ...selectedFile, data: updatedData };
    setCsvFiles(prev => prev.map(file => 
      file.fileName === selectedFile.fileName && file.zipSource === selectedFile.zipSource 
        ? updatedFile 
        : file
    ));
    setSelectedFile(updatedFile);

    toast({
      title: "Edits Applied",
      description: `Applied ${columnEdits.length} column edits to ${selectedFile.fileName}`
    });

    setColumnEdits([]);
  };

  const toggleFileSelection = (targetFile: CSVFile) => {
    setCsvFiles(prev => prev.map(file =>
      file.fileName === targetFile.fileName && file.zipSource === targetFile.zipSource
        ? { ...file, selected: !file.selected }
        : file
    ));
  };

  const toggleAllSelection = () => {
    const newSelected = !allSelected;
    setCsvFiles(prev => prev.map(file => ({ ...file, selected: newSelected })));
  };

  const applyEditsToSelected = () => {
    if (selectedFiles.length === 0 || columnEdits.length === 0) {
      toast({
        title: "No Files or Edits",
        description: "Please select files and add column edits to apply",
        variant: "destructive"
      });
      return;
    }

    let updatedCount = 0;
    setCsvFiles(prev => prev.map(file => {
      if (!file.selected) return file;

      const updatedData = [...file.data];
      columnEdits.forEach(edit => {
        const columnIndex = file.headers.indexOf(edit.column);
        if (columnIndex === -1) return;

        updatedData.forEach((row, rowIndex) => {
          if (edit.applyToRows === 'all' || 
             (edit.applyToRows === 'empty' && (!row[columnIndex] || row[columnIndex] === '')) ||
             (edit.applyToRows === 'specific' && edit.specificRows?.includes(rowIndex))) {
            row[columnIndex] = edit.newValue;
          }
        });
      });

      updatedCount++;
      return { ...file, data: updatedData };
    }));

    // Update selected file if it was modified
    if (selectedFile && selectedFile.selected) {
      const updatedFile = csvFiles.find(f => 
        f.fileName === selectedFile.fileName && f.zipSource === selectedFile.zipSource
      );
      if (updatedFile) {
        setSelectedFile(updatedFile);
      }
    }

    toast({
      title: "Bulk Edits Applied",
      description: `Applied ${columnEdits.length} column edits to ${updatedCount} selected files`
    });

    setColumnEdits([]);
  };

  const exportModifiedFiles = async () => {
    if (selectedFiles.length === 0) {
      toast({
        title: "No Files Selected",
        description: "Please select files to export",
        variant: "destructive"
      });
      return;
    }

    setExporting(true);
    setExportProgress(0);

    try {
      const { compressionLevel, splitMethod, maxSizeMB, maxFiles } = exportOptions;
      const maxZipSizeBytes = maxSizeMB * 1024 * 1024;
      
      let currentZip = new JSZip();
      let zipIndex = 1;
      let filesInCurrentZip = 0;
      let currentZipEstimatedSize = 0;
      const zipsToDownload: { zip: JSZip; name: string }[] = [];

      // Optimized CSV conversion function
      const toCsv = (headers: string[], data: any[][]) => {
        const escapeField = (field: any) => {
          if (field == null) return '';
          const str = String(field);
          return str.includes(',') || str.includes('"') || str.includes('\n') 
            ? `"${str.replace(/"/g, '""')}"` 
            : str;
        };
        
        const headerRow = headers.map(escapeField).join(',');
        const dataRows = data.map(row => row.map(escapeField).join(','));
        return headerRow + '\n' + dataRows.join('\n');
      };

      // More accurate size estimation for CSV data (compression ratio ~40-50% for CSV)
      const estimateCompressedSize = (content: string) => {
        return Math.ceil(new Blob([content]).size * 0.45);
      };

      // Test actual compressed size periodically for accuracy
      const testCompressedSize = async (zip: JSZip) => {
        const compressed = await zip.generateAsync({ 
          type: 'blob',
          compression: 'DEFLATE',
          compressionOptions: { level: compressionLevel }
        });
        return compressed.size;
      };

      // Process only selected files for much faster export
      let testCounter = 0;
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const csvContent = toCsv(file.headers, file.data);
        const fileName = `modified_${file.fileName.replace(/\.[^/.]+$/, '')}.csv`;
        const estimatedSize = estimateCompressedSize(csvContent);

        let shouldCreateNewZip = false;

        if (splitMethod === 'size' && filesInCurrentZip > 0) {
          // Test actual size every 10 files or when approaching limit
          if (testCounter % 10 === 0 || (currentZipEstimatedSize + estimatedSize) > (maxZipSizeBytes * 0.8)) {
            const actualSize = await testCompressedSize(currentZip);
            
            // If adding this file would exceed the limit, create new zip
            if ((actualSize + estimatedSize) > maxZipSizeBytes) {
              shouldCreateNewZip = true;
            } else {
              // Update our estimate based on actual compression
              currentZipEstimatedSize = actualSize;
            }
            testCounter = 0;
          } else {
            // Use estimation for speed
            shouldCreateNewZip = (currentZipEstimatedSize + estimatedSize) > (maxZipSizeBytes * 0.9);
          }
        } else if (splitMethod === 'files') {
          shouldCreateNewZip = filesInCurrentZip >= maxFiles && filesInCurrentZip > 0;
        }

        // Create new zip if needed
        if (shouldCreateNewZip) {
          zipsToDownload.push({ 
            zip: currentZip, 
            name: `modified_files_part_${zipIndex}.zip` 
          });
          currentZip = new JSZip();
          filesInCurrentZip = 0;
          currentZipEstimatedSize = 0;
          zipIndex++;
        }

        // Add file to current zip
        currentZip.file(fileName, csvContent);
        filesInCurrentZip++;
        currentZipEstimatedSize += estimatedSize;
        testCounter++;

        // Update progress for processing
        const progress = Math.round(((i + 1) / selectedFiles.length) * 70);
        setExportProgress(progress);

        // Allow UI to update every 50 files for better performance
        if (i % 50 === 0) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }

      // Add the last zip if it has files
      if (filesInCurrentZip > 0) {
        zipsToDownload.push({ 
          zip: currentZip, 
          name: zipIndex === 1 ? 'modified_files.zip' : `modified_files_part_${zipIndex}.zip` 
        });
      }

      setExportProgress(75);

      // Generate and download zip files in parallel for smaller sets
      const downloadPromises = zipsToDownload.map(async ({ zip, name }, index) => {
        const content = await zip.generateAsync({ 
          type: 'blob',
          compression: 'DEFLATE',
          compressionOptions: { level: compressionLevel },
          streamFiles: true
        });
        
        return { content, name, index };
      });

      // Download files as they become ready
      const downloadResults = await Promise.all(downloadPromises);
      
      for (const { content, name } of downloadResults) {
        const link = document.createElement('a');
        const url = URL.createObjectURL(content);
        link.setAttribute('href', url);
        link.setAttribute('download', name);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up blob URL
        setTimeout(() => URL.revokeObjectURL(url), 100);
      }

      setExportProgress(100);

      toast({
        title: "Export Complete",
        description: `Exported ${selectedFiles.length} selected files in ${zipsToDownload.length} zip archive(s)`
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "An error occurred during export",
        variant: "destructive"
      });
    } finally {
      setTimeout(() => {
        setExporting(false);
        setExportProgress(0);
      }, 1000);
    }
  };

  const clearAllFiles = () => {
    setCsvFiles([]);
    setSelectedFile(null);
    setColumnEdits([]);
    toast({
      title: "Files Cleared",
      description: "All files and edits have been cleared"
    });
  };

  return (
    <div className="space-y-6 max-w-[95vw] mx-auto p-6">
      {/* Header */}
      <Card className="border-0 shadow-xl bg-gradient-to-r from-card/80 to-card/60 backdrop-blur-md">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-2xl font-bold">
            <Database className="w-8 h-8 text-primary" />
            CSV Batch Editor
            <div className="flex items-center gap-2 ml-2">
              <Badge variant="outline">
                {csvFiles.length} files loaded
              </Badge>
              {selectedFiles.length > 0 && (
                <Badge variant="secondary">
                  {selectedFiles.length} selected
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Upload multiple ZIP files containing CSV/Excel files, edit columns with default values, and export the modified data.
          </p>
        </CardContent>
      </Card>

      {/* File Upload Area */}
      <Card>
        <CardContent className="p-8">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
            }`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-2">
                <FileArchive className="w-12 h-12 text-primary" />
                <FileText className="w-10 h-10 text-muted-foreground" />
              </div>
              <div>
                <p className="text-lg font-semibold">
                  {isDragActive ? 'Drop files here...' : 'Upload ZIP files or CSV/Excel files'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Supports .zip, .csv, .xlsx, .xls files. ZIP files will be extracted automatically.
                </p>
              </div>
              {processing && (
                <div className="flex items-center gap-2 text-primary">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processing files...</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {csvFiles.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* File List */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-t-lg">
              <CardTitle className="flex items-center gap-3 text-lg">
                <FolderOpen className="w-6 h-6 text-primary" />
                Loaded Files
                <div className="flex items-center gap-2 ml-auto">
                  <Badge variant="secondary">
                    {csvFiles.length} files
                  </Badge>
                  {selectedFiles.length > 0 && (
                    <Badge variant="default">
                      {selectedFiles.length} selected
                    </Badge>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {/* Bulk Selection Controls */}
              <div className="mb-4 p-3 bg-muted/30 rounded-lg border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="select-all"
                        checked={allSelected}
                        onCheckedChange={toggleAllSelection}
                        className="h-4 w-4"
                      />
                      <Label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                        {allSelected ? 'Deselect All' : 'Select All'}
                      </Label>
                    </div>
                    {someSelected && (
                      <Badge variant="secondary" className="text-xs">
                        {selectedFiles.length} of {csvFiles.length} selected
                      </Badge>
                    )}
                  </div>
                  {selectedFiles.length > 0 && columnEdits.length > 0 && (
                    <Button 
                      onClick={applyEditsToSelected} 
                      size="sm" 
                      className="h-8"
                    >
                      <Edit3 className="w-3 h-3 mr-1" />
                      Apply to Selected ({selectedFiles.length})
                    </Button>
                  )}
                </div>
              </div>

              <ScrollArea className="h-80">
                <div className="space-y-3">
                  {csvFiles.map((file, index) => (
                    <div 
                      key={`${file.zipSource}-${file.fileName}-${index}`}
                      className={`p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-md ${
                        file.selected
                          ? 'bg-primary/10 border-primary/50 shadow-md' 
                          : 'hover:bg-muted/30 border-muted hover:border-muted-foreground/30'
                      } ${
                        selectedFile?.fileName === file.fileName && selectedFile?.zipSource === file.zipSource
                          ? 'ring-2 ring-primary ring-offset-2' 
                          : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex items-center pt-1">
                          <Checkbox
                            checked={file.selected || false}
                            onCheckedChange={() => toggleFileSelection(file)}
                            className="h-4 w-4"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        <div 
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => setSelectedFile(file)}
                        >
                          <p className="font-semibold text-sm truncate">{file.fileName}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Source: {file.zipSource}
                          </p>
                          <div className="flex items-center gap-4 mt-2">
                            <div className="flex items-center gap-1">
                              <Database className="w-3 h-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">{file.data.length} rows</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Columns className="w-3 h-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">{file.headers.length} cols</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {selectedFile?.fileName === file.fileName && selectedFile?.zipSource === file.zipSource && (
                            <Badge variant="outline" className="text-xs">
                              Editing
                            </Badge>
                          )}
                          {file.selected && (
                            <div className="w-2 h-2 bg-primary rounded-full"></div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <div className="mt-6 space-y-2">
                <div className="text-xs text-muted-foreground text-center">
                  Selected files will be processed for edits and export
                </div>
                <Button onClick={clearAllFiles} variant="outline" className="w-full">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear All Files
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Column Editor */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-secondary/5 to-secondary/10 rounded-t-lg">
              <CardTitle className="flex items-center gap-3 text-lg">
                <Edit3 className="w-6 h-6 text-secondary-foreground" />
                Column Editor
                {selectedFile && (
                  <Badge variant="outline" className="ml-auto">
                    {selectedFile.fileName}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {selectedFile ? (
                <>
                  <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Select Column</Label>
                      <Select value={newColumnEdit.column} onValueChange={(value) => 
                        setNewColumnEdit(prev => ({ ...prev, column: value }))
                      }>
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Choose a column to edit" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedFile.headers.map(header => (
                            <SelectItem key={header} value={header} className="py-2">
                              <div className="flex items-center gap-2">
                                <Columns className="w-4 h-4 text-muted-foreground" />
                                {header}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">New Value</Label>
                      <Input
                        className="h-11"
                        value={newColumnEdit.newValue}
                        onChange={(e) => setNewColumnEdit(prev => ({ ...prev, newValue: e.target.value }))}
                        placeholder="Enter the default value"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Apply To</Label>
                      <Select value={newColumnEdit.applyToRows} onValueChange={(value: 'all' | 'empty' | 'specific') => 
                        setNewColumnEdit(prev => ({ ...prev, applyToRows: value }))
                      }>
                        <SelectTrigger className="h-11">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Rows</SelectItem>
                          <SelectItem value="empty">Empty Cells Only</SelectItem>
                          <SelectItem value="specific">Specific Rows</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button onClick={addColumnEdit} className="w-full h-11" size="lg">
                      <Settings className="w-4 h-4 mr-2" />
                      Add Column Edit
                    </Button>
                  </div>

                  {columnEdits.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Label className="text-sm font-medium">Pending Edits</Label>
                        <Badge variant="secondary">{columnEdits.length}</Badge>
                      </div>
                      <ScrollArea className="h-40 w-full border rounded-lg p-2">
                        <div className="space-y-2">
                          {columnEdits.map((edit, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-card border rounded-lg shadow-sm">
                              <div className="flex-1">
                                <p className="font-medium text-sm">{edit.column}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Set to: <span className="font-medium">"{edit.newValue}"</span> • Apply to: <span className="font-medium">{edit.applyToRows}</span>
                                </p>
                              </div>
                              <Button size="sm" variant="ghost" onClick={() => removeColumnEdit(index)} className="h-8 w-8 p-0">
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                      <div className="grid grid-cols-1 gap-2">
                        <Button onClick={applyColumnEdits} className="w-full h-11" size="lg">
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Apply to Current File ({columnEdits.length})
                        </Button>
                        {selectedFiles.length > 1 && (
                          <Button onClick={applyEditsToSelected} variant="secondary" className="w-full h-11" size="lg">
                            <Edit3 className="w-4 h-4 mr-2" />
                            Apply to {selectedFiles.length} Selected Files
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground text-lg">Select a file to start editing columns</p>
                  <p className="text-sm text-muted-foreground mt-2">Choose any file from the list to begin making column edits</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Export Options - Moved to the end */}
      {csvFiles.length > 0 && (
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-accent/5 to-accent/10 rounded-t-lg">
            <CardTitle className="flex items-center gap-3 text-lg">
              <Settings className="w-6 h-6 text-accent-foreground" />
              Export Options & Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Export Progress */}
            {exporting && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Exporting Files...</Label>
                  <span className="text-sm text-muted-foreground">{exportProgress}%</span>
                </div>
                <Progress value={exportProgress} className="w-full" />
              </div>
            )}

            {/* Export Configuration */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Compression Level</Label>
                <Select 
                  value={exportOptions.compressionLevel.toString()} 
                  onValueChange={(value) => setExportOptions(prev => ({ ...prev, compressionLevel: parseInt(value) }))}
                  disabled={exporting}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0 - No Compression</SelectItem>
                    <SelectItem value="1">1 - Fastest</SelectItem>
                    <SelectItem value="3">3 - Fast</SelectItem>
                    <SelectItem value="6">6 - Balanced (Default)</SelectItem>
                    <SelectItem value="9">9 - Maximum</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Split Method</Label>
                <Select 
                  value={exportOptions.splitMethod} 
                  onValueChange={(value: 'size' | 'files') => setExportOptions(prev => ({ ...prev, splitMethod: value }))}
                  disabled={exporting}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="size">Split by Size</SelectItem>
                    <SelectItem value="files">Split by File Count</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {exportOptions.splitMethod === 'size' ? (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Max Size (MB)</Label>
                  <Input
                    type="number"
                    value={exportOptions.maxSizeMB}
                    onChange={(e) => setExportOptions(prev => ({ ...prev, maxSizeMB: parseInt(e.target.value) || 50 }))}
                    placeholder="50"
                    min="1"
                    max="500"
                    disabled={exporting}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Max Files per ZIP</Label>
                  <Input
                    type="number"
                    value={exportOptions.maxFiles}
                    onChange={(e) => setExportOptions(prev => ({ ...prev, maxFiles: parseInt(e.target.value) || 100 }))}
                    placeholder="100"
                    min="1"
                    max="1000"
                    disabled={exporting}
                  />
                </div>
              )}

              <div className="flex items-end">
                <Button 
                  onClick={exportModifiedFiles} 
                  className="w-full" 
                  disabled={exporting || selectedFiles.length === 0}
                  size="lg"
                >
                  {exporting ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Exporting {selectedFiles.length} files...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Export {selectedFiles.length} Selected Files
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}