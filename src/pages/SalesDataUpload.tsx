import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, FileText, DollarSign, Receipt } from "lucide-react";
import { InvoiceCreditUpload } from "@/components/sales/InvoiceCreditUpload";
import { CostDataEntry } from "@/components/sales/CostDataEntry";
import { CountrySwitcher } from "@/components/CountrySwitcher";
import { useCountry } from "@/contexts/CountryContext";

export default function SalesDataUpload() {
  const [invoiceCreditData, setInvoiceCreditData] = useState(null);
  const [costData, setCostData] = useState(null);
  const { selectedCountry } = useCountry();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Upload className="h-6 w-6" />
          <h1 className="text-3xl font-bold">Invoice & Credit Note Management</h1>
        </div>
        <CountrySwitcher />
      </div>

      <div className="mb-4 p-4 bg-muted/50 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Upload Invoice & Credit Note Data for {selectedCountry}</h2>
        <p className="text-sm text-muted-foreground">
          Upload files containing order details as invoices (sales) or credit notes (returns). 
          The system will automatically separate and process them based on the Document Type field.
        </p>
      </div>

      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Invoice & Credit Upload
          </TabsTrigger>
          <TabsTrigger value="costs" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Item Costs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upload Invoice & Credit Note Data</CardTitle>
            </CardHeader>
            <CardContent>
              <InvoiceCreditUpload onDataUploaded={setInvoiceCreditData} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="costs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Item Cost Management</CardTitle>
            </CardHeader>
            <CardContent>
              <CostDataEntry onDataUpdated={setCostData} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}