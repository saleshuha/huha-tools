import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, CheckCircle, AlertCircle, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useCountry } from "@/contexts/CountryContext";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import type { NoonSalesHeaders } from "@/types/noon-sales";

interface InvoiceCreditUploadProps {
  onDataUploaded: (summary: any) => void;
}

interface FileAnalysis {
  totalRows: number;
  invoiceCount: number;
  creditNoteCount: number;
  detectedHeaders: string[];
  sampleData: any[];
  reportMonth?: string;
}

const EXPECTED_HEADERS: (keyof NoonSalesHeaders)[] = [
  'contract', 'business_unit', 'document_type', 'invoice_type_code', 'document_subtype',
  'document_date', 'invoice_nr', 'invoice_line_nr', 'credit_note_nr', 'credit_note_line_nr',
  'transaction_type', 'source_doc_type', 'source_doc_nr', 'source_doc_line_type', 'source_doc_line_nr',
  'description', 'sku', 'issuer_city', 'issuer_country', 'issuer_location', 'receiver_city',
  'receiver_country', 'receiver_location', 'issuer_legal_entity', 'issuer_legal_name', 'issuer_trn',
  'receiver_legal_entity', 'receiver_legal_name', 'receiver_trn', 'document_currency', 'vat_currency',
  'vat_rate', 'fx_rate', 'price_excluding_vat_doc_currency', 'price_excluding_vat_vat_currency',
  'vat_amount_doc_currency', 'vat_amount_vat_currency', 'price_including_vat_doc_currency'
];

