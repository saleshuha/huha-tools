import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, BarChart3 } from "lucide-react";
import NoonSalesUpload from "@/components/NoonSalesUpload";
import NoonSalesData from "@/components/NoonSalesData";

const NoonPaymentsReconciliation = () => {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleDataUploaded = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Noon Sales Reconciliation</h1>
          <p className="text-muted-foreground">
            Upload and reconcile Noon marketplace sales transactions
          </p>
        </div>
      </div>

      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload Sales Reports
          </TabsTrigger>
          <TabsTrigger value="data" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Sales Data & Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload">
          <Card>
            <CardHeader>
              <CardTitle>Upload Sales Report</CardTitle>
              <CardDescription>
                Upload your Noon sales report. The system will automatically separate invoice and credit transactions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <NoonSalesUpload onDataUploaded={handleDataUploaded} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data" key={refreshKey}>
          <NoonSalesData />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NoonPaymentsReconciliation;