import React, { useState, useCallback } from 'react';
import { Upload, Download, X, FileSpreadsheet, AlertCircle, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ExcelData } from '@/types/excel';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';

interface MergeFile extends ExcelData {
  id: string;
  size: number;
}

export function FileMerger() {
  const [files, setFiles] = useState<MergeFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [mergedData, setMergedData] = useState<ExcelData | null>(null);
  const [outputFileName, setOutputFileName] = useState('merged_files');
  const [exportRowLimit, setExportRowLimit] = useState<number>(0); // 0 means export all
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const { toast } = useToast();

  // Helper function to validate file headers match
  const validateHeaders = (newHeaders: string[], existingHeaders?: string[]): boolean => {
    if (!existingHeaders) return true;
    if (newHeaders.length !== existingHeaders.length) return false;
    return newHeaders.every((header, index) => header === existingHeaders[index]);
  };

  // Process uploaded files
  const processFile = useCallback(async (file: File): Promise<MergeFile> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          let data: any[][];
          let headers: string[];

          if (file.name.toLowerCase().endsWith('.csv')) {
            const text = new TextDecoder().decode(arrayBuffer);
            const lines = text.split('\n').filter(line => line.trim());
            const parsedData = lines.map(line => {
              const result: string[] = [];
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
            });
            
            headers = parsedData[0] || [];
            data = parsedData.slice(1);
          } else {
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];
            
            headers = jsonData[0] || [];
            data = jsonData.slice(1);
          }

          const mergeFile: MergeFile = {
            id: Math.random().toString(36).substr(2, 9),
            headers,
            data,
            fileName: file.name,
            size: file.size
          };

          resolve(mergeFile);
        } catch (error) {
          reject(new Error(`Failed to process ${file.name}: ${error}`));
        }
      };
      reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
      reader.readAsArrayBuffer(file);
    });
  }, []);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const newFiles: MergeFile[] = [];
      let currentHeaders: string[] | undefined;

      for (let i = 0; i < acceptedFiles.length; i++) {
        const file = acceptedFiles[i];
        setUploadProgress((i / acceptedFiles.length) * 100);

        try {
          const processedFile = await processFile(file);
          
          // Validate headers match existing files
          if (files.length > 0 || newFiles.length > 0) {
            const existingHeaders = files.length > 0 ? files[0].headers : newFiles[0]?.headers;
            if (!validateHeaders(processedFile.headers, existingHeaders)) {
              toast({
                title: "Header Mismatch",
                description: `File "${file.name}" has different headers. All files must have identical headers.`,
                variant: "destructive"
              });
              continue;
            }
          }

          newFiles.push(processedFile);
          currentHeaders = processedFile.headers;
        } catch (error) {
          toast({
            title: "Processing Error",
            description: error instanceof Error ? error.message : `Failed to process ${file.name}`,
            variant: "destructive"
          });
        }
      }

      setFiles(prev => [...prev, ...newFiles]);
      setUploadProgress(100);

      if (newFiles.length > 0) {
        toast({
          title: "Files Added",
          description: `Successfully added ${newFiles.length} file(s) for merging.`
        });
      }
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  }, [files, processFile, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv']
    },
    maxSize: 1024 * 1024 * 1024, // 1GB
    multiple: true
  });

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(file => file.id !== id));
    setMergedData(null);
  };

  const mergeFiles = async () => {
    if (files.length < 2) {
      toast({
        title: "Insufficient Files",
        description: "Please upload at least 2 files to merge.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);

    try {
      const mergedRows: any[][] = [];
      
      files.forEach(file => {
        mergedRows.push(...file.data);
      });

      const merged: ExcelData = {
        headers: files[0].headers,
        data: mergedRows,
        fileName: `${outputFileName}.csv`
      };

      setMergedData(merged);
      
      toast({
        title: "Files Merged",
        description: `Successfully merged ${files.length} files with ${mergedRows.length} total rows.`
      });
    } catch (error) {
      toast({
        title: "Merge Error",
        description: "Failed to merge files. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const exportMergedFile = async () => {
    if (!mergedData) {
      console.log('No merged data available for export');
      toast({
        title: "Export Error",
        description: "No merged data available. Please merge files first.",
        variant: "destructive"
      });
      return;
    }

    if (!outputFileName || outputFileName.trim() === '') {
      console.log('Invalid output filename');
      toast({
        title: "Export Error",
        description: "Please enter a valid output filename.",
        variant: "destructive"
      });
      return;
    }

    setIsExporting(true);
    setExportProgress(0);

    try {
      console.log('Starting export process...', {
        headers: mergedData.headers.length,
        rows: mergedData.data.length,
        filename: outputFileName
      });

      const totalRows = mergedData.data.length;
      const rowsToExport = exportRowLimit > 0 && exportRowLimit < totalRows 
        ? exportRowLimit 
        : totalRows;

      const filename = outputFileName.trim();
      
      console.log(`Exporting ${rowsToExport} rows of ${totalRows} total rows`);

      // Progress: 10% - Start creating merged CSV content
      setExportProgress(10);

      // Helper function to process CSV row with proper escaping
      const processCSVRow = (row: any[]): string => {
        return row.map(cell => {
          const cellStr = String(cell || '');
          if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n') || cellStr.includes('\r')) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        }).join(',');
      };

      // Progress: 20% - Create complete merged CSV content
      setExportProgress(20);
      
      const csvContent = [
        processCSVRow(mergedData.headers),
        ...mergedData.data.slice(0, rowsToExport).map(row => processCSVRow(row))
      ].join('\n');

      // Progress: 60% - CSV content created, now compress
      setExportProgress(60);
      
      // Create ZIP with the merged content
      const zip = new JSZip();
      zip.file(`${filename}.csv`, csvContent);

      // Progress: 80% - Start ZIP generation
      setExportProgress(80);
      
      const zipBlob = await zip.generateAsync({ 
        type: 'blob',
        streamFiles: true,
        compression: 'DEFLATE',
        compressionOptions: {
          level: 9 // Maximum compression
        }
      });
      
      // Progress: 95% - ZIP generated, preparing download
      setExportProgress(95);
      
      const link = document.createElement('a');
      const url = URL.createObjectURL(zipBlob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}_merged.zip`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportProgress(100);

      toast({
        title: "Export Complete",
        description: `Exported ${rowsToExport} rows as compressed ${filename}_merged.zip`
      });
      
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Error",
        description: error instanceof Error ? error.message : "Failed to export merged file.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
      setTimeout(() => setExportProgress(0), 2000);
    }
  };

  const clearAll = () => {
    setFiles([]);
    setMergedData(null);
    setOutputFileName('merged_files');
    setExportRowLimit(0);
    setExportProgress(0);
    setIsExporting(false);
  };

  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">File Merger</h1>
          <p className="text-muted-foreground mt-2">
            Merge multiple Excel/CSV files with identical headers into a single file
          </p>
        </div>
        <div className="flex gap-2">
          {files.length > 0 && (
            <Button onClick={clearAll} variant="outline" size="sm">
              <X className="h-4 w-4 mr-2" />
              Clear All
            </Button>
          )}
        </div>
      </div>

      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Files to Merge
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive 
                ? 'border-primary bg-primary/5' 
                : 'border-border hover:border-primary/50'
            }`}
          >
            <input {...getInputProps()} />
            <FileSpreadsheet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium mb-2">
              {isDragActive ? 'Drop files here...' : 'Drag & drop files here'}
            </p>
            <p className="text-muted-foreground text-sm mb-4">
              or click to select files (Excel .xlsx, .xls or CSV files, up to 1GB each)
            </p>
            <Badge variant="secondary">Multiple files supported</Badge>
          </div>

          {isUploading && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Processing files...</span>
                <span className="text-sm font-medium">{Math.round(uploadProgress)}%</span>
              </div>
              <Progress value={uploadProgress} className="w-full" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* File List */}
      {files.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Uploaded Files ({files.length})</span>
              <Badge variant="outline">{formatFileSize(totalSize)} total</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {files.map((file) => (
                <div key={file.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">{file.fileName}</p>
                      <p className="text-sm text-muted-foreground">
                        {file.headers.length} columns • {file.data.length} rows • {formatFileSize(file.size)}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => removeFile(file.id)}
                    variant="outline"
                    size="sm"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            {files.length > 1 && (
              <Alert className="mt-4">
                <Check className="h-4 w-4" />
                <AlertDescription>
                  All files have matching headers ({files[0].headers.length} columns). Ready to merge!
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Merge Controls */}
      {files.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Merge Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="outputFileName">Output File Name</Label>
                <Input
                  id="outputFileName"
                  value={outputFileName}
                  onChange={(e) => setOutputFileName(e.target.value)}
                  placeholder="Enter output file name"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="exportRowLimit">
                  Export Rows (0 = all {mergedData?.data.length.toLocaleString()} rows)
                </Label>
                <Input
                  id="exportRowLimit"
                  type="number"
                  min="0"
                  max={mergedData?.data.length || 0}
                  value={exportRowLimit}
                  onChange={(e) => setExportRowLimit(parseInt(e.target.value) || 0)}
                  placeholder={`Max: ${mergedData?.data.length.toLocaleString()}`}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={mergeFiles} 
                disabled={isProcessing || files.length < 2 || isExporting}
                className="flex-1"
              >
                {isProcessing ? 'Merging...' : 'Merge Files'}
              </Button>
              
              {mergedData && (
                <Button 
                  onClick={exportMergedFile} 
                  disabled={isExporting}
                  variant="outline"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isExporting ? 'Exporting...' : 'Export'}
                </Button>
              )}
            </div>

            {isExporting && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">
                    Exporting merged data...
                  </span>
                  <span className="text-sm font-medium">{Math.round(exportProgress)}%</span>
                </div>
                <Progress value={exportProgress} className="w-full" />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Merge Results */}
      {mergedData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-600" />
              Merge Complete
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-primary">{files.length}</p>
                <p className="text-sm text-muted-foreground">Files Merged</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">{mergedData.data.length}</p>
                <p className="text-sm text-muted-foreground">Total Rows</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">{mergedData.headers.length}</p>
                <p className="text-sm text-muted-foreground">Columns</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {files.length === 1 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Upload at least one more file with matching headers to enable merging.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}