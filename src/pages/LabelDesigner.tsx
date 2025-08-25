import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Database, Printer, Palette, ArrowRight } from "lucide-react";
import { LabelCanvas } from "@/components/label/LabelCanvas";
import { LabelTemplates } from "@/components/label/LabelTemplates";
import { BulkDataManager } from "@/components/label/BulkDataManager";
import { PrintManager } from "@/components/label/PrintManager";
import { WelcomeGuide } from "@/components/label/WelcomeGuide";
import { StepperIndicator } from "@/components/label/StepperIndicator";
import { toast } from "sonner";

export default function LabelDesigner() {
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);
  const [activeDataset, setActiveDataset] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState(true);
  const [canvasSize, setCanvasSize] = useState({ width: 400, height: 300 });
  const [canvasData, setCanvasData] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [activeTab, setActiveTab] = useState("data");

  // Auto-navigate based on data availability
  useEffect(() => {
    if (!activeDataset && activeTab !== "data") {
      setActiveTab("data");
      setCurrentStep(1);
      toast.info("Please select or import data first");
    } else if (activeDataset && !activeTemplate && activeTab === "data") {
      // Optionally prompt to move to templates
      setTimeout(() => {
        toast.success("Data ready! You can now design your template", {
          action: {
            label: "Go to Designer",
            onClick: () => {
              setActiveTab("designer");
              setCurrentStep(3);
            }
          }
        });
      }, 1000);
    }
  }, [activeDataset, activeTemplate, activeTab]);

  // Update current step based on active tab
  useEffect(() => {
    switch (activeTab) {
      case "data":
        setCurrentStep(1);
        break;
      case "templates":
        setCurrentStep(2);
        break;
      case "designer":
        setCurrentStep(3);
        break;
      case "print":
        setCurrentStep(4);
        break;
    }
  }, [activeTab]);

  const handleDatasetSelect = (datasetId: string | null) => {
    setActiveDataset(datasetId);
    if (datasetId) {
      toast.success("Dataset selected successfully!");
    }
  };

  const handleTemplateSelect = (templateId: string | null) => {
    setActiveTemplate(templateId);
    if (templateId) {
      toast.success("Template selected successfully!");
    }
  };

  if (showWelcome) {
    return (
      <div className="min-h-screen bg-background animate-fade-in">
        <div className="container mx-auto p-6">
          <WelcomeGuide onGetStarted={() => setShowWelcome(false)} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background animate-fade-in">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2 text-foreground">Label Designer</h1>
              <p className="text-muted-foreground">
                Create professional labels with data-first workflow, smart mapping, and Zebra printer support
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="flex items-center gap-1">
                <Palette className="w-3 h-3" />
                Smart Mapping
              </Badge>
              <Badge variant="secondary" className="flex items-center gap-1">
                <Printer className="w-3 h-3" />
                Zebra Ready
              </Badge>
            </div>
          </div>
        </div>

        {/* Stepper Indicator */}
        <StepperIndicator 
          currentStep={currentStep}
          hasDataset={!!activeDataset}
          hasTemplate={!!activeTemplate}
        />

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="data" className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              Data
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Templates
            </TabsTrigger>
            <TabsTrigger 
              value="designer" 
              className="flex items-center gap-2"
              disabled={!activeDataset}
            >
              <Palette className="w-4 h-4" />
              Designer
            </TabsTrigger>
            <TabsTrigger 
              value="print" 
              className="flex items-center gap-2"
              disabled={!activeDataset || !activeTemplate}
            >
              <Printer className="w-4 h-4" />
              Print
            </TabsTrigger>
          </TabsList>

          <TabsContent value="data" className="mt-6">
            <BulkDataManager 
              onDatasetSelect={handleDatasetSelect}
              activeDataset={activeDataset}
            />
          </TabsContent>

          <TabsContent value="templates" className="mt-6">
            <LabelTemplates 
              onTemplateSelect={handleTemplateSelect}
              activeTemplate={activeTemplate}
            />
          </TabsContent>

          <TabsContent value="designer" className="mt-6">
            {!activeDataset ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Database className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-xl font-semibold mb-2">No Data Selected</h3>
                  <p className="text-muted-foreground mb-6">
                    Import or select a dataset to start designing your labels with smart mapping
                  </p>
                  <Button onClick={() => setActiveTab("data")} className="gap-2">
                    <Database className="w-4 h-4" />
                    Go to Data Import
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-12 gap-6">
                <div className="col-span-12">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Palette className="w-5 h-5" />
                          Smart Label Designer
                        </div>
                        <div className="flex items-center gap-2">
                          {activeDataset && (
                            <Badge variant="secondary" className="text-xs">
                              <Database className="w-3 h-3 mr-1" />
                              Data Connected
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs font-mono">
                            {canvasSize.width} × {canvasSize.height} px
                          </Badge>
                        </div>
                      </CardTitle>
                      <CardDescription>
                        Add elements and map them to your data columns. Elements will automatically prompt for mapping when added.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <LabelCanvas 
                        templateId={activeTemplate}
                        datasetId={activeDataset}
                        onCanvasSizeChange={(size) => setCanvasSize(size)}
                        onCanvasDataChange={(data) => setCanvasData(data)}
                      />
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="print" className="mt-6">
            {!activeDataset || !activeTemplate ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Printer className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-xl font-semibold mb-2">Setup Required</h3>
                  <p className="text-muted-foreground mb-6">
                    You need both a dataset and template to print labels
                  </p>
                  <div className="flex gap-4 justify-center">
                    {!activeDataset && (
                      <Button variant="outline" onClick={() => setActiveTab("data")} className="gap-2">
                        <Database className="w-4 h-4" />
                        Import Data
                      </Button>
                    )}
                    {!activeTemplate && (
                      <Button variant="outline" onClick={() => setActiveTab("designer")} className="gap-2">
                        <Palette className="w-4 h-4" />
                        Design Template
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
            <PrintManager 
              templateId={activeTemplate} 
              datasetId={activeDataset}
              canvasData={canvasData}
            />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
