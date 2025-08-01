import { useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, X, Download, Store, Calendar } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useCountry } from "@/contexts/CountryContext";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { NoonOrderFeesData, NOON_FEES_EXPECTED_HEADERS } from "@/types/noon-fees";
import { ColumnMappingWizard } from "@/components/sales/ColumnMappingWizard";

interface NoonFeesUploadProps {
  onDataUploaded: (data: NoonOrderFeesData[]) => void;
}

interface Store {
  id: string;
  name: string;
}

export function NoonFeesUpload({ onDataUploaded }: NoonFeesUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [fileData, setFileData] = useState<{ headers: string[]; rows: any[][] } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showMapping, setShowMapping] = useState(false);
  const [showPeriodForm, setShowPeriodForm] = useState(false);
  
  // Form states
  const [selectedStore, setSelectedStore] = useState<string>("no-store");
  const [reportMonth, setReportMonth] = useState<string>("");
  const [periodStart, setPeriodStart] = useState<string>("");
  const [periodEnd, setPeriodEnd] = useState<string>("");
  const [stores, setStores] = useState<Store[]>([]);
  
  const { toast } = useToast();
  const { selectedCountry } = useCountry();

  // Load stores on component mount
  useEffect(() => {
    const loadStores = async () => {
      try {
        const { data, error } = await supabase
          .from('stores')
          .select('id, name')
          .eq('country', selectedCountry)
          .eq('platform', 'noon')
          .order('name');
        
        if (error) throw error;
        setStores(data || []);
      } catch (error) {
        console.error('Error loading stores:', error);
        toast({
          title: "Error loading stores",
          description: "Please try again",
          variant: "destructive"
        });
      }
    };
    
    loadStores();
  }, [selectedCountry, toast]);

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
        setShowPeriodForm(true);
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

  const handleMappingComplete = async (mappedData: NoonOrderFeesData[]) => {
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) {
        throw new Error('User not authenticated');
      }

      // Prepare data for database insertion
      const dbData = mappedData.map(item => ({
        user_id: user.data.user.id,
        store_id: selectedStore === "no-store" ? null : selectedStore,
        report_month: reportMonth,
        report_period_start: periodStart || null,
        report_period_end: periodEnd || null,
        country_code: selectedCountry,
        
        // Order details
        id_partner: item.id_partner,
        marketplace: item.marketplace,
        order_nr: item.order_nr,
        item_nr: item.item_nr,
        partner_sales_nr: item.partner_sales_nr,
        awb_nr: item.awb_nr,
        sku: item.sku,
        partner_sku: item.partner_sku,
        fulfillment_mode: item.fulfillment_mode,
        family: item.family,
        product_type: item.product_type,
        brand: item.brand,
        product_title: item.product_title,
        item_status: item.item_status,
        
        // Dates
        last_statement_date: item.last_statement_date ? new Date(item.last_statement_date).toISOString() : null,
        ordered_date: item.ordered_date ? new Date(item.ordered_date).toISOString() : null,
        shipped_date: item.shipped_date ? new Date(item.shipped_date).toISOString() : null,
        delivered_date: item.delivered_date ? new Date(item.delivered_date).toISOString() : null,
        returned_date: item.returned_date ? new Date(item.returned_date).toISOString() : null,
        
        // Currency and pricing
        currency_code: item.currency_code,
        seller_price: item.seller_price,
        seller_promo: item.seller_promo,
        base_price: item.base_price,
        promo_deal: item.promo_deal,
        noon_markup: item.noon_markup,
        offer_price: item.offer_price,
        promo_coupon: item.promo_coupon,
        invoice_price: item.invoice_price,
        
        // Fees
        fee_noon_promo: item.fee_noon_promo,
        fee_noon_markup: item.fee_noon_markup,
        fee_referral: item.fee_referral,
        fee_noon_rocket_referral: item.fee_noon_rocket_referral,
        fee_outbound_fbn: item.fee_outbound_fbn,
        fee_weight_handling: item.fee_weight_handling,
        fee_crossdock: item.fee_crossdock,
        fee_directship_outbound: item.fee_directship_outbound,
        fee_shipping: item.fee_shipping,
        fee_damaged_return: item.fee_damaged_return,
        fee_noon_penalty: item.fee_noon_penalty,
        fee_item_cancellation: item.fee_item_cancellation,
        fee_warranty_penalty: item.fee_warranty_penalty,
        fee_retention_penalty: item.fee_retention_penalty,
        fee_alternate_seller_fulfillment: item.fee_alternate_seller_fulfillment,
        fee_miscellaneous: item.fee_miscellaneous,
        fee_direct_collection: item.fee_direct_collection,
        fee_reinvoicing: item.fee_reinvoicing,
        total_payment: item.total_payment,
        
        // Statement details
        statement_nr: item.statement_nr,
        invoice_nr: item.invoice_nr,
        creditnote_nr: item.creditnote_nr
      }));

      const { error } = await supabase
        .from('noon_order_fees')
        .insert(dbData);

      if (error) throw error;

      onDataUploaded(mappedData);
      resetForm();
      
      toast({
        title: "Data saved successfully",
        description: `Imported ${mappedData.length} order records to database`,
      });
    } catch (error) {
      console.error('Error saving to database:', error);
      toast({
        title: "Error saving data",
        description: "Failed to save data to database. Please try again.",
        variant: "destructive"
      });
    }
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

  const resetForm = () => {
    setFile(null);
    setFileData(null);
    setShowMapping(false);
    setShowPeriodForm(false);
    setSelectedStore("no-store");
    setReportMonth("");
    setPeriodStart("");
    setPeriodEnd("");
    setError(null);
    setProgress(0);
  };

  const handlePeriodSubmit = () => {
    if (!reportMonth) {
      setError("Please select a report month");
      return;
    }
    
    if (file) {
      processFile(file);
      setShowPeriodForm(false);
    }
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

  if (showPeriodForm && file) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Report Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="store">Store (Optional)</Label>
              <Select value={selectedStore} onValueChange={setSelectedStore}>
                <SelectTrigger>
                  <SelectValue placeholder="Select store..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no-store">No specific store</SelectItem>
                  {stores.map((store) => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="month">Report Month *</Label>
              <Input
                type="month"
                value={reportMonth}
                onChange={(e) => setReportMonth(e.target.value)}
                placeholder="YYYY-MM"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="start">Period Start (Optional)</Label>
              <Input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end">Period End (Optional)</Label>
              <Input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-4">
            <Button onClick={handlePeriodSubmit} className="flex-1">
              Process File
            </Button>
            <Button variant="outline" onClick={resetForm}>
              Cancel
            </Button>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
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
                onClick={resetForm}
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