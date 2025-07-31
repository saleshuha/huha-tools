import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Upload, FileText, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CreateCarrefourSalesOrder } from "@/types/carrefour";

interface BulkDataEntryProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  storeId?: string;
  selectedCountry: string;
}

export function BulkDataEntry({ isOpen, onClose, onSuccess, storeId, selectedCountry }: BulkDataEntryProps) {
  const [bulkData, setBulkData] = useState("");
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

  const parseBulkData = (data: string): CreateCarrefourSalesOrder[] => {
    const lines = data.trim().split('\n');
    if (lines.length === 0) return [];

    // Skip header line if it exists
    const dataLines = lines[0].toLowerCase().includes('order') ? lines.slice(1) : lines;
    
    return dataLines.map((line, index) => {
      const parts = line.split(',').map(part => part.trim());
      
      if (parts.length < 6) {
        throw new Error(`Row ${index + 1}: Expected 6 columns, got ${parts.length}`);
      }

      const [orderNumber, saleValue, sellerFees, cost, status, paymentStatus] = parts;

      // Validate required fields
      if (!orderNumber) {
        throw new Error(`Row ${index + 1}: Order number is required`);
      }

      const saleValueNum = parseFloat(saleValue);
      const sellerFeesNum = parseFloat(sellerFees);
      const costNum = parseFloat(cost);

      if (isNaN(saleValueNum) || isNaN(sellerFeesNum) || isNaN(costNum)) {
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
        sale_value: saleValueNum,
        seller_fees: sellerFeesNum,
        cost: costNum,
        profit: saleValueNum - costNum - sellerFeesNum,
        status: status as 'Delivered' | 'Returned' | 'Cancelled' | 'Shipped' | 'Other',
        payment_status: paymentStatus as 'Pending' | 'Received',
        country: selectedCountry,
      };
    });
  };

  const handleSubmit = async () => {
    if (!bulkData.trim()) {
      toast({
        title: "Error",
        description: "Please enter some data",
        variant: "destructive",
      });
      return;
    }

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

      const parsedData = parseBulkData(bulkData);
      
      // Add user_id and store_id to each record
      const dataWithIds = parsedData.map(order => ({
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
        description: `Successfully imported ${parsedData.length} sales orders`,
      });

      setBulkData("");
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Bulk Data Entry
          </DialogTitle>
          <DialogDescription>
            Import multiple sales orders at once using CSV format
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Template Download */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-4 w-4" />
                CSV Template
              </CardTitle>
              <CardDescription>
                Download a template to see the required format
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
              Format: Order Number, Sale Value, Seller Fees, Cost, Status (Delivered/Returned/Cancelled/Shipped/Other), Payment Status (Pending/Received)
            </p>
          </div>

          {/* Instructions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Instructions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>• Each line represents one sales order</div>
              <div>• Separate values with commas</div>
              <div>• First line can be headers (will be skipped if detected)</div>
              <div>• Profit will be calculated automatically (Sale Value - Cost - Seller Fees)</div>
              <div>• Status must be: Delivered, Returned, Cancelled, Shipped, or Other</div>
              <div>• Payment Status must be: Pending or Received</div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? "Importing..." : "Import Data"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}