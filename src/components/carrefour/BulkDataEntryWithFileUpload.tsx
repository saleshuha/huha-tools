import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, Download, ArrowRight, MapPin, File } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CreateCarrefourSalesOrder } from "@/types/carrefour";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { useDropzone } from "react-dropzone";

interface BulkDataEntryWithFileUploadProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  storeId?: string;
  selectedCountry: string;
}

interface ColumnMapping {
  [key: string]: string; // expected column -> csv column
}

const EXPECTED_COLUMNS = [
  { key: 'order_number', label: 'Order Number', required: true },
  { key: 'sale_value', label: 'Sale Value', required: true },
  { key: 'seller_fees', label: 'Seller Fees', required: true },
  { key: 'cost', label: 'Cost', required: true },
  { key: 'status', label: 'Status', required: true },
  { key: 'payment_status', label: 'Payment Status', required: true },
];

export function BulkDataEntryWithFileUpload({ isOpen, onClose, onSuccess, storeId, selectedCountry }: BulkDataEntryWithFileUploadProps) {
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const downloadTemplate = () => {
    const template = `Order Number,Sale Value,Seller Fees,Cost,Status,Payment Status
ORD001,100.00,10.00,50.00,Delivered,Received
ORD002,150.00,15.00,75.00,Shipped,Pending
ORD003,200.00,20.00,100.00,Delivered,Received`;

    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'carrefour-bulk-template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const parseExcelFile = (file: File): Promise<{ headers: string[], data: any[] }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          if (jsonData.length === 0) {
            reject(new Error('No data found in the file'));
            return;
          }

          const headers = jsonData[0] as string[];
          const dataRows = jsonData.slice(1).filter(row => row && (row as any[]).some(cell => cell !== null && cell !== undefined && cell !== ''));
          
          resolve({ headers, data: dataRows });
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Error reading file'));
      reader.readAsArrayBuffer(file);
    });
  };

  const parseCsvFile = (file: File): Promise<{ headers: string[], data: any[] }> => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            reject(new Error('Error parsing CSV file'));
            return;
          }

          const headers = results.meta.fields || [];
          const data = results.data;
          resolve({ headers, data });
        },
        error: (error) => reject(error)
      });
    });
  };

  const handleFileUpload = async (file: File) => {
    setIsLoading(true);
    try {
      let parseResult: { headers: string[], data: any[] };

      if (file.name.endsWith('.csv')) {
        parseResult = await parseCsvFile(file);
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        parseResult = await parseExcelFile(file);
      } else {
        throw new Error('Unsupported file format. Please upload CSV or Excel files.');
      }

      const { headers, data } = parseResult;
      setFileHeaders(headers);
      setParsedData(data);
      setUploadedFile(file);

      // Auto-detect mappings
      const autoMapping: ColumnMapping = {};
      EXPECTED_COLUMNS.forEach(expected => {
        const found = headers.find(header => 
          header.toLowerCase().includes(expected.key.toLowerCase()) ||
          header.toLowerCase().replace(/[_\s]/g, '').includes(expected.key.toLowerCase().replace(/[_\s]/g, ''))
        );
        if (found) {
          autoMapping[expected.key] = found;
        }
      });
      setColumnMapping(autoMapping);
      setStep('mapping');

      toast({
        title: "File uploaded successfully",
        description: `Found ${headers.length} columns and ${data.length} rows`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to parse file",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      handleFileUpload(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    multiple: false
  });

  const handleMappingComplete = () => {
    // Validate required mappings
    const missingMappings = EXPECTED_COLUMNS
      .filter(col => col.required && !columnMapping[col.key])
      .map(col => col.label);

    if (missingMappings.length > 0) {
      toast({
        title: "Missing Mappings",
        description: `Please map the following required columns: ${missingMappings.join(', ')}`,
        variant: "destructive",
      });
      return;
    }

    setStep('preview');
  };

  const getMappedData = (): CreateCarrefourSalesOrder[] => {
    return parsedData.map((row, index) => {
      const orderNumber = row[columnMapping.order_number] || '';
      const saleValue = parseFloat(row[columnMapping.sale_value] || '0');
      const sellerFees = parseFloat(row[columnMapping.seller_fees] || '0');
      const cost = parseFloat(row[columnMapping.cost] || '0');
      const status = row[columnMapping.status] || 'Delivered';
      const paymentStatus = row[columnMapping.payment_status] || 'Pending';

      // Validate required fields
      if (!orderNumber) {
        throw new Error(`Row ${index + 1}: Order number is required`);
      }

      if (isNaN(saleValue) || isNaN(sellerFees) || isNaN(cost)) {
        throw new Error(`Row ${index + 1}: Sale value, seller fees, and cost must be valid numbers`);
      }

      // Validate status values
      const validStatuses = ['Delivered', 'Returned', 'Cancelled', 'Shipped', 'Other'];
      const validPaymentStatuses = ['Pending', 'Received'];

      if (!validStatuses.includes(status)) {
        throw new Error(`Row ${index + 1}: Status must be one of: ${validStatuses.join(', ')}`);
      }

      if (!validPaymentStatuses.includes(paymentStatus)) {
        throw new Error(`Row ${index + 1}: Payment status must be one of: ${validPaymentStatuses.join(', ')}`);
      }

      return {
        order_number: orderNumber,
        sale_value: saleValue,
        seller_fees: sellerFees,
        cost: cost,
        profit: saleValue - cost - sellerFees,
        status: status as 'Delivered' | 'Returned' | 'Cancelled' | 'Shipped' | 'Other',
        payment_status: paymentStatus as 'Pending' | 'Received',
        country: selectedCountry,
      };
    });
  };

  const handleSubmit = async () => {
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get store info to use store's country
      const { data: storeData } = await supabase
        .from("stores")
        .select("country")
        .eq("id", storeId)
        .single();

      const mappedData = getMappedData();
      
      // Add user_id and store_id to each record
      const dataWithIds = mappedData.map(order => ({
        ...order,
        user_id: user.id,
        store_id: storeId,
        country: (storeData as any)?.country || selectedCountry,
      }));

      const { error } = await supabase
        .from("carrefour_payments")
        .insert(dataWithIds as any);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Successfully imported ${mappedData.length} sales orders`,
      });

      resetForm();
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error importing bulk data:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to import bulk data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setStep('upload');
    setUploadedFile(null);
    setParsedData([]);
    setFileHeaders([]);
    setColumnMapping({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Bulk Data Import with File Upload
          </DialogTitle>
          <DialogDescription>
            Upload CSV or Excel files and map columns to import sales orders
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Step Indicator */}
          <div className="flex items-center justify-center space-x-4">
            <div className={`flex items-center space-x-2 ${step === 'upload' ? 'text-primary' : step === 'mapping' || step === 'preview' ? 'text-green-600' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step === 'upload' ? 'bg-primary text-primary-foreground' : step === 'mapping' || step === 'preview' ? 'bg-green-600 text-white' : 'bg-muted text-muted-foreground'}`}>
                1
              </div>
              <span>Upload File</span>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <div className={`flex items-center space-x-2 ${step === 'mapping' ? 'text-primary' : step === 'preview' ? 'text-green-600' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step === 'mapping' ? 'bg-primary text-primary-foreground' : step === 'preview' ? 'bg-green-600 text-white' : 'bg-muted text-muted-foreground'}`}>
                2
              </div>
              <span>Map Columns</span>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <div className={`flex items-center space-x-2 ${step === 'preview' ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step === 'preview' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                3
              </div>
              <span>Preview & Import</span>
            </div>
          </div>

          {/* Step 1: Upload File */}
          {step === 'upload' && (
            <>
              {/* Template Download */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Download Template
                  </CardTitle>
                  <CardDescription>
                    Download a template to see the expected format
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    onClick={downloadTemplate}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download CSV Template
                  </Button>
                </CardContent>
              </Card>

              {/* File Upload */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    Upload File
                  </CardTitle>
                  <CardDescription>
                    Upload CSV or Excel files (.csv, .xlsx, .xls)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div
                    {...getRootProps()}
                    className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                      isDragActive 
                        ? 'border-primary bg-primary/10' 
                        : 'border-muted-foreground/25 hover:border-primary/50'
                    }`}
                  >
                    <input {...getInputProps()} />
                    <File className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    {isDragActive ? (
                      <p className="text-lg font-medium">Drop the file here...</p>
                    ) : (
                      <>
                        <p className="text-lg font-medium mb-2">
                          Drag & drop a file here, or click to select
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Supported formats: CSV, Excel (.xlsx, .xls)
                        </p>
                      </>
                    )}
                  </div>

                  {uploadedFile && (
                    <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                      <p className="text-sm font-medium">Uploaded: {uploadedFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Size: {(uploadedFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {/* Step 2: Map Columns */}
          {step === 'mapping' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Map Your Columns
                </CardTitle>
                <CardDescription>
                  Map your file columns to the required fields. Found {fileHeaders.length} columns in your data.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {EXPECTED_COLUMNS.map((expected) => (
                    <div key={expected.key} className="space-y-2">
                      <Label className="text-sm font-medium">
                        {expected.label}
                        {expected.required && <span className="text-red-500 ml-1">*</span>}
                      </Label>
                      <Select
                        value={columnMapping[expected.key] || undefined}
                        onValueChange={(value) => 
                          setColumnMapping(prev => ({ ...prev, [expected.key]: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a column..." />
                        </SelectTrigger>
                        <SelectContent>
                          {fileHeaders.map((header) => (
                            <SelectItem key={header} value={header}>
                              {header}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Preview */}
          {step === 'preview' && (
            <Card>
              <CardHeader>
                <CardTitle>Data Preview</CardTitle>
                <CardDescription>
                  Preview of your mapped data. Check the first few rows before importing.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-border">
                    <thead>
                      <tr className="bg-muted">
                        {EXPECTED_COLUMNS.map(col => (
                          <th key={col.key} className="border border-border p-2 text-left text-xs font-medium">
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {parsedData.slice(0, 3).map((row, index) => (
                        <tr key={index}>
                          {EXPECTED_COLUMNS.map(col => (
                            <td key={col.key} className="border border-border p-2 text-xs">
                              {row[columnMapping[col.key]] || 'N/A'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Showing first 3 rows. Total rows to import: {parsedData.length}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          {step === 'upload' && uploadedFile && (
            <Button onClick={() => setStep('mapping')}>
              Continue to Mapping
            </Button>
          )}
          {step === 'mapping' && (
            <>
              <Button variant="outline" onClick={() => setStep('upload')}>
                Back
              </Button>
              <Button onClick={handleMappingComplete}>
                Continue to Preview
              </Button>
            </>
          )}
          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={() => setStep('mapping')}>
                Back
              </Button>
              <Button onClick={handleSubmit} disabled={isLoading}>
                {isLoading ? "Importing..." : `Import ${parsedData.length} Records`}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}