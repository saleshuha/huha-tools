import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, X, Download } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { NoonOrderFeesData, NOON_FEES_EXPECTED_HEADERS } from "@/types/noon-fees";
import { ColumnMappingWizard } from "@/components/sales/ColumnMappingWizard";

interface NoonFeesUploadProps {
  onDataUploaded: (data: NoonOrderFeesData[]) => void;
}

export function NoonFeesUpload({ onDataUploaded }: NoonFeesUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [fileData, setFileData] = useState<{ headers: string[]; rows: any[][] } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showMapping, setShowMapping] = useState(false);
  const { toast } = useToast();

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        setFile(acceptedFiles[0]);
        setError(null);
        processFile(acceptedFiles[0]);
      }
    },
    onDropRejected: () => {
      setError("Please upload a valid CSV or Excel file");
    }
  });

  const processFile = async (file: File) => {
    setIsProcessing(true);
    setProgress(0);

    try {
      let data: { headers: string[]; rows: any[][] };

      if (file.name.endsWith('.csv')) {
        data = await processCSV(file);
      } else {
        data = await processExcel(file);
      }

      setFileData(data);
      setShowMapping(true);
      setProgress(100);
      
      toast({
        title: "File uploaded successfully",
        description: `Found ${data.rows.length} rows with ${data.headers.length} columns`,
      });
    } catch (error) {
      console.error("Error processing file:", error);
      setError("Error processing file. Please check the format and try again.");
      toast({
        title: "Upload failed",
        description: "There was an error processing your file",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const processCSV = (file: File): Promise<{ headers: string[]; rows: any[][] }> => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: false,
        skipEmptyLines: true,
        complete: (result) => {
          if (result.errors.length > 0) {
            reject(new Error("CSV parsing error"));
            return;
          }

          const data = result.data as string[][];
          if (data.length === 0) {
            reject(new Error("Empty file"));
            return;
          }

          const headers = data[0];
          const rows = data.slice(1);

          resolve({ headers, rows });
        },
        error: (error) => reject(error)
      });
    });
  };

  const processExcel = async (file: File): Promise<{ headers: string[]; rows: any[][] }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

          if (jsonData.length === 0) {
            reject(new Error("Empty file"));
            return;
          }

          const headers = jsonData[0];
          const rows = jsonData.slice(1);

          resolve({ headers, rows });
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error("File reading failed"));
      reader.readAsArrayBuffer(file);
    });
  };

  const handleMappingComplete = (mappedData: NoonOrderFeesData[]) => {
    onDataUploaded(mappedData);
    setShowMapping(false);
    setFileData(null);
    setFile(null);
    
    toast({
      title: "Data imported successfully",
      description: `Imported ${mappedData.length} order records`,
    });
  };

  const downloadTemplate = () => {
    const csvContent = [
      NOON_FEES_EXPECTED_HEADERS.join(','),
      // Sample row with placeholder data
      NOON_FEES_EXPECTED_HEADERS.map(() => '').join(',')
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'noon_fees_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const removeFile = () => {
    setFile(null);
    setFileData(null);
    setShowMapping(false);
    setError(null);
    setProgress(0);
  };

  if (showMapping && fileData) {
    return (
      <ColumnMappingWizard
        fileData={fileData}
        expectedColumns={NOON_FEES_EXPECTED_HEADERS}
        onMappingComplete={handleMappingComplete}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Upload Noon Order Fees Report</h3>
          <p className="text-sm text-muted-foreground">
            Upload your consolidated order level fees report from Noon
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={downloadTemplate}
          className="flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          Download Template
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!file && (
        <Card>
          <CardContent className="p-6">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50"
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">
                {isDragActive
                  ? "Drop your file here"
                  : "Drag & drop your file here"}
              </h3>
              <p className="text-muted-foreground mb-4">
                or click to browse files
              </p>
              <p className="text-sm text-muted-foreground">
                Supports CSV and Excel files (.csv, .xlsx, .xls)
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {file && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {file.name}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={removeFile}
                className="h-auto p-1"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isProcessing && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Processing file...</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}