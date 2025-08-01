import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, BarChart3, FileText, Download, TrendingUp } from "lucide-react";
import { NoonFeesUpload } from "@/components/noon/NoonFeesUpload";
import { NoonFeesAnalytics } from "@/components/noon/NoonFeesAnalytics";
import { NoonFeesTable } from "@/components/noon/NoonFeesTable";
import { NoonOrderFeesData } from "@/types/noon-fees";

export default function NoonSalesTracker() {
  const [feesData, setFeesData] = useState<NoonOrderFeesData[]>([]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-6 w-6" />
          <h1 className="text-3xl font-bold">Noon Order Fees Tracker</h1>
        </div>
      </div>

      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload Fees Data
          </TabsTrigger>
          <TabsTrigger value="analysis" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Fees Analysis
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload Order Level Fees Report</CardTitle>
            </CardHeader>
            <CardContent>
              <NoonFeesUpload onDataUploaded={setFeesData} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-6">
          {feesData.length > 0 ? (
            <>
              <NoonFeesAnalytics feesData={feesData} />
              
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="overview" className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Analytics Overview
                  </TabsTrigger>
                  <TabsTrigger value="details" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Order Details
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  <NoonFeesAnalytics feesData={feesData} />
                </TabsContent>

                <TabsContent value="details" className="space-y-4">
                  <NoonFeesTable feesData={feesData} />
                </TabsContent>
              </Tabs>
            </>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Data Available</h3>
                  <p>Upload your Noon order fees report to view analytics and insights.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}