import React, { useState, useCallback } from 'react';
import { Upload, Download, X, FileSpreadsheet, Plus, Trash2, Edit3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ExcelData } from '@/types/excel';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';

interface NewColumn {
  id: string;
  header: string;
  defaultValue: string;
  fillMethod: 'default' | 'sequential' | 'formula';
  formula?: string;
  startValue?: number;
  increment?: number;
}

export function ExcelEditor() {
  const [originalData, setOriginalData] = useState<ExcelData | null>(null);
  const [newColumns, setNewColumns] = useState<NewColumn[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [outputFileName, setOutputFileName] = useState('modified_file');
  const { toast } = useToast();

  // Process uploaded file
  const processFile = useCallback(async (file: File): Promise<ExcelData> => {
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

          const excelData: ExcelData = {
            headers,
            data,
            fileName: file.name
          };

          resolve(excelData);
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

    const file = acceptedFiles[0]; // Only process the first file
    setIsUploading(true);
    setUploadProgress(0);

    try {
      setUploadProgress(50);
      const processedFile = await processFile(file);
      setOriginalData(processedFile);
      setOutputFileName(file.name.replace(/\.(xlsx|xls|csv)$/i, '_modified'));
      setUploadProgress(100);

      toast({
        title: "File Uploaded",
        description: `Successfully uploaded ${file.name} with ${processedFile.headers.length} columns and ${processedFile.data.length} rows.`
      });
    } catch (error) {
      toast({
        title: "Upload Error",
        description: error instanceof Error ? error.message : `Failed to process ${file.name}`,
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  }, [processFile, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv']
    },
    maxSize: 1024 * 1024 * 1024, // 1GB
    multiple: false
  });

  const addNewColumn = () => {
    const newColumn: NewColumn = {
      id: Math.random().toString(36).substr(2, 9),
      header: '',
      defaultValue: '',
      fillMethod: 'default'
    };
    setNewColumns(prev => [...prev, newColumn]);
  };

  const updateColumn = (id: string, updates: Partial<NewColumn>) => {
    setNewColumns(prev => prev.map(col => 
      col.id === id ? { ...col, ...updates } : col
    ));
  };

  const removeColumn = (id: string) => {
    setNewColumns(prev => prev.filter(col => col.id !== id));
  };

  const generateColumnData = (column: NewColumn, rowCount: number): string[] => {
    const data: string[] = [];
    
    for (let i = 0; i < rowCount; i++) {
      switch (column.fillMethod) {
        case 'sequential':
          const startValue = column.startValue || 1;
          const increment = column.increment || 1;
          data.push(String(startValue + (i * increment)));
          break;
        case 'formula':
          // Simple formula evaluation for row number
          if (column.formula?.includes('{row}')) {
            data.push(column.formula.replace('{row}', String(i + 1)));
          } else {
            data.push(column.formula || column.defaultValue);
          }
          break;
        case 'default':
        default:
          data.push(column.defaultValue);
          break;
      }
    }
    
    return data;
  };

  const processAndExport = async () => {
    if (!originalData) {
      toast({
        title: "No File",
        description: "Please upload a file first.",
        variant: "destructive"
      });
      return;
    }

    if (newColumns.length === 0) {
      toast({
        title: "No Changes",
        description: "Please add at least one new column.",
        variant: "destructive"
      });
      return;
    }

    // Validate new columns
    const invalidColumns = newColumns.filter(col => !col.header.trim());
    if (invalidColumns.length > 0) {
      toast({
        title: "Invalid Headers",
        description: "All new columns must have a header name.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setIsExporting(true);
    setExportProgress(0);

    try {
      // Create new headers
      const modifiedHeaders = [...originalData.headers, ...newColumns.map(col => col.header)];
      
      setExportProgress(20);

      // Generate data for new columns
      const newColumnsData: string[][] = newColumns.map(column => 
        generateColumnData(column, originalData.data.length)
      );

      setExportProgress(40);

      // Combine original data with new columns
      const modifiedData = originalData.data.map((row, index) => {
        const newRow = [...row];
        newColumns.forEach((_, colIndex) => {
          newRow.push(newColumnsData[colIndex][index] || '');
        });
        return newRow;
      });

      setExportProgress(60);

      // Create CSV content
      const csvContent = [
        modifiedHeaders.join(','),
        ...modifiedData.map(row => 
          row.map(cell => {
            const cellStr = String(cell || '');
            if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n') || cellStr.includes('\r')) {
              return `"${cellStr.replace(/"/g, '""')}"`;
            }
            return cellStr;
          }).join(',')
        )
      ].join('\n');

      setExportProgress(80);

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `${outputFileName}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportProgress(100);

      toast({
        title: "Export Complete",
        description: `Successfully exported file with ${newColumns.length} new column(s) and ${modifiedData.length} rows.`
      });

    } catch (error) {
      toast({
        title: "Processing Error",
        description: error instanceof Error ? error.message : "Failed to process and export file.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
      setTimeout(() => {
        setIsExporting(false);
        setExportProgress(0);
      }, 2000);
    }
  };

  const clearAll = () => {
    setOriginalData(null);
    setNewColumns([]);
    setOutputFileName('modified_file');
    setExportProgress(0);
    setIsExporting(false);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Excel Editor</h1>
          <p className="text-muted-foreground mt-2">
            Upload Excel/CSV files and add new columns with custom data
          </p>
        </div>
        <div className="flex gap-2">
          {originalData && (
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
            Upload File to Edit
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
              {isDragActive ? 'Drop file here...' : 'Drag & drop a file here'}
            </p>
            <p className="text-muted-foreground text-sm mb-4">
              or click to select file (Excel .xlsx, .xls or CSV files, up to 1GB)
            </p>
            <Badge variant="secondary">Single file only</Badge>
          </div>

          {isUploading && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Processing file...</span>
                <span className="text-sm font-medium">{Math.round(uploadProgress)}%</span>
              </div>
              <Progress value={uploadProgress} className="w-full" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* File Preview */}
      {originalData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Original File Preview</span>
              <Badge variant="outline">{originalData.fileName}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center mb-4">
              <div>
                <p className="text-2xl font-bold text-primary">{originalData.headers.length}</p>
                <p className="text-sm text-muted-foreground">Columns</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">{originalData.data.length}</p>
                <p className="text-sm text-muted-foreground">Rows</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">{originalData.headers.length + newColumns.length}</p>
                <p className="text-sm text-muted-foreground">Total Columns</p>
              </div>
            </div>
            
            <div className="border rounded-lg p-4 bg-muted/30">
              <p className="text-sm font-medium mb-2">Current Headers:</p>
              <div className="flex flex-wrap gap-2">
                {originalData.headers.map((header, index) => (
                  <Badge key={index} variant="secondary">{header}</Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add New Columns */}
      {originalData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Edit3 className="h-5 w-5" />
                Add New Columns
              </span>
              <Button onClick={addNewColumn} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Column
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {newColumns.length === 0 ? (
              <Alert>
                <AlertDescription>
                  Click "Add Column" to start adding new columns to your file.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-4">
                {newColumns.map((column, index) => (
                  <div key={column.id} className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">Column {index + 1}</Badge>
                      <Button 
                        onClick={() => removeColumn(column.id)}
                        variant="outline"
                        size="sm"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`header-${column.id}`}>Column Header</Label>
                        <Input
                          id={`header-${column.id}`}
                          value={column.header}
                          onChange={(e) => updateColumn(column.id, { header: e.target.value })}
                          placeholder="Enter header name"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`fillMethod-${column.id}`}>Fill Method</Label>
                        <Select 
                          value={column.fillMethod} 
                          onValueChange={(value: 'default' | 'sequential' | 'formula') => 
                            updateColumn(column.id, { fillMethod: value })
                          }
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="default">Default Value</SelectItem>
                            <SelectItem value="sequential">Sequential Numbers</SelectItem>
                            <SelectItem value="formula">Formula</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {column.fillMethod === 'default' && (
                      <div>
                        <Label htmlFor={`default-${column.id}`}>Default Value</Label>
                        <Input
                          id={`default-${column.id}`}
                          value={column.defaultValue}
                          onChange={(e) => updateColumn(column.id, { defaultValue: e.target.value })}
                          placeholder="Enter default value for all rows"
                          className="mt-1"
                        />
                      </div>
                    )}

                    {column.fillMethod === 'sequential' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor={`start-${column.id}`}>Start Value</Label>
                          <Input
                            id={`start-${column.id}`}
                            type="number"
                            value={column.startValue || ''}
                            onChange={(e) => updateColumn(column.id, { startValue: parseInt(e.target.value) || 1 })}
                            placeholder="1"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`increment-${column.id}`}>Increment</Label>
                          <Input
                            id={`increment-${column.id}`}
                            type="number"
                            value={column.increment || ''}
                            onChange={(e) => updateColumn(column.id, { increment: parseInt(e.target.value) || 1 })}
                            placeholder="1"
                            className="mt-1"
                          />
                        </div>
                      </div>
                    )}

                    {column.fillMethod === 'formula' && (
                      <div>
                        <Label htmlFor={`formula-${column.id}`}>Formula</Label>
                        <Textarea
                          id={`formula-${column.id}`}
                          value={column.formula || ''}
                          onChange={(e) => updateColumn(column.id, { formula: e.target.value })}
                          placeholder="Use {row} for row number, e.g., ROW-{row} or PREFIX-{row}-SUFFIX"
                          className="mt-1"
                          rows={2}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Use {'{row}'} to insert the row number (starting from 1)
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Export Controls */}
      {originalData && newColumns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Export Modified File</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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

            <Button 
              onClick={processAndExport} 
              disabled={isProcessing || isExporting}
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              {isProcessing ? 'Processing...' : 'Export Modified File'}
            </Button>

            {isExporting && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">
                    Processing and exporting...
                  </span>
                  <span className="text-sm font-medium">{Math.round(exportProgress)}%</span>
                </div>
                <Progress value={exportProgress} className="w-full" />
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}