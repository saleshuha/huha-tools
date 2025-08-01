import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, Download, ArrowRight, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CreateCarrefourSalesOrder } from "@/types/carrefour";
import Papa from "papaparse";

interface BulkDataEntryWithMappingProps {
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

export function BulkDataEntryWithMapping({ isOpen, onClose, onSuccess, storeId, selectedCountry }: BulkDataEntryWithMappingProps) {
  const [step, setStep] = useState<'input' | 'mapping' | 'preview'>('input');
  const [bulkData, setBulkData] = useState("");
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
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

  const handleDataParse = () => {
    if (!bulkData.trim()) {
      toast({
        title: "Error",
        description: "Please enter some data",
        variant: "destructive",
      });
      return;
    }

    try {
      Papa.parse(bulkData.trim(), {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            toast({
              title: "Parse Error",
              description: "There was an error parsing your CSV data",
              variant: "destructive",
            });
            return;
          }

          const headers = results.meta.fields || [];
          setCsvHeaders(headers);
          setParsedData(results.data);

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
        }
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to parse CSV data",
        variant: "destructive",
      });
    }
  };

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
        country: storeData?.country || selectedCountry,
      }));

      const { error } = await supabase
        .from("carrefour_payments")
        .insert(dataWithIds);

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
    setStep('input');
    setBulkData("");
    setParsedData([]);
    setCsvHeaders([]);
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
            Bulk Data Import with Column Mapping
          </DialogTitle>
          <DialogDescription>
            Import multiple sales orders with flexible column mapping
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Step Indicator */}
          <div className="flex items-center justify-center space-x-4">
            <div className={`flex items-center space-x-2 ${step === 'input' ? 'text-primary' : step === 'mapping' || step === 'preview' ? 'text-green-600' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step === 'input' ? 'bg-primary text-primary-foreground' : step === 'mapping' || step === 'preview' ? 'bg-green-600 text-white' : 'bg-muted text-muted-foreground'}`}>
                1
              </div>
              <span>Input Data</span>
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

          {/* Step 1: Input Data */}
          {step === 'input' && (
            <>
              {/* Template Download */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    CSV Template
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
                    Download Template
                  </Button>
                </CardContent>
              </Card>

              {/* Data Entry */}
              <div className="space-y-2">
                <Label htmlFor="bulkData">Paste CSV Data</Label>
                <Textarea
                  id="bulkData"
                  placeholder={`Order Number,Sale Value,Seller Fees,Cost,Status,Payment Status
ORD001,100.00,10.00,50.00,Delivered,Received
ORD002,150.00,15.00,75.00,Shipped,Pending`}
                  value={bulkData}
                  onChange={(e) => setBulkData(e.target.value)}
                  className="min-h-[200px] font-mono text-sm"
                />
                <p className="text-sm text-muted-foreground">
                  Paste your CSV data above. The first row should contain column headers.
                </p>
              </div>
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
                  Map your CSV columns to the required fields. Found {csvHeaders.length} columns in your data.
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
                        value={columnMapping[expected.key] || ''}
                        onValueChange={(value) => 
                          setColumnMapping(prev => ({ ...prev, [expected.key]: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a column..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">None</SelectItem>
                          {csvHeaders.map((header) => (
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
          {step === 'input' && (
            <Button onClick={handleDataParse} disabled={!bulkData.trim()}>
              Parse Data & Continue
            </Button>
          )}
          {step === 'mapping' && (
            <>
              <Button variant="outline" onClick={() => setStep('input')}>
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