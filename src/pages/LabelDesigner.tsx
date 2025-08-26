import React, { useState, useEffect } from 'react';
import { LabelDocProvider, useLabelDoc } from '@/contexts/LabelDocContext';
import { LabelToolbar } from '@/components/label/LabelToolbar';
import { LabelWorkspace } from '@/components/label/LabelWorkspace';
import { LabelPropertiesPanel } from '@/components/label/LabelPropertiesPanel';
import { InventoryDataMapper } from '@/components/label/InventoryDataMapper';
import { OrderLabelTemplates } from '@/components/label/OrderLabelTemplates';
import { DateWiseOrderPrint } from '@/components/label/DateWiseOrderPrint';
import { DataPreviewPanel } from '@/components/label/DataPreviewPanel';
import { StepperIndicator } from '@/components/label/StepperIndicator';
import { PrintService } from '@/services/print-service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LABEL_PRESETS, PrintSettings } from '@/types/label';
import { Plus, Database, Eye, Download, Printer, FolderOpen } from 'lucide-react';
import { toast } from 'sonner';

const LabelDesignerContent: React.FC = () => {
  const { document: labelDoc, dataset, createDocument, loadDocument, loadUserDocuments } = useLabelDoc();
  const [currentStep, setCurrentStep] = useState(1);
  const [activeTab, setActiveTab] = useState('data');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [showWelcomeGuide, setShowWelcomeGuide] = useState(false);
  const [userDocuments, setUserDocuments] = useState<any[]>([]);
  const [newLabelName, setNewLabelName] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('address');
  const [customWidth, setCustomWidth] = useState(100);
  const [customHeight, setCustomHeight] = useState(50);
  const [isCustomSize, setIsCustomSize] = useState(false);
  const [printSettings, setPrintSettings] = useState<PrintSettings>({
    format: 'pdf',
    paperSize: 'a4',
    orientation: 'portrait',
    dpi: 203,
    copies: 1,
    labelsPerPage: 4,
    margin: 10,
  });

  // Determine step status based on current state
  const hasDataset = !!dataset;
  const hasTemplate = !!labelDoc;

  // Show welcome guide if no data and no template on first load
  useEffect(() => {
    if (!hasDataset && !hasTemplate) {
      setShowWelcomeGuide(true);
    }
  }, []);

  // Auto-advance steps based on state
  useEffect(() => {
    if (!hasDataset) {
      setCurrentStep(1);
      setActiveTab('data');
    } else if (!hasTemplate) {
      setCurrentStep(2);
      setActiveTab('template');
    } else if (hasTemplate) {
      setCurrentStep(3);
      setActiveTab('design');
    }
  }, [hasDataset, hasTemplate]);

  const handleCreateLabel = async () => {
    if (!newLabelName.trim()) {
      toast.error('Please enter a label name');
      return;
    }
    
    let labelSize;
    if (isCustomSize) {
      if (customWidth <= 0 || customHeight <= 0) {
        toast.error('Please enter valid dimensions (greater than 0)');
        return;
      }
      labelSize = { width: customWidth, height: customHeight, unit: 'mm' as const };
    } else {
      labelSize = LABEL_PRESETS[selectedPreset];
    }
    
    await createDocument(newLabelName, labelSize);
    setShowCreateDialog(false);
    setNewLabelName('');
    setIsCustomSize(false);
    setCustomWidth(100);
    setCustomHeight(50);
    // Auto-advance to design step after creating label
    setCurrentStep(3);
    setActiveTab('design');
  };

  const handlePreview = async () => {
    if (!labelDoc) return;
    const html = PrintService.generateHTMLPreview(labelDoc, dataset);
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(html);
      newWindow.document.close();
    }
  };

  const handleExportPDF = async () => {
    if (!labelDoc) return;
    try {
      const blob = await PrintService.generatePDF(labelDoc, dataset, printSettings);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${labelDoc.name}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('PDF exported successfully');
    } catch (error) {
      toast.error('Failed to export PDF');
    }
  };

  const handleLoadDocuments = async () => {
    const docs = await loadUserDocuments();
    setUserDocuments(docs);
    setShowLoadDialog(true);
  };

  const handleLoadDocument = async (id: string) => {
    await loadDocument(id);
    setShowLoadDialog(false);
    // Auto-advance to design step after loading label
    setCurrentStep(3);
    setActiveTab('design');
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header with Stepper */}
      <div className="border-b bg-card p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">Label Designer</h1>
            {labelDoc && (
              <div className="flex items-center gap-2">
                <Badge variant="outline">{labelDoc.name}</Badge>
                <Badge variant="secondary">
                  {labelDoc.size.width}×{labelDoc.size.height}mm
                </Badge>
                {dataset && (
                  <Badge variant="secondary">
                    <Database className="h-3 w-3 mr-1" />
                    {dataset.name} ({dataset.rowCount} rows)
                  </Badge>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={showLoadDialog} onOpenChange={setShowLoadDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" onClick={handleLoadDocuments}>
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Load Label
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Load Existing Label</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  {userDocuments.length === 0 ? (
                    <p className="text-muted-foreground">No saved labels found.</p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {userDocuments.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex justify-between items-center p-3 border rounded-lg hover:bg-muted cursor-pointer"
                          onClick={() => handleLoadDocument(doc.id)}
                        >
                          <div>
                            <h4 className="font-medium">{doc.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {doc.width}×{doc.height}mm • {new Date(doc.updated_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
            
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  New Label
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Label</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <Label>Label Name</Label>
                    <Input
                      value={newLabelName}
                      onChange={(e) => setNewLabelName(e.target.value)}
                      placeholder="Enter label name"
                    />
                  </div>
                  <div>
                    <Label>Size Preset</Label>
                    <Select 
                      value={isCustomSize ? 'custom' : selectedPreset} 
                      onValueChange={(value) => {
                        if (value === 'custom') {
                          setIsCustomSize(true);
                        } else {
                          setIsCustomSize(false);
                          setSelectedPreset(value);
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-background border shadow-md z-50">
                        {Object.entries(LABEL_PRESETS).map(([key, preset]) => (
                          <SelectItem key={key} value={key}>
                            {key} ({preset.width}×{preset.height}mm)
                          </SelectItem>
                        ))}
                        <SelectItem value="custom">
                          Custom Size
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {isCustomSize && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Width (mm)</Label>
                        <Input
                          type="number"
                          value={customWidth}
                          onChange={(e) => setCustomWidth(Number(e.target.value))}
                          placeholder="Width"
                          min="1"
                          max="500"
                        />
                      </div>
                      <div>
                        <Label>Height (mm)</Label>
                        <Input
                          type="number"
                          value={customHeight}
                          onChange={(e) => setCustomHeight(Number(e.target.value))}
                          placeholder="Height"
                          min="1"
                          max="500"
                        />
                      </div>
                    </div>
                  )}
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateLabel}>Create</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            {labelDoc && (
              <>
                <Button variant="outline" size="sm" onClick={handlePreview}>
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
              </>
            )}
          </div>
        </div>
        
        {/* Stepper Indicator */}
        <StepperIndicator 
          currentStep={currentStep} 
          hasDataset={hasDataset} 
          hasTemplate={hasTemplate}
          onStepClick={(step) => {
            setCurrentStep(step);
            // Auto-switch to corresponding tab
            const tabMap = { 1: 'data', 2: 'template', 3: 'design', 4: 'print' };
            setActiveTab(tabMap[step as keyof typeof tabMap] || 'data');
          }}
        />
      </div>

      {/* Main Content */}
      <div className="flex flex-1 min-h-0">
        {/* Workspace */}
        <div className="flex-1 p-4">
          <LabelWorkspace />
        </div>
        
        {/* Right Panel with Tabs */}
        <div className="w-96 border-l bg-card">
          <Tabs value={activeTab} onValueChange={(tab) => {
            setActiveTab(tab);
            // Update step when tab changes
            const stepMap = { 'data': 1, 'template': 2, 'design': 3, 'print': 4 };
            setCurrentStep(stepMap[tab as keyof typeof stepMap] || 1);
          }} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-4 m-4 mb-0">
              <TabsTrigger value="data" className="text-xs">Data</TabsTrigger>
              <TabsTrigger value="template" className="text-xs">Template</TabsTrigger>
              <TabsTrigger value="design" className="text-xs">Design</TabsTrigger>
              <TabsTrigger value="print" className="text-xs">Print</TabsTrigger>
            </TabsList>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <TabsContent value="data" className="mt-0 space-y-4">
              {!hasDataset && !hasTemplate && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Welcome to Label Designer</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 text-sm text-muted-foreground">
                      <p><strong>Step 1: Data</strong> - Upload or connect your data source to populate labels</p>
                      <p><strong>Step 2: Template</strong> - Choose from pre-built templates or create from scratch</p>
                      <p><strong>Step 3: Design</strong> - Customize your label with elements and styling</p>
                      <p><strong>Step 4: Print</strong> - Preview and export your finished labels</p>
                      <div className="mt-4 pt-3 border-t">
                        <p className="text-primary font-medium">Start by uploading data or creating a new label template below.</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              <InventoryDataMapper />
              <DataPreviewPanel />
            </TabsContent>
              
              <TabsContent value="template" className="mt-0 space-y-4">
                <OrderLabelTemplates />
              </TabsContent>
              
              <TabsContent value="design" className="mt-0 space-y-4">
                <LabelToolbar />
                <LabelPropertiesPanel />
              </TabsContent>
              
              <TabsContent value="print" className="mt-0 space-y-4">
                <DateWiseOrderPrint />
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Export Options</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button 
                      onClick={handleExportPDF} 
                      disabled={!labelDoc}
                      className="w-full"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export PDF
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

const LabelDesigner: React.FC = () => {
  return (
    <LabelDocProvider>
      <LabelDesignerContent />
    </LabelDocProvider>
  );
};

export default LabelDesigner;
