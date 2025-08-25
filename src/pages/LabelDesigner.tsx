import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Database, Printer, Palette } from "lucide-react";
import { LabelCanvas } from "@/components/label/LabelCanvas";
import { LabelTemplates } from "@/components/label/LabelTemplates";
import { BulkDataManager } from "@/components/label/BulkDataManager";
import { PrintManager } from "@/components/label/PrintManager";

export default function LabelDesigner() {
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);
  const [activeDataset, setActiveDataset] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2 text-foreground">Label Designer</h1>
              <p className="text-muted-foreground">
                Create professional labels with drag-and-drop canvas, bulk data import, and Zebra printer support
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="flex items-center gap-1">
                <Palette className="w-3 h-3" />
                Canvas Editor
              </Badge>
              <Badge variant="secondary" className="flex items-center gap-1">
                <Printer className="w-3 h-3" />
                Zebra Ready
              </Badge>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="designer" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="designer" className="flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Designer
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="data" className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              Bulk Data
            </TabsTrigger>
            <TabsTrigger value="print" className="flex items-center gap-2">
              <Printer className="w-4 h-4" />
              Print
            </TabsTrigger>
          </TabsList>

          <TabsContent value="designer" className="mt-6">
            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-12">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Palette className="w-5 h-5" />
                      Label Canvas
                    </CardTitle>
                    <CardDescription>
                      Drag and drop elements to create your label design
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <LabelCanvas 
                      templateId={activeTemplate}
                      datasetId={activeDataset}
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="templates" className="mt-6">
            <LabelTemplates 
              onTemplateSelect={setActiveTemplate}
              activeTemplate={activeTemplate}
            />
          </TabsContent>

          <TabsContent value="data" className="mt-6">
            <BulkDataManager 
              onDatasetSelect={setActiveDataset}
              activeDataset={activeDataset}
            />
          </TabsContent>

          <TabsContent value="print" className="mt-6">
            <PrintManager 
              templateId={activeTemplate}
              datasetId={activeDataset}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}