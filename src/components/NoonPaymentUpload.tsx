import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, CreditCard, AlertCircle } from "lucide-react";
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
  const [uploadedFiles, setUploadedFiles] = useState<{
    invoice?: string;
    credit?: string;
  }>({});

  const processFile = (file: File, fileType: 'invoice' | 'credit'): Promise<NoonFileData> => {
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
            fileName: file.name,
            fileType
          });
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  };

  const saveHeaders = async (headers: string[], fileType: 'invoice' | 'credit') => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

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
  };

  const saveData = async (fileData: NoonFileData) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const tableName = fileData.fileType === 'invoice' ? 'noon_invoice_data' : 'noon_credit_data';
    const records: (NoonInvoiceData | NoonCreditData)[] = [];

    // Convert headers to lowercase and replace spaces with underscores for mapping
    const headerMap = fileData.headers.reduce((acc, header, index) => {
      const key = header.toLowerCase().replace(/\s+/g, '_').replace(/[()]/g, '');
      acc[key] = index;
      return acc;
    }, {} as { [key: string]: number });

    // Process each row of data
    for (const row of fileData.data) {
      if (row.length === 0 || row.every(cell => !cell)) continue; // Skip empty rows

      const record: any = {
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
            record[dbField] = isNaN(numValue) ? null : numValue;
          } else if (dbField === 'document_date') {
            // Handle date conversion
            record[dbField] = value ? new Date(value).toISOString() : null;
          } else {
            record[dbField] = value || null;
          }
        }
      });

      records.push(record);
    }

    // Insert data in batches
    const batchSize = 100;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const { error } = await supabase
        .from(tableName)
        .insert(batch);
      
      if (error) throw error;
    }

    return records.length;
  };

  const onDrop = async (acceptedFiles: File[], fileType: 'invoice' | 'credit') => {
    if (acceptedFiles.length === 0) return;

    setUploading(true);
    try {
      const file = acceptedFiles[0];
      
      // Process the file
      const fileData = await processFile(file, fileType);
      
      // Save headers permanently
      await saveHeaders(fileData.headers, fileType);
      
      // Save data to database
      const recordCount = await saveData(fileData);
      
      setUploadedFiles(prev => ({
        ...prev,
        [fileType]: file.name
      }));

      toast.success(`${fileType} file uploaded successfully! ${recordCount} records processed.`);
      onDataUploaded();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(`Failed to upload ${fileType} file: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const createDropzone = (fileType: 'invoice' | 'credit') => {
    const { getRootProps, getInputProps, isDragActive } = useDropzone({
      onDrop: (files) => onDrop(files, fileType),
      accept: {
        'text/csv': ['.csv'],
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
        'application/vnd.ms-excel': ['.xls']
      },
      multiple: false
    });

    const Icon = fileType === 'invoice' ? FileText : CreditCard;
    const title = fileType === 'invoice' ? 'Invoice Report' : 'Credit Report';
    const description = fileType === 'invoice' 
      ? 'Upload your Noon invoice/payment report CSV or Excel file'
      : 'Upload your Noon credit/return report CSV or Excel file';

    return (
      <Card className="h-64">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-6 h-32 flex flex-col items-center justify-center cursor-pointer transition-colors
              ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
              ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <input {...getInputProps()} disabled={uploading} />
            {uploadedFiles[fileType] ? (
              <div className="text-center">
                <FileText className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="text-sm text-green-600 font-medium">{uploadedFiles[fileType]}</p>
                <p className="text-xs text-muted-foreground">File uploaded successfully</p>
              </div>
            ) : (
              <div className="text-center">
                <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {isDragActive ? `Drop ${fileType} file here` : `Drag & drop ${fileType} file or click to browse`}
                </p>
                <p className="text-xs text-muted-foreground mt-1">CSV or Excel files only</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {createDropzone('invoice')}
        {createDropzone('credit')}
      </div>

      {uploading && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-blue-600">
              <AlertCircle className="h-4 w-4 animate-spin" />
              <span className="text-sm">Processing file and saving to database...</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default NoonPaymentUpload;