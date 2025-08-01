import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, BarChart3, FileText, Download, TrendingUp, DollarSign } from "lucide-react";
import { NoonFeesUpload } from "@/components/noon/NoonFeesUpload";
import { NoonFeesAnalytics } from "@/components/noon/NoonFeesAnalytics";
import { NoonFeesTable } from "@/components/noon/NoonFeesTable";
import { SKUCostManager, SKUCost } from "@/components/noon/SKUCostManager";
import { NoonProfitAnalytics } from "@/components/noon/NoonProfitAnalytics";
import { NoonOrderFeesData } from "@/types/noon-fees";

export default function NoonSalesTracker() {
  const [feesData, setFeesData] = useState<NoonOrderFeesData[]>([]);
  const [skuCosts, setSkuCosts] = useState<SKUCost[]>([]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-6 w-6" />
          <h1 className="text-3xl font-bold">Noon Order Fees Tracker</h1>
        </div>
      </div>

      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload Data
          </TabsTrigger>
          <TabsTrigger value="costs" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            SKU Costs
          </TabsTrigger>
          <TabsTrigger value="analysis" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analysis
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

        <TabsContent value="costs" className="space-y-6">
          {feesData.length > 0 ? (
            <SKUCostManager 
              feesData={feesData} 
              onCostsUpdated={setSkuCosts}
            />
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="text-muted-foreground">
                  <DollarSign className="h-12 w-12 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Orders Data</h3>
                  <p>Upload your Noon order fees report first to manage SKU costs.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="analysis" className="space-y-6">
          {feesData.length > 0 ? (
            <>
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="basic" className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Basic Analytics
                  </TabsTrigger>
                  <TabsTrigger value="profit" className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Profit Analysis
                  </TabsTrigger>
                  <TabsTrigger value="details" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Order Details
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4">
                  <NoonFeesAnalytics feesData={feesData} />
                </TabsContent>

                <TabsContent value="profit" className="space-y-4">
                  <NoonProfitAnalytics feesData={feesData} skuCosts={skuCosts} />
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