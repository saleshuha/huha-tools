import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, AlertCircle } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { NoonFileData, NoonInvoiceData, NoonCreditData } from "@/types/noon-payments";
import * as XLSX from "xlsx";
import Papa from "papaparse";

interface NoonPaymentUploadProps {
  onDataUploaded: () => void;
}

const NoonPaymentUpload = ({ onDataUploaded }: NoonPaymentUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{
    name?: string;
    invoiceCount?: number;
    creditCount?: number;
  }>({});

  const processFile = (file: File): Promise<NoonFileData> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          let headers: string[] = [];
          let data: string[][] = [];

          if (file.name.endsWith('.csv')) {
            // Parse CSV
            const text = new TextDecoder().decode(arrayBuffer);
            const result = Papa.parse(text, {
              header: false,
              skipEmptyLines: true
            });
            
            if (result.data.length > 0) {
              headers = result.data[0] as string[];
              data = result.data.slice(1) as string[][];
            }
          } else {
            // Parse Excel
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];
            
            if (jsonData.length > 0) {
              headers = jsonData[0];
              data = jsonData.slice(1);
            }
          }

          resolve({
            headers,
            data,
            fileName: file.name
          });
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  };

  const saveHeaders = async (headers: string[]) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Save headers for both invoice and credit types (they're the same)
    const fileTypes = ['invoice', 'credit'] as const;
    
    for (const fileType of fileTypes) {
      // Check if headers already exist for this file type
      const { data: existingHeaders } = await supabase
        .from('noon_file_headers')
        .select('*')
        .eq('user_id', user.id)
        .eq('file_type', fileType)
        .single();

      if (existingHeaders) {
        // Update existing headers
        const { error } = await supabase
          .from('noon_file_headers')
          .update({ headers })
          .eq('id', existingHeaders.id);
        
        if (error) throw error;
      } else {
        // Insert new headers
        const { error } = await supabase
          .from('noon_file_headers')
          .insert({
            user_id: user.id,
            file_type: fileType,
            headers
          });
        
        if (error) throw error;
      }
    }
  };

  const isCredutRow = (row: string[], headerMap: { [key: string]: number }): boolean => {
    // Check if this row is a credit/return based on data content
    // Look for credit note number or specific transaction types
    const creditNoteIndex = headerMap['credit_note_nr'];
    const transactionTypeIndex = headerMap['transaction_type'];
    const documentTypeIndex = headerMap['document_type'];
    
    // If credit note number exists and is not empty, it's a credit row
    if (creditNoteIndex !== undefined && row[creditNoteIndex] && row[creditNoteIndex].trim()) {
      return true;
    }
    
    // Check transaction type for credit indicators
    if (transactionTypeIndex !== undefined && row[transactionTypeIndex]) {
      const transactionType = row[transactionTypeIndex].toLowerCase();
      if (transactionType.includes('credit') || transactionType.includes('return') || transactionType.includes('refund')) {
        return true;
      }
    }
    
    // Check document type for credit indicators
    if (documentTypeIndex !== undefined && row[documentTypeIndex]) {
      const documentType = row[documentTypeIndex].toLowerCase();
      if (documentType.includes('credit') || documentType.includes('return')) {
        return true;
      }
    }
    
    return false;
  };

  const saveData = async (fileData: NoonFileData) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const invoiceRecords: NoonInvoiceData[] = [];
    const creditRecords: NoonCreditData[] = [];

    // Convert headers to lowercase and replace spaces with underscores for mapping
    const headerMap = fileData.headers.reduce((acc, header, index) => {
      const key = header.toLowerCase().replace(/\s+/g, '_').replace(/[()]/g, '');
      acc[key] = index;
      return acc;
    }, {} as { [key: string]: number });

    // Process each row of data
    for (const row of fileData.data) {
      if (row.length === 0 || row.every(cell => !cell)) continue; // Skip empty rows

      const baseRecord: any = {
        user_id: user.id,
        file_name: fileData.fileName,
        country: 'UAE' // Default country
      };

      // Map CSV columns to database columns
      const fieldMappings = {
        'contract': 'contract',
        'business_unit': 'business_unit',
        'document_type': 'document_type',
        'invoice_type_code': 'invoice_type_code',
        'document_subtype': 'document_subtype',
        'document_date': 'document_date',
        'invoice_nr': 'invoice_nr',
        'invoice_line_nr': 'invoice_line_nr',
        'credit_note_nr': 'credit_note_nr',
        'credit_note_line_nr': 'credit_note_line_nr',
        'transaction_type': 'transaction_type',
        'source_doc_type': 'source_doc_type',
        'source_doc_nr': 'source_doc_nr',
        'source_doc_line_type': 'source_doc_line_type',
        'source_doc_line_nr': 'source_doc_line_nr',
        'description': 'description',
        'sku': 'sku',
        'issuer_city': 'issuer_city',
        'issuer_country': 'issuer_country',
        'issuer_location': 'issuer_location',
        'receiver_city': 'receiver_city',
        'receiver_country': 'receiver_country',
        'receiver_location': 'receiver_location',
        'issuer_legal_entity': 'issuer_legal_entity',
        'issuer_legal_name': 'issuer_legal_name',
        'issuer_trn': 'issuer_trn',
        'receiver_legal_entity': 'receiver_legal_entity',
        'receiver_legal_name': 'receiver_legal_name',
        'receiver_trn': 'receiver_trn',
        'document_currency': 'document_currency',
        'vat_currency': 'vat_currency',
        'vat_rate': 'vat_rate',
        'fx_rate': 'fx_rate',
        'price_excluding_vat_document_currency': 'price_excluding_vat_doc_currency',
        'price_excluding_vat_vat_currency': 'price_excluding_vat_vat_currency',
        'vat_amount_document_currency': 'vat_amount_doc_currency',
        'vat_amount_vat_currency': 'vat_amount_vat_currency',
        'price_including_vat_document_currency': 'price_including_vat_doc_currency'
      };

      // Map fields from CSV to database
      Object.entries(fieldMappings).forEach(([csvField, dbField]) => {
        const index = headerMap[csvField];
        if (index !== undefined && row[index]) {
          const value = row[index];
          // Handle numeric fields
          if (['vat_rate', 'fx_rate'].includes(dbField) || dbField.includes('amount') || dbField.includes('price')) {
            const numValue = parseFloat(value);
            baseRecord[dbField] = isNaN(numValue) ? null : numValue;
          } else if (dbField === 'document_date') {
            // Handle date conversion
            baseRecord[dbField] = value ? new Date(value).toISOString() : null;
          } else {
            baseRecord[dbField] = value || null;
          }
        }
      });

      // Determine if this is a credit or invoice row and add to appropriate array
      if (isCredutRow(row, headerMap)) {
        // Add credit-specific fields
        const creditRecord = {
          ...baseRecord,
          return_charges: 0, // Can be calculated or mapped if available
          refund_amount: baseRecord.price_including_vat_doc_currency || 0
        };
        creditRecords.push(creditRecord);
      } else {
        // Add invoice-specific fields
        const invoiceRecord = {
          ...baseRecord,
          commission_amount: 0, // Can be calculated or mapped if available
          shipping_amount: 0, // Can be calculated or mapped if available
          net_amount_received: baseRecord.price_including_vat_doc_currency || 0
        };
        invoiceRecords.push(invoiceRecord);
      }
    }

    // Insert invoice data in batches
    const batchSize = 100;
    if (invoiceRecords.length > 0) {
      for (let i = 0; i < invoiceRecords.length; i += batchSize) {
        const batch = invoiceRecords.slice(i, i + batchSize);
        const { error } = await supabase
          .from('noon_invoice_data')
          .insert(batch);
        
        if (error) throw error;
      }
    }

    // Insert credit data in batches
    if (creditRecords.length > 0) {
      for (let i = 0; i < creditRecords.length; i += batchSize) {
        const batch = creditRecords.slice(i, i + batchSize);
        const { error } = await supabase
          .from('noon_credit_data')
          .insert(batch);
        
        if (error) throw error;
      }
    }

    return {
      invoiceCount: invoiceRecords.length,
      creditCount: creditRecords.length,
      totalCount: invoiceRecords.length + creditRecords.length
    };
  };

  const onDrop = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    setUploading(true);
    try {
      const file = acceptedFiles[0];
      
      // Process the file
      const fileData = await processFile(file);
      
      // Save headers permanently
      await saveHeaders(fileData.headers);
      
      // Save data to database (automatically separates invoice and credit rows)
      const result = await saveData(fileData);
      
      setUploadedFile({
        name: file.name,
        invoiceCount: result.invoiceCount,
        creditCount: result.creditCount
      });

      toast.success(`File uploaded successfully! ${result.invoiceCount} invoice records and ${result.creditCount} credit records processed.`);
      onDataUploaded();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(`Failed to upload file: ${error.message}`);
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
    multiple: false
  });

  return (
    <div className="space-y-6">
      {/* Single Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Upload Noon Payment Report
          </CardTitle>
          <CardDescription>
            Upload your Noon payment report CSV or Excel file. The system will automatically separate invoice and credit data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 h-48 flex flex-col items-center justify-center cursor-pointer transition-colors
              ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
              ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <input {...getInputProps()} disabled={uploading} />
            {uploadedFile.name ? (
              <div className="text-center">
                <FileText className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <p className="text-lg text-green-600 font-medium">{uploadedFile.name}</p>
                <p className="text-sm text-muted-foreground mb-2">File uploaded successfully</p>
                <div className="flex gap-2 justify-center">
                  <Badge variant="outline">
                    {uploadedFile.invoiceCount || 0} invoices
                  </Badge>
                  <Badge variant="outline">
                    {uploadedFile.creditCount || 0} credits
                  </Badge>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg text-muted-foreground mb-2">
                  {isDragActive ? 'Drop payment report here' : 'Drag & drop payment report or click to browse'}
                </p>
                <p className="text-sm text-muted-foreground">CSV or Excel files only</p>
                <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span>Combined Invoice & Credit Report</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {uploading && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-blue-600">
              <AlertCircle className="h-4 w-4 animate-spin" />
              <span className="text-sm">Processing payment report and saving to database...</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default NoonPaymentUpload;