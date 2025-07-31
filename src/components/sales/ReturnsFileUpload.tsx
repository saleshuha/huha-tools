import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, FileText, CheckCircle, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ColumnMappingWizard } from "./ColumnMappingWizard";
import { DataPreview } from "./DataPreview";
import * as XLSX from "xlsx";
import Papa from "papaparse";

interface ReturnsFileUploadProps {
  onDataUploaded: (data: any) => void;
}

export function ReturnsFileUpload({ onDataUploaded }: ReturnsFileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [fileData, setFileData] = useState<any>(null);
  const [mappingStep, setMappingStep] = useState(false);
  const [processedData, setProcessedData] = useState<any>(null);
  const { toast } = useToast();

  const processFile = async (file: File): Promise<any> => {
    return new Promise((resolve, reject) => {
      const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
      
      if (isExcel) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
            
            const headers = jsonData[0] as string[];
            const rows = jsonData.slice(1);
            
            resolve({ headers, rows, fileName: file.name });
          } catch (error) {
            reject(error);
          }
        };
        reader.readAsArrayBuffer(file);
      } else {
        Papa.parse(file, {
          complete: (results) => {
            const headers = results.data[0] as string[];
            const rows = results.data.slice(1);
            resolve({ headers, rows, fileName: file.name });
          },
          error: (error) => reject(error),
          header: false
        });
      }
    });
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    setUploading(true);
    try {
      const file = acceptedFiles[0];
      const data = await processFile(file);
      setFileData(data);
      setMappingStep(true);
      
      toast({
        title: "Returns file uploaded successfully",
        description: `Processed ${data.rows.length} return records with ${data.headers.length} columns`,
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to process the returns file. Please check the format.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    maxFiles: 1
  });

  const handleMappingComplete = (mappedData: any) => {
    setProcessedData(mappedData);
    onDataUploaded(mappedData);
    setMappingStep(false);
    
    toast({
      title: "Returns data processed successfully",
      description: `${mappedData.length} return records ready for analysis`,
    });
  };

  if (mappingStep && fileData) {
    return (
      <ColumnMappingWizard
        fileData={fileData}
        onMappingComplete={handleMappingComplete}
        expectedColumns={[
          'Item Name', 'SKU', 'ASIN', 'Refunded Amount', 'Commission Refund',
          'Shipping Charges', 'Total Deduction', 'Return Date'
        ]}
      />
    );
  }

  if (processedData) {
    return <DataPreview data={processedData} title="Returns Data Preview" />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25 hover:border-primary/50'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Upload Returns/Credit Data</h3>
            <p className="text-muted-foreground mb-4">
              Drag and drop your returns/credit invoice file here, or click to browse
            </p>
            <p className="text-sm text-muted-foreground">
              Supported formats: CSV, XLS, XLSX
            </p>
            {uploading && (
              <div className="mt-4 flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                <span className="text-sm">Processing file...</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h4 className="font-semibold mb-4 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Expected Returns Data Columns
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Item Name/SKU/ASIN
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Refunded Amount
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Commission Refund/Charged
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Shipping Charges
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Total Deduction
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Return Date (Optional)
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Original Order ID (Optional)
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Return Reason (Optional)
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}