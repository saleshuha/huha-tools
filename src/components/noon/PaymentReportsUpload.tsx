import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useCountry } from "@/contexts/CountryContext";
import { supabase } from "@/integrations/supabase/client";
import { Upload, FileText, CheckCircle2, Database } from "lucide-react";
import Papa from "papaparse";
import * as XLSX from "xlsx";

interface PaymentReportsUploadProps {
  onDataUploaded: () => void;
}

interface FileAnalysis {
  totalRows: number;
  sampleData: any[];
  detectedHeaders: string[];
  reportMonth: string;
  reportPeriodStart?: string;
  reportPeriodEnd?: string;
}

export function PaymentReportsUpload({ onDataUploaded }: PaymentReportsUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileAnalysis, setFileAnalysis] = useState<FileAnalysis | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const { toast } = useToast();
  const { selectedCountry } = useCountry();

  const parseFile = async (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();

      if (fileExtension === 'csv') {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => resolve(results.data),
          error: (error) => reject(error)
        });
      } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            resolve(jsonData);
          } catch (error) {
            reject(error);
          }
        };
        reader.readAsArrayBuffer(file);
      } else {
        reject(new Error('Unsupported file format. Please upload CSV or Excel files.'));
      }
    });
  };

  const formatDateValue = (value: any): string | null => {
    if (!value) return null;
    
    if (typeof value === 'string' && !isNaN(Date.parse(value))) {
      return new Date(value).toISOString();
    }
    
    if (typeof value === 'number') {
      const date = new Date((value - 25569) * 86400 * 1000);
      return date.toISOString();
    }
    
    return null;
  };

  const saveToDatabase = async (data: any[], reportMonth: string, fileName: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get the first store for this user and country
    const { data: stores } = await supabase
      .from('stores')
      .select('id')
      .eq('platform', 'noon')
      .eq('country', selectedCountry)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1);

    const storeId = stores?.[0]?.id || null;

    const batchSize = 100;
    const batches = [];
    
    for (let i = 0; i < data.length; i += batchSize) {
      batches.push(data.slice(i, i + batchSize));
    }

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i].map(row => ({
        user_id: user.id,
        store_id: storeId,
        report_month: reportMonth,
        country_code: selectedCountry,
        file_name: fileName,
        
        // Financial fields
        gross_amount: row.gross_amount || row.total_amount || row.amount ? parseFloat(row.gross_amount || row.total_amount || row.amount) : null,
        fees: row.fees || row.commission_fees ? parseFloat(row.fees || row.commission_fees) : null,
        tax: row.tax || row.vat ? parseFloat(row.tax || row.vat) : null,
        net_amount: row.net_amount || row.net_payment ? parseFloat(row.net_amount || row.net_payment) : null,
        commission: row.commission ? parseFloat(row.commission) : null,
        refunds: row.refunds || row.refund_amount ? parseFloat(row.refunds || row.refund_amount) : null,
        adjustments: row.adjustments ? parseFloat(row.adjustments) : null,
        
        // Reference fields
        transaction_id: row.transaction_id || row.payment_id || null,
        order_id: row.order_id || row.order_number || null,
        payment_date: formatDateValue(row.payment_date || row.date),
        payment_method: row.payment_method || row.method || null,
        currency: row.currency || 'AED',
        description: row.description || row.details || null,
        
        // Period fields
        report_period_start: formatDateValue(row.period_start || row.start_date) ? new Date(formatDateValue(row.period_start || row.start_date)!).toISOString().split('T')[0] : null,
        report_period_end: formatDateValue(row.period_end || row.end_date) ? new Date(formatDateValue(row.period_end || row.end_date)!).toISOString().split('T')[0] : null
      }));

      const { error } = await supabase
        .from('payment_reports')
        .insert(batch);

      if (error) throw error;

      setUploadProgress(((i + 1) / batches.length) * 100);
    }
  };

  const onDrop = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);
    setFileAnalysis(null);
    setUploadSuccess(false);

    try {
      // Parse file
      const data = await parseFile(file);
      
      if (!data || data.length === 0) {
        throw new Error('No data found in file');
      }

      // Analyze file
      const headers = Object.keys(data[0]);
      const reportMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
      
      const analysis: FileAnalysis = {
        totalRows: data.length,
        sampleData: data.slice(0, 5),
        detectedHeaders: headers,
        reportMonth
      };

      setFileAnalysis(analysis);

      // Save to database
      await saveToDatabase(data, reportMonth, file.name);

      setUploadSuccess(true);
      onDataUploaded();

      toast({
        title: "Upload successful",
        description: `Processed ${data.length} payment records`,
      });

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    multiple: false,
    disabled: uploading
  });

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card>
        <CardContent className="pt-6">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
              isDragActive 
                ? 'border-primary bg-primary/5' 
                : uploading 
                ? 'border-muted bg-muted/20 cursor-not-allowed' 
                : 'border-muted-foreground/25 hover:border-primary hover:bg-primary/5'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            
            {uploading ? (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Processing Payment Reports...</h3>
                <Progress value={uploadProgress} className="w-full max-w-md mx-auto" />
                <p className="text-sm text-muted-foreground">
                  {uploadProgress < 100 ? 'Uploading and processing data...' : 'Finalizing...'}
                </p>
              </div>
            ) : uploadSuccess ? (
              <div className="space-y-2">
                <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-green-700">Upload Complete!</h3>
                <p className="text-sm text-muted-foreground">
                  Payment reports have been successfully processed and saved
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <h3 className="text-lg font-medium">
                  {isDragActive ? 'Drop your payment report here...' : 'Upload Payment Reports'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Drag & drop a CSV or Excel file, or click to browse
                </p>
                <p className="text-xs text-muted-foreground">
                  Multiple reports per month or time period supported
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* File Analysis */}
      {fileAnalysis && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* File Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                File Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Total Rows</p>
                  <p className="text-2xl font-bold">{fileAnalysis.totalRows.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Report Month</p>
                  <p className="text-lg font-semibold">{fileAnalysis.reportMonth}</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Detected Headers</p>
                <div className="flex flex-wrap gap-1">
                  {fileAnalysis.detectedHeaders.map((header, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {header}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sample Data */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Sample Data Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {fileAnalysis.detectedHeaders.slice(0, 4).map((header, index) => (
                        <TableHead key={index} className="text-xs">{header}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fileAnalysis.sampleData.map((row, index) => (
                      <TableRow key={index}>
                        {fileAnalysis.detectedHeaders.slice(0, 4).map((header, colIndex) => (
                          <TableCell key={colIndex} className="text-xs max-w-32 truncate">
                            {row[header] || '-'}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Showing first 4 columns and 5 rows
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}