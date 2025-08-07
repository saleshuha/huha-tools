import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, Download, Upload, FileSpreadsheet, Edit3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import JSZip from "jszip";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

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

const BulkColumnEditor = () => {
  const [files, setFiles] = useState<FileData[]>([]);
  const [replacements, setReplacements] = useState<ColumnReplacement[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const newFiles: FileData[] = [];

    for (const file of acceptedFiles) {
      try {
        let data: string[][];
        let headers: string[];
        const fileType = file.name.toLowerCase().endsWith('.csv') ? 'csv' : 'excel';

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

        newFiles.push({
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          headers,
          data,
          type: fileType
        });
      } catch (error) {
        toast({
          title: "Error",
          description: `Failed to process file: ${file.name}`,
          variant: "destructive"
        });
      }
    }

    setFiles(prev => [...prev, ...newFiles]);
    toast({
      title: "Files uploaded",
      description: `${newFiles.length} file(s) processed successfully`
    });
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
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

  const applyReplacements = async () => {
    if (files.length === 0 || replacements.length === 0) {
      toast({
        title: "Error",
        description: "Please upload files and add at least one replacement rule",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);

    try {
      const zip = new JSZip();

      for (const file of files) {
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

        // Convert back to CSV
        const csvContent = [file.headers, ...processedData]
          .map(row => row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(','))
          .join('\n');

        const fileName = file.name.replace(/\.(xlsx?|csv)$/i, '_edited.csv');
        zip.file(fileName, csvContent);
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'bulk_edited_files.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Files processed and downloaded successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process files",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getAvailableColumns = () => {
    const allColumns = new Set<string>();
    files.forEach(file => {
      file.headers.forEach(header => allColumns.add(header));
    });
    return Array.from(allColumns);
  };

  return (
    <div className="min-h-screen bg-gradient-surface">
      <div className="glass-container mx-6 my-4 p-8 animate-fade-in">
        <div className="mb-6">
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
            Bulk Column Text Editor
          </h1>
          <p className="text-muted-foreground text-lg">
            Upload multiple CSV/Excel files and replace text in entire columns
          </p>
        </div>

        {/* File Upload Area */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Files
            </CardTitle>
          </CardHeader>
          <CardContent>
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
                  <p className="text-lg mb-2">Drag & drop CSV or Excel files here</p>
                  <p className="text-sm text-muted-foreground">or click to select files</p>
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
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Edit3 className="h-5 w-5" />
              Text Replacement Rules
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={addReplacement} className="mb-4">
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
                      />
                    </div>

                    <div>
                      <Label htmlFor={`new-${replacement.id}`}>Replace With</Label>
                      <Input
                        id={`new-${replacement.id}`}
                        value={replacement.newValue}
                        onChange={(e) => updateReplacement(replacement.id, 'newValue', e.target.value)}
                        placeholder="Replacement text"
                      />
                    </div>

                    <div>
                      <Label htmlFor={`mode-${replacement.id}`}>Replace Mode</Label>
                      <Select
                        value={replacement.replaceAll ? 'all' : 'exact'}
                        onValueChange={(value) => updateReplacement(replacement.id, 'replaceAll', value === 'all')}
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
            onClick={applyReplacements}
            disabled={isProcessing || files.length === 0 || replacements.length === 0}
            size="lg"
            className="gap-2"
          >
            <Download className="h-5 w-5" />
            {isProcessing ? "Processing..." : "Process & Download Files"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BulkColumnEditor;