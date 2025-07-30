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

    const maxZipSizeMB = 50; // 50MB limit per zip
    const maxZipSizeBytes = maxZipSizeMB * 1024 * 1024;
    
    let currentZip = new JSZip();
    let currentZipSize = 0;
    let zipIndex = 1;
    const zipsToDownload: { zip: JSZip; name: string }[] = [];

    for (const file of csvFiles) {
      const csvContent = [
        file.headers.join(','),
        ...file.data.map(row => row.map(cell => `"${cell || ''}"`).join(','))
      ].join('\n');

      const fileSizeBytes = new Blob([csvContent]).size;
      
      // If adding this file would exceed the limit, start a new zip
      if (currentZipSize + fileSizeBytes > maxZipSizeBytes && Object.keys(currentZip.files).length > 0) {
        zipsToDownload.push({ 
          zip: currentZip, 
          name: `modified_files_part_${zipIndex}.zip` 
        });
        currentZip = new JSZip();
        currentZipSize = 0;
        zipIndex++;
      }

      // Add file to current zip
      const fileName = `modified_${file.fileName.replace(/\.[^/.]+$/, '')}.csv`;
      currentZip.file(fileName, csvContent);
      currentZipSize += fileSizeBytes;
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
      const content = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
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
      description: `Exported ${csvFiles.length} files in ${zipsToDownload.length} compressed zip archive(s)`
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

      {csvFiles.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* File List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5" />
                Loaded Files
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {csvFiles.map((file, index) => (
                    <div 
                      key={`${file.zipSource}-${file.fileName}-${index}`}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedFile?.fileName === file.fileName && selectedFile?.zipSource === file.zipSource
                          ? 'bg-primary/10 border-primary' 
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => setSelectedFile(file)}
                    >
                      <p className="font-medium text-sm">{file.fileName}</p>
                      <p className="text-xs text-muted-foreground">From: {file.zipSource}</p>
                      <p className="text-xs text-muted-foreground">
                        {file.data.length} rows, {file.headers.length} columns
                      </p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <div className="mt-4 space-y-2">
                <Button onClick={exportModifiedFiles} className="w-full" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export All Modified
                </Button>
                <Button onClick={clearAllFiles} variant="outline" className="w-full" size="sm">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear All Files
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Column Editor */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Edit3 className="w-5 h-5" />
                Column Editor
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedFile && (
                <>
                  <div className="space-y-3">
                    <div>
                      <Label>Column</Label>
                      <Select value={newColumnEdit.column} onValueChange={(value) => 
                        setNewColumnEdit(prev => ({ ...prev, column: value }))
                      }>
                        <SelectTrigger>
                          <SelectValue placeholder="Select column" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedFile.headers.map(header => (
                            <SelectItem key={header} value={header}>
                              {header}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>New Value</Label>
                      <Input
                        value={newColumnEdit.newValue}
                        onChange={(e) => setNewColumnEdit(prev => ({ ...prev, newValue: e.target.value }))}
                        placeholder="Enter default value"
                      />
                    </div>

                    <div>
                      <Label>Apply To</Label>
                      <Select value={newColumnEdit.applyToRows} onValueChange={(value: 'all' | 'empty' | 'specific') => 
                        setNewColumnEdit(prev => ({ ...prev, applyToRows: value }))
                      }>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Rows</SelectItem>
                          <SelectItem value="empty">Empty Cells Only</SelectItem>
                          <SelectItem value="specific">Specific Rows</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button onClick={addColumnEdit} className="w-full">
                      Add Column Edit
                    </Button>
                  </div>

                  {columnEdits.length > 0 && (
                    <div className="space-y-2">
                      <Label>Pending Edits</Label>
                      <ScrollArea className="h-32">
                        {columnEdits.map((edit, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-muted rounded text-sm">
                            <div>
                              <p className="font-medium">{edit.column}</p>
                              <p className="text-xs text-muted-foreground">"{edit.newValue}" → {edit.applyToRows}</p>
                            </div>
                            <Button size="sm" variant="ghost" onClick={() => removeColumnEdit(index)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </ScrollArea>
                      <Button onClick={applyColumnEdits} className="w-full" variant="default">
                        Apply All Edits
                      </Button>
                    </div>
                  )}
                </>
              )}
              
              {!selectedFile && (
                <p className="text-center text-muted-foreground">Select a file to edit columns</p>
              )}
            </CardContent>
          </Card>

          {/* Data Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Columns className="w-5 h-5" />
                Data Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedFile ? (
                <ScrollArea className="h-64 w-full">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {selectedFile.headers.map(header => (
                          <TableHead key={header} className="whitespace-nowrap">
                            {header}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedFile.data.slice(0, 10).map((row, index) => (
                        <TableRow key={index}>
                          {row.map((cell, cellIndex) => (
                            <TableCell key={cellIndex} className="whitespace-nowrap">
                              {cell || '-'}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {selectedFile.data.length > 10 && (
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      Showing first 10 rows of {selectedFile.data.length} total rows
                    </p>
                  )}
                </ScrollArea>
              ) : (
                <p className="text-center text-muted-foreground">Select a file to preview data</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}