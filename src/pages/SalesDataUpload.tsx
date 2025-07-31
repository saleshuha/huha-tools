import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, FileText, DollarSign } from "lucide-react";
import { SalesFileUpload } from "@/components/sales/SalesFileUpload";
import { ReturnsFileUpload } from "@/components/sales/ReturnsFileUpload";
import { CostDataEntry } from "@/components/sales/CostDataEntry";

export default function SalesDataUpload() {
  const [salesData, setSalesData] = useState(null);
  const [returnsData, setReturnsData] = useState(null);
  const [costData, setCostData] = useState(null);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Upload className="h-6 w-6" />
        <h1 className="text-3xl font-bold">Sales Data Management</h1>
      </div>

      <Tabs defaultValue="sales" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="sales" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Sales Data
          </TabsTrigger>
          <TabsTrigger value="returns" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Returns Data
          </TabsTrigger>
          <TabsTrigger value="costs" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Item Costs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upload Sales Data</CardTitle>
            </CardHeader>
            <CardContent>
              <SalesFileUpload onDataUploaded={setSalesData} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="returns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upload Returns/Credit Data</CardTitle>
            </CardHeader>
            <CardContent>
              <ReturnsFileUpload onDataUploaded={setReturnsData} />
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