export function InvoiceCreditUpload({ onDataUploaded }: InvoiceCreditUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [analysis, setAnalysis] = useState<FileAnalysis | null>(null);
  const [uploaded, setUploaded] = useState(false);
  const { toast } = useToast();
  const { selectedCountry } = useCountry();

  const parseFile = async (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      
      if (fileExtension === 'csv') {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            if (results.errors.length > 0) {
              reject(new Error(results.errors[0].message));
            } else {
              resolve(results.data);
            }
          },
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

  const analyzeData = (data: any[]): FileAnalysis => {
    if (!data || data.length === 0) {
      return {
        totalRows: 0,
        invoiceCount: 0,
        creditNoteCount: 0,
        detectedHeaders: [],
        sampleData: []
      };
    }

    const headers = Object.keys(data[0]);
    const invoiceCount = data.filter(row => row['Document Type']?.toLowerCase() === 'invoice').length;
    const creditNoteCount = data.filter(row => row['Document Type']?.toLowerCase() === 'creditnote').length;
    
    // Try to extract report month from document dates
    const documentDates = data
      .map(row => row['Document Date'])
      .filter(date => date)
      .slice(0, 10); // Check first 10 dates
    
    let reportMonth = '';
    if (documentDates.length > 0) {
      const sampleDate = new Date(documentDates[0]);
      if (!isNaN(sampleDate.getTime())) {
        reportMonth = `${sampleDate.getFullYear()}-${String(sampleDate.getMonth() + 1).padStart(2, '0')}`;
      }
    }

    return {
      totalRows: data.length,
      invoiceCount,
      creditNoteCount,
      detectedHeaders: headers,
      sampleData: data.slice(0, 5),
      reportMonth
    };
  };

  const normalizeHeaderName = (header: string): string => {
    return header
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[()]/g, '')
      .replace(/\//g, '_');
  };

  const saveToDatabase = async (data: any[], fileName: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const invoiceRecords = [];
    const creditRecords = [];

    for (const row of data) {
      const normalizedRow: any = {};
      
      // Normalize headers and map data
      Object.keys(row).forEach(originalHeader => {
        const normalizedHeader = normalizeHeaderName(originalHeader);
        normalizedRow[normalizedHeader] = row[originalHeader];
      });

      const baseRecord = {
        user_id: user.id,
        file_name: fileName,
        country: selectedCountry,
        contract: normalizedRow.contract,
        business_unit: normalizedRow.business_unit,
        document_type: normalizedRow.document_type,
        invoice_type_code: normalizedRow.invoice_type_code,
        document_subtype: normalizedRow.document_subtype,
        document_date: normalizedRow.document_date ? new Date(normalizedRow.document_date).toISOString() : null,
        invoice_nr: normalizedRow.invoice_nr,
        invoice_line_nr: normalizedRow.invoice_line_nr,
        credit_note_nr: normalizedRow.credit_note_nr,
        credit_note_line_nr: normalizedRow.credit_note_line_nr,
        transaction_type: normalizedRow.transaction_type,
        source_doc_type: normalizedRow.source_doc_type,
        source_doc_nr: normalizedRow.source_doc_nr,
        source_doc_line_type: normalizedRow.source_doc_line_type,
        source_doc_line_nr: normalizedRow.source_doc_line_nr,
        description: normalizedRow.description,
        sku: normalizedRow.sku,
        issuer_city: normalizedRow.issuer_city,
        issuer_country: normalizedRow.issuer_country,
        issuer_location: normalizedRow.issuer_location,
        receiver_city: normalizedRow.receiver_city,
        receiver_country: normalizedRow.receiver_country,
        receiver_location: normalizedRow.receiver_location,
        issuer_legal_entity: normalizedRow.issuer_legal_entity,
        issuer_legal_name: normalizedRow.issuer_legal_name,
        issuer_trn: normalizedRow.issuer_trn,
        receiver_legal_entity: normalizedRow.receiver_legal_entity,
        receiver_legal_name: normalizedRow.receiver_legal_name,
        receiver_trn: normalizedRow.receiver_trn,
        document_currency: normalizedRow.document_currency,
        vat_currency: normalizedRow.vat_currency,
        vat_rate: normalizedRow.vat_rate ? parseFloat(normalizedRow.vat_rate) : null,
        fx_rate: normalizedRow.fx_rate ? parseFloat(normalizedRow.fx_rate) : null,
        price_excluding_vat_doc_currency: normalizedRow.price_excluding_vat_document_currency ? parseFloat(normalizedRow.price_excluding_vat_document_currency) : null,
        price_excluding_vat_vat_currency: normalizedRow.price_excluding_vat_vat_currency ? parseFloat(normalizedRow.price_excluding_vat_vat_currency) : null,
        vat_amount_doc_currency: normalizedRow.vat_amount_document_currency ? parseFloat(normalizedRow.vat_amount_document_currency) : null,
        vat_amount_vat_currency: normalizedRow.vat_amount_vat_currency ? parseFloat(normalizedRow.vat_amount_vat_currency) : null,
        price_including_vat_doc_currency: normalizedRow.price_including_vat_document_currency ? parseFloat(normalizedRow.price_including_vat_document_currency) : null
      };

      if (normalizedRow.document_type?.toLowerCase() === 'invoice') {
        invoiceRecords.push(baseRecord);
      } else if (normalizedRow.document_type?.toLowerCase() === 'creditnote') {
        creditRecords.push(baseRecord);
      }
    }

    // Save invoices
    if (invoiceRecords.length > 0) {
      const { error: invoiceError } = await supabase
        .from('noon_invoice_data')
        .insert(invoiceRecords);
      
      if (invoiceError) throw invoiceError;
    }

    // Save credit notes
    if (creditRecords.length > 0) {
      const { error: creditError } = await supabase
        .from('noon_credit_data')
        .insert(creditRecords);
      
      if (creditError) throw creditError;
    }

    return {
      invoiceCount: invoiceRecords.length,
      creditCount: creditRecords.length,
      totalCount: invoiceRecords.length + creditRecords.length
    };
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setFile(file);
    setUploading(true);
    setProgress(10);
    setAnalysis(null);
    setUploaded(false);

    try {
      // Parse file
      setProgress(30);
      const data = await parseFile(file);
      
      // Analyze data
      setProgress(50);
      const analysisResult = analyzeData(data);
      setAnalysis(analysisResult);
      
      if (analysisResult.totalRows === 0) {
        throw new Error('No valid data found in the file');
      }

      // Save to database
      setProgress(70);
      const saveResult = await saveToDatabase(data, file.name);
      
      setProgress(100);
      setUploaded(true);
      
      toast({
        title: "Upload Successful",
        description: `Processed ${saveResult.totalCount} records (${saveResult.invoiceCount} invoices, ${saveResult.creditCount} credit notes)`,
      });

      onDataUploaded({
        fileName: file.name,
        totalRecords: saveResult.totalCount,
        invoiceCount: saveResult.invoiceCount,
        creditCount: saveResult.creditCount,
        country: selectedCountry
      });

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }, [selectedCountry, toast, onDataUploaded]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    maxFiles: 1,
    disabled: uploading
  });

  const resetForm = () => {
    setFile(null);
    setAnalysis(null);
    setUploaded(false);
    setProgress(0);
  };

  const getHeaderMatchStatus = (header: string) => {
    const normalizedHeader = normalizeHeaderName(header);
    const isExpected = EXPECTED_HEADERS.some(expectedHeader => 
      normalizeHeaderName(expectedHeader) === normalizedHeader
    );
    return isExpected;
  };

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Upload CSV or Excel files containing invoice and credit note data for <strong>{selectedCountry}</strong>. 
          The system will automatically separate invoices (sales) from credit notes (returns).
        </AlertDescription>
      </Alert>

      {!uploaded && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Invoice & Credit Note Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-primary/50'
              } ${uploading ? 'pointer-events-none opacity-50' : ''}`}
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 bg-primary/10 rounded-full">
                  <FileText className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <p className="text-lg font-medium">
                    {isDragActive ? 'Drop the file here' : 'Drag & drop or click to upload'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Supports CSV, XLS, XLSX files
                  </p>
                </div>
              </div>
            </div>

            {uploading && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Processing {file?.name}...</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {analysis && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Upload Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-primary">{analysis.totalRows}</div>
                <div className="text-sm text-muted-foreground">Total Records</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{analysis.invoiceCount}</div>
                <div className="text-sm text-muted-foreground">Invoices (Sales)</div>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{analysis.creditNoteCount}</div>
                <div className="text-sm text-muted-foreground">Credit Notes (Returns)</div>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{selectedCountry}</div>
                <div className="text-sm text-muted-foreground">Country</div>
              </div>
            </div>

            {analysis.reportMonth && (
              <div className="p-3 bg-primary/5 rounded-lg">
                <div className="text-sm font-medium">Detected Report Period: {analysis.reportMonth}</div>
              </div>
            )}

            <div>
              <h4 className="font-medium mb-2">Detected Headers ({analysis.detectedHeaders.length})</h4>
              <div className="flex flex-wrap gap-2">
                {analysis.detectedHeaders.map((header, index) => (
                  <Badge
                    key={index}
                    variant={getHeaderMatchStatus(header) ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {header}
                  </Badge>
                ))}
              </div>
            </div>

            {uploaded && (
              <div className="flex justify-center pt-4">
                <Button onClick={resetForm} variant="outline">
                  Upload Another File
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}