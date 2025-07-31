import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, BarChart3 } from "lucide-react";
import NoonPaymentUpload from "@/components/NoonPaymentUpload";
import NoonPaymentData from "@/components/NoonPaymentData";

const NoonPaymentsReconciliation = () => {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleDataUploaded = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Noon Payments Reconciliation</h1>
          <p className="text-muted-foreground">
            Upload and reconcile Noon marketplace payment transactions
          </p>
        </div>
      </div>

      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload Reports
          </TabsTrigger>
          <TabsTrigger value="data" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            View Data & Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload">
          <Card>
            <CardHeader>
              <CardTitle>Upload Payment Reports</CardTitle>
              <CardDescription>
                Upload your Noon invoice and credit reports. Headers will be saved permanently for future uploads.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <NoonPaymentUpload onDataUploaded={handleDataUploaded} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data" key={refreshKey}>
          <NoonPaymentData />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NoonPaymentsReconciliation;