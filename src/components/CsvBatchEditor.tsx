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
import { useToast } from '@/hooks/use-toast';
import { FileUp, Download, Settings, Trash2, RefreshCw, Database, FileText, Edit3, Columns, FolderOpen, FileArchive } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';

interface CSVFile {
  name: string;
  data: any[][];
  headers: string[];
  fileName: string;
  zipSource: string;
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
                zipSource: file.name
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
            zipSource: 'Direct Upload'
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

  const exportModifiedFiles = async () => {
    if (csvFiles.length === 0) {
      toast({
        title: "No Files",
        description: "No files to export",
        variant: "destructive"
      });
      return;
    }

    const { compressionLevel, splitMethod, maxSizeMB, maxFiles } = exportOptions;
    const maxZipSizeBytes = maxSizeMB * 1024 * 1024;
    
    let currentZip = new JSZip();
    let zipIndex = 1;
    let filesInCurrentZip = 0;
    const zipsToDownload: { zip: JSZip; name: string }[] = [];

    for (const file of csvFiles) {
      const csvContent = [
        file.headers.join(','),
        ...file.data.map(row => row.map(cell => `"${cell || ''}"`).join(','))
      ].join('\n');

      const fileName = `modified_${file.fileName.replace(/\.[^/.]+$/, '')}.csv`;
      
      let shouldCreateNewZip = false;

      if (splitMethod === 'size') {
        // Create a temporary zip to test the compressed size
        const tempZip = new JSZip();
        // Copy current files to temp zip
        Object.keys(currentZip.files).forEach(name => {
          const currentFile = currentZip.files[name];
          if (!currentFile.dir) {
            tempZip.file(name, currentFile.async('string'));
          }
        });
        tempZip.file(fileName, csvContent);
        
        // Check compressed size
        const compressedContent = await tempZip.generateAsync({ 
          type: 'blob', 
          compression: 'DEFLATE', 
          compressionOptions: { level: compressionLevel } 
        });

        shouldCreateNewZip = compressedContent.size > maxZipSizeBytes && Object.keys(currentZip.files).length > 0;
      } else {
        // Split by file count
        shouldCreateNewZip = filesInCurrentZip >= maxFiles && Object.keys(currentZip.files).length > 0;
      }

      // If we need to start a new zip
      if (shouldCreateNewZip) {
        zipsToDownload.push({ 
          zip: currentZip, 
          name: `modified_files_part_${zipIndex}.zip` 
        });
        currentZip = new JSZip();
        filesInCurrentZip = 0;
        zipIndex++;
      }

      // Add file to current zip
      currentZip.file(fileName, csvContent);
      filesInCurrentZip++;
    }

    // Add the last zip if it has files
    if (Object.keys(currentZip.files).length > 0) {
      zipsToDownload.push({ 
        zip: currentZip, 
        name: zipIndex === 1 ? 'modified_files.zip' : `modified_files_part_${zipIndex}.zip` 
      });
    }

    // Download all zip files
    for (const { zip, name } of zipsToDownload) {
      const content = await zip.generateAsync({ 
        type: 'blob', 
        compression: 'DEFLATE', 
        compressionOptions: { level: compressionLevel } 
      });
      const link = document.createElement('a');
      const url = URL.createObjectURL(content);
      link.setAttribute('href', url);
      link.setAttribute('download', name);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }

    toast({
      title: "Export Complete",
      description: `Exported ${csvFiles.length} files in ${zipsToDownload.length} compressed zip archive(s) (Level ${compressionLevel})`
    });
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
            <Badge variant="outline" className="ml-2">
              {csvFiles.length} files loaded
            </Badge>
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

      {/* Export Options */}
      {csvFiles.length > 0 && (
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-accent/5 to-accent/10 rounded-t-lg">
            <CardTitle className="flex items-center gap-3 text-lg">
              <Settings className="w-6 h-6 text-accent-foreground" />
              Export Options
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Compression Level</Label>
                <Select 
                  value={exportOptions.compressionLevel.toString()} 
                  onValueChange={(value) => setExportOptions(prev => ({ ...prev, compressionLevel: parseInt(value) }))}
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
                  />
                </div>
              )}

              <div className="flex items-end">
                <Button onClick={exportModifiedFiles} className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Export with Options
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {csvFiles.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* File List */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-t-lg">
              <CardTitle className="flex items-center gap-3 text-lg">
                <FolderOpen className="w-6 h-6 text-primary" />
                Loaded Files
                <Badge variant="secondary" className="ml-auto">
                  {csvFiles.length} files
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ScrollArea className="h-80">
                <div className="space-y-3">
                  {csvFiles.map((file, index) => (
                    <div 
                      key={`${file.zipSource}-${file.fileName}-${index}`}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:shadow-md ${
                        selectedFile?.fileName === file.fileName && selectedFile?.zipSource === file.zipSource
                          ? 'bg-primary/10 border-primary shadow-lg transform scale-[1.02]' 
                          : 'hover:bg-muted/30 border-muted hover:border-muted-foreground/30'
                      }`}
                      onClick={() => setSelectedFile(file)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
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
                        {selectedFile?.fileName === file.fileName && selectedFile?.zipSource === file.zipSource && (
                          <div className="ml-2">
                            <Badge variant="default" className="text-xs">Selected</Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <div className="mt-6">
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
                      <Button onClick={applyColumnEdits} className="w-full h-11" size="lg">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Apply All Edits ({columnEdits.length})
                      </Button>
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
    </div>
  );
